import { GalleryThumbnails } from "lucide-react";
import { SnowfallBackground } from "./snow-flakes";

export function TitleBar() {
  const isDecember = new Date().getMonth() === 11;

  return (
    <div
      className="relative flex h-10 select-none items-center justify-start bg-background/50 pl-4 backdrop-blur-md"
      data-tauri-drag-region
    >
      {isDecember && (
        <SnowfallBackground
          className="pointer-events-none h-[50px]"
          color="#fff"
          count={30}
          fadeBottom={true}
          maxOpacity={1}
          maxSize={30}
          minOpacity={0}
          minSize={1}
          speed={1}
          wind={true}
          zIndex={50}
        />
      )}
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
