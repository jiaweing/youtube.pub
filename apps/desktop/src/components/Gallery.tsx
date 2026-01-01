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
import { useCallback, useMemo, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { toast } from "sonner";
import type { ViewMode } from "@/App";
import { EmptyState } from "@/components/gallery/EmptyState";
import { gridComponents } from "@/components/gallery/VirtuosoGridComponents";
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
import { useDragSelection } from "@/hooks/use-drag-selection";
import { openAndLoadImages } from "@/lib/image-file-utils";
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

  const [searchQuery, setSearchQuery] = useState("");

  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectAll = useSelectionStore((s) => s.selectAll);
  const toggleSelectionMode = useSelectionStore((s) => s.toggleSelectionMode);
  const exitSelectionMode = useSelectionStore((s) => s.exitSelectionMode);

  const lastClickedIndex = useGalleryUIStore((s) => s.lastClickedIndex);
  const setLastClickedIndex = useGalleryUIStore((s) => s.setLastClickedIndex);

  const thumbnails = useMemo(() => {
    let filtered = rawThumbnails;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(query));
    }
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

  const gridColClass = useMemo(() => {
    const gridClasses: Record<ViewMode, string> = {
      "3": "grid-cols-3",
      "4": "grid-cols-4",
      "5": "grid-cols-5",
      row: "grid-cols-1",
    };
    return gridClasses[viewMode];
  }, [viewMode]);

  // Drag selection hook
  const { selectionBox, containerRef, scrollerRef, handleMouseDown } =
    useDragSelection({
      dataAttribute: "data-thumbnail-id",
      isSelectionMode,
      onEnableSelectionMode: toggleSelectionMode,
      onSelectionChange: (ids) => useSelectionStore.getState().selectAll(ids),
      onClearSelection: () => useSelectionStore.getState().clearSelection(),
    });

  const handleAddImage = useCallback(async () => {
    const images = await openAndLoadImages();
    for (const { dataUrl, fileName } of images) {
      addThumbnail(dataUrl, fileName);
    }
  }, [addThumbnail]);

  const loadFullImageForId = useGalleryStore((s) => s.loadFullImageForId);

  const handleRemoveBackground = useCallback(
    async (e: React.MouseEvent, thumbnail: ThumbnailItem) => {
      e.stopPropagation();
      setProcessingId(thumbnail.id);
      try {
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

  const itemContent = (index: number) => {
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
    if (!thumbnail) return null;

    return (
      <ThumbnailGridItem
        isProcessing={processingId === thumbnail.id}
        onDelete={handleDelete}
        onExportClick={onExportClick}
        onRemoveBackground={handleRemoveBackground}
        onRename={handleRename}
        onThumbnailClick={(t) => {
          setLastClickedIndex(index);
          onThumbnailClick(t);
        }}
        thumbnail={thumbnail}
      />
    );
  };

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
      <EmptyState
        action={{
          label: "Add Image",
          icon: <Plus className="mr-2 size-4" />,
          onClick: handleAddImage,
        }}
        description="Start by adding images or extracting frames from videos"
        icon={<GalleryThumbnails className="size-10 fill-muted-foreground" />}
        title="No thumbnails yet"
      />
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
                  totalCount={thumbnails.length + 1}
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
