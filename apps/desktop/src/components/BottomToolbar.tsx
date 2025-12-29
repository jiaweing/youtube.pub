import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  ArrowDownAZ,
  ArrowUpZA,
  Calendar,
  ChevronDown,
  Clock,
  Copy,
  Grid2X2,
  Grid3X3,
  Image,
  Key,
  List,
  Plus,
  Trash2,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ViewMode } from "@/App";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
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
import { type SortField, useGalleryStore } from "@/stores/use-gallery-store";
import { useSelectionStore } from "@/stores/use-selection-store";

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddVideoClick: () => void;
}

const viewModeIcons: Record<ViewMode, React.ReactNode> = {
  "3": <Grid3X3 className="size-4" />,
  "4": <Grid2X2 className="size-4" />,
  "5": <Grid2X2 className="size-3" />,
  row: <List className="size-4" />,
};

const viewModeTitles: Record<ViewMode, string> = {
  "3": "3×3 Grid",
  "4": "4×4 Grid",
  "5": "5×5 Grid",
  row: "List View",
};

const sortOptions: {
  field: SortField;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    field: "updatedAt",
    label: "Last Edited",
    icon: <Clock className="size-3" />,
  },
  {
    field: "createdAt",
    label: "Date Added",
    icon: <Calendar className="size-3" />,
  },
  { field: "name", label: "Name", icon: <ArrowDownAZ className="size-3" /> },
];

export function BottomToolbar({
  viewMode,
  onViewModeChange,
  onAddVideoClick,
}: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);
  const sortField = useGalleryStore((s) => s.sortField);
  const sortOrder = useGalleryStore((s) => s.sortOrder);
  const setSortField = useGalleryStore((s) => s.setSortField);
  const setSortOrder = useGalleryStore((s) => s.setSortOrder);
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleBulkDuplicate = useCallback(async () => {
    const ids = Array.from(selectedIds);
    await duplicateThumbnailsBatch(ids);
    toast.success(`Duplicated ${ids.length} items`);
    clearSelection();
  }, [selectedIds, duplicateThumbnailsBatch, clearSelection]);

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await deleteThumbnailsBatch(ids);
    toast.success(`Deleted ${ids.length} items`);
    setDeleteDialogOpen(false);
    clearSelection();
  };

  const handleBulkRemoveBackground = useCallback(() => {
    const itemsToProcess = thumbnails
      .filter((t) => selectedIds.has(t.id))
      .map((t) => ({
        thumbnailId: t.id,
        name: t.name,
        dataUrl: t.dataUrl,
      }));

    addToQueue(itemsToProcess);
    toast.success(`Added ${itemsToProcess.length} items to processing queue`);
    clearSelection();
  }, [thumbnails, selectedIds, addToQueue, clearSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if we have a selection OR if we are handling global shortcuts like Ctrl+A/Esc
      // if (selectedIds.size === 0) return; // Removed this check to allow Ctrl+A/Esc to work without prior selection

      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Delete: Del or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setDeleteDialogOpen(true);
      }

      // Duplicate: Ctrl+D or Ctrl+J
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "j")) {
        e.preventDefault();
        handleBulkDuplicate();
      }

      // Remove Background: Ctrl+B
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        handleBulkRemoveBackground();
      }

      // Select All: Ctrl+A
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        if (!isSelectionMode) {
          useSelectionStore.getState().toggleSelectionMode();
        }
        selectAll(thumbnails.map((t) => t.id));
      }

      // Escape: Unselect All or Exit Mode
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

  const currentSortOption = sortOptions.find((o) => o.field === sortField);

  const handleAddImage = useCallback(async () => {
    setShowMenu(false);
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

  const handleAddVideo = useCallback(() => {
    setShowMenu(false);
    onAddVideoClick();
  }, [onAddVideoClick]);

  return (
    <header className="flex h-12 items-center justify-between bg-background px-4">
      {isSelectionMode && selectedIds.size > 0 ? (
        <div className="flex flex-1 items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={clearSelection}
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
          <Button onClick={handleBulkDuplicate} size="sm" variant="ghost">
            <Copy className="mr-2 size-4" />
            Duplicate
          </Button>
          <Button
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
          <Button
            onClick={handleBulkRemoveBackground}
            size="sm"
            variant="ghost"
          >
            <Wand2 className="mr-2 size-4" />
            Remove BG
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* View mode buttons */}
          <div className="flex gap-1">
            {(["3", "4", "5", "row"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                size="icon-sm"
                title={viewModeTitles[mode]}
                variant={viewMode === mode ? "secondary" : "ghost"}
              >
                {viewModeIcons[mode]}
              </Button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <Button
              className="gap-1"
              onClick={() => setShowSortMenu(!showSortMenu)}
              size="sm"
              variant="ghost"
            >
              {currentSortOption?.icon}
              <span className="text-xs">{currentSortOption?.label}</span>
              {sortOrder === "desc" ? (
                <ArrowDownAZ className="size-3 text-muted-foreground" />
              ) : (
                <ArrowUpZA className="size-3 text-muted-foreground" />
              )}
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSortMenu(false)}
                  onKeyDown={() => {}}
                />
                <div className="absolute bottom-full left-0 z-50 mb-2 w-44 rounded-lg border border-border bg-card p-1 shadow-lg">
                  {sortOptions.map((opt) => (
                    <Button
                      className="w-full justify-start"
                      key={opt.field}
                      onClick={() => {
                        setSortField(opt.field);
                        setShowSortMenu(false);
                      }}
                      size="sm"
                      variant={sortField === opt.field ? "secondary" : "ghost"}
                    >
                      {opt.icon}
                      <span className="ml-2">{opt.label}</span>
                    </Button>
                  ))}
                  <div className="my-1 h-px bg-border" />
                  <Button
                    className="w-full justify-start"
                    onClick={() => {
                      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                      setShowSortMenu(false);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {sortOrder === "desc" ? (
                      <>
                        <ArrowUpZA className="size-3" />
                        <span className="ml-2">Oldest First / A→Z</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownAZ className="size-3" />
                        <span className="ml-2">Newest First / Z→A</span>
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Right side buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={toggleSelectionMode}
          size="sm"
          variant={isSelectionMode ? "secondary" : "ghost"}
        >
          {isSelectionMode ? "Cancel" : "Select"}
        </Button>

        {/* API Key Button */}
        {(!isSelectionMode || selectedIds.size === 0) && (
          <Button
            aria-label="Gemini API Key"
            onClick={() => setShowApiKeyDialog(true)}
            size="icon-sm"
            title="Gemini API Key"
            variant="ghost"
          >
            <Key className="size-4" />
          </Button>
        )}

        {/* Add button - hide in selection mode if items selected to reduce clutter? Or keep? Keeping it for now but maybe disable if confusing. */}
        {(!isSelectionMode || selectedIds.size === 0) && (
          <div className="relative">
            <Button
              aria-label="Add"
              onClick={() => setShowMenu(!showMenu)}
              size="icon-sm"
            >
              <Plus className="size-4" />
            </Button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                  onKeyDown={() => {}}
                />
                <div className="absolute right-0 bottom-full z-50 mb-2 w-40 rounded-lg border border-border bg-card p-1 shadow-lg">
                  <Button
                    className="w-full justify-start"
                    onClick={handleAddImage}
                    size="sm"
                    variant="ghost"
                  >
                    <Image className="mr-2 size-4" />
                    Add Image
                  </Button>
                  <Button
                    className="w-full justify-start"
                    onClick={handleAddVideo}
                    size="sm"
                    variant="ghost"
                  >
                    <Video className="mr-2 size-4" />
                    Upload Video
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} items?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected thumbnails.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Delete
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
