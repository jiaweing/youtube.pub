import { Download, Image, Pencil, Wand2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { ViewMode } from "@/App";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ThumbnailItem, useGalleryStore } from "@/stores/useGalleryStore";

interface GalleryProps {
  viewMode: ViewMode;
  thumbnails: ThumbnailItem[];
  onThumbnailClick: (thumbnail: ThumbnailItem) => void;
  onExportClick: (thumbnail: ThumbnailItem) => void;
}

export function Gallery({
  viewMode,
  thumbnails,
  onThumbnailClick,
  onExportClick,
}: GalleryProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);

  const gridCols = {
    "3": "grid-cols-3",
    "4": "grid-cols-4",
    "5": "grid-cols-5",
    row: "grid-cols-1",
  };

  const handleRemoveBackground = useCallback(
    async (e: React.MouseEvent, thumbnail: ThumbnailItem) => {
      e.stopPropagation();
      setProcessingId(thumbnail.id);

      try {
        const { removeBackground } = await import("@imgly/background-removal");
        const blob = await fetch(thumbnail.dataUrl).then((r) => r.blob());
        const resultBlob = await removeBackground(blob);
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(resultBlob);
        });
        addThumbnail(dataUrl, `${thumbnail.name} (no bg)`);
      } catch (error) {
        console.error("Background removal failed:", error);
      } finally {
        setProcessingId(null);
      }
    },
    [addThumbnail]
  );

  if (thumbnails.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
        <Image className="size-16 opacity-40" />
        <div className="text-center">
          <p className="text-lg">No thumbnails yet</p>
          <p className="mt-1 text-sm">
            Click + to add images or extract frames
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className={cn("grid gap-4", gridCols[viewMode])}>
        {thumbnails.map((thumbnail) => (
          <div
            className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-card transition-transform hover:scale-[1.02]"
            key={thumbnail.id}
          >
            <img
              alt={thumbnail.name}
              className="h-full w-full object-cover"
              src={thumbnail.dataUrl}
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              {processingId === thumbnail.id ? (
                <span className="text-sm text-white">Processing...</span>
              ) : (
                <>
                  <Button
                    onClick={() => onThumbnailClick(thumbnail)}
                    size="icon-sm"
                    title="Edit"
                    variant="secondary"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    onClick={(e) => handleRemoveBackground(e, thumbnail)}
                    size="icon-sm"
                    title="Remove Background"
                    variant="secondary"
                  >
                    <Wand2 className="size-4" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportClick(thumbnail);
                    }}
                    size="icon-sm"
                    title="Export"
                    variant="secondary"
                  >
                    <Download className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
