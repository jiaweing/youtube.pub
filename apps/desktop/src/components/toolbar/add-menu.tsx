import { Image, Plus, Video } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { openAndLoadImages } from "@/lib/image-file-utils";
import { useGalleryStore } from "@/stores/use-gallery-store";

interface AddMenuProps {
  onAddVideoClick: () => void;
}

export function AddMenu({ onAddVideoClick }: AddMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);

  const handleAddImage = useCallback(async () => {
    setShowMenu(false);
    const images = await openAndLoadImages();
    for (const { dataUrl, fileName } of images) {
      addThumbnail(dataUrl, fileName);
    }
  }, [addThumbnail]);

  const handleAddVideo = useCallback(() => {
    setShowMenu(false);
    onAddVideoClick();
  }, [onAddVideoClick]);

  return (
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
            <Button
              className="w-full justify-start"
              onClick={handleAddImage}
              size="sm"
              variant="ghost"
            >
              <Image className="mr-2 size-4" />
              Add Image
            </Button>
            <Button
              className="w-full justify-start"
              onClick={handleAddVideo}
              size="sm"
              variant="ghost"
            >
              <Video className="mr-2 size-4" />
              Upload Video
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
