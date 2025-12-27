interface GalleryPickerProps {
  onSelect: (dataUrl: string, name: string) => void;
  onClose: () => void;
}

export function GalleryPicker({ onSelect, onClose }: GalleryPickerProps) {
  const thumbnails = useGalleryStore((s) => s.thumbnails);

  if (thumbnails.length === 0) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div
          className="w-[400px] rounded-xl border border-border bg-card p-6 text-center"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={() => {}}
        >
          <Image className="mx-auto size-12 text-muted-foreground opacity-50" />
          <p className="mt-4 text-muted-foreground">No images in gallery</p>
          <Button className="mt-4" onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="max-h-[80vh] w-[600px] overflow-hidden rounded-xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="border-border border-b px-5 py-4">
          <h3 className="font-semibold">Add Image from Gallery</h3>
        </div>
        <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto p-4">
          {thumbnails.map((thumb) => (
            <button
              className="aspect-video overflow-hidden rounded-lg border border-border transition-all hover:border-accent hover:ring-2 hover:ring-accent/50"
              key={thumb.id}
              onClick={() => onSelect(thumb.dataUrl, thumb.name)}
              type="button"
            >
              <img
                alt={thumb.name}
                className="h-full w-full object-cover"
                src={thumb.dataUrl}
              />
            </button>
          ))}
        </div>
        <div className="flex justify-end border-border border-t px-5 py-4">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
