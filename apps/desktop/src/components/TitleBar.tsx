import { GalleryThumbnails } from "lucide-react";

export function TitleBar() {
  return (
    <div
      className="flex h-10 select-none items-center justify-start bg-background/50 pl-4 backdrop-blur-md"
      data-tauri-drag-region
    >
      <span className="pointer-events-none font-medium text-sm">
        <GalleryThumbnails
          className="fill-foreground"
          size={16}
          strokeWidth={3}
        />
      </span>
    </div>
  );
}
