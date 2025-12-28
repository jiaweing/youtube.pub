import {
  Circle,
  ImageDown,
  ImagePlus,
  MousePointer,
  RectangleHorizontal,
  Redo2,
  Sparkles,
  Type,
  Undo2,
  Wand2,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorStore } from "@/stores/use-editor-store";

interface EditorToolbarProps {
  isProcessing: boolean;
  onRemoveBackground: () => void;
  onAddImage: () => void;
  onAiGenerate: () => void;
  onSaveLayerAsImage: () => void;
}

export function EditorToolbar({
  isProcessing,
  onRemoveBackground,
  onAddImage,
  onAiGenerate,
  onSaveLayerAsImage,
}: EditorToolbarProps) {
  const {
    activeTool,
    activeLayerId,
    layers,
    canvasWidth,
    canvasHeight,
    setActiveTool,
    addTextLayer,
    addShapeLayer,
    updateLayer,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const canRemoveBg = activeLayer?.type === "image" && !isProcessing;
  const canAiGenerate = activeLayer?.type === "image" && !isProcessing;

  const handleAddText = () => {
    addTextLayer("Your Text");
    const newLayerId = useEditorStore.getState().activeLayerId;
    if (newLayerId) {
      updateLayer(newLayerId, {
        x: canvasWidth / 2 - 100,
        y: canvasHeight / 2 - 24,
      });
    }
    setActiveTool("select");
  };

  const handleAddShape = (shapeType: "rect" | "ellipse") => {
    addShapeLayer(shapeType);
    const newLayerId = useEditorStore.getState().activeLayerId;
    if (newLayerId) {
      updateLayer(newLayerId, {
        x: canvasWidth / 2 - 100,
        y: canvasHeight / 2 - 75,
      });
    }
    setActiveTool("select");
  };

  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-border border-r bg-background py-2">
      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({
            size: "icon-sm",
            variant: activeTool === "select" ? "secondary" : "ghost",
          })}
          onClick={() => setActiveTool("select")}
        >
          <MousePointer className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Select (V)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          onClick={handleAddText}
        >
          <Type className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Add Text</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          onClick={() => handleAddShape("rect")}
        >
          <RectangleHorizontal className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Add Rectangle</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          onClick={() => handleAddShape("ellipse")}
        >
          <Circle className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Add Ellipse</TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-8 bg-border" />

      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          onClick={onAddImage}
        >
          <ImagePlus className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Add Image</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          disabled={!canRemoveBg}
          onClick={onRemoveBackground}
        >
          <Wand2 className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Remove Background</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          disabled={!canAiGenerate}
          onClick={onAiGenerate}
        >
          <Sparkles className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Generate Image</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          disabled={!activeLayer || activeLayer.type !== "image"}
          onClick={onSaveLayerAsImage}
        >
          <ImageDown className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Save Layer as Image</TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-8 bg-border" />

      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          disabled={!canUndo()}
          onClick={undo}
        >
          <Undo2 className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Undo (Ctrl+Z)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          disabled={!canRedo()}
          onClick={redo}
        >
          <Redo2 className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Redo (Ctrl+Y)</TooltipContent>
      </Tooltip>
    </div>
  );
}
