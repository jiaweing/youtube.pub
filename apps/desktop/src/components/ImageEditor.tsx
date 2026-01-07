import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CarouselGeneratorDialog } from "@/components/editor/CarouselGeneratorDialog";
import { EditorFooter } from "@/components/editor/EditorFooter";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { KonvaCanvas } from "@/components/editor/KonvaCanvas";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { PageCarousel } from "@/components/editor/PageCarousel";
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
import { getGeminiApiKey } from "@/lib/gemini-store";
import { generateCarouselContent } from "@/lib/gemini-text";
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
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    reset();
    setSavedHistoryIndex(-1);
    setIsLoadingEditor(true);

    const loadProject = async () => {
      try {
        const savedData = await loadLayerDataForId(thumbnail.id);
        if (savedData && savedData.length > 0) {
          // Detect if it's new Page[] format or old Layer[] format
          const isPageFormat = "layers" in savedData[0];
          const pages = isPageFormat
            ? (savedData as unknown as any[])
            : [{ id: crypto.randomUUID(), layers: savedData }];

          const initialLayers = pages[0].layers;

          useEditorStore.setState({
            pages,
            activePageIndex: 0,
            layers: initialLayers,
            activeLayerId: initialLayers[0]?.id || null,
            canvasWidth: thumbnail.canvasWidth || 1280,
            canvasHeight: thumbnail.canvasHeight || 720,
          });
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
    if (!exportRef.current || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const previewDataUrl = exportRef.current();
      await saveProject(
        projectId,
        projectName,
        previewDataUrl,
        layers as unknown as GalleryLayer[],
        canvasSize.width,
        canvasSize.height,
        { pages: useEditorStore.getState().pages }
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
    if (!exportRef.current) {
      return;
    }
    const previewDataUrl = exportRef.current();
    const newId = await saveProject(
      null,
      `${projectName} (Copy)`,
      previewDataUrl,
      layers as unknown as GalleryLayer[],
      canvasSize.width,
      canvasSize.height,
      { pages: useEditorStore.getState().pages }
    );
    setProjectId(newId);
    setProjectName(`${projectName} (Copy)`);
    toast.success("Saved as new project");
  }, [saveProject, projectName, layers, canvasSize]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!exportRef.current) {
      return;
    }
    const previewDataUrl = exportRef.current();
    const newId = await saveProject(
      null,
      `${projectName} (Template)`,
      previewDataUrl,
      layers as unknown as GalleryLayer[],
      canvasSize.width,
      canvasSize.height,
      { isTemplate: true, pages: useEditorStore.getState().pages }
    );
    setProjectId(newId);
    setProjectName(`${projectName} (Template)`);
    toast.success("Saved as template");
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

  const handleGenerateCarousel = useCallback(
    async (
      topic: string,
      count: number,
      style: string,
      mode: "full" | "template"
    ) => {
      const apiKey = await getGeminiApiKey();
      if (!apiKey) {
        toast.error("Please set your Gemini API key in Settings");
        return;
      }

      setIsProcessing(true);
      const toastId = toast.loading("Generating carousel with Gemini AI...");

      try {
        const slides = await generateCarouselContent(
          apiKey,
          topic,
          count,
          style
        );

        const state = useEditorStore.getState();
        const isPage0Empty =
          state.pages.length === 1 &&
          (state.pages[0].layers.length === 0 ||
            (state.pages[0].layers.length === 1 &&
              state.pages[0].layers[0].name === "Background Layer"));

        for (let i = 0; i < slides.length; i++) {
          const slide = slides[i];
          if (i === 0 && isPage0Empty) {
            // Reuse page 0
          } else {
            useEditorStore.getState().addPage();
          }

          // Background Logic
          const currentLayers = useEditorStore.getState().layers;
          const bgLayer = currentLayers.find(
            (l) => l.name === "Background Layer"
          );

          if (bgLayer) {
            if (mode === "full") {
              useEditorStore.getState().updateLayer(bgLayer.id, {
                fill: slide.backgroundColor || "#ffffff",
                width: canvasSize.width,
                height: canvasSize.height,
              });
            }
          } else {
            useEditorStore.getState().addShapeLayer("rect");
            const newBgId = useEditorStore.getState().activeLayerId;
            if (newBgId) {
              useEditorStore.getState().updateLayer(newBgId, {
                x: 0,
                y: 0,
                width: canvasSize.width,
                height: canvasSize.height,
                fill:
                  mode === "full"
                    ? slide.backgroundColor || "#ffffff"
                    : "#ffffff",
                name: "Background Layer",
                locked: true,
              });
            }
          }

          // Title
          useEditorStore.getState().addTextLayer(slide.title);
          const titleId = useEditorStore.getState().activeLayerId;
          if (titleId) {
            useEditorStore.getState().updateLayer(titleId, {
              x: 50,
              y: 100,
              fontSize: 64,
              fontStyle: "bold",
              fill: slide.textColor || "#1f2937",
              width: canvasSize.width - 100,
              name: "Title",
            });
          }

          // Subtitle / Content
          useEditorStore.getState().addTextLayer(slide.content);
          const contentId = useEditorStore.getState().activeLayerId;
          if (contentId) {
            useEditorStore.getState().updateLayer(contentId, {
              x: 50,
              y: 200,
              fontSize: 32,
              fill: slide.textColor || "#374151",
              width: canvasSize.width - 100,
              name: "Content",
            });
          }
        }

        // Go back to first page
        useEditorStore.getState().setActivePage(0);

        toast.success("AI Carousel generated!", { id: toastId });
      } catch (error) {
        console.error("Carousel generation failed:", error);
        toast.error("Failed to generate carousel. Check console for details.", {
          id: toastId,
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [canvasSize]
  );
  const [showCarouselGenerator, setShowCarouselGenerator] = useState(false);

  const handleAddIcon = useCallback((dataUrl: string) => {
    useEditorStore.getState().addImageLayer(dataUrl);
    const id = useEditorStore.getState().activeLayerId;
    if (id) {
      useEditorStore.getState().updateLayer(id, { name: "Icon" });
    }
  }, []);

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
          onAddIcon={handleAddIcon}
          onAddImage={() => setShowGalleryPicker(true)}
          onAiGenerate={() => {
            const activeLayer = layers.find((l) => l.id === activeLayerId);
            if (activeLayer?.type === "image") {
              const imgLayer = activeLayer as ImageLayer;
              onAiGenerate(imgLayer.dataUrl);
            }
          }}
          onGenerateCarousel={() => setShowCarouselGenerator(true)}
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
            <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
              <PageCarousel />
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
            onSaveAsTemplate={handleSaveAsTemplate}
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

      <CarouselGeneratorDialog
        onGenerate={handleGenerateCarousel}
        onOpenChange={setShowCarouselGenerator}
        open={showCarouselGenerator}
      />

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
