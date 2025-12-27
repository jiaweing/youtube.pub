import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { type Layer, useEditorStore } from "@/stores/useEditorStore";

interface LayersPanelProps {
  activeLayer: Layer | undefined;
}

export function LayersPanel({ activeLayer }: LayersPanelProps) {
  const {
    layers,
    activeLayerId,
    updateLayer,
    removeLayer,
    setActiveLayer,
    moveLayer,
    reorderLayers,
  } = useEditorStore();

  const [dragLayerIdx, setDragLayerIdx] = useState<number | null>(null);

  const handleLayerDragStart = (idx: number) => {
    setDragLayerIdx(idx);
  };

  const handleLayerDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragLayerIdx !== null && dragLayerIdx !== idx) {
      reorderLayers(dragLayerIdx, idx);
      setDragLayerIdx(idx);
    }
  };

  const handleLayerDragEnd = () => {
    setDragLayerIdx(null);
  };

  return (
    <div className="flex w-56 shrink-0 flex-col border-border border-l bg-muted/30">
      <div className="flex items-center justify-between border-border border-b px-4 py-3">
        <span className="font-semibold text-muted-foreground text-xs uppercase">
          Layers
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {[...layers].reverse().map((layer, displayIdx) => {
          const realIdx = layers.length - 1 - displayIdx;
          return (
            <div
              className={cn(
                "flex cursor-pointer items-center gap-2 border-border border-b px-3 py-2.5 transition-colors",
                activeLayerId === layer.id
                  ? "bg-accent/20"
                  : "hover:bg-muted/50"
              )}
              draggable
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              onDragEnd={handleLayerDragEnd}
              onDragOver={(e) => handleLayerDragOver(e, realIdx)}
              onDragStart={() => handleLayerDragStart(realIdx)}
              onKeyDown={(e) => e.key === "Enter" && setActiveLayer(layer.id)}
              role="button"
              tabIndex={0}
            >
              <GripVertical className="size-3.5 cursor-grab text-muted-foreground" />
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
              <div className="flex gap-0.5">
                <button
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={realIdx === layers.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, "up");
                  }}
                  title="Move up"
                  type="button"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={realIdx === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, "down");
                  }}
                  title="Move down"
                  type="button"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
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
          );
        })}
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
  );
}
