import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useEffect,
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
  onRestore,
  onDelete,
}: {
  item: TrashItem;
  onRestore: (item: TrashItem) => void;
  onDelete: (item: TrashItem) => void;
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
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card">
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
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-background/90 to-transparent p-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100">
        <Button onClick={() => onRestore(item)} size="sm" variant="secondary">
          <RotateCcw className="mr-1 size-3" />
          Restore
        </Button>
        <Button
          className="text-destructive"
          onClick={() => onDelete(item)}
          size="sm"
          variant="ghost"
        >
          <Trash2 className="mr-1 size-3" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function TrashPage({ onClose }: TrashPageProps) {
  const trashItems = useTrashStore((s) => s.trashItems);
  const isLoaded = useTrashStore((s) => s.isLoaded);
  const restoreFromTrash = useTrashStore((s) => s.restoreFromTrash);
  const restoreFromTrashBatch = useTrashStore((s) => s.restoreFromTrashBatch);
  const deletePermanently = useTrashStore((s) => s.deletePermanently);
  const emptyTrash = useTrashStore((s) => s.emptyTrash);
  const restoreThumbnail = useGalleryStore((s) => s.restoreThumbnail);

  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [restoreAllDialogOpen, setRestoreAllDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
      <header className="relative z-[110] flex h-14 items-center justify-between px-4 pr-40">
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

        {trashItems.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setRestoreAllDialogOpen(true)}
              size="sm"
              variant="secondary"
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
          </div>
        )}
      </header>

      {/* Content */}
      <div className="relative flex-1">
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
            <VirtuosoGrid
              components={trashGridComponents}
              itemContent={(index) => {
                const item = trashItems[index];
                return (
                  <TrashItemCard
                    item={item}
                    key={item.id}
                    onDelete={handleDeleteClick}
                    onRestore={handleRestore}
                  />
                );
              }}
              listClassName="grid-cols-4"
              overscan={600}
              style={{ height: "100%", width: "100%" }}
              totalCount={trashItems.length}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
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
    </div>
  );
}
