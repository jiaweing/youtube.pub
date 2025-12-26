import {
  Download,
  Eye,
  EyeOff,
  MousePointer,
  Trash2,
  Type,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/useEditorStore";
import { type ThumbnailItem, useGalleryStore } from "@/stores/useGalleryStore";

interface ImageEditorProps {
  thumbnail: ThumbnailItem;
  onClose: () => void;
  onExport: () => void;
}

export function ImageEditor({
  thumbnail,
  onClose,
  onExport,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initializedRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);
  const {
    layers,
    activeLayerId,
    activeTool,
    addImageLayer,
    addTextLayer,
    removeLayer,
    updateLayer,
    setActiveLayer,
    setActiveTool,
    reset,
  } = useEditorStore();

  // Initialize with the base image (only once)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    reset();
    const img = new Image();
    img.onload = () => {
      addImageLayer(thumbnail.dataUrl, img.width, img.height);
    };
    img.src = thumbnail.dataUrl;
  }, [thumbnail.dataUrl, addImageLayer, reset]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Find base layer dimensions
    const baseLayer = layers.find((l) => l.type === "image");
    if (baseLayer) {
      canvas.width = baseLayer.width;
      canvas.height = baseLayer.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw layers in order
    for (const layer of layers) {
      if (!layer.visible) continue;

      if (layer.type === "image" && layer.dataUrl) {
        const img = new Image();
        img.src = layer.dataUrl;
        ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
      } else if (layer.type === "text" && layer.text) {
        ctx.font = `${layer.fontSize || 48}px ${layer.fontFamily || "Inter"}`;
        ctx.fillStyle = layer.color || "#ffffff";
        ctx.fillText(layer.text, layer.x, layer.y + (layer.fontSize || 48));
      }
    }
  }, [layers]);

  const handleAddText = useCallback(() => {
    addTextLayer("Your Text");
    setActiveTool("text");
  }, [addTextLayer, setActiveTool]);

  const handleRemoveBackground = useCallback(async () => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== "image" || !activeLayer.dataUrl)
      return;

    setIsProcessing(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await fetch(activeLayer.dataUrl).then((r) => r.blob());
      const resultBlob = await removeBackground(blob);
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(resultBlob);
      });

      // Add as new layer above current
      const img = new Image();
      img.onload = () => {
        addImageLayer(dataUrl, img.width, img.height);
      };
      img.src = dataUrl;
    } catch (error) {
      console.error("Background removal failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [activeLayerId, layers, addImageLayer]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    addThumbnail(dataUrl, `${thumbnail.name} (edited)`);
    onClose();
  }, [addThumbnail, thumbnail.name, onClose]);

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="flex h-[700px] max-h-[90vh] w-[1000px] max-w-[95vw] flex-col overflow-hidden rounded-xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-border border-b px-5 py-4">
          <h2 className="font-semibold text-lg">Edit Thumbnail</h2>
          <Button onClick={onClose} size="icon-sm" variant="ghost">
            <X className="size-4" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-border border-r bg-muted/30 py-2">
            <Button
              onClick={() => setActiveTool("select")}
              size="icon-sm"
              title="Select"
              variant={activeTool === "select" ? "secondary" : "ghost"}
            >
              <MousePointer className="size-4" />
            </Button>
            <Button
              onClick={handleAddText}
              size="icon-sm"
              title="Add Text"
              variant={activeTool === "text" ? "secondary" : "ghost"}
            >
              <Type className="size-4" />
            </Button>
            <div className="my-2 h-px w-8 bg-border" />
            <Button
              disabled={
                !activeLayer || activeLayer.type !== "image" || isProcessing
              }
              onClick={handleRemoveBackground}
              size="icon-sm"
              title="Remove Background"
              variant="ghost"
            >
              <Wand2 className="size-4" />
            </Button>
          </div>

          {/* Canvas area */}
          <div className="flex flex-1 items-center justify-center overflow-hidden bg-black/50 p-4">
            <canvas
              className="max-h-full max-w-full rounded-lg shadow-lg"
              ref={canvasRef}
            />
          </div>

          {/* Layers panel */}
          <div className="flex w-56 shrink-0 flex-col border-border border-l bg-muted/30">
            <div className="flex items-center justify-between border-border border-b px-4 py-3">
              <span className="font-semibold text-muted-foreground text-xs uppercase">
                Layers
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {[...layers].reverse().map((layer) => (
                <div
                  className={cn(
                    "flex cursor-pointer items-center gap-3 border-border border-b px-4 py-2.5 transition-colors",
                    activeLayerId === layer.id
                      ? "bg-accent/20"
                      : "hover:bg-muted/50"
                  )}
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setActiveLayer(layer.id)
                  }
                  role="button"
                  tabIndex={0}
                >
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateLayer(layer.id, { visible: !layer.visible });
                    }}
                    type="button"
                  >
                    {layer.visible ? (
                      <Eye className="size-3.5" />
                    ) : (
                      <EyeOff className="size-3.5" />
                    )}
                  </button>
                  <span className="flex-1 truncate text-sm">{layer.name}</span>
                  {layers.length > 1 && (
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.id);
                      }}
                      type="button"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Text properties */}
            {activeLayer?.type === "text" && (
              <div className="border-border border-t p-4">
                <label className="mb-2 block">
                  <span className="text-muted-foreground text-xs">Text</span>
                  <input
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    onChange={(e) =>
                      updateLayer(activeLayer.id, { text: e.target.value })
                    }
                    type="text"
                    value={activeLayer.text || ""}
                  />
                </label>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="text-muted-foreground text-xs">Size</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      onChange={(e) =>
                        updateLayer(activeLayer.id, {
                          fontSize: Number(e.target.value),
                        })
                      }
                      type="number"
                      value={activeLayer.fontSize || 48}
                    />
                  </label>
                  <label className="w-12">
                    <span className="text-muted-foreground text-xs">Color</span>
                    <input
                      className="mt-1 h-9 w-full cursor-pointer rounded-md border border-border p-1"
                      onChange={(e) =>
                        updateLayer(activeLayer.id, { color: e.target.value })
                      }
                      type="color"
                      value={activeLayer.color || "#ffffff"}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-between border-border border-t px-5 py-4">
          <div className="text-muted-foreground text-sm">
            {isProcessing && "Processing..."}
          </div>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button onClick={onExport} variant="outline">
              <Download className="mr-2 size-4" />
              Export
            </Button>
            <Button onClick={handleSave}>Save to Gallery</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
