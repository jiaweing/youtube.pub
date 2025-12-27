import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { Grid2X2, Grid3X3, Image, List, Plus, Video } from "lucide-react";
import { useCallback, useState } from "react";
import type { ViewMode } from "@/App";
import { Button } from "@/components/ui/button";
import { useGalleryStore } from "@/stores/useGalleryStore";

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddVideoClick: () => void;
}

const viewModeIcons: Record<ViewMode, React.ReactNode> = {
  "3": <Grid3X3 className="size-4" />,
  "4": <Grid2X2 className="size-4" />,
  "5": <Grid2X2 className="size-3" />,
  row: <List className="size-4" />,
};

const viewModeTitles: Record<ViewMode, string> = {
  "3": "3×3 Grid",
  "4": "4×4 Grid",
  "5": "5×5 Grid",
  row: "List View",
};

export function Header({
  viewMode,
  onViewModeChange,
  onAddVideoClick,
}: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);

  const handleAddImage = useCallback(async () => {
    setShowMenu(false);
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"],
        },
      ],
    });

    if (selected) {
      const files = Array.isArray(selected) ? selected : [selected];
      for (const filePath of files) {
        try {
          const data = await readFile(filePath);
          const blob = new Blob([data]);
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const fileName = filePath.split(/[/\\]/).pop() || "Image";
          addThumbnail(dataUrl, fileName);
        } catch (error) {
          console.error("Failed to load image:", error);
        }
      }
    }
  }, [addThumbnail]);

  const handleAddVideo = useCallback(() => {
    setShowMenu(false);
    onAddVideoClick();
  }, [onAddVideoClick]);

  return (
    <header className="flex items-center justify-between px-4 py-2">
      <div className="flex gap-1">
        {(["3", "4", "5", "row"] as ViewMode[]).map((mode) => (
          <Button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            size="icon-sm"
            title={viewModeTitles[mode]}
            variant={viewMode === mode ? "secondary" : "ghost"}
          >
            {viewModeIcons[mode]}
          </Button>
        ))}
      </div>
      <div className="relative">
        <Button
          aria-label="Add"
          onClick={() => setShowMenu(!showMenu)}
          size="icon-sm"
        >
          <Plus className="size-4" />
        </Button>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
              onKeyDown={() => {}}
            />
            <div className="absolute right-0 bottom-full z-50 mb-2 w-40 rounded-lg border border-border bg-card p-1 shadow-lg">
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={handleAddImage}
                type="button"
              >
                <Image className="size-4" />
                Add Image
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                onClick={handleAddVideo}
                type="button"
              >
                <Video className="size-4" />
                Extract from Video
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
