import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  Trash2,
  Unlock,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/useEditorStore";

export function LayersPanel() {
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
    <div className="flex w-full shrink-0 flex-col border-border border-l bg-background">
      <div className="flex items-center justify-between border-border border-b px-3 py-2.5">
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
                "flex cursor-pointer items-center gap-1 border-border border-b px-2 py-1.5 text-xs transition-colors",
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
              <GripVertical className="size-3 shrink-0 cursor-grab text-muted-foreground" />

              {/* Visibility */}
              <Button
                className="size-6"
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, { visible: !layer.visible });
                }}
                size="icon-sm"
                variant="ghost"
              >
                {layer.visible ? (
                  <Eye className="size-3" />
                ) : (
                  <EyeOff className="size-3" />
                )}
              </Button>

              {/* Lock */}
              <Button
                className="size-6"
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, { locked: !layer.locked });
                }}
                size="icon-sm"
                variant="ghost"
              >
                {layer.locked ? (
                  <Lock className="size-3" />
                ) : (
                  <Unlock className="size-3" />
                )}
              </Button>

              {/* Name */}
              <span className="flex-1 truncate">{layer.name}</span>

              {/* Move buttons */}
              <div className="flex shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="size-6"
                      disabled={realIdx === layers.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, "up");
                      }}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <ChevronUp className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move up</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="size-6"
                      disabled={realIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(layer.id, "down");
                      }}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <ChevronDown className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move down</TooltipContent>
                </Tooltip>
              </div>

              {/* Delete */}
              {layers.length > 1 && (
                <Button
                  className="size-6 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLayer(layer.id);
                  }}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
