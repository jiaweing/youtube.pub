import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Circle,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGalleryStore } from "@/stores/use-gallery-store";
import { type TrashItem, useTrashStore } from "@/stores/use-trash-store";

interface TrashPageProps {
  onClose: () => void;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getDaysRemaining(deletedAt: number): number {
  const expiresAt = deletedAt + THIRTY_DAYS_MS;
  const remaining = expiresAt - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

function getDaysAgo(deletedAt: number): number {
  return Math.floor((Date.now() - deletedAt) / (24 * 60 * 60 * 1000));
}

// Stable grid components - MUST be defined outside component to prevent remounting
const TrashGridList = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, style, className, ...props }, ref) => (
  <div
    ref={ref}
    style={style}
    {...props}
    className={cn("grid gap-4 px-4 pt-4 pb-4", className)}
  >
    {children}
  </div>
));
TrashGridList.displayName = "TrashGridList";

const TrashGridItem = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
  <div ref={ref} {...props}>
    {children}
  </div>
));
TrashGridItem.displayName = "TrashGridItem";

const TrashGridFooter = () => <div className="col-span-full h-8" />;

const trashGridComponents = {
  List: TrashGridList,
  Item: TrashGridItem,
  Footer: TrashGridFooter,
};

function TrashItemCard({
  item,
  isSelected,
  isSelectionMode,
  onRestore,
  onDelete,
  onClick,
}: {
  item: TrashItem;
  isSelected: boolean;
  isSelectionMode: boolean;
  onRestore: (item: TrashItem) => void;
  onDelete: (item: TrashItem) => void;
  onClick: (item: TrashItem) => void;
}) {
  const loadPreviewForId = useTrashStore((s) => s.loadPreviewForId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoadingPreview(true);
    loadPreviewForId(item.id).then((url) => {
      if (mounted) {
        setPreviewUrl(url);
        setIsLoadingPreview(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [item.id, loadPreviewForId]);

  const daysAgo = getDaysAgo(item.deletedAt);
  const daysRemaining = getDaysRemaining(item.deletedAt);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card transition-all",
        isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
      )}
      data-trash-id={item.id}
      onClick={() => onClick(item)}
    >
      <div className="relative aspect-video w-full bg-muted">
        {isLoadingPreview ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground/50" />
          </div>
        ) : previewUrl ? (
          <img
            alt={item.name}
            className="h-full w-full object-cover"
            src={previewUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Trash2 className="size-8 text-muted-foreground/30" />
          </div>
        )}
        {/* Selection checkbox overlay */}
        {(isSelectionMode || isSelected) && (
          <div className="absolute top-2 left-2 z-20">
            {isSelected ? (
              <div className="flex size-6 items-center justify-center rounded-full bg-white text-black shadow-md">
                <Check className="size-4" />
              </div>
            ) : (
              <div className="flex size-6 items-center justify-center rounded-full border-2 border-white/80 bg-black/30 shadow-md">
                <Circle className="size-4 text-transparent" />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="truncate font-medium text-sm">{item.name}</p>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Deleted {daysAgo} {daysAgo === 1 ? "day" : "days"} ago •{" "}
          <span className={daysRemaining <= 3 ? "text-destructive" : ""}>
            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
          </span>
        </p>
      </div>
      {/* Action buttons - only show when not in selection mode */}
      {!isSelectionMode && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-background/90 to-transparent p-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onRestore(item);
            }}
            size="sm"
            variant="secondary"
          >
            <RotateCcw className="mr-1 size-3" />
            Restore
          </Button>
          <Button
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="mr-1 size-3" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

export function TrashPage({ onClose }: TrashPageProps) {
  const trashItems = useTrashStore((s) => s.trashItems);
  const isLoaded = useTrashStore((s) => s.isLoaded);
  const restoreFromTrash = useTrashStore((s) => s.restoreFromTrash);
  const restoreFromTrashBatch = useTrashStore((s) => s.restoreFromTrashBatch);
  const deletePermanently = useTrashStore((s) => s.deletePermanently);
  const deletePermanentlyBatch = useTrashStore((s) => s.deletePermanentlyBatch);
  const emptyTrash = useTrashStore((s) => s.emptyTrash);
  const restoreThumbnail = useGalleryStore((s) => s.restoreThumbnail);

  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [restoreAllDialogOpen, setRestoreAllDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [deleteSelectedDialogOpen, setDeleteSelectedDialogOpen] =
    useState(false);
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Selection state (local to trash page - not shared with gallery)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Selection helpers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Handle item click - toggle selection in selection mode
  const handleItemClick = useCallback(
    (item: TrashItem) => {
      if (isSelectionMode) {
        toggleSelection(item.id);
      }
    },
    [isSelectionMode, toggleSelection]
  );

  // Handle drag selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const container = scrollerRef.current;
      if (!container) {
        return;
      }

      // Don't start drag on thumbnail cards or buttons
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("[data-trash-id]") // Trash item container
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
      if (!isSelectionMode) {
        setIsSelectionMode(true);
      }

      // Standard behavior: clear selection on background click/drag unless Shift/Ctrl held
      if (!(e.shiftKey || e.ctrlKey || e.metaKey)) {
        clearSelection();
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
        const boxRect = {
          left: x,
          top: y,
          right: x + width,
          bottom: y + height,
        };
        const newSelectedIds: string[] = [];

        // Get all trash item elements
        const trashElements = container.querySelectorAll("[data-trash-id]");
        for (const el of trashElements) {
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
            const id = el.getAttribute("data-trash-id");
            if (id) {
              newSelectedIds.push(id);
            }
          }
        }

        // Update selection - replace current selection with what's in box
        setSelectedIds(new Set(newSelectedIds));
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
    },
    [isSelectionMode, clearSelection]
  );

  // Keyboard shortcuts for bulk actions
  useEffect(() => {
    if (!isSelectionMode) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key - permanently delete selected items
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.size > 0
      ) {
        e.preventDefault();
        setDeleteSelectedDialogOpen(true);
      }
      // Escape - exit selection mode
      if (e.key === "Escape") {
        e.preventDefault();
        exitSelectionMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelectionMode, selectedIds.size, exitSelectionMode]);

  const handleRestore = useCallback(
    async (item: TrashItem) => {
      const restoredItem = await restoreFromTrash(item.id);
      if (restoredItem) {
        await restoreThumbnail({
          id: restoredItem.id,
          name: restoredItem.name,
          originalCreatedAt: restoredItem.originalCreatedAt,
          originalUpdatedAt: restoredItem.originalUpdatedAt,
          canvasWidth: restoredItem.canvasWidth,
          canvasHeight: restoredItem.canvasHeight,
        });
        toast.success(`Restored "${item.name}"`);
      }
    },
    [restoreFromTrash, restoreThumbnail]
  );

  // Bulk restore selected items
  const handleRestoreSelected = useCallback(async () => {
    setIsProcessing(true);
    try {
      const ids = [...selectedIds];
      const restoredItems = await restoreFromTrashBatch(ids);
      for (const item of restoredItems) {
        await restoreThumbnail({
          id: item.id,
          name: item.name,
          originalCreatedAt: item.originalCreatedAt,
          originalUpdatedAt: item.originalUpdatedAt,
          canvasWidth: item.canvasWidth,
          canvasHeight: item.canvasHeight,
        });
      }
      toast.success(`Restored ${restoredItems.length} items`);
      exitSelectionMode();
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, restoreFromTrashBatch, restoreThumbnail, exitSelectionMode]);

  // Bulk delete selected items
  const handleDeleteSelected = useCallback(async () => {
    setIsProcessing(true);
    try {
      const ids = [...selectedIds];
      await deletePermanentlyBatch(ids);
      toast.info(`Permanently deleted ${ids.length} items`);
      setDeleteSelectedDialogOpen(false);
      exitSelectionMode();
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, deletePermanentlyBatch, exitSelectionMode]);

  const handleRestoreAll = useCallback(async () => {
    setIsProcessing(true);
    try {
      const ids = trashItems.map((item) => item.id);
      const restoredItems = await restoreFromTrashBatch(ids);
      for (const item of restoredItems) {
        await restoreThumbnail({
          id: item.id,
          name: item.name,
          originalCreatedAt: item.originalCreatedAt,
          originalUpdatedAt: item.originalUpdatedAt,
          canvasWidth: item.canvasWidth,
          canvasHeight: item.canvasHeight,
        });
      }
      toast.success(`Restored ${restoredItems.length} items`);
      setRestoreAllDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  }, [trashItems, restoreFromTrashBatch, restoreThumbnail]);

  const handleDeleteClick = useCallback((item: TrashItem) => {
    setSelectedItem(item);
    setDeleteItemDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (selectedItem) {
      await deletePermanently(selectedItem.id);
      toast.info(`Permanently deleted "${selectedItem.name}"`);
      setDeleteItemDialogOpen(false);
      setSelectedItem(null);
    }
  }, [selectedItem, deletePermanently]);

  const handleEmptyTrash = useCallback(async () => {
    setIsProcessing(true);
    try {
      await emptyTrash();
      toast.info("Trash emptied");
      setEmptyTrashDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  }, [emptyTrash]);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="relative z-[110] flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={onClose}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Trash2 className="size-4" />
            <span className="text-sm">Trash</span>
            {trashItems.length > 0 && (
              <span className="text-muted-foreground text-sm">
                ({trashItems.length}{" "}
                {trashItems.length === 1 ? "item" : "items"})
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative flex-1 select-none">
        {isLoaded ? (
          trashItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Trash2 className="size-10 text-muted-foreground opacity-40" />
              <div className="text-center">
                <p className="font-medium">Trash is empty</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Deleted items will appear here for 30 days
                </p>
              </div>
              <Button onClick={onClose} variant="ghost">
                <ArrowLeft className="mr-2 size-4" />
                Back to Gallery
              </Button>
            </div>
          ) : (
            <div
              className="absolute inset-0 overflow-hidden"
              onMouseDown={handleMouseDown}
              ref={containerRef}
            >
              {/* Selection box */}
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
              <VirtuosoGrid
                components={trashGridComponents}
                itemContent={(index) => {
                  const item = trashItems[index];
                  return (
                    <TrashItemCard
                      isSelected={selectedIds.has(item.id)}
                      isSelectionMode={isSelectionMode}
                      item={item}
                      key={item.id}
                      onClick={handleItemClick}
                      onDelete={handleDeleteClick}
                      onRestore={handleRestore}
                    />
                  );
                }}
                listClassName="grid-cols-4"
                overscan={600}
                scrollerRef={(ref) => {
                  scrollerRef.current = ref as HTMLDivElement;
                }}
                style={{ height: "100%", width: "100%" }}
                totalCount={trashItems.length}
              />
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="flex h-12 items-center justify-between border-border border-t bg-background/50 px-4 backdrop-blur-sm">
        {isSelectionMode ? (
          <div className="flex flex-1 items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={exitSelectionMode}
                size="icon-sm"
                title="Clear selection"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
              <span className="font-medium text-sm">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <Button
              disabled={isProcessing || selectedIds.size === 0}
              onClick={handleRestoreSelected}
              size="sm"
              variant="ghost"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 size-4" />
              )}
              Restore
            </Button>
            <Button
              className="text-destructive hover:text-destructive"
              disabled={isProcessing || selectedIds.size === 0}
              onClick={() => setDeleteSelectedDialogOpen(true)}
              size="sm"
              variant="ghost"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        ) : (
          <>
            <div /> {/* Spacer for left side */}
            <div className="flex items-center gap-2">
              {trashItems.length > 0 && (
                <>
                  <Button
                    onClick={() => setRestoreAllDialogOpen(true)}
                    size="sm"
                    variant="ghost"
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Restore All
                  </Button>
                  <Button
                    className="text-destructive hover:text-destructive"
                    onClick={() => setEmptyTrashDialogOpen(true)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Empty Trash
                  </Button>
                  <div className="h-4 w-px bg-border" />
                </>
              )}
              <Button
                onClick={() => setIsSelectionMode(true)}
                size="sm"
                variant="ghost"
              >
                Select
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Restore All Confirmation */}
      <AlertDialog
        onOpenChange={setRestoreAllDialogOpen}
        open={restoreAllDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5" />
              Restore All Items?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all {trashItems.length} items back to your
              gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isProcessing}
              onClick={handleRestoreAll}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty Trash Confirmation */}
      <AlertDialog
        onOpenChange={setEmptyTrashDialogOpen}
        open={emptyTrashDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Empty Trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {trashItems.length} items in the
              trash. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
              onClick={handleEmptyTrash}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Emptying...
                </>
              ) : (
                "Empty Trash"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Confirmation */}
      <AlertDialog
        onOpenChange={setDeleteItemDialogOpen}
        open={deleteItemDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedItem?.name}" will be permanently deleted. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Selected Confirmation */}
      <AlertDialog
        onOpenChange={setDeleteSelectedDialogOpen}
        open={deleteSelectedDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Permanently Delete {selectedIds.size} Items?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} selected{" "}
              {selectedIds.size === 1 ? "item" : "items"}. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
              onClick={handleDeleteSelected}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
