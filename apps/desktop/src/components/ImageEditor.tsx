import { Download, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { LayersPanel } from "@/components/editor/LayersPanel";
import {
  type DragMode,
  getHandlePositions,
  hitTestHandle,
  hitTestLayer,
  type ResizeHandle,
} from "@/components/editor/useCanvasInteraction";
import { GalleryPicker } from "@/components/GalleryPicker";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/stores/useEditorStore";
import { type ThumbnailItem, useGalleryStore } from "@/stores/useGalleryStore";

interface ImageEditorProps {
  thumbnail: ThumbnailItem;
  onClose: () => void;
  onExport: () => void;
}

const HANDLE_SIZE = 8;

export function ImageEditor({
  thumbnail,
  onClose,
  onExport,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);

  // Drag state
  const [dragMode, setDragMode] = useState<DragMode>("none");
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layerStart, setLayerStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const addThumbnail = useGalleryStore((s) => s.addThumbnail);
  const {
    layers,
    activeLayerId,
    activeTool,
    addImageLayer,
    addTextLayer,
    updateLayer,
    setActiveLayer,
    setActiveTool,
    reset,
  } = useEditorStore();

  // Initialize with the base image
  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    reset();
    const img = new Image();
    img.onload = () => addImageLayer(thumbnail.dataUrl, img.width, img.height);
    img.src = thumbnail.dataUrl;
  }, [thumbnail.dataUrl, addImageLayer, reset]);

  // Calculate canvas scale
  useEffect(() => {
    const container = containerRef.current;
    const baseLayer = layers.find((l) => l.type === "image");
    if (!(container && baseLayer)) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const padding = 40;
    const scale = Math.min(
      (rect.width - padding * 2) / baseLayer.width,
      (rect.height - padding * 2) / baseLayer.height,
      1
    );
    setCanvasScale(scale);
  }, [layers]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const baseLayer = layers.find((l) => l.type === "image");
    if (baseLayer) {
      canvas.width = baseLayer.width;
      canvas.height = baseLayer.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw layers
    for (const layer of layers) {
      if (!layer.visible) {
        continue;
      }
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

    // Draw selection
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (activeLayer && activeTool === "select") {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        activeLayer.x,
        activeLayer.y,
        activeLayer.width,
        activeLayer.height
      );

      ctx.fillStyle = "#3b82f6";
      for (const h of Object.values(getHandlePositions(activeLayer))) {
        ctx.fillRect(
          h.x - HANDLE_SIZE / 2,
          h.y - HANDLE_SIZE / 2,
          HANDLE_SIZE,
          HANDLE_SIZE
        );
      }
    }
  }, [layers, activeLayerId, activeTool]);

  const screenToCanvas = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / canvasScale,
      y: (clientY - rect.top) / canvasScale,
    };
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "select") {
        return;
      }
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const activeLayer = layers.find((l) => l.id === activeLayerId);

      if (activeLayer) {
        const handle = hitTestHandle(activeLayer, x, y, canvasScale);
        if (handle) {
          setDragMode("resize");
          setResizeHandle(handle);
          setDragStart({ x, y });
          setLayerStart({
            x: activeLayer.x,
            y: activeLayer.y,
            w: activeLayer.width,
            h: activeLayer.height,
          });
          return;
        }
      }

      const hitLayer = hitTestLayer(layers, x, y);
      if (hitLayer) {
        setActiveLayer(hitLayer.id);
        setDragMode("move");
        setDragStart({ x, y });
        setLayerStart({
          x: hitLayer.x,
          y: hitLayer.y,
          w: hitLayer.width,
          h: hitLayer.height,
        });
      } else {
        setActiveLayer(null);
      }
    },
    [
      activeTool,
      layers,
      activeLayerId,
      setActiveLayer,
      canvasScale,
      screenToCanvas,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragMode === "none" || !activeLayerId) {
        return;
      }
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      if (dragMode === "move") {
        updateLayer(activeLayerId, {
          x: layerStart.x + dx,
          y: layerStart.y + dy,
        });
      } else if (dragMode === "resize" && resizeHandle) {
        let {
          x: newX,
          y: newY,
          w: newW,
          h: newH,
        } = {
          x: layerStart.x,
          y: layerStart.y,
          w: layerStart.w,
          h: layerStart.h,
        };
        if (resizeHandle.includes("w")) {
          newX += dx;
          newW -= dx;
        }
        if (resizeHandle.includes("e")) {
          newW += dx;
        }
        if (resizeHandle.includes("n")) {
          newY += dy;
          newH -= dy;
        }
        if (resizeHandle.includes("s")) {
          newH += dy;
        }
        if (newW > 20 && newH > 20) {
          updateLayer(activeLayerId, {
            x: newX,
            y: newY,
            width: newW,
            height: newH,
          });
        }
      }
    },
    [
      dragMode,
      activeLayerId,
      dragStart,
      layerStart,
      resizeHandle,
      updateLayer,
      screenToCanvas,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setDragMode("none");
    setResizeHandle(null);
  }, []);

  const handleAddFromGallery = useCallback(
    (dataUrl: string) => {
      const img = new Image();
      img.onload = () => {
        const baseLayer = layers[0];
        let w = img.width,
          h = img.height;
        if (baseLayer) {
          const scale = Math.min(
            (baseLayer.width * 0.5) / w,
            (baseLayer.height * 0.5) / h,
            1
          );
          w *= scale;
          h *= scale;
        }
        addImageLayer(dataUrl, w, h);
      };
      img.src = dataUrl;
      setShowGalleryPicker(false);
    },
    [addImageLayer, layers]
  );

  const handleRemoveBackground = useCallback(async () => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== "image" || !activeLayer.dataUrl) {
      return;
    }

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
      const img = new Image();
      img.onload = () => addImageLayer(dataUrl, img.width, img.height);
      img.src = dataUrl;
    } catch (error) {
      console.error("Background removal failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [activeLayerId, layers, addImageLayer]);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    addThumbnail(canvas.toDataURL("image/png"), `${thumbnail.name} (edited)`);
    onClose();
  }, [addThumbnail, thumbnail.name, onClose]);

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-3 px-4 py-3"
        data-tauri-drag-region
      >
        <Button onClick={onClose} size="sm" variant="ghost">
          <X className="mr-1 size-4" /> Back
        </Button>
        <span className="text-muted-foreground text-sm">{thumbnail.name}</span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <EditorToolbar
          activeLayer={activeLayer}
          activeTool={activeTool}
          isProcessing={isProcessing}
          onAddImage={() => setShowGalleryPicker(true)}
          onAddText={() => {
            addTextLayer("Your Text");
            setActiveTool("text");
          }}
          onRemoveBackground={handleRemoveBackground}
          onSelectTool={() => setActiveTool("select")}
        />

        {/* Canvas */}
        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden bg-black/50"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          ref={containerRef}
        >
          <canvas
            className="rounded shadow-lg"
            ref={canvasRef}
            style={{
              transform: `scale(${canvasScale})`,
              transformOrigin: "center",
              cursor:
                dragMode === "move"
                  ? "grabbing"
                  : dragMode === "resize"
                    ? "nwse-resize"
                    : "default",
            }}
          />
        </div>

        <LayersPanel activeLayer={activeLayer} />
      </div>

      {/* Footer */}
      <div className="flex shrink-0 justify-between px-4 py-3">
        <div className="text-muted-foreground text-sm">
          {isProcessing && "Processing..."}
        </div>
        <div className="flex gap-3">
          <Button onClick={onExport} variant="outline">
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button onClick={handleSave}>Save to Gallery</Button>
        </div>
      </div>

      {showGalleryPicker && (
        <GalleryPicker
          onClose={() => setShowGalleryPicker(false)}
          onSelect={handleAddFromGallery}
        />
      )}
    </div>
  );
}
