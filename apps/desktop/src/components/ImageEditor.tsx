import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Download,
  Link2,
  Link2Off,
  Minus,
  Plus,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { KonvaCanvas } from "@/components/editor/KonvaCanvas";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { GalleryPicker } from "@/components/GalleryPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizablePanel } from "@/components/ui/resizable-panel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VerticalResizablePanel } from "@/components/ui/vertical-resizable-panel";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<(() => string) | null>(null);
  const initializedRef = useRef(false);
  const [projectId, setProjectId] = useState<string | null>(thumbnail.id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showCanvasSizeDialog, setShowCanvasSizeDialog] = useState(false);
  const [canvasSize, setCanvasSize] = useState({
    width: thumbnail.canvasWidth || 1280,
    height: thumbnail.canvasHeight || 720,
  });
  const [tempCanvasSize, setTempCanvasSize] = useState(canvasSize);
  const [keepAspectRatio, setKeepAspectRatio] = useState(false);
  const aspectRatio = canvasSize.width / canvasSize.height;
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const saveProject = useGalleryStore((s) => s.saveProject);
  const updateThumbnailName = useGalleryStore((s) => s.updateThumbnailName);
  const [projectName, setProjectName] = useState(thumbnail.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const {
    layers,
    activeLayerId,
    addImageLayer,
    setCanvasSize: setStoreCanvasSize,
    reset,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorStore();
  // Initialize - load from layerData if exists, otherwise from image
  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    reset();
    if (thumbnail.layerData) {
      // Load existing project
      try {
        const savedLayers = JSON.parse(thumbnail.layerData);
        for (const layer of savedLayers) {
          useEditorStore.setState((state) => ({
            layers: [...state.layers, layer],
          }));
        }
        if (savedLayers.length > 0) {
          useEditorStore.setState({ activeLayerId: savedLayers[0].id });
        }
        setCanvasSize({
          width: thumbnail.canvasWidth || 1280,
          height: thumbnail.canvasHeight || 720,
        });
        setStoreCanvasSize(
          thumbnail.canvasWidth || 1280,
          thumbnail.canvasHeight || 720
        );
      } catch (error) {
        console.error("Failed to load project data:", error);
      }
    } else {
      // Create new project from image
      const img = new window.Image();
      img.onload = () => {
        console.log(
          "[ImageEditor] Image loaded:",
          img.naturalWidth,
          "x",
          img.naturalHeight
        );
        // Use naturalWidth/Height to get actual pixel dimensions
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        addImageLayer(thumbnail.dataUrl, w, h);
        setCanvasSize({ width: w, height: h });
        setStoreCanvasSize(w, h);
      };
      img.src = thumbnail.dataUrl;
    }
  }, [thumbnail, addImageLayer, reset, setStoreCanvasSize]);
  // Calculate fit scale
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const padding = 60;
        const newFitScale = Math.min(
          (width - padding * 2) / canvasSize.width,
          (height - padding * 2) / canvasSize.height,
          1
        );
        setFitScale(newFitScale);
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [canvasSize]);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.1, Math.min(5, prev + delta)));
    }
  }, []);
  const handleZoomIn = () => setZoom((prev) => Math.min(5, prev + 0.25));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.1, prev - 0.25));
  const handleZoomFit = () => setZoom(1);
  const handleAddFromGallery = useCallback(
    (dataUrl: string) => {
      const img = new window.Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxSize = Math.min(canvasSize.width, canvasSize.height) * 0.4;
        if (w > maxSize || h > maxSize) {
          const scale = Math.min(maxSize / w, maxSize / h);
          w *= scale;
          h *= scale;
        }
        addImageLayer(dataUrl, w, h);
      };
      img.src = dataUrl;
      setShowGalleryPicker(false);
    },
    [addImageLayer, canvasSize]
  );
  const handleRemoveBackground = useCallback(async () => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || activeLayer.type !== "image") {
      return;
    }
    setIsProcessing(true);
    try {
      const { removeBackgroundAsync } = await import("@/lib/backgroundRemoval");
      const resultDataUrl = await removeBackgroundAsync(activeLayer.dataUrl);
      const img = new window.Image();
      img.onload = () => addImageLayer(resultDataUrl, img.width, img.height);
      img.src = resultDataUrl;
    } catch (error) {
      console.error("Background removal failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [activeLayerId, layers, addImageLayer]);
  const handleSave = useCallback(async () => {
    if (!exportRef.current) {
      return;
    }
    setShowSaveMenu(false);
    try {
      const previewDataUrl = exportRef.current();
      await saveProject(
        projectId,
        projectName,
        previewDataUrl,
        layers,
        canvasSize.width,
        canvasSize.height
      );
      toast("Project saved");
    } catch (error) {
      console.error("Save failed:", error);
      toast("Failed to save");
    }
  }, [saveProject, projectId, projectName, layers, canvasSize]);
  const handleSaveAsNew = useCallback(async () => {
    if (!exportRef.current) {
      return;
    }
    setShowSaveMenu(false);
    const previewDataUrl = exportRef.current();
    const newId = await saveProject(
      null, // Pass null to create a new entry
      `${projectName} (Copy)`,
      previewDataUrl,
      layers,
      canvasSize.width,
      canvasSize.height
    );
    setProjectId(newId);
    setProjectName(`${projectName} (Copy)`);
    toast("Saved as new project");
  }, [saveProject, projectName, layers, canvasSize]);
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s") {
          e.preventDefault();
          handleSave();
        } else if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, undo, redo]);
  const effectiveScale = fitScale * zoom;
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header - minimal */}
      <div
        className="flex shrink-0 items-center gap-3 border-border border-b px-3 py-2"
        data-tauri-drag-region
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="relative z-[101]"
              onClick={onClose}
              size="icon-sm"
              variant="ghost"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to Gallery</TooltipContent>
        </Tooltip>
        {isEditingName ? (
          <input
            className="relative z-[101] max-w-[200px] border-none bg-transparent text-sm outline-none"
            defaultValue={projectName}
            onBlur={(e) => {
              setProjectName(e.target.value);
              setIsEditingName(false);
              if (projectId) {
                updateThumbnailName(projectId, e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setIsEditingName(false);
              }
            }}
            ref={nameInputRef}
          />
        ) : (
          <span
            className="relative z-[101] cursor-text truncate text-muted-foreground text-sm hover:text-foreground"
            onClick={() => {
              setIsEditingName(true);
              setTimeout(() => nameInputRef.current?.focus(), 0);
            }}
            onKeyDown={() => {}}
          >
            {projectName}
          </span>
        )}
      </div>
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <EditorToolbar
          isProcessing={isProcessing}
          onAddImage={() => setShowGalleryPicker(true)}
          onRemoveBackground={handleRemoveBackground}
        />
        {/* Canvas container */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            className="relative flex flex-1 items-center justify-center overflow-auto bg-neutral-900"
            onWheel={handleWheel}
            ref={containerRef}
          >
            <div
              style={{
                transform: `scale(${effectiveScale})`,
                transformOrigin: "center",
              }}
            >
              <KonvaCanvas
                height={canvasSize.height}
                onExportRef={exportRef}
                width={canvasSize.width}
              />
            </div>
          </div>
          {/* Footer controls */}
          <div className="flex shrink-0 items-center justify-between border-border border-t bg-background px-3 py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="cursor-pointer text-muted-foreground text-xs hover:text-foreground"
                  onClick={() => setShowCanvasSizeDialog(true)}
                  type="button"
                >
                  {isProcessing
                    ? "Processing..."
                    : `${canvasSize.width} × ${canvasSize.height}`}
                </button>
              </TooltipTrigger>
              <TooltipContent>Change Canvas Size</TooltipContent>
            </Tooltip>
            <Dialog
              onOpenChange={(open) => {
                setShowCanvasSizeDialog(open);
                if (open) {
                  setTempCanvasSize(canvasSize);
                }
              }}
              open={showCanvasSizeDialog}
            >
              <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                  <DialogTitle>Change Canvas Size</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label
                        className="mb-1.5 block text-xs"
                        htmlFor="canvas-width"
                      >
                        Width
                      </Label>
                      <Input
                        id="canvas-width"
                        max={7680}
                        min={1}
                        onChange={(e) => {
                          const newWidth = Number(e.target.value);
                          if (keepAspectRatio) {
                            const newHeight = Math.round(
                              newWidth / aspectRatio
                            );
                            setTempCanvasSize({
                              width: newWidth,
                              height: newHeight,
                            });
                          } else {
                            setTempCanvasSize((prev) => ({
                              ...prev,
                              width: newWidth,
                            }));
                          }
                        }}
                        type="number"
                        value={tempCanvasSize.width}
                      />
                    </div>
                    <div className="flex-1">
                      <Label
                        className="mb-1.5 block text-xs"
                        htmlFor="canvas-height"
                      >
                        Height
                      </Label>
                      <Input
                        id="canvas-height"
                        max={7680}
                        min={1}
                        onChange={(e) => {
                          const newHeight = Number(e.target.value);
                          if (keepAspectRatio) {
                            const newWidth = Math.round(
                              newHeight * aspectRatio
                            );
                            setTempCanvasSize({
                              width: newWidth,
                              height: newHeight,
                            });
                          } else {
                            setTempCanvasSize((prev) => ({
                              ...prev,
                              height: newHeight,
                            }));
                          }
                        }}
                        type="number"
                        value={tempCanvasSize.height}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={keepAspectRatio}
                      id="keep-aspect-ratio"
                      onCheckedChange={(checked) =>
                        setKeepAspectRatio(checked === true)
                      }
                    />
                    <Label
                      className="flex cursor-pointer items-center gap-1.5 text-xs"
                      htmlFor="keep-aspect-ratio"
                    >
                      {keepAspectRatio ? (
                        <Link2 className="size-3.5" />
                      ) : (
                        <Link2Off className="size-3.5 text-muted-foreground" />
                      )}
                      Keep aspect ratio
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => setShowCanvasSizeDialog(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setCanvasSize(tempCanvasSize);
                      setStoreCanvasSize(
                        tempCanvasSize.width,
                        tempCanvasSize.height
                      );
                      setShowCanvasSizeDialog(false);
                      toast.success(
                        `Canvas resized to ${tempCanvasSize.width} × ${tempCanvasSize.height}`
                      );
                    }}
                  >
                    Apply
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!canUndo()}
                    onClick={undo}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Undo2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={!canRedo()}
                    onClick={redo}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Redo2 className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>
            </div>
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 rounded-md px-0.5">
              <Button onClick={handleZoomOut} size="icon-sm" variant="ghost">
                <Minus className="size-3" />
              </Button>
              <Button
                className="min-w-12 text-xs"
                onClick={handleZoomFit}
                size="sm"
                variant="ghost"
              >
                {Math.round(zoom * 100)}%
              </Button>
              <Button onClick={handleZoomIn} size="icon-sm" variant="ghost">
                <Plus className="size-3" />
              </Button>
            </div>
            {/* Save/Export */}
            <div className="flex gap-2">
              <Button onClick={onExport} size="sm" variant="ghost">
                <Download className="mr-1 size-4" />
                Export
              </Button>
              <div className="relative">
                <Button
                  className="gap-1"
                  onClick={() => setShowSaveMenu(!showSaveMenu)}
                  size="sm"
                >
                  <Save className="size-4" />
                  Save
                  <ChevronDown className="size-3" />
                </Button>
                {showSaveMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSaveMenu(false)}
                      onKeyDown={() => {}}
                    />
                    <div className="absolute right-0 bottom-full z-50 mb-2 w-40 rounded-lg border border-border bg-card p-1 shadow-lg">
                      <Button
                        className="w-full justify-start"
                        onClick={handleSave}
                        size="sm"
                        variant="ghost"
                      >
                        <Save className="mr-2 size-4" />
                        Save
                      </Button>
                      <Button
                        className="w-full justify-start"
                        onClick={handleSaveAsNew}
                        size="sm"
                        variant="ghost"
                      >
                        <Copy className="mr-2 size-4" />
                        Save as New
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Right panels - combined column */}
        <ResizablePanel
          defaultWidth={260}
          maxWidth={360}
          minWidth={180}
          side="right"
        >
          <VerticalResizablePanel
            bottomPanel={<PropertiesPanel />}
            defaultTopHeight={45}
            maxTopHeight={70}
            minTopHeight={25}
            topPanel={<LayersPanel />}
          />
        </ResizablePanel>
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
