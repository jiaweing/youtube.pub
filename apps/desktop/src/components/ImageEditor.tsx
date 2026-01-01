import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EditorFooter } from "@/components/editor/EditorFooter";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { KonvaCanvas } from "@/components/editor/KonvaCanvas";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { GalleryPicker } from "@/components/GalleryPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ResizablePanel } from "@/components/ui/resizable-panel";
import { VerticalResizablePanel } from "@/components/ui/vertical-resizable-panel";
import type { ImageLayer } from "@/stores/use-editor-store";
import { useEditorStore } from "@/stores/use-editor-store";
import {
  type Layer as GalleryLayer,
  type ThumbnailItem,
  useGalleryStore,
} from "@/stores/use-gallery-store";

interface ImageEditorProps {
  thumbnail: ThumbnailItem;
  onClose: () => void;
  onExport: () => void;
  onAiGenerate: (imageDataUrl: string) => void;
}

export function ImageEditor({
  thumbnail,
  onClose,
  onExport,
  onAiGenerate,
}: ImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<(() => string) | null>(null);
  const initializedRef = useRef(false);
  const [projectId, setProjectId] = useState<string | null>(thumbnail.id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [savedHistoryIndex, setSavedHistoryIndex] = useState(-1);
  const [canvasSize, setCanvasSize] = useState({
    width: thumbnail.canvasWidth || 1280,
    height: thumbnail.canvasHeight || 720,
  });
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const saveProject = useGalleryStore((s) => s.saveProject);
  const updateThumbnailName = useGalleryStore((s) => s.updateThumbnailName);
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);
  const [projectName, setProjectName] = useState(thumbnail.name);
  const {
    layers,
    activeLayerId,
    addImageLayer,
    setCanvasSize: setStoreCanvasSize,
    reset,
    undo,
    redo,
    historyIndex,
  } = useEditorStore();

  const hasUnsavedChanges = historyIndex !== savedHistoryIndex;

  const loadFullImageForId = useGalleryStore((s) => s.loadFullImageForId);
  const loadLayerDataForId = useGalleryStore((s) => s.loadLayerDataForId);

  const [, setIsLoadingEditor] = useState(true);

  // Initialize - load from files
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    reset();
    setSavedHistoryIndex(-1);
    setIsLoadingEditor(true);

    const loadProject = async () => {
      try {
        const savedLayers = await loadLayerDataForId(thumbnail.id);
        if (savedLayers && savedLayers.length > 0) {
          for (const layer of savedLayers) {
            useEditorStore.setState((state) => ({
              layers: [...state.layers, layer as unknown as ImageLayer],
            }));
          }
          useEditorStore.setState({ activeLayerId: savedLayers[0].id });
          setCanvasSize({
            width: thumbnail.canvasWidth || 1280,
            height: thumbnail.canvasHeight || 720,
          });
          setStoreCanvasSize(
            thumbnail.canvasWidth || 1280,
            thumbnail.canvasHeight || 720
          );
        } else {
          const fullImageUrl = await loadFullImageForId(thumbnail.id);
          if (!fullImageUrl) {
            console.error("[ImageEditor] Failed to load full image");
            setIsLoadingEditor(false);
            return;
          }
          const img = new window.Image();
          img.onload = () => {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            addImageLayer(fullImageUrl, w, h);
            setCanvasSize({ width: w, height: h });
            setStoreCanvasSize(w, h);
            setSavedHistoryIndex(useEditorStore.getState().historyIndex);
            setIsLoadingEditor(false);
          };
          img.onerror = () => {
            console.error("[ImageEditor] Failed to load image");
            setIsLoadingEditor(false);
          };
          img.src = fullImageUrl;
          return;
        }
      } catch (error) {
        console.error("[ImageEditor] Failed to load project:", error);
      }
      setIsLoadingEditor(false);
    };

    loadProject();
  }, [
    thumbnail.id,
    thumbnail.canvasWidth,
    thumbnail.canvasHeight,
    addImageLayer,
    reset,
    setStoreCanvasSize,
    loadFullImageForId,
    loadLayerDataForId,
  ]);

  // Calculate fit scale
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
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
    if (!activeLayer || activeLayer.type !== "image") return;
    setIsProcessing(true);
    const toastId = toast.loading("Removing background...");
    try {
      const { removeBackgroundAsync } = await import(
        "@/lib/background-removal"
      );
      const resultDataUrl = await removeBackgroundAsync(activeLayer.dataUrl);
      const img = new window.Image();
      img.onload = () => addImageLayer(resultDataUrl, img.width, img.height);
      img.src = resultDataUrl;
      toast.success("Background removed", { id: toastId });
    } catch (error) {
      console.error("Background removal failed:", error);
      toast.error("Failed to remove background", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  }, [activeLayerId, layers, addImageLayer]);

  const handleSave = useCallback(async () => {
    if (!exportRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const previewDataUrl = exportRef.current();
      await saveProject(
        projectId,
        projectName,
        previewDataUrl,
        layers as unknown as GalleryLayer[],
        canvasSize.width,
        canvasSize.height
      );
      toast.success("Project saved");
      setSavedHistoryIndex(useEditorStore.getState().historyIndex);
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [saveProject, projectId, projectName, layers, canvasSize, isSaving]);

  const handleSaveAsNew = useCallback(async () => {
    if (!exportRef.current) return;
    const previewDataUrl = exportRef.current();
    const newId = await saveProject(
      null,
      `${projectName} (Copy)`,
      previewDataUrl,
      layers as unknown as GalleryLayer[],
      canvasSize.width,
      canvasSize.height
    );
    setProjectId(newId);
    setProjectName(`${projectName} (Copy)`);
    toast.success("Saved as new project");
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

  const handleNameChange = useCallback(
    (name: string) => {
      setProjectName(name);
      if (projectId) {
        updateThumbnailName(projectId, name);
      }
    },
    [projectId, updateThumbnailName]
  );

  const handleCanvasSizeChange = useCallback(
    (size: { width: number; height: number }) => {
      setCanvasSize(size);
      setStoreCanvasSize(size.width, size.height);
    },
    [setStoreCanvasSize]
  );

  const effectiveScale = fitScale * zoom;

  return (
    <div className="flex h-full flex-col bg-background">
      <EditorHeader
        hasUnsavedChanges={hasUnsavedChanges}
        onClose={onClose}
        onNameChange={handleNameChange}
        onShowConfirmClose={() => setShowConfirmClose(true)}
        projectName={projectName}
      />

      <div className="flex flex-1 overflow-hidden">
        <EditorToolbar
          isProcessing={isProcessing}
          onAddImage={() => setShowGalleryPicker(true)}
          onAiGenerate={() => {
            const activeLayer = layers.find((l) => l.id === activeLayerId);
            if (activeLayer?.type === "image") {
              const imgLayer = activeLayer as ImageLayer;
              onAiGenerate(imgLayer.dataUrl);
            }
          }}
          onRemoveBackground={handleRemoveBackground}
          onSaveLayerAsImage={() => {
            const activeLayer = layers.find((l) => l.id === activeLayerId);
            if (activeLayer?.type === "image") {
              const imgLayer = activeLayer as ImageLayer;
              addThumbnail(imgLayer.dataUrl, `${imgLayer.name} (Saved)`);
              toast.success("Layer saved as new thumbnail");
            }
          }}
        />

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

          <EditorFooter
            canvasSize={canvasSize}
            hasUnsavedChanges={hasUnsavedChanges}
            isSaving={isSaving}
            onCanvasSizeChange={handleCanvasSizeChange}
            onExport={onExport}
            onSave={handleSave}
            onSaveAsNew={handleSaveAsNew}
            onZoomFit={handleZoomFit}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            zoom={zoom}
          />
        </div>

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

      <AlertDialog onOpenChange={setShowConfirmClose} open={showConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your
              changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmClose(false);
                onClose();
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
