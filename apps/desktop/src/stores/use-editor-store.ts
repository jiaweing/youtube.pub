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

export interface Page {
  id: string;
  layers: Layer[];
}

interface EditorState {
  // Multi-page support
  pages: Page[];
  activePageIndex: number;
  // Legacy support & convenience (always reflects active page layers)
  layers: Layer[];

  activeLayerId: string | null;
  activeTool: "select" | "text" | "rect" | "ellipse";
  canvasWidth: number;
  canvasHeight: number;
  history: Page[][]; // History now tracks pages snapshot
  historyIndex: number;
  // Layer CRUD
  addImageLayer: (dataUrl: string, width: number, height: number) => void;
  addTextLayer: (text: string) => void;
  addShapeLayer: (shapeType: "rect" | "ellipse") => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  // Page CRUD
  addPage: () => void;
  removePage: (index: number) => void;
  setActivePage: (index: number) => void;
  duplicatePage: (index: number) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;

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
  // Internal helper to sync state
  _syncLayers: (pages: Page[], activeIndex: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  pages: [{ id: crypto.randomUUID(), layers: [] }],
  activePageIndex: 0,
  layers: [],
  activeLayerId: null,
  activeTool: "select",
  canvasWidth: 1280,
  canvasHeight: 720,
  history: [],
  historyIndex: -1,

  _syncLayers: (pages, activeIndex) => {
    set({
      pages,
      activePageIndex: activeIndex,
      layers: pages[activeIndex]?.layers || [],
    });
  },

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

    const { pages, activePageIndex } = get();
    const newPages = [...pages];
    newPages[activePageIndex] = {
      ...newPages[activePageIndex],
      layers: [...newPages[activePageIndex].layers, newLayer],
    };

    set((state) => ({
      pages: newPages,
      layers: newPages[activePageIndex].layers,
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

    const { pages, activePageIndex } = get();
    const newPages = [...pages];
    newPages[activePageIndex] = {
      ...newPages[activePageIndex],
      layers: [...newPages[activePageIndex].layers, newLayer],
    };

    set((state) => ({
      pages: newPages,
      layers: newPages[activePageIndex].layers,
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

    const { pages, activePageIndex } = get();
    const newPages = [...pages];
    newPages[activePageIndex] = {
      ...newPages[activePageIndex],
      layers: [...newPages[activePageIndex].layers, newLayer],
    };

    set((state) => ({
      pages: newPages,
      layers: newPages[activePageIndex].layers,
      activeLayerId: newLayer.id,
    }));
  },

  removeLayer: (id) => {
    get().pushHistory();
    const { pages, activePageIndex, activeLayerId } = get();
    const newPages = [...pages];
    const currentCallback = newPages[activePageIndex];

    newPages[activePageIndex] = {
      ...currentCallback,
      layers: currentCallback.layers.filter((l) => l.id !== id),
    };

    set((state) => ({
      pages: newPages,
      layers: newPages[activePageIndex].layers,
      activeLayerId: activeLayerId === id ? null : activeLayerId,
    }));
  },

  updateLayer: (id, updates) => {
    const { pages, activePageIndex } = get();
    const newPages = [...pages];
    const currentCallback = newPages[activePageIndex];

    newPages[activePageIndex] = {
      ...currentCallback,
      layers: currentCallback.layers.map((l) =>
        l.id === id ? ({ ...l, ...updates } as Layer) : l
      ),
    };

    set((state) => ({
      pages: newPages,
      layers: newPages[activePageIndex].layers,
    }));
  },

  setActiveLayer: (id) => set({ activeLayerId: id }),
  setActiveTool: (tool) => set({ activeTool: tool }),

  moveLayer: (id, direction) => {
    get().pushHistory();
    const { pages, activePageIndex } = get();
    const newPages = [...pages];
    const currentCallback = newPages[activePageIndex];
    const layers = [...currentCallback.layers];

    const index = layers.findIndex((l) => l.id === id);
    if (index === -1) return;

    const newIndex = direction === "up" ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= layers.length) return;

    [layers[index], layers[newIndex]] = [layers[newIndex], layers[index]];

    newPages[activePageIndex] = {
      ...currentCallback,
      layers,
    };

    set({ pages: newPages, layers });
  },

  reorderLayers: (fromIndex, toIndex) => {
    get().pushHistory();
    const { pages, activePageIndex } = get();
    const newPages = [...pages];
    const currentCallback = newPages[activePageIndex];
    const layers = [...currentCallback.layers];

    const [removed] = layers.splice(fromIndex, 1);
    layers.splice(toIndex, 0, removed);

    newPages[activePageIndex] = {
      ...currentCallback,
      layers,
    };

    set({ pages: newPages, layers });
  },

  // Page Actions
  addPage: () => {
    get().pushHistory();
    const { pages, canvasWidth, canvasHeight } = get();

    const bgLayer: ShapeLayer = {
      id: crypto.randomUUID(),
      type: "shape",
      shapeType: "rect",
      name: "Background Layer",
      visible: true,
      locked: true,
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      fill: "#ffffff",
      stroke: "",
      strokeWidth: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      cornerRadius: 0,
    };

    const newPage: Page = {
      id: crypto.randomUUID(),
      layers: [bgLayer],
    };

    // Check if previous page has a full-size rect background, duplicate it?
    // For now, clean slate.
    const newPages = [...pages, newPage];
    const newIndex = newPages.length - 1;

    set({
      pages: newPages,
      activePageIndex: newIndex,
      layers: newPage.layers,
      activeLayerId: null,
    });
  },

  removePage: (index) => {
    get().pushHistory();
    const { pages, activePageIndex } = get();
    if (pages.length <= 1) return; // Cannot remove last page

    const newPages = pages.filter((_, i) => i !== index);
    const newActiveIndex =
      index === activePageIndex
        ? Math.max(0, index - 1)
        : activePageIndex > index
          ? activePageIndex - 1
          : activePageIndex;

    set({
      pages: newPages,
      activePageIndex: newActiveIndex,
      layers: newPages[newActiveIndex].layers,
      activeLayerId: null,
    });
  },

  setActivePage: (index) => {
    const { pages } = get();
    if (pages[index]) {
      set({
        activePageIndex: index,
        layers: pages[index].layers,
        activeLayerId: null,
      });
    }
  },

  duplicatePage: (index) => {
    get().pushHistory();
    const { pages } = get();
    const pageToDup = pages[index];
    if (!pageToDup) return;

    // Deep clone layers
    const newLayers = JSON.parse(JSON.stringify(pageToDup.layers)).map(
      (l: Layer) => ({
        ...l,
        id: crypto.randomUUID(), // Ensure new IDs for layers
      })
    );

    const newPage: Page = {
      id: crypto.randomUUID(),
      layers: newLayers,
    };

    const newPages = [...pages];
    newPages.splice(index + 1, 0, newPage);

    set({
      pages: newPages,
      activePageIndex: index + 1,
      layers: newPage.layers,
      activeLayerId: null,
    });
  },

  reorderPages: (fromIndex, toIndex) => {
    get().pushHistory();
    const { pages, activePageIndex } = get();
    const newPages = [...pages];
    const [removed] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, removed);

    // Adjust active index if needed
    // If active page moved, track it.
    // However, usually reorder happens in UI without changing selection conceptually,
    // or we can just keep the active page ID?

    // Simple for now: just update active index if we moved the active page
    let newActiveIndex = activePageIndex;
    if (activePageIndex === fromIndex) {
      newActiveIndex = toIndex;
    } else if (activePageIndex > fromIndex && activePageIndex <= toIndex) {
      newActiveIndex = activePageIndex - 1;
    } else if (activePageIndex < fromIndex && activePageIndex >= toIndex) {
      newActiveIndex = activePageIndex + 1;
    }

    set({
      pages: newPages,
      activePageIndex: newActiveIndex,
      layers: newPages[newActiveIndex].layers,
    });
  },

  setCanvasSize: (width, height) =>
    set({ canvasWidth: width, canvasHeight: height }),

  reset: () => {
    const { canvasWidth, canvasHeight } = get();
    const bgLayer: ShapeLayer = {
      id: crypto.randomUUID(),
      type: "shape",
      shapeType: "rect",
      name: "Background Layer",
      visible: true,
      locked: true,
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      fill: "#ffffff",
      stroke: "",
      strokeWidth: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      cornerRadius: 0,
    };

    set({
      pages: [{ id: crypto.randomUUID(), layers: [bgLayer] }],
      activePageIndex: 0,
      layers: [bgLayer],
      activeLayerId: null,
      activeTool: "select",
      history: [],
      historyIndex: -1,
    });
  },

  pushHistory: () => {
    const { pages, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(pages)));
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex, pages } = get();
    if (historyIndex < 0) return;

    if (historyIndex === history.length - 1) {
      const newHistory = [...history];
      newHistory.push(JSON.parse(JSON.stringify(pages)));
      set({ history: newHistory });
    }

    const newIndex = Math.max(0, historyIndex - 1);
    const previousPages = history[newIndex];
    if (previousPages) {
      // Restore pages
      // We also need to ensure activePageIndex is valid, usually keep it unless out of bounds
      const currentIndex = get().activePageIndex;
      const validIndex = Math.min(currentIndex, previousPages.length - 1);

      set({
        pages: JSON.parse(JSON.stringify(previousPages)),
        historyIndex: newIndex,
        activePageIndex: validIndex,
        layers: previousPages[validIndex].layers,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const nextPages = history[newIndex];
    if (nextPages) {
      const currentIndex = get().activePageIndex;
      const validIndex = Math.min(currentIndex, nextPages.length - 1);

      set({
        pages: JSON.parse(JSON.stringify(nextPages)),
        historyIndex: newIndex,
        activePageIndex: validIndex,
        layers: nextPages[validIndex].layers,
      });
    }
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  _syncLayers: () => {}, // placeholder
}));
