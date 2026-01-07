import { Image, LayoutTemplate, Plus, Video } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { openAndLoadImages } from "@/lib/image-file-utils";
import { useGalleryStore } from "@/stores/use-gallery-store";

interface AddMenuProps {
  onAddVideoClick: () => void;
  onNewProjectClick: () => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function AddMenu({
  onAddVideoClick,
  onNewProjectClick,
  trigger,
  className,
}: AddMenuProps) {
  const [open, setOpen] = useState(false);
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);

  const handleAddImage = useCallback(async () => {
    setOpen(false);
    const images = await openAndLoadImages();
    for (const { dataUrl, fileName } of images) {
      addThumbnail(dataUrl, fileName);
    }
  }, [addThumbnail]);

  const handleAddVideo = useCallback(() => {
    setOpen(false);
    onAddVideoClick();
  }, [onAddVideoClick]);

  const handleNewProject = useCallback(() => {
    setOpen(false);
    onNewProjectClick();
  }, [onNewProjectClick]);

  return (
    <div className={className}>
      <DropdownMenu onOpenChange={setOpen} open={open}>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <Button aria-label="Add" size="icon-sm">
              <Plus className="size-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-max" side="top">
          <DropdownMenuItem onClick={handleNewProject}>
            <LayoutTemplate className="mr-2 size-4" />
            New Project
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddImage}>
            <Image className="mr-2 size-4" />
            Add Image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddVideo}>
            <Video className="mr-2 size-4" />
            Upload Video
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
