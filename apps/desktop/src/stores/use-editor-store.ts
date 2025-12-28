import { create } from "zustand";

// Base layer properties
interface BaseLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}
// Image layer
export interface ImageLayer extends BaseLayer {
  type: "image";
  dataUrl: string;
  width: number;
  height: number;
}
// Text layer with rich styling
export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: "normal" | "bold" | "italic" | "bold italic";
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}
// Shape layer
export interface ShapeLayer extends BaseLayer {
  type: "shape";
  shapeType: "rect" | "ellipse";
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}
export type Layer = ImageLayer | TextLayer | ShapeLayer;
interface EditorState {
  layers: Layer[];
  activeLayerId: string | null;
  activeTool: "select" | "text" | "rect" | "ellipse";
  canvasWidth: number;
  canvasHeight: number;
  history: Layer[][];
  historyIndex: number;
  // Layer CRUD
  addImageLayer: (dataUrl: string, width: number, height: number) => void;
  addTextLayer: (text: string) => void;
  addShapeLayer: (shapeType: "rect" | "ellipse") => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  // Selection
  setActiveLayer: (id: string | null) => void;
  setActiveTool: (tool: "select" | "text" | "rect" | "ellipse") => void;
  // Ordering
  moveLayer: (id: string, direction: "up" | "down") => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  // Canvas
  setCanvasSize: (width: number, height: number) => void;
  reset: () => void;
  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}
export const useEditorStore = create<EditorState>((set, get) => ({
  layers: [],
  activeLayerId: null,
  activeTool: "select",
  canvasWidth: 1280,
  canvasHeight: 720,
  history: [],
  historyIndex: -1,
  addImageLayer: (dataUrl, width, height) => {
    get().pushHistory();
    const newLayer: ImageLayer = {
      id: crypto.randomUUID(),
      type: "image",
      name: "Image",
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      dataUrl,
      width,
      height,
    };
    set((state) => ({
      layers: [...state.layers, newLayer],
      activeLayerId: newLayer.id,
    }));
  },
  addTextLayer: (text) => {
    get().pushHistory();
    const newLayer: TextLayer = {
      id: crypto.randomUUID(),
      type: "text",
      name: text.slice(0, 20) || "Text",
      visible: true,
      locked: false,
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      text,
      fontSize: 48,
      fontFamily: "Inter",
      fontStyle: "normal",
      fill: "#ffffff",
      stroke: "",
      strokeWidth: 0,
      shadowColor: "rgba(0,0,0,0.5)",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };
    set((state) => ({
      layers: [...state.layers, newLayer],
      activeLayerId: newLayer.id,
    }));
  },
  addShapeLayer: (shapeType) => {
    get().pushHistory();
    const newLayer: ShapeLayer = {
      id: crypto.randomUUID(),
      type: "shape",
      name: shapeType === "rect" ? "Rectangle" : "Ellipse",
      visible: true,
      locked: false,
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      shapeType,
      width: 200,
      height: 150,
      fill: "#3b82f6",
      stroke: "#1d4ed8",
      strokeWidth: 2,
      cornerRadius: shapeType === "rect" ? 8 : 0,
    };
    set((state) => ({
      layers: [...state.layers, newLayer],
      activeLayerId: newLayer.id,
    }));
  },
  removeLayer: (id) => {
    get().pushHistory();
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
    }));
  },
  updateLayer: (id, updates) => {
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? ({ ...l, ...updates } as Layer) : l
      ),
    }));
  },
  setActiveLayer: (id) => set({ activeLayerId: id }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  moveLayer: (id, direction) => {
    get().pushHistory();
    set((state) => {
      const index = state.layers.findIndex((l) => l.id === id);
      if (index === -1) {
        return state;
      }
      const newIndex = direction === "up" ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= state.layers.length) {
        return state;
      }
      const newLayers = [...state.layers];
      [newLayers[index], newLayers[newIndex]] = [
        newLayers[newIndex],
        newLayers[index],
      ];
      return { layers: newLayers };
    });
  },
  reorderLayers: (fromIndex, toIndex) => {
    get().pushHistory();
    set((state) => {
      const newLayers = [...state.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return { layers: newLayers };
    });
  },
  setCanvasSize: (width, height) =>
    set({ canvasWidth: width, canvasHeight: height }),
  reset: () =>
    set({
      layers: [],
      activeLayerId: null,
      activeTool: "select",
      history: [],
      historyIndex: -1,
    }),
  pushHistory: () => {
    const { layers, history, historyIndex } = get();
    // Truncate future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(layers)));
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  undo: () => {
    const { history, historyIndex, layers } = get();
    if (historyIndex < 0) {
      return;
    }
    // If we're at the current state, save it first
    if (historyIndex === history.length - 1) {
      const newHistory = [...history];
      newHistory.push(JSON.parse(JSON.stringify(layers)));
      set({ history: newHistory });
    }
    const newIndex = Math.max(0, historyIndex - 1);
    const previousState = history[newIndex];
    if (previousState) {
      set({
        layers: JSON.parse(JSON.stringify(previousState)),
        historyIndex: newIndex,
      });
    }
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) {
      return;
    }
    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];
    if (nextState) {
      set({
        layers: JSON.parse(JSON.stringify(nextState)),
        historyIndex: newIndex,
      });
    }
  },
  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
}));
