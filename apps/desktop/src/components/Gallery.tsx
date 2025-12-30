import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  CheckSquare,
  GalleryThumbnails,
  Grid2X2,
  ImagePlus,
  Loader2,
  MonitorPlay,
  Plus,
  Search,
} from "lucide-react";
import {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { toast } from "sonner";
import type { ViewMode } from "@/App";
import { ThumbnailGridItem } from "@/components/ThumbnailGridItem";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VideoExtractor } from "@/components/VideoExtractor";
import { cn } from "@/lib/utils";
import {
  type ThumbnailItem,
  useGalleryStore,
} from "@/stores/use-gallery-store";
import { useGalleryUIStore } from "@/stores/use-gallery-ui-store";
import { useSelectionStore } from "@/stores/use-selection-store";

interface GalleryProps {
  viewMode: ViewMode;
  onThumbnailClick: (thumbnail: ThumbnailItem) => void;
  onExportClick: (thumbnail: ThumbnailItem) => void;
}

// Stable grid components - MUST be defined outside component to prevent remounting
const GridList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, style, className, ...props }, ref) => (
    <div
      ref={ref}
      style={style}
      {...props}
      className={cn("grid gap-4 px-4 pt-4 pb-4", className)}
    >
      {children}
    </div>
  )
);
GridList.displayName = "GridList";

const GridItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  )
);
GridItem.displayName = "GridItem";

const gridComponents = {
  List: GridList,
  Item: GridItem,
};

export function Gallery({
  viewMode,
  onThumbnailClick,
  onExportClick,
}: GalleryProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showVideoExtractor, setShowVideoExtractor] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] =
    useState<ThumbnailItem | null>(null);
  const [newName, setNewName] = useState("");
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);
  const deleteThumbnail = useGalleryStore((s) => s.deleteThumbnail);
  const updateThumbnailName = useGalleryStore((s) => s.updateThumbnailName);
  const sortField = useGalleryStore((s) => s.sortField);
  const sortOrder = useGalleryStore((s) => s.sortOrder);
  const rawThumbnails = useGalleryStore((s) => s.thumbnails);
  const isLoaded = useGalleryStore((s) => s.isLoaded);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Selection mode
  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectAll = useSelectionStore((s) => s.selectAll);
  const toggleSelectionMode = useSelectionStore((s) => s.toggleSelectionMode);
  const exitSelectionMode = useSelectionStore((s) => s.exitSelectionMode);

  // Scroll position restoration
  const lastClickedIndex = useGalleryUIStore((s) => s.lastClickedIndex);
  const setLastClickedIndex = useGalleryUIStore((s) => s.setLastClickedIndex);

  const thumbnails = useMemo(() => {
    let filtered = rawThumbnails;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(query));
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = (a[sortField] || 0) - (b[sortField] || 0);
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });
  }, [rawThumbnails, sortField, sortOrder, searchQuery]);

  // Get grid column class based on viewMode
  const gridColClass = useMemo(() => {
    const gridClasses: Record<ViewMode, string> = {
      "3": "grid-cols-3",
      "4": "grid-cols-4",
      "5": "grid-cols-5",
      row: "grid-cols-1",
    };
    return gridClasses[viewMode];
  }, [viewMode]);

  // Drag selection state
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Handle drag selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const container = scrollerRef.current;
    if (!container) {
      return;
    }

    // Create a specialized type guard or check if the target is a thumbnail or button
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest(".group") // Thumbnail container class
    ) {
      return;
    }

    if (e.button !== 0) {
      return;
    }

    isDragging.current = true;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;
    startPoint.current = { x, y };

    // Enable selection mode if not already active
    if (!useSelectionStore.getState().isSelectionMode) {
      useSelectionStore.getState().toggleSelectionMode();
    }

    // Standard behavior: clear selection on background click/drag unless Shift/Ctrl held
    if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
      useSelectionStore.getState().clearSelection();
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!(isDragging.current && startPoint.current)) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const currentX = e.clientX - rect.left + container.scrollLeft;
      const currentY = e.clientY - rect.top + container.scrollTop;

      const x = Math.min(currentX, startPoint.current.x);
      const y = Math.min(currentY, startPoint.current.y);
      const width = Math.abs(currentX - startPoint.current.x);
      const height = Math.abs(currentY - startPoint.current.y);

      setSelectionBox({ x, y, width, height });

      // Calculate intersections
      const boxRect = { left: x, top: y, right: x + width, bottom: y + height };
      const newSelectedIds: string[] = [];

      // Get all thumbnail elements
      const thumbnailElements = container.querySelectorAll(
        "[data-thumbnail-id]"
      );
      for (const el of thumbnailElements) {
        const elRect = (el as HTMLElement).getBoundingClientRect();
        // Convert elRect to container-relative coordinates
        const elRelLeft = elRect.left - rect.left + container.scrollLeft;
        const elRelTop = elRect.top - rect.top + container.scrollTop;
        const elRelRight = elRelLeft + elRect.width;
        const elRelBottom = elRelTop + elRect.height;

        const isIntersecting =
          boxRect.left < elRelRight &&
          boxRect.right > elRelLeft &&
          boxRect.top < elRelBottom &&
          boxRect.bottom > elRelTop;

        if (isIntersecting) {
          const id = el.getAttribute("data-thumbnail-id");
          if (id) {
            newSelectedIds.push(id);
          }
        }
      }

      // Update selection store - replace current selection with what's in box
      useSelectionStore.getState().selectAll(newSelectedIds);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      startPoint.current = null;
      setSelectionBox(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, []);

  const handleAddImage = useCallback(async () => {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"],
        },
      ],
    });

    if (selected) {
      const files = Array.isArray(selected) ? selected : [selected];
      for (const filePath of files) {
        try {
          const data = await readFile(filePath);
          const blob = new Blob([data]);
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const fileName = filePath.split(/[/\\]/).pop() || "Image";
          addThumbnail(dataUrl, fileName);
        } catch (error) {
          console.error("Failed to load image:", error);
        }
      }
    }
  }, [addThumbnail]);

  // Get the loadFullImageForId function from store
  const loadFullImageForId = useGalleryStore((s) => s.loadFullImageForId);

  const handleRemoveBackground = useCallback(
    async (e: React.MouseEvent, thumbnail: ThumbnailItem) => {
      e.stopPropagation();
      setProcessingId(thumbnail.id);

      try {
        // Load full image from file
        const fullImageUrl = await loadFullImageForId(thumbnail.id);
        if (!fullImageUrl) {
          console.error("Failed to load image for background removal");
          return;
        }

        const { removeBackgroundAsync } = await import(
          "@/lib/background-removal"
        );
        const resultDataUrl = await removeBackgroundAsync(fullImageUrl);
        addThumbnail(resultDataUrl, `${thumbnail.name} (no bg)`);
      } catch (error) {
        console.error("Background removal failed:", error);
      } finally {
        setProcessingId(null);
      }
    },
    [addThumbnail, loadFullImageForId]
  );

  const handleRename = useCallback((thumbnail: ThumbnailItem) => {
    setSelectedThumbnail(thumbnail);
    setNewName(thumbnail.name);
    setRenameDialogOpen(true);
  }, []);

  const handleDelete = useCallback((thumbnail: ThumbnailItem) => {
    setSelectedThumbnail(thumbnail);
    setDeleteDialogOpen(true);
  }, []);

  // Item renderer for VirtuosoGrid - no useCallback to avoid stale closure issues
  const itemContent = (index: number) => {
    // First item is the add button
    if (index === 0) {
      return (
        <button
          className="flex aspect-video h-full w-full cursor-pointer items-center justify-center rounded-lg border-2 border-muted-foreground/30 border-dashed transition-colors hover:border-muted-foreground/50 hover:bg-muted/30"
          onClick={handleAddImage}
          type="button"
        >
          <Plus className="size-8 text-muted-foreground/50" />
        </button>
      );
    }

    const thumbnail = thumbnails[index - 1];
    if (!thumbnail) {
      return null;
    }

    return (
      <ThumbnailGridItem
        isProcessing={processingId === thumbnail.id}
        onDelete={handleDelete}
        onExportClick={onExportClick}
        onRemoveBackground={handleRemoveBackground}
        onRename={handleRename}
        onThumbnailClick={(t) => {
          // Store the clicked index for scroll restoration (index includes +1 offset for add button)
          setLastClickedIndex(index);
          onThumbnailClick(t);
        }}
        thumbnail={thumbnail}
      />
    );
  };

  // Show loading spinner while database is loading
  if (!isLoaded) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Loading thumbnails...</p>
      </div>
    );
  }

  if (rawThumbnails.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <GalleryThumbnails className="size-10 fill-muted-foreground text-muted-foreground opacity-40" />
        <div className="text-center">
          <p className="font-medium">No thumbnails yet</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Start by adding images or extracting frames from videos
          </p>
        </div>
        <Button onClick={handleAddImage} variant="ghost">
          <Plus className="mr-2 size-4" />
          Add Image
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 select-none flex-col">
      {/* Search Bar */}
      <div className="relative z-10 p-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-14 pr-20 pl-12 text-xl"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            type="text"
            value={searchQuery}
          />
          <Badge
            className="absolute top-1/2 right-3 -translate-y-1/2"
            variant="secondary"
          >
            {thumbnails.length}
          </Badge>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="relative flex-1">
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className="absolute inset-0 overflow-hidden"
              onMouseDown={handleMouseDown}
              ref={containerRef}
            >
              {selectionBox && (
                <div
                  className="pointer-events-none absolute z-50 border border-primary/50 bg-primary/20"
                  style={{
                    left: selectionBox.x,
                    top: selectionBox.y,
                    width: selectionBox.width,
                    height: selectionBox.height,
                  }}
                />
              )}
              {thumbnails.length === 0 && searchQuery.trim() ? (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <Search className="size-10 text-muted-foreground opacity-40" />
                  <div className="text-center">
                    <p className="font-medium">No results found</p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Try a different search term
                    </p>
                  </div>
                  <Button onClick={() => setSearchQuery("")} variant="ghost">
                    Clear Search
                  </Button>
                </div>
              ) : (
                <VirtuosoGrid
                  components={gridComponents}
                  initialTopMostItemIndex={lastClickedIndex ?? 0}
                  itemContent={itemContent}
                  listClassName={gridColClass}
                  overscan={600}
                  scrollerRef={(ref) => {
                    scrollerRef.current = ref as HTMLDivElement;
                  }}
                  style={{ height: "100%", width: "100%" }}
                  totalCount={thumbnails.length + 1} // +1 for add button
                />
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleAddImage}>
              <ImagePlus className="mr-2 size-4" />
              Upload Photo
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setShowVideoExtractor(true)}>
              <MonitorPlay className="mr-2 size-4" />
              Upload Video
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => {
                toggleSelectionMode();
                selectAll(thumbnails.map((t) => t.id));
              }}
            >
              <CheckSquare className="mr-2 size-4" />
              Select All
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                if (isSelectionMode) {
                  exitSelectionMode();
                } else {
                  toggleSelectionMode();
                }
              }}
            >
              <Grid2X2 className="mr-2 size-4" />
              {isSelectionMode ? "Exit Selection Mode" : "Enter Selection Mode"}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
      {showVideoExtractor && (
        <VideoExtractor onClose={() => setShowVideoExtractor(false)} />
      )}

      {/* Rename Dialog */}
      <Dialog onOpenChange={setRenameDialogOpen} open={renameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Thumbnail</DialogTitle>
          </DialogHeader>
          <Input
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && selectedThumbnail && newName.trim()) {
                updateThumbnailName(selectedThumbnail.id, newName.trim());
                toast.success("Thumbnail renamed");
                setRenameDialogOpen(false);
              }
            }}
            placeholder="Enter new name"
            value={newName}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={() => {
                if (selectedThumbnail && newName.trim()) {
                  updateThumbnailName(selectedThumbnail.id, newName.trim());
                  toast.success("Thumbnail renamed");
                  setRenameDialogOpen(false);
                }
              }}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedThumbnail?.name}" will be moved to trash. You can
              restore it within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedThumbnail) {
                  await deleteThumbnail(selectedThumbnail.id);
                  toast.info("Moved to trash");
                  setDeleteDialogOpen(false);
                }
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
