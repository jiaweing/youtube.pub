import { useState } from "react";
import { ExportDialog } from "@/components/ExportDialog";
import { Gallery } from "@/components/Gallery";
import { Header } from "@/components/Header";
import { ImageEditor } from "@/components/ImageEditor";
import { TitleBar } from "@/components/TitleBar";
import { VideoExtractor } from "@/components/VideoExtractor";
import { type ThumbnailItem, useGalleryStore } from "@/stores/useGalleryStore";

export type ViewMode = "3" | "4" | "5" | "row";
type Page = "gallery" | "editor";

export default function App() {
  const [page, setPage] = useState<Page>("gallery");
  const [viewMode, setViewMode] = useState<ViewMode>("4");
  const [showExtractor, setShowExtractor] = useState(false);
  const [editingThumbnail, setEditingThumbnail] =
    useState<ThumbnailItem | null>(null);
  const [exportingThumbnail, setExportingThumbnail] =
    useState<ThumbnailItem | null>(null);
  const thumbnails = useGalleryStore((s) => s.thumbnails);

  const handleEditThumbnail = (thumbnail: ThumbnailItem) => {
    setEditingThumbnail(thumbnail);
    setPage("editor");
  };

  const handleCloseEditor = () => {
    setEditingThumbnail(null);
    setPage("gallery");
  };

  // Editor page
  if (page === "editor" && editingThumbnail) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <ImageEditor
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
        thumbnails={thumbnails}
        viewMode={viewMode}
      />
      <Header
        onAddVideoClick={() => setShowExtractor(true)}
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
    </div>
  );
}
