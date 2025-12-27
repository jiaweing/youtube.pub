import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ThumbnailItem } from "@/stores/useGalleryStore";

interface ExportDialogProps {
  thumbnail: ThumbnailItem;
  onClose: () => void;
}

type ImageFormat = "png" | "jpeg" | "webp";
type Resolution = "original" | "1920x1080" | "1280x720" | "854x480" | "custom";

const RESOLUTIONS: { value: Resolution; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "1920x1080", label: "1920 × 1080 (1080p)" },
  { value: "1280x720", label: "1280 × 720 (720p)" },
  { value: "854x480", label: "854 × 480 (480p)" },
  { value: "custom", label: "Custom" },
];

const FORMATS: { value: ImageFormat; label: string; mime: string }[] = [
  { value: "png", label: "PNG", mime: "image/png" },
  { value: "jpeg", label: "JPEG", mime: "image/jpeg" },
  { value: "webp", label: "WebP", mime: "image/webp" },
];

export function ExportDialog({ thumbnail, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ImageFormat>("png");
  const [resolution, setResolution] = useState<Resolution>("original");
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [quality, setQuality] = useState(90);
  const [isExporting, setIsExporting] = useState(false);

  const originalDimensions = useMemo(() => {
    const img = new Image();
    img.src = thumbnail.dataUrl;
    return { width: img.width || 1920, height: img.height || 1080 };
  }, [thumbnail.dataUrl]);

  const getFinalDimensions = useCallback(() => {
    if (resolution === "original") {
      return originalDimensions;
    }
    if (resolution === "custom") {
      return { width: customWidth, height: customHeight };
    }
    const [w, h] = resolution.split("x").map(Number);
    return { width: w, height: h };
  }, [resolution, customWidth, customHeight, originalDimensions]);

  const handleExport = useCallback(async () => {
    const formatInfo = FORMATS.find((f) => f.value === format)!;
    const dims = getFinalDimensions();

    const filePath = await save({
      defaultPath: `${thumbnail.name}.${format}`,
      filters: [{ name: formatInfo.label, extensions: [format] }],
    });

    if (!filePath) {
      return;
    }

    setIsExporting(true);

    try {
      // Create canvas and draw image at target resolution
      const canvas = document.createElement("canvas");
      canvas.width = dims.width;
      canvas.height = dims.height;
      const ctx = canvas.getContext("2d")!;

      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = thumbnail.dataUrl;
      });

      ctx.drawImage(img, 0, 0, dims.width, dims.height);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b!),
          formatInfo.mime,
          format === "png" ? undefined : quality / 100
        );
      });

      // Write to file
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));

      onClose();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [format, getFinalDimensions, quality, thumbnail, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="w-[400px] rounded-xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="flex items-center justify-between border-border border-b px-5 py-4">
          <h2 className="font-semibold text-lg">Export Image</h2>
          <Button onClick={onClose} size="icon-sm" variant="ghost">
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          {/* Preview */}
          <div className="aspect-video overflow-hidden rounded-lg bg-black">
            <img
              alt={thumbnail.name}
              className="h-full w-full object-contain"
              src={thumbnail.dataUrl}
            />
          </div>

          {/* Format */}
          <div>
            <label className="mb-2 block font-medium text-sm">Format</label>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <Button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  size="sm"
                  variant={format === f.value ? "secondary" : "outline"}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="mb-2 block font-medium text-sm">Resolution</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              onChange={(e) => setResolution(e.target.value as Resolution)}
              value={resolution}
            >
              {RESOLUTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Resolution */}
          {resolution === "custom" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-muted-foreground text-xs">
                  Width
                </label>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  type="number"
                  value={customWidth}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-muted-foreground text-xs">
                  Height
                </label>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  type="number"
                  value={customHeight}
                />
              </div>
            </div>
          )}

          {/* Quality (for JPEG/WebP) */}
          {format !== "png" && (
            <div>
              <label className="mb-2 flex justify-between font-medium text-sm">
                <span>Quality</span>
                <span className="text-muted-foreground">{quality}%</span>
              </label>
              <input
                className="w-full"
                max={100}
                min={10}
                onChange={(e) => setQuality(Number(e.target.value))}
                type="range"
                value={quality}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-border border-t px-5 py-4">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={isExporting} onClick={handleExport}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>
    </div>
  );
}
