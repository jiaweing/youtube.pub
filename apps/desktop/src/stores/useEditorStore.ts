import { create } from "zustand";

export type LayerType = "image" | "text";

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  // Image layer
  dataUrl?: string;
  // Text layer
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

interface EditorState {
  layers: Layer[];
  activeLayerId: string | null;
  activeTool: "select" | "text";
  addImageLayer: (dataUrl: string, width: number, height: number) => void;
  addTextLayer: (text: string) => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  setActiveLayer: (id: string | null) => void;
  setActiveTool: (tool: "select" | "text") => void;
  moveLayer: (id: string, direction: "up" | "down") => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  layers: [],
  activeLayerId: null,
  activeTool: "select",

  addImageLayer: (dataUrl, width, height) => {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      type: "image",
      name: `Image ${Date.now()}`,
      visible: true,
      x: 0,
      y: 0,
      width,
      height,
      dataUrl,
    };
    set((state) => ({
      layers: [...state.layers, newLayer],
      activeLayerId: newLayer.id,
    }));
  },

  addTextLayer: (text) => {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      type: "text",
      name: text.slice(0, 20) || "Text",
      visible: true,
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      text,
      fontSize: 48,
      fontFamily: "Inter",
      color: "#ffffff",
    };
    set((state) => ({
      layers: [...state.layers, newLayer],
      activeLayerId: newLayer.id,
    }));
  },

  removeLayer: (id) => {
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
    }));
  },

  updateLayer: (id, updates) => {
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
  },

  setActiveLayer: (id) => set({ activeLayerId: id }),
  setActiveTool: (tool) => set({ activeTool: tool }),

  moveLayer: (id, direction) => {
    set((state) => {
      const index = state.layers.findIndex((l) => l.id === id);
      if (index === -1) return state;

      const newIndex = direction === "up" ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= state.layers.length) return state;

      const newLayers = [...state.layers];
      [newLayers[index], newLayers[newIndex]] = [
        newLayers[newIndex],
        newLayers[index],
      ];
      return { layers: newLayers };
    });
  },

  reorderLayers: (fromIndex, toIndex) => {
    set((state) => {
      const newLayers = [...state.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return { layers: newLayers };
    });
  },

  reset: () => set({ layers: [], activeLayerId: null, activeTool: "select" }),
}));
