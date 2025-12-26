import { open } from "@tauri-apps/plugin-dialog";
import { X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGalleryStore } from "@/stores/useGalleryStore";

interface VideoExtractorProps {
  onClose: () => void;
}

export function VideoExtractor({ onClose }: VideoExtractorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);

  const handleSelectVideo = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Videos",
          extensions: ["mp4", "webm", "mov", "avi", "mkv"],
        },
      ],
    });

    if (selected) {
      // Convert file path to file:// URL for video element
      const fileUrl = `file://${selected}`;
      setVideoSrc(fileUrl);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number.parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleExtractFrame = useCallback(() => {
    if (!(videoRef.current && canvasRef.current)) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");
    addThumbnail(dataUrl);
    onClose();
  }, [addThumbnail, onClose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="w-[800px] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <div className="flex items-center justify-between border-border border-b px-5 py-4">
          <h2 className="font-semibold text-lg">Extract Frame</h2>
          <Button onClick={onClose} size="icon-sm" variant="ghost">
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-5">
          {videoSrc ? (
            <>
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                <video
                  className="h-full w-full object-contain"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  ref={videoRef}
                  src={videoSrc}
                />
              </div>

              <div className="mt-4">
                <input
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
                  max={duration || 100}
                  min={0}
                  onChange={handleSeek}
                  step={0.01}
                  type="range"
                  value={currentTime}
                />
                <div className="mt-2 flex justify-between text-muted-foreground text-sm">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
              <Button onClick={handleSelectVideo}>Select Video</Button>
            </div>
          )}

          <canvas className="hidden" ref={canvasRef} />
        </div>

        <div className="flex justify-end gap-3 border-border border-t px-5 py-4">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={!videoSrc} onClick={handleExtractFrame}>
            Extract Frame
          </Button>
        </div>
      </div>
    </div>
  );
}
