import {
  Check,
  Circle,
  Copy,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Wand2,
} from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  type ThumbnailItem,
  useGalleryStore,
} from "@/stores/use-gallery-store";
import { useSelectionStore } from "@/stores/use-selection-store";

interface ThumbnailGridItemProps {
  thumbnail: ThumbnailItem;
  onThumbnailClick: (thumbnail: ThumbnailItem) => void;
  onExportClick: (thumbnail: ThumbnailItem) => void;
  isProcessing: boolean;
  onRemoveBackground: (
    e: React.MouseEvent,
    thumbnail: ThumbnailItem
  ) => Promise<void>;
  onRename: (thumbnail: ThumbnailItem) => void;
  onDelete: (thumbnail: ThumbnailItem) => void;
}

export const ThumbnailGridItem = memo(function ThumbnailGridItem({
  thumbnail,
  onThumbnailClick,
  onExportClick,
  isProcessing,
  onRemoveBackground,
  onRename,
  onDelete,
}: ThumbnailGridItemProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const isSelectionMode = useSelectionStore((s) => s.isSelectionMode);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const toggleSelection = useSelectionStore((s) => s.toggleSelection);
  const duplicateThumbnail = useGalleryStore((s) => s.duplicateThumbnail);
  const loadPreviewForId = useGalleryStore((s) => s.loadPreviewForId);
  const previewCache = useGalleryStore((s) => s.previewCache);

  // Get preview URL from cache or thumbnail
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    thumbnail.previewUrl || previewCache.get(thumbnail.id) || null
  );
  const [isLoadingPreview, setIsLoadingPreview] = useState(!previewUrl);

  // Load preview on mount if not cached
  useEffect(() => {
    const cached = previewCache.get(thumbnail.id);
    if (cached) {
      setPreviewUrl(cached);
      setIsLoadingPreview(false);
      return;
    }

    if (thumbnail.previewUrl) {
      setPreviewUrl(thumbnail.previewUrl);
      setIsLoadingPreview(false);
      return;
    }

    // Load preview from file
    let cancelled = false;
    setIsLoadingPreview(true);

    loadPreviewForId(thumbnail.id).then((url) => {
      if (!cancelled) {
        setPreviewUrl(url);
        setIsLoadingPreview(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [thumbnail.id, thumbnail.previewUrl, previewCache, loadPreviewForId]);

  const handleClick = useCallback(() => {
    if (isProcessing) {
      return;
    }
    if (isSelectionMode) {
      toggleSelection(thumbnail.id);
    } else {
      onThumbnailClick(thumbnail);
    }
  }, [
    isProcessing,
    isSelectionMode,
    toggleSelection,
    thumbnail,
    onThumbnailClick,
  ]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-card transition-transform hover:scale-[1.02]",
            isSelectionMode &&
              selectedIds.has(thumbnail.id) &&
              "ring-2 ring-primary"
          )}
          data-thumbnail-id={thumbnail.id}
          onClick={handleClick}
          onKeyDown={() => {}}
        >
          {/* Loading state */}
          {isLoadingPreview ? (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : previewUrl ? (
            <img
              alt={thumbnail.name}
              className="h-full w-full object-cover"
              decoding="async"
              loading="lazy"
              src={previewUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <span className="text-muted-foreground text-sm">No preview</span>
            </div>
          )}
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
            {isProcessing ? (
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
                    onClick={(e) => onRemoveBackground(e, thumbnail)}
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
                          menuOpenId === thumbnail.id ? null : thumbnail.id
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
                            onRename(thumbnail);
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
                            onDelete(thumbnail);
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
                    {thumbnail.canvasWidth && thumbnail.canvasHeight && (
                      <p className="text-muted-foreground text-xs">
                        {thumbnail.canvasWidth} × {thumbnail.canvasHeight}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      Updated: {new Date(thumbnail.updatedAt).toLocaleString()}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Created: {new Date(thumbnail.createdAt).toLocaleString()}
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
        <ContextMenuItem onClick={() => onRename(thumbnail)}>
          <Pencil className="mr-2 size-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onExportClick(thumbnail)}>
          <Download className="mr-2 size-4" />
          Export
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => onRemoveBackground(e, thumbnail)}>
          <Wand2 className="mr-2 size-4" />
          Remove Background
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(thumbnail)}
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
