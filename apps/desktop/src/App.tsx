import { useState } from "react";
import { BackgroundRemovalQueue } from "@/components/BackgroundRemovalQueue";
import { BottomToolbar } from "@/components/BottomToolbar";
import { ExportDialog } from "@/components/ExportDialog";
import { Gallery } from "@/components/Gallery";
import { GeminiImagePage } from "@/components/GeminiImagePage";
import { ImageEditor } from "@/components/ImageEditor";
import { TitleBar } from "@/components/TitleBar";
import { TrashPage } from "@/components/TrashPage";
import { Toaster } from "@/components/ui/sonner";
import { VideoExtractor } from "@/components/VideoExtractor";
import { useEditorStore } from "@/stores/use-editor-store";
import type { ThumbnailItem } from "@/stores/use-gallery-store";

export type ViewMode = "3" | "4" | "5" | "row";
type Page = "gallery" | "editor" | "ai-generate" | "trash";

export default function App() {
  const [page, setPage] = useState<Page>("gallery");
  const [viewMode, setViewMode] = useState<ViewMode>("4");
  const [showExtractor, setShowExtractor] = useState(false);
  const [editingThumbnail, setEditingThumbnail] =
    useState<ThumbnailItem | null>(null);
  const [exportingThumbnail, setExportingThumbnail] =
    useState<ThumbnailItem | null>(null);
  const [aiInputImage, setAiInputImage] = useState<string | null>(null);

  const handleEditThumbnail = (thumbnail: ThumbnailItem) => {
    setEditingThumbnail(thumbnail);
    setPage("editor");
  };

  const handleCloseEditor = () => {
    setEditingThumbnail(null);
    setPage("gallery");
  };

  const handleOpenAiGenerate = (imageDataUrl: string) => {
    setAiInputImage(imageDataUrl);
    setPage("ai-generate");
  };

  const handleCloseAiGenerate = () => {
    setAiInputImage(null);
    setPage("editor");
  };

  const handleSaveAiLayer = (dataUrl: string) => {
    const img = new window.Image();
    img.onload = () => {
      useEditorStore.getState().addImageLayer(dataUrl, img.width, img.height);
    };
    img.src = dataUrl;
  };

  const handleSaveAiImage = async (dataUrl: string) => {
    const { addThumbnail } = await import("@/stores/use-gallery-store").then(
      (m) => m.useGalleryStore.getState()
    );
    await addThumbnail(dataUrl, "AI Generated");
  };

  // AI Generate page
  if (page === "ai-generate" && aiInputImage) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <GeminiImagePage
          inputImageDataUrl={aiInputImage}
          onClose={handleCloseAiGenerate}
          onSaveAsImage={handleSaveAiImage}
          onSaveAsLayer={handleSaveAiLayer}
        />
        <Toaster />
      </div>
    );
  }

  // Editor page
  if (page === "editor" && editingThumbnail) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <ImageEditor
          onAiGenerate={handleOpenAiGenerate}
          onClose={handleCloseEditor}
          onExport={() => setExportingThumbnail(editingThumbnail)}
          thumbnail={editingThumbnail}
        />
        {exportingThumbnail && (
          <ExportDialog
            onClose={() => setExportingThumbnail(null)}
            thumbnail={exportingThumbnail}
          />
        )}
        <Toaster />
      </div>
    );
  }

  // Trash page
  if (page === "trash") {
    return (
      <div className="flex h-screen flex-col bg-background">
        <TrashPage onClose={() => setPage("gallery")} />
        <Toaster />
      </div>
    );
  }

  // Gallery page (default)
  return (
    <div className="flex h-screen flex-col bg-background">
      <TitleBar />
      <Gallery
        onExportClick={setExportingThumbnail}
        onThumbnailClick={handleEditThumbnail}
        viewMode={viewMode}
      />
      <BottomToolbar
        onAddVideoClick={() => setShowExtractor(true)}
        onTrashClick={() => setPage("trash")}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
      />
      {showExtractor && (
        <VideoExtractor onClose={() => setShowExtractor(false)} />
      )}
      {exportingThumbnail && (
        <ExportDialog
          onClose={() => setExportingThumbnail(null)}
          thumbnail={exportingThumbnail}
        />
      )}
      <Toaster />
      <BackgroundRemovalQueue />
    </div>
  );
}
