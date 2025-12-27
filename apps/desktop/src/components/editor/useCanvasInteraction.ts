import { type Layer, useEditorStore } from "@/stores/useEditorStore";

const HANDLE_SIZE = 8;

export type DragMode = "none" | "move" | "resize";
export type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | null;

export const getHandlePositions = (layer: Layer) => ({
  nw: { x: layer.x, y: layer.y },
  n: { x: layer.x + layer.width / 2, y: layer.y },
  ne: { x: layer.x + layer.width, y: layer.y },
  e: { x: layer.x + layer.width, y: layer.y + layer.height / 2 },
  se: { x: layer.x + layer.width, y: layer.y + layer.height },
  s: { x: layer.x + layer.width / 2, y: layer.y + layer.height },
  sw: { x: layer.x, y: layer.y + layer.height },
  w: { x: layer.x, y: layer.y + layer.height / 2 },
});

export const hitTestHandle = (
  layer: Layer,
  x: number,
  y: number,
  scale: number
): ResizeHandle => {
  const handles = getHandlePositions(layer);
  const threshold = HANDLE_SIZE / scale + 4;

  for (const [key, pos] of Object.entries(handles)) {
    if (Math.abs(x - pos.x) < threshold && Math.abs(y - pos.y) < threshold) {
      return key as ResizeHandle;
    }
  }
  return null;
};

export const hitTestLayer = (
  layers: Layer[],
  x: number,
  y: number
): Layer | null => {
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (!layer.visible) continue;
    if (
      x >= layer.x &&
      x <= layer.x + layer.width &&
      y >= layer.y &&
      y <= layer.y + layer.height
    ) {
      return layer;
    }
  }
  return null;
};

export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  canvasScale: number
) {
  const { layers, activeLayerId, activeTool, updateLayer, setActiveLayer } =
    useEditorStore();

  const screenToCanvas = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / canvasScale,
      y: (clientY - rect.top) / canvasScale,
    };
  };

  return {
    layers,
    activeLayerId,
    activeTool,
    updateLayer,
    setActiveLayer,
    screenToCanvas,
  };
}
