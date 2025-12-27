import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  Copy,
  Download,
  GalleryThumbnails,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { type ThumbnailItem, useGalleryStore } from "@/stores/useGalleryStore";

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
          "@/lib/backgroundRemoval"
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
    <div className="flex-1 overflow-y-auto p-4">
      <div className={cn("grid gap-4", gridCols[viewMode])}>
        {/* Ghost add button as first item */}
        {AddImageButton}

        {thumbnails.map((thumbnail) => (
          <div
            className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-card transition-transform hover:scale-[1.02]"
            key={thumbnail.id}
            onClick={() => {
              if (processingId !== thumbnail.id) {
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
            {/* Single gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
              {processingId === thumbnail.id ? (
                <span className="absolute inset-0 flex items-center justify-center text-sm text-white">
                  Processing...
                </span>
              ) : (
                <div
                  className="absolute right-2 bottom-2 z-10 flex gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={(e) => handleRemoveBackground(e, thumbnail)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Wand2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove Background</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportClick(thumbnail);
                        }}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Download className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export</TooltipContent>
                  </Tooltip>
                  <div className="relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(
                              menuOpenId === thumbnail.id ? null : thumbnail.id
                            );
                          }}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
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
                              toast("Thumbnail duplicated");
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
                  <TooltipTrigger asChild>
                    <span className="block truncate text-sm text-white">
                      {thumbnail.name}
                    </span>
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
                        Updated:{" "}
                        {new Date(thumbnail.updatedAt).toLocaleString()}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Created:{" "}
                        {new Date(thumbnail.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        ))}
      </div>

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
                toast("Thumbnail renamed");
                setRenameDialogOpen(false);
              }
            }}
            placeholder="Enter new name"
            value={newName}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={() => {
                if (selectedThumbnail && newName.trim()) {
                  updateThumbnailName(selectedThumbnail.id, newName.trim());
                  toast("Thumbnail renamed");
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
                  toast("Thumbnail deleted");
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
