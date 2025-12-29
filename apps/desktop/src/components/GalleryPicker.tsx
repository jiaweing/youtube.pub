import { Image, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useGalleryStore } from "@/stores/use-gallery-store";
import { Button } from "./ui/button";

interface GalleryPickerProps {
  onSelect: (dataUrl: string, name: string) => void;
  onClose: () => void;
}

// Individual thumbnail item that loads its own preview
function PickerThumbnail({
  id,
  name,
  previewUrl: initialPreviewUrl,
  onSelect,
}: {
  id: string;
  name: string;
  previewUrl?: string;
  onSelect: (dataUrl: string, name: string) => void;
}) {
  const loadPreviewForId = useGalleryStore((s) => s.loadPreviewForId);
  const loadFullImageForId = useGalleryStore((s) => s.loadFullImageForId);
  const cachedPreviewUrl = useGalleryStore((s) => s.previewCache.get(id));

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialPreviewUrl || cachedPreviewUrl || null
  );
  const [isLoading, setIsLoading] = useState(!previewUrl);
  const [isSelecting, setIsSelecting] = useState(false);

  // Load preview on mount
  useEffect(() => {
    if (previewUrl) {
      setIsLoading(false);
      return;
    }

    if (cachedPreviewUrl) {
      setPreviewUrl(cachedPreviewUrl);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    loadPreviewForId(id).then((url) => {
      if (!cancelled) {
        setPreviewUrl(url);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [id, previewUrl, cachedPreviewUrl, loadPreviewForId]);

  const handleClick = useCallback(async () => {
    setIsSelecting(true);
    try {
      // Load full image for the editor
      const fullUrl = await loadFullImageForId(id);
      if (fullUrl) {
        onSelect(fullUrl, name);
      }
    } finally {
      setIsSelecting(false);
    }
  }, [id, name, loadFullImageForId, onSelect]);

  return (
    <Button
      className="relative aspect-video h-auto overflow-hidden rounded-lg p-0"
      disabled={isSelecting}
      onClick={handleClick}
      variant="ghost"
    >
      {isLoading || isSelecting ? (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : previewUrl ? (
        <img
          alt={name}
          className="h-full w-full object-cover"
          src={previewUrl}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <Image className="size-6 text-muted-foreground" />
        </div>
      )}
    </Button>
  );
}

export function GalleryPicker({ onSelect, onClose }: GalleryPickerProps) {
  const thumbnails = useGalleryStore((s) => s.thumbnails);

  if (thumbnails.length === 0) {
    return (
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/60"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div
          className="w-100 rounded-xl border border-border bg-card p-6 text-center"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={() => {}}
        >
          <Image className="mx-auto size-12 text-muted-foreground opacity-50" />
          <p className="mt-4 text-muted-foreground">No images in gallery</p>
          <Button className="mt-4" onClick={onClose} variant="ghost">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="max-h-[80vh] w-150 overflow-hidden rounded-xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="border-border border-b px-5 py-4">
          <h3 className="font-semibold">Add Image from Gallery</h3>
        </div>
        <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto p-4">
          {thumbnails.map((thumb) => (
            <PickerThumbnail
              id={thumb.id}
              key={thumb.id}
              name={thumb.name}
              onSelect={onSelect}
              previewUrl={thumb.previewUrl}
            />
          ))}
        </div>
        <div className="flex justify-end border-border border-t px-5 py-4">
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
