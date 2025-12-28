import {
  Circle,
  ImagePlus,
  MousePointer,
  RectangleHorizontal,
  Type,
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
}

export function EditorToolbar({
  isProcessing,
  onRemoveBackground,
  onAddImage,
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
  } = useEditorStore();

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const canRemoveBg = activeLayer?.type === "image" && !isProcessing;

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
          disabled={!canRemoveBg}
          onClick={onRemoveBackground}
        >
          <Wand2 className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Remove Background</TooltipContent>
      </Tooltip>
    </div>
  );
}
