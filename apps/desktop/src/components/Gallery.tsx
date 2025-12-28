import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  Check,
  CheckSquare,
  Circle,
  Copy,
  Download,
  GalleryThumbnails,
  Grid2X2,
  ImagePlus,
  MonitorPlay,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ViewMode } from "@/App";
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
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VideoExtractor } from "@/components/VideoExtractor";
import { cn } from "@/lib/utils";
import {
  type ThumbnailItem,
  useGalleryStore,
} from "@/stores/use-gallery-store";
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showVideoExtractor, setShowVideoExtractor] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] =
    useState<ThumbnailItem | null>(null);
  const [newName, setNewName] = useState("");
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);
  const duplicateThumbnail = useGalleryStore((s) => s.duplicateThumbnail);
  const deleteThumbnail = useGalleryStore((s) => s.deleteThumbnail);
  const updateThumbnailName = useGalleryStore((s) => s.updateThumbnailName);
  const sortField = useGalleryStore((s) => s.sortField);
  const sortOrder = useGalleryStore((s) => s.sortOrder);
  const rawThumbnails = useGalleryStore((s) => s.thumbnails);

  // Selection mode
  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const toggleSelection = useSelectionStore((s) => s.toggleSelection);

  const selectAll = useSelectionStore((s) => s.selectAll);
  const toggleSelectionMode = useSelectionStore((s) => s.toggleSelectionMode);
  const exitSelectionMode = useSelectionStore((s) => s.exitSelectionMode);

  const thumbnails = useMemo(() => {
    return [...rawThumbnails].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = (a[sortField] || 0) - (b[sortField] || 0);
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });
  }, [rawThumbnails, sortField, sortOrder]);

  // Drag selection state
  const containerRef = useRef<HTMLDivElement>(null);
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
    const container = containerRef.current;
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
      thumbnailElements.forEach((el) => {
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
      });

      // Update selection store - replace current selection with what's in box
      // (Advanced: support shift/ctrl modifiers for add/remove)
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

  const gridCols = {
    "3": "grid-cols-3",
    "4": "grid-cols-4",
    "5": "grid-cols-5",
    row: "grid-cols-1",
  };

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

  const handleRemoveBackground = useCallback(
    async (e: React.MouseEvent, thumbnail: ThumbnailItem) => {
      e.stopPropagation();
      setProcessingId(thumbnail.id);

      try {
        const { removeBackgroundAsync } = await import(
          "@/lib/background-removal"
        );
        const resultDataUrl = await removeBackgroundAsync(thumbnail.dataUrl);
        addThumbnail(resultDataUrl, `${thumbnail.name} (no bg)`);
      } catch (error) {
        console.error("Background removal failed:", error);
      } finally {
        setProcessingId(null);
      }
    },
    [addThumbnail]
  );

  // Ghost add button
  const AddImageButton = (
    <button
      className="flex aspect-video cursor-pointer items-center justify-center rounded-lg border-2 border-muted-foreground/30 border-dashed transition-colors hover:border-muted-foreground/50 hover:bg-muted/30"
      onClick={handleAddImage}
      type="button"
    >
      <Plus className="size-8 text-muted-foreground/50" />
    </button>
  );

  if (thumbnails.length === 0) {
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
    <div className="relative flex h-full flex-1 select-none flex-col">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="flex-1 overflow-y-auto p-4 outline-none"
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
            <div className={cn("grid gap-4", gridCols[viewMode])}>
              {/* Ghost add button as first item */}
              {AddImageButton}

              {thumbnails.map((thumbnail) => (
                <ContextMenu key={thumbnail.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        "group relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-card transition-transform hover:scale-[1.02]",
                        isSelectionMode &&
                          selectedIds.has(thumbnail.id) &&
                          "ring-2 ring-primary"
                      )}
                      data-thumbnail-id={thumbnail.id}
                      onClick={() => {
                        if (processingId === thumbnail.id) {
                          return;
                        }
                        if (isSelectionMode) {
                          toggleSelection(thumbnail.id);
                        } else {
                          onThumbnailClick(thumbnail);
                        }
                      }}
                      onKeyDown={() => {}}
                    >
                      <img
                        alt={thumbnail.name}
                        className="h-full w-full object-cover"
                        src={thumbnail.dataUrl}
                      />
                      {/* Selection checkbox overlay */}
                      {isSelectionMode && (
                        <div className="absolute top-2 left-2 z-20">
                          {selectedIds.has(thumbnail.id) ? (
                            <div className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                              <Check className="size-4" />
                            </div>
                          ) : (
                            <div className="flex size-6 items-center justify-center rounded-full border-2 border-white/80 bg-black/30 shadow-md">
                              <Circle className="size-4 text-transparent" />
                            </div>
                          )}
                        </div>
                      )}
                      {/* Single gradient overlay */}
                      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        {processingId === thumbnail.id ? (
                          <span className="absolute inset-0 flex items-center justify-center text-sm text-white">
                            Processing...
                          </span>
                        ) : isSelectionMode ? null : (
                          <div
                            className="absolute right-2 bottom-2 z-10 flex gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Tooltip>
                              <TooltipTrigger
                                className={buttonVariants({
                                  size: "icon-sm",
                                  variant: "ghost",
                                })}
                                onClick={(e) =>
                                  handleRemoveBackground(e, thumbnail)
                                }
                              >
                                <Wand2 className="size-4" />
                              </TooltipTrigger>
                              <TooltipContent>Remove Background</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                className={buttonVariants({
                                  size: "icon-sm",
                                  variant: "ghost",
                                })}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onExportClick(thumbnail);
                                }}
                              >
                                <Download className="size-4" />
                              </TooltipTrigger>
                              <TooltipContent>Export</TooltipContent>
                            </Tooltip>
                            <div className="relative">
                              <Tooltip>
                                <TooltipTrigger
                                  className={buttonVariants({
                                    size: "icon-sm",
                                    variant: "ghost",
                                  })}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(
                                      menuOpenId === thumbnail.id
                                        ? null
                                        : thumbnail.id
                                    );
                                  }}
                                >
                                  <MoreHorizontal className="size-4" />
                                </TooltipTrigger>
                                <TooltipContent>More</TooltipContent>
                              </Tooltip>
                              {menuOpenId === thumbnail.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuOpenId(null);
                                    }}
                                    onKeyDown={() => {}}
                                  />
                                  <div className="absolute right-0 bottom-full z-50 mb-2 w-36 rounded-lg border border-border bg-card p-1 shadow-lg">
                                    <Button
                                      className="w-full justify-start"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await duplicateThumbnail(thumbnail.id);
                                        toast.success("Thumbnail duplicated");
                                        setMenuOpenId(null);
                                      }}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <Copy className="mr-2 size-4" />
                                      Duplicate
                                    </Button>
                                    <Button
                                      className="w-full justify-start"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedThumbnail(thumbnail);
                                        setNewName(thumbnail.name);
                                        setRenameDialogOpen(true);
                                        setMenuOpenId(null);
                                      }}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <Pencil className="mr-2 size-4" />
                                      Rename
                                    </Button>
                                    <Button
                                      className="w-full justify-start text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedThumbnail(thumbnail);
                                        setDeleteDialogOpen(true);
                                        setMenuOpenId(null);
                                      }}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <Trash2 className="mr-2 size-4" />
                                      Delete
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 max-w-[60%] px-3 py-2">
                          <Tooltip>
                            <TooltipTrigger className="block truncate text-sm text-white">
                              {thumbnail.name}
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-0.5">
                                <p className="font-medium">{thumbnail.name}</p>
                                {thumbnail.canvasWidth &&
                                  thumbnail.canvasHeight && (
                                    <p className="text-muted-foreground text-xs">
                                      {thumbnail.canvasWidth} ×{" "}
                                      {thumbnail.canvasHeight}
                                    </p>
                                  )}
                                <p className="text-muted-foreground text-xs">
                                  Updated:{" "}
                                  {new Date(
                                    thumbnail.updatedAt
                                  ).toLocaleString()}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Created:{" "}
                                  {new Date(
                                    thumbnail.createdAt
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={async () => {
                        await duplicateThumbnail(thumbnail.id);
                        toast.success("Thumbnail duplicated");
                      }}
                    >
                      <Copy className="mr-2 size-4" />
                      Duplicate
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        setSelectedThumbnail(thumbnail);
                        setNewName(thumbnail.name);
                        setRenameDialogOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 size-4" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => onExportClick(thumbnail)}>
                      <Download className="mr-2 size-4" />
                      Export
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={(e) => handleRemoveBackground(e, thumbnail)}
                    >
                      <Wand2 className="mr-2 size-4" />
                      Remove Background
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setSelectedThumbnail(thumbnail);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
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
            <AlertDialogTitle>Delete Thumbnail?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedThumbnail?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedThumbnail) {
                  await deleteThumbnail(selectedThumbnail.id);
                  toast.info("Thumbnail deleted");
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
