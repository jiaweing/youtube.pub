import { Key, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ViewMode } from "@/App";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { AddMenu } from "@/components/toolbar/add-menu";
import { SelectionToolbar } from "@/components/toolbar/selection-toolbar";
import { SortMenu } from "@/components/toolbar/sort-menu";
import { ViewModeButtons } from "@/components/toolbar/view-mode-buttons";
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
import { useBackgroundRemovalQueue } from "@/stores/use-background-removal-queue";
import { useGalleryStore } from "@/stores/use-gallery-store";
import { useSelectionStore } from "@/stores/use-selection-store";
import { useTrashStore } from "@/stores/use-trash-store";

interface BottomToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddVideoClick: () => void;
  onTrashClick: () => void;
}

export function BottomToolbar({
  viewMode,
  onViewModeChange,
  onAddVideoClick,
  onTrashClick,
}: BottomToolbarProps) {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const thumbnails = useGalleryStore((s) => s.thumbnails);
  const duplicateThumbnailsBatch = useGalleryStore(
    (s) => s.duplicateThumbnailsBatch
  );
  const deleteThumbnailsBatch = useGalleryStore((s) => s.deleteThumbnailsBatch);

  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const toggleSelectionMode = useSelectionStore((s) => s.toggleSelectionMode);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectAll = useSelectionStore((s) => s.selectAll);
  const exitSelectionMode = useSelectionStore((s) => s.exitSelectionMode);

  const addToQueue = useBackgroundRemovalQueue((s) => s.addToQueue);

  const trashItems = useTrashStore((s) => s.trashItems);
  const trashCount = trashItems.length;

  const handleBulkDuplicate = useCallback(async () => {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      const ids = Array.from(selectedIds);
      await duplicateThumbnailsBatch(ids);
      toast.success(`Duplicated ${ids.length} items`);
      clearSelection();
    } finally {
      setIsDuplicating(false);
    }
  }, [selectedIds, duplicateThumbnailsBatch, clearSelection, isDuplicating]);

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await deleteThumbnailsBatch(ids);
      toast.success(`Moved ${ids.length} items to trash`);
      setDeleteDialogOpen(false);
      clearSelection();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkRemoveBackground = useCallback(() => {
    const itemsToProcess = thumbnails
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({
        thumbnailId: t.id,
        name: t.name,
      }));

    addToQueue(itemsToProcess);
    toast.success(`Added ${itemsToProcess.length} items to processing queue`);
    clearSelection();
  }, [thumbnails, selectedIds, addToQueue, clearSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setDeleteDialogOpen(true);
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "j")) {
        e.preventDefault();
        handleBulkDuplicate();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        handleBulkRemoveBackground();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        if (!isSelectionMode) {
          useSelectionStore.getState().toggleSelectionMode();
        }
        selectAll(thumbnails.map((t) => t.id));
      }

      if (e.key === "Escape") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          clearSelection();
        } else if (isSelectionMode) {
          e.preventDefault();
          exitSelectionMode();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIds,
    isSelectionMode,
    thumbnails,
    handleBulkDuplicate,
    handleBulkRemoveBackground,
    selectAll,
    clearSelection,
    exitSelectionMode,
  ]);

  const showDefaultToolbar = !isSelectionMode || selectedIds.size === 0;

  return (
    <header className="flex h-12 items-center justify-between bg-background/50 px-4 backdrop-blur-sm">
      {isSelectionMode && selectedIds.size > 0 ? (
        <SelectionToolbar
          isDuplicating={isDuplicating}
          onClearSelection={clearSelection}
          onDelete={() => setDeleteDialogOpen(true)}
          onDuplicate={handleBulkDuplicate}
          onRemoveBackground={handleBulkRemoveBackground}
          selectedCount={selectedIds.size}
        />
      ) : (
        <div className="flex items-center gap-2">
          <ViewModeButtons
            onViewModeChange={onViewModeChange}
            viewMode={viewMode}
          />
          <SortMenu />
        </div>
      )}

      {/* Right side buttons */}
      <div className="flex items-center gap-2">
        {showDefaultToolbar && (
          <Button
            aria-label="Trash"
            className="relative"
            onClick={onTrashClick}
            size="icon-sm"
            title="Trash"
            variant="ghost"
          >
            <Trash2 className="size-4" />
            {trashCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-medium text-[10px] text-primary-foreground">
                {trashCount > 99 ? "99+" : trashCount}
              </span>
            )}
          </Button>
        )}

        <Button
          onClick={toggleSelectionMode}
          size="sm"
          variant={isSelectionMode ? "secondary" : "ghost"}
        >
          {isSelectionMode ? "Cancel" : "Select"}
        </Button>

        {showDefaultToolbar && (
          <>
            <Button
              aria-label="Gemini API Key"
              onClick={() => setShowApiKeyDialog(true)}
              size="icon-sm"
              title="Gemini API Key"
              variant="ghost"
            >
              <Key className="size-4" />
            </Button>
            <AddMenu onAddVideoClick={onAddVideoClick} />
          </>
        )}
      </div>

      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move {selectedIds.size} items to trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              These items will be moved to trash. You can restore them within 30
              days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleBulkDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Moving...
                </>
              ) : (
                "Move to Trash"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ApiKeyDialog
        onOpenChange={setShowApiKeyDialog}
        open={showApiKeyDialog}
      />
    </header>
  );
}
