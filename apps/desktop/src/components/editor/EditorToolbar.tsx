import {
  Bot,
  Circle,
  ImageDown,
  ImagePlus,
  MousePointer,
  RectangleHorizontal,
  Redo2,
  Smile,
  Sparkles,
  Type,
  Undo2,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorStore } from "@/stores/use-editor-store";
import { IconPicker } from "./IconPicker";

interface EditorToolbarProps {
  isProcessing: boolean;
  onRemoveBackground: () => void;
  onAddImage: () => void;
  onAiGenerate: () => void;
  onSaveLayerAsImage: () => void;
  onGenerateCarousel: () => void;
  onAddIcon: (dataUrl: string) => void;
}

export function EditorToolbar({
  isProcessing,
  onRemoveBackground,
  onAddImage,
  onAiGenerate,
  onSaveLayerAsImage,
  onGenerateCarousel,
  onAddIcon,
}: EditorToolbarProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);
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
          aria-label="Select Tool"
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
          aria-label="Add Text"
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          onClick={handleAddText}
        >
          <Type className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Add Text</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          aria-label="Add Rectangle"
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          onClick={() => handleAddShape("rect")}
        >
          <RectangleHorizontal className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Add Rectangle</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          aria-label="Add Ellipse"
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
          onClick={() => setShowIconPicker(true)}
        >
          <Smile className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Icon Picker</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              className="disabled:opacity-100"
              disabled={!activeLayer || activeLayer.type !== "image"}
              onClick={onSaveLayerAsImage}
              size="icon-sm"
              variant="ghost"
            >
              <ImageDown className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          Save Layer as Image{" "}
          {(!activeLayer || activeLayer.type !== "image") && "(Select Image)"}
        </TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-8 bg-border" />

      <Tooltip>
        <TooltipTrigger
          className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
          onClick={onGenerateCarousel}
        >
          <Bot className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">Generate Carousel</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              className="disabled:opacity-100"
              disabled={!canRemoveBg}
              onClick={onRemoveBackground}
              size="icon-sm"
              variant="ghost"
            >
              <Wand2 className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          Remove Background{" "}
          {(!activeLayer || activeLayer.type !== "image") && "(Select Image)"}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              className="disabled:opacity-100"
              disabled={!canAiGenerate}
              onClick={onAiGenerate}
              size="icon-sm"
              variant="ghost"
            >
              <Sparkles className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          Generate Image{" "}
          {(!activeLayer || activeLayer.type !== "image") && "(Select Image)"}
        </TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-8 bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              disabled={!canUndo()}
              onClick={undo}
              size="icon-sm"
              variant="ghost"
            >
              <Undo2 className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">Undo (Ctrl+Z)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              disabled={!canRedo()}
              onClick={redo}
              size="icon-sm"
              variant="ghost"
            >
              <Redo2 className="size-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">Redo (Ctrl+Y)</TooltipContent>
      </Tooltip>
      <IconPicker
        onOpenChange={setShowIconPicker}
        onSelect={onAddIcon}
        open={showIconPicker}
      />
    </div>
  );
}
