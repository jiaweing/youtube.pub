import { useState } from "react";
import { ExportDialog } from "@/components/ExportDialog";
import { Gallery } from "@/components/Gallery";
import { Header } from "@/components/Header";
import { ImageEditor } from "@/components/ImageEditor";
import { TitleBar } from "@/components/TitleBar";
import { VideoExtractor } from "@/components/VideoExtractor";
import { type ThumbnailItem, useGalleryStore } from "@/stores/useGalleryStore";

export type ViewMode = "3" | "4" | "5" | "row";

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("4");
  const [showExtractor, setShowExtractor] = useState(false);
  const [editingThumbnail, setEditingThumbnail] =
    useState<ThumbnailItem | null>(null);
  const [exportingThumbnail, setExportingThumbnail] =
    useState<ThumbnailItem | null>(null);
  const thumbnails = useGalleryStore((s) => s.thumbnails);

  return (
    <div className="flex h-screen flex-col bg-background">
      <TitleBar />
      <Gallery
        onExportClick={setExportingThumbnail}
        onThumbnailClick={setEditingThumbnail}
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
      {editingThumbnail && (
        <ImageEditor
          onClose={() => setEditingThumbnail(null)}
          onExport={() => {
            setExportingThumbnail(editingThumbnail);
          }}
          thumbnail={editingThumbnail}
        />
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
