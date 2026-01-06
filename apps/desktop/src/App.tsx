import { useEffect, useState } from "react";
import { BackgroundRemovalQueue } from "@/components/BackgroundRemovalQueue";
import { BottomToolbar } from "@/components/BottomToolbar";
import { ExportDialog } from "@/components/ExportDialog";
import { Gallery } from "@/components/Gallery";
import { GeminiImagePage } from "@/components/GeminiImagePage";
import { ImageEditor } from "@/components/ImageEditor";
import { LicenseActivation } from "@/components/LicenseActivation";
import { SettingsPage } from "@/components/SettingsPage";
import { TitleBar } from "@/components/TitleBar";
import { TrashPage } from "@/components/TrashPage";
import { Toaster } from "@/components/ui/sonner";
import { VideoExtractor } from "@/components/VideoExtractor";
import { useAppUpdater } from "@/hooks/use-app-updater";
import { useEditorStore } from "@/stores/use-editor-store";
import type { ThumbnailItem } from "@/stores/use-gallery-store";
import { useLicenseStore } from "@/stores/use-license-store";

export type ViewMode = "3" | "4" | "5" | "row";
type Page = "gallery" | "editor" | "ai-generate" | "trash" | "settings";

// Component to initialize the updater (runs once on gallery page mount)
function UpdateChecker() {
  useAppUpdater();
  return null;
}

export default function App() {
  const [page, setPage] = useState<Page>("gallery");
  const [viewMode, setViewMode] = useState<ViewMode>("4");
  const [showExtractor, setShowExtractor] = useState(false);
  const [editingThumbnail, setEditingThumbnail] =
    useState<ThumbnailItem | null>(null);
  const [exportingThumbnail, setExportingThumbnail] =
    useState<ThumbnailItem | null>(null);
  const [aiInputImage, setAiInputImage] = useState<string | null>(null);

  // License validation
  const { isValidated, isValidating, loadStoredLicense } = useLicenseStore();

  useEffect(() => {
    loadStoredLicense();
  }, [loadStoredLicense]);

  // Show loading during initial license check
  if (isValidating && !isValidated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Checking license...</p>
        </div>
      </div>
    );
  }

  // Show license activation page if not licensed
  if (!isValidated) {
    return <LicenseActivation />;
  }

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

  // Settings page
  if (page === "settings") {
    return (
      <div className="flex h-screen flex-col bg-background">
        <SettingsPage onClose={() => setPage("gallery")} />
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
        onSettingsClick={() => setPage("settings")}
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
      <UpdateChecker />
    </div>
  );
}
