import { useCallback, useRef, useState } from "react";

interface ImageCompareSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function ImageCompareSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Before",
  afterLabel = "After",
  className = "",
}: ImageCompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    },
    [isDragging, handleMove]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    },
    [handleMove]
  );

  return (
    <div
      className={`relative select-none overflow-hidden rounded-lg ${className}`}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onTouchMove={handleTouchMove}
      ref={containerRef}
    >
      {/* After image (full width, underneath) */}
      <img
        alt={afterLabel}
        className="block h-auto w-full"
        draggable={false}
        src={afterImage}
      />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          alt={beforeLabel}
          className="block h-auto w-full"
          draggable={false}
          src={beforeImage}
          style={{
            width: containerRef.current
              ? `${containerRef.current.offsetWidth}px`
              : "100%",
          }}
        />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-1 cursor-ew-resize bg-white shadow-lg"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      >
        {/* Handle circle */}
        <div className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/50 shadow-lg backdrop-blur-sm">
          <svg
            className="size-4 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M18 8l4 4-4 4M6 8l-4 4 4 4" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute top-2 left-2 rounded bg-black/50 px-2 py-1 font-medium text-white text-xs backdrop-blur-sm">
        {beforeLabel}
      </div>
      <div className="pointer-events-none absolute top-2 right-2 rounded bg-black/50 px-2 py-1 font-medium text-white text-xs backdrop-blur-sm">
        {afterLabel}
      </div>
    </div>
  );
}
