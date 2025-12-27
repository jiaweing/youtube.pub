interface EditorToolbarProps {
  activeTool: "select" | "text";
  activeLayer: Layer | undefined;
  isProcessing: boolean;
  onSelectTool: () => void;
  onAddText: () => void;
  onAddImage: () => void;
  onRemoveBackground: () => void;
}

export function EditorToolbar({
  activeTool,
  activeLayer,
  isProcessing,
  onSelectTool,
  onAddText,
  onAddImage,
  onRemoveBackground,
}: EditorToolbarProps) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-border border-r bg-muted/30 py-2">
      <Button
        onClick={onSelectTool}
        size="icon-sm"
        title="Select"
        variant={activeTool === "select" ? "secondary" : "ghost"}
      >
        <MousePointer className="size-4" />
      </Button>
      <Button
        onClick={onAddText}
        size="icon-sm"
        title="Add Text"
        variant={activeTool === "text" ? "secondary" : "ghost"}
      >
        <Type className="size-4" />
      </Button>
      <Button
        onClick={onAddImage}
        size="icon-sm"
        title="Add Image"
        variant="ghost"
      >
        <ImageIcon className="size-4" />
      </Button>
      <div className="my-2 h-px w-8 bg-border" />
      <Button
        disabled={!activeLayer || activeLayer.type !== "image" || isProcessing}
        onClick={onRemoveBackground}
        size="icon-sm"
        title="Remove Background"
        variant="ghost"
      >
        <Wand2 className="size-4" />
      </Button>
    </div>
  );
}
