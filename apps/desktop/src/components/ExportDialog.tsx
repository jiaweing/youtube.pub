import { open, save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { renderLayersToCanvas } from "@/lib/canvas-renderer";
import { cn } from "@/lib/utils";
import {
  type ThumbnailItem,
  useGalleryStore,
} from "@/stores/use-gallery-store";

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

const parsePageRange = (input: string, totalPages: number): number[] => {
  const indices = new Set<number>();
  const parts = input.split(",");

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = Number.parseInt(startStr, 10);
      const end = Number.parseInt(endStr, 10);

      if (!(isNaN(start) || isNaN(end))) {
        const s = Math.max(1, Math.min(start, end));
        const e = Math.min(totalPages, Math.max(start, end));

        for (let i = s; i <= e; i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const page = Number.parseInt(trimmed, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        indices.add(page - 1);
      }
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
};

const formatPageSelection = (indices: number[]): string => {
  if (indices.length === 0) return "";
  // Simple comma separated list for now
  return indices.map((i) => i + 1).join(", ");
};

export function ExportDialog({ thumbnail, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ImageFormat>("png");
  const [resolution, setResolution] = useState<Resolution>("original");
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [quality, setQuality] = useState(90);
  const [isExporting, setIsExporting] = useState(false);

  // Load full image from file storage
  const loadFullImageForId = useGalleryStore((s) => s.loadFullImageForId);
  const loadLayerDataForId = useGalleryStore((s) => s.loadLayerDataForId);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<any[] | null>(null);

  // Selection state
  const [exportScope, setExportScope] = useState<"current" | "all" | "custom">(
    "all"
  );
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [customRange, setCustomRange] = useState("");

  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [originalDimensions, setOriginalDimensions] = useState({
    width: 1920,
    height: 1080,
  });

  // Load the full image on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoadingImage(true);

    loadFullImageForId(thumbnail.id).then((url) => {
      if (cancelled || !url) {
        setIsLoadingImage(false);
        return;
      }

      // Get dimensions from the loaded image
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          setFullImageUrl(url);
          setOriginalDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
          setIsLoadingImage(false);
        }
      };
      img.src = url;
    });

    loadLayerDataForId(thumbnail.id).then((data) => {
      if (cancelled || !data) return;
      if (data.length > 0 && "layers" in data[0]) {
        setPages(data);
        // Default to all pages
        const allIndices = data.map((_, i) => i);
        setSelectedIndices(allIndices);
        setCustomRange(formatPageSelection(allIndices));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [thumbnail.id, loadFullImageForId]);

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
    if (!fullImageUrl) {
      return;
    }

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
        img.src = fullImageUrl;
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
  }, [format, getFinalDimensions, quality, thumbnail, onClose, fullImageUrl]);

  const handleExportBatch = useCallback(async () => {
    if (!pages || pages.length === 0) return;

    let indicesToExport: number[] = [];
    if (exportScope === "all") {
      indicesToExport = pages.map((_, i) => i);
    } else if (exportScope === "custom") {
      indicesToExport = selectedIndices;
    } else if (exportScope === "current") {
      // For current, we conceptually export just 1 page (index 0 for now as we don't track active page in gallery view)
      // Usage of handleExportBatch for "current" is debatable unless we want consistent rendering logic.
      // But preserving old logic for 'current' (single file) is better handled by handleExport mostly.
      // Only use this batch logic if we are exporting > 1 file.
      indicesToExport = [0];
    }

    if (indicesToExport.length === 0) {
      toast.error("No pages selected");
      return;
    }

    // If only 1 page is selected, treat it as a single file export (ask for filename)
    // unless the scope is explicitly 'all'/'custom' and user expects batch?
    // Actually, consistency: if 'Current' -> Single file.
    // If 'All'/'Custom' -> Batch export (even if 1 page? Maybe single file is better UX for 1 page).

    const isSingleFile = indicesToExport.length === 1;

    setIsExporting(true);
    try {
      let exportPath = "";
      let dirPath = "";
      const formatInfo = FORMATS.find((f) => f.value === format)!;
      const dims = getFinalDimensions();

      if (isSingleFile) {
        const pageIndex = indicesToExport[0];
        const defaultName = `${thumbnail.name}${pages.length > 1 ? `_page_${pageIndex + 1}` : ""}.${format}`;

        const saveResult = await save({
          defaultPath: defaultName,
          filters: [{ name: formatInfo.label, extensions: [format] }],
        });

        if (!saveResult) {
          setIsExporting(false);
          return;
        }
        exportPath = saveResult;
      } else {
        const dirResult = await open({
          directory: true,
          title: "Select Export Directory",
        });

        if (!dirResult || typeof dirResult !== "string") {
          setIsExporting(false);
          return;
        }
        dirPath = dirResult;
      }

      const canvas = document.createElement("canvas");
      canvas.width = dims.width;
      canvas.height = dims.height;

      const toastId = isSingleFile
        ? toast.loading("Exporting...")
        : toast.loading(`Exporting ${indicesToExport.length} slides...`);

      for (let i = 0; i < indicesToExport.length; i++) {
        const pageIndex = indicesToExport[i];
        const page = pages[pageIndex];

        if (!isSingleFile) {
          toast.loading(`Exporting slide ${pageIndex + 1}...`, {
            id: toastId,
          });
        }

        await renderLayersToCanvas(
          page.layers,
          dims.width,
          dims.height,
          canvas
        );

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b!),
            formatInfo.mime,
            format === "png" ? undefined : quality / 100
          );
        });

        const arrayBuffer = await blob.arrayBuffer();

        let filePath = exportPath;
        if (!isSingleFile) {
          const fileName = `${thumbnail.name}_page_${String(pageIndex + 1).padStart(2, "0")}.${format}`;
          filePath = `${dirPath.replace(/[\\/]$/, "")}/${fileName}`;
        }

        await writeFile(filePath, new Uint8Array(arrayBuffer));
      }

      toast.success(
        isSingleFile
          ? "Export successful"
          : `Successfully exported ${indicesToExport.length} slides`,
        {
          id: toastId,
        }
      );
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Check console.");
    } finally {
      setIsExporting(false);
    }
  }, [
    pages,
    format,
    getFinalDimensions,
    quality,
    onClose,
    exportScope,
    selectedIndices,
    thumbnail.name,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="w-100 rounded-xl border border-border bg-card"
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
          <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-black">
            {isLoadingImage ? (
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            ) : fullImageUrl ? (
              <img
                alt={thumbnail.name}
                className="h-full w-full object-contain"
                src={fullImageUrl}
              />
            ) : (
              <span className="text-muted-foreground text-sm">
                Failed to load image
              </span>
            )}
          </div>

          {/* Pages Info & Selection */}
          {pages && pages.length > 1 && (
            <div className="space-y-3 rounded-lg bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">Export Scope</h3>
                  <p className="text-muted-foreground text-xs">
                    {pages.length} slides detected
                  </p>
                </div>
              </div>

              <RadioGroup
                className="grid grid-cols-3 gap-2"
                onValueChange={(v: "current" | "all" | "custom") => {
                  setExportScope(v);
                  if (v === "all") {
                    // Reset custom selection to all for visual consistency if they switch back
                    const all = pages.map((_, i) => i);
                    setSelectedIndices(all);
                    setCustomRange(formatPageSelection(all));
                  }
                }}
                value={exportScope}
              >
                <div className="flex items-center space-x-2 rounded-md border border-input bg-background/50 p-2 hover:bg-muted">
                  <RadioGroupItem id="scope-current" value="current" />
                  <Label
                    className="cursor-pointer font-normal text-xs"
                    htmlFor="scope-current"
                  >
                    Current (Cover)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border border-input bg-background/50 p-2 hover:bg-muted">
                  <RadioGroupItem id="scope-all" value="all" />
                  <Label
                    className="cursor-pointer font-normal text-xs"
                    htmlFor="scope-all"
                  >
                    All Slides
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border border-input bg-background/50 p-2 hover:bg-muted">
                  <RadioGroupItem id="scope-custom" value="custom" />
                  <Label
                    className="cursor-pointer font-normal text-xs"
                    htmlFor="scope-custom"
                  >
                    Custom Range
                  </Label>
                </div>
              </RadioGroup>

              {exportScope === "custom" && (
                <div className="fade-in slide-in-from-top-2 animate-in space-y-3 pt-2 duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Page Range</Label>
                    <Input
                      className="h-8 bg-background"
                      onChange={(e) => {
                        setCustomRange(e.target.value);
                        setSelectedIndices(
                          parsePageRange(e.target.value, pages.length)
                        );
                      }}
                      placeholder="e.g. 1-3, 5, 8"
                      value={customRange}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Enter page numbers separated by commas (e.g. "1, 3, 5") or
                      ranges (e.g. "1-5")
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Select Pages</Label>
                    <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background/30 p-2">
                      {pages.map((_, i) => (
                        <div
                          className={cn(
                            "flex size-6 cursor-pointer items-center justify-center rounded text-xs transition-colors",
                            selectedIndices.includes(i)
                              ? "bg-primary font-medium text-primary-foreground shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                          key={i}
                          onClick={() => {
                            const newSet = new Set(selectedIndices);
                            if (newSet.has(i)) {
                              newSet.delete(i);
                            } else {
                              newSet.add(i);
                            }
                            const newIndices = Array.from(newSet).sort(
                              (a, b) => a - b
                            );
                            setSelectedIndices(newIndices);
                            setCustomRange(formatPageSelection(newIndices));
                          }}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={
              isExporting ||
              isLoadingImage ||
              !fullImageUrl ||
              (exportScope === "custom" && selectedIndices.length === 0)
            }
            onClick={
              exportScope === "current" && (!pages || pages.length <= 1)
                ? handleExport
                : handleExportBatch
            }
          >
            {isExporting
              ? "Exporting..."
              : exportScope === "current"
                ? "Export"
                : `Export (${exportScope === "all" ? pages?.length || 1 : selectedIndices.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
