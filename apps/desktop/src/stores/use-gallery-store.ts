import Database from "@tauri-apps/plugin-sql";
import { create } from "zustand";
import {
  deleteThumbnailFiles,
  loadFullImage,
  loadLayerData,
  loadPreview,
  saveLayerData,
  saveThumbnail,
} from "@/lib/thumbnail-storage";

// ThumbnailItem no longer stores dataUrl - images are loaded on demand
export interface ThumbnailItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  canvasWidth?: number;
  canvasHeight?: number;
  // Lazy loaded fields (not in DB)
  previewUrl?: string;
}

// Layer type for projects
export interface Layer {
  id: string;
  name: string;
  dataUrl: string;
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  flipX: boolean;
  flipY: boolean;
  filters?: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
}

export type SortField = "updatedAt" | "createdAt" | "name";
export type SortOrder = "desc" | "asc";

interface GalleryState {
  thumbnails: ThumbnailItem[];
  isLoaded: boolean;
  dbError: string | null;
  sortField: SortField;
  sortOrder: SortOrder;
  previewCache: Map<string, string>; // id -> previewUrl

  // Actions
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  addThumbnail: (dataUrl: string, name?: string) => Promise<string>;
  duplicateThumbnail: (id: string) => Promise<void>;
  duplicateThumbnailsBatch: (ids: string[]) => Promise<void>;
  deleteThumbnailsBatch: (ids: string[]) => Promise<void>;
  saveProject: (
    id: string | null,
    name: string,
    previewDataUrl: string,
    layers: Layer[],
    canvasWidth: number,
    canvasHeight: number
  ) => Promise<string>;
  updateThumbnailName: (id: string, name: string) => Promise<void>;
  updateThumbnail: (id: string, dataUrl: string) => Promise<void>;
  deleteThumbnail: (id: string) => Promise<void>;
  loadFromDb: () => Promise<void>;

  // Lazy loading
  loadPreviewForId: (id: string) => Promise<string | null>;
  loadFullImageForId: (id: string) => Promise<string | null>;
  loadLayerDataForId: (id: string) => Promise<Layer[] | null>;
}

let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

async function initDb(): Promise<Database> {
  console.log("[Gallery] Initializing database...");
  const database = await Database.load("sqlite:gallery.db");
  console.log("[Gallery] Database loaded, creating tables...");

  // New schema - NO dataUrl or layerData columns (stored as files)
  await database.execute(`
    CREATE TABLE IF NOT EXISTS thumbnails (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL DEFAULT 0,
      canvasWidth INTEGER,
      canvasHeight INTEGER
    )
  `);

  console.log("[Gallery] Tables created/verified");
  return database;
}

async function getDb(): Promise<Database> {
  if (db) {
    return db;
  }
  if (!dbInitPromise) {
    dbInitPromise = initDb();
  }
  db = await dbInitPromise;
  return db;
}

export const useGalleryStore = create<GalleryState>()((set, get) => ({
  thumbnails: [],
  isLoaded: false,
  dbError: null,
  sortField: "updatedAt",
  sortOrder: "desc",
  previewCache: new Map(),

  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),

  addThumbnail: async (dataUrl, name) => {
    const now = Date.now();
    const id = crypto.randomUUID();
    const itemName = name || `Thumbnail ${get().thumbnails.length + 1}`;

    console.log("[Gallery] Adding thumbnail:", itemName);

    // Save image files (full + preview)
    const { previewUrl } = await saveThumbnail(id, dataUrl);

    const newItem: ThumbnailItem = {
      id,
      name: itemName,
      createdAt: now,
      updatedAt: now,
      previewUrl, // Include preview for immediate display
    };

    set((state) => ({
      thumbnails: [newItem, ...state.thumbnails],
      previewCache: new Map(state.previewCache).set(id, previewUrl),
    }));

    try {
      const database = await getDb();
      await database.execute(
        "INSERT INTO thumbnails (id, name, createdAt, updatedAt) VALUES ($1, $2, $3, $4)",
        [id, itemName, now, now]
      );
      console.log("[Gallery] Thumbnail saved:", id);
    } catch (error) {
      console.error("[Gallery] Failed to save thumbnail:", error);
      set({ dbError: String(error) });
    }

    return id;
  },

  duplicateThumbnail: async (id) => {
    const original = get().thumbnails.find((t) => t.id === id);
    if (!original) {
      return;
    }

    console.log("[Gallery] Duplicating thumbnail:", original.name);

    // Load full image from original
    const fullImage = await loadFullImage(id);
    if (!fullImage) {
      console.error("[Gallery] Failed to load original image for duplication");
      return;
    }

    // Save as new thumbnail
    const newId = crypto.randomUUID();
    const now = Date.now();
    const { previewUrl } = await saveThumbnail(newId, fullImage);

    // Copy layer data if exists
    const layers = await loadLayerData(id);
    if (layers) {
      await saveLayerData(newId, layers);
    }

    const newItem: ThumbnailItem = {
      id: newId,
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      canvasWidth: original.canvasWidth,
      canvasHeight: original.canvasHeight,
      previewUrl,
    };

    set((state) => ({
      thumbnails: [newItem, ...state.thumbnails],
      previewCache: new Map(state.previewCache).set(newId, previewUrl),
    }));

    try {
      const database = await getDb();
      await database.execute(
        "INSERT INTO thumbnails (id, name, createdAt, updatedAt, canvasWidth, canvasHeight) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          newId,
          newItem.name,
          now,
          now,
          newItem.canvasWidth || null,
          newItem.canvasHeight || null,
        ]
      );
      console.log("[Gallery] Duplicate saved:", newId);
    } catch (error) {
      console.error("[Gallery] Failed to duplicate thumbnail:", error);
      set({ dbError: String(error) });
    }
  },

  duplicateThumbnailsBatch: async (ids) => {
    const state = get();
    const originals = ids
      .map((id) => state.thumbnails.find((t) => t.id === id))
      .filter((t): t is ThumbnailItem => t !== undefined);

    if (originals.length === 0) {
      return;
    }

    console.log("[Gallery] Batch duplicating", originals.length, "thumbnails");

    const now = Date.now();
    const newItems: ThumbnailItem[] = [];
    const newPreviews = new Map<string, string>();

    // Process each original
    for (let i = 0; i < originals.length; i++) {
      const original = originals[i];
      const fullImage = await loadFullImage(original.id);
      if (!fullImage) {
        continue;
      }

      const newId = crypto.randomUUID();
      const { previewUrl } = await saveThumbnail(newId, fullImage);

      // Copy layer data if exists
      const layers = await loadLayerData(original.id);
      if (layers) {
        await saveLayerData(newId, layers);
      }

      newItems.push({
        id: newId,
        name: `${original.name} (Copy)`,
        createdAt: now + i,
        updatedAt: now + i,
        canvasWidth: original.canvasWidth,
        canvasHeight: original.canvasHeight,
        previewUrl,
      });
      newPreviews.set(newId, previewUrl);
    }

    // Single state update
    set((state) => ({
      thumbnails: [...newItems, ...state.thumbnails],
      previewCache: new Map([...state.previewCache, ...newPreviews]),
    }));

    // Batch DB insert
    try {
      const database = await getDb();
      await database.execute("BEGIN TRANSACTION");
      for (const item of newItems) {
        await database.execute(
          "INSERT INTO thumbnails (id, name, createdAt, updatedAt, canvasWidth, canvasHeight) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            item.id,
            item.name,
            item.createdAt,
            item.updatedAt,
            item.canvasWidth || null,
            item.canvasHeight || null,
          ]
        );
      }
      await database.execute("COMMIT");
      console.log("[Gallery] Batch duplicates saved:", newItems.length);
    } catch (error) {
      console.error("[Gallery] Failed to batch duplicate:", error);
      try {
        const database = await getDb();
        await database.execute("ROLLBACK");
      } catch {}
      set({ dbError: String(error) });
    }
  },

  saveProject: async (
    id,
    name,
    previewDataUrl,
    layers,
    canvasWidth,
    canvasHeight
  ) => {
    const projectId = id || crypto.randomUUID();
    const now = Date.now();
    console.log(
      "[Gallery] Saving project:",
      name,
      "with",
      layers.length,
      "layers"
    );

    // Save image files
    const { previewUrl } = await saveThumbnail(projectId, previewDataUrl);

    // Save layer data
    await saveLayerData(projectId, layers);

    const existingItem = get().thumbnails.find((t) => t.id === projectId);
    if (existingItem) {
      set((state) => ({
        thumbnails: state.thumbnails.map((t) =>
          t.id === projectId
            ? {
                ...t,
                name,
                canvasWidth,
                canvasHeight,
                updatedAt: now,
                previewUrl,
              }
            : t
        ),
        previewCache: new Map(state.previewCache).set(projectId, previewUrl),
      }));

      try {
        const database = await getDb();
        await database.execute(
          "UPDATE thumbnails SET name = $1, canvasWidth = $2, canvasHeight = $3, updatedAt = $4 WHERE id = $5",
          [name, canvasWidth, canvasHeight, now, projectId]
        );
        console.log("[Gallery] Project updated:", projectId);
      } catch (error) {
        console.error("[Gallery] Failed to update project:", error);
        set({ dbError: String(error) });
      }
    } else {
      const newItem: ThumbnailItem = {
        id: projectId,
        name,
        createdAt: now,
        updatedAt: now,
        canvasWidth,
        canvasHeight,
        previewUrl,
      };

      set((state) => ({
        thumbnails: [newItem, ...state.thumbnails],
        previewCache: new Map(state.previewCache).set(projectId, previewUrl),
      }));

      try {
        const database = await getDb();
        await database.execute(
          "INSERT INTO thumbnails (id, name, createdAt, updatedAt, canvasWidth, canvasHeight) VALUES ($1, $2, $3, $4, $5, $6)",
          [projectId, name, now, now, canvasWidth, canvasHeight]
        );
        console.log("[Gallery] Project saved:", projectId);
      } catch (error) {
        console.error("[Gallery] Failed to save project:", error);
        set({ dbError: String(error) });
      }
    }

    return projectId;
  },

  updateThumbnailName: async (id, name) => {
    const now = Date.now();
    set((state) => ({
      thumbnails: state.thumbnails.map((t) =>
        t.id === id ? { ...t, name, updatedAt: now } : t
      ),
    }));

    try {
      const database = await getDb();
      await database.execute(
        "UPDATE thumbnails SET name = $1, updatedAt = $2 WHERE id = $3",
        [name, now, id]
      );
      console.log("[Gallery] Thumbnail name updated:", id);
    } catch (error) {
      console.error("[Gallery] Failed to update name:", error);
      set({ dbError: String(error) });
    }
  },

  updateThumbnail: async (id, dataUrl) => {
    const now = Date.now();

    // Update files
    const { previewUrl } = await saveThumbnail(id, dataUrl);

    set((state) => ({
      thumbnails: state.thumbnails.map((t) =>
        t.id === id ? { ...t, updatedAt: now, previewUrl } : t
      ),
      previewCache: new Map(state.previewCache).set(id, previewUrl),
    }));

    try {
      const database = await getDb();
      await database.execute(
        "UPDATE thumbnails SET updatedAt = $1 WHERE id = $2",
        [now, id]
      );
    } catch (error) {
      console.error("[Gallery] Failed to update thumbnail:", error);
      set({ dbError: String(error) });
    }
  },

  deleteThumbnail: async (id) => {
    set((state) => {
      const newCache = new Map(state.previewCache);
      newCache.delete(id);
      return {
        thumbnails: state.thumbnails.filter((t) => t.id !== id),
        previewCache: newCache,
      };
    });

    // Delete files
    await deleteThumbnailFiles(id);

    try {
      const database = await getDb();
      await database.execute("DELETE FROM thumbnails WHERE id = $1", [id]);
    } catch (error) {
      console.error("[Gallery] Failed to delete:", error);
      set({ dbError: String(error) });
    }
  },

  deleteThumbnailsBatch: async (ids) => {
    if (ids.length === 0) {
      return;
    }

    const idsSet = new Set(ids);
    console.log("[Gallery] Batch deleting", ids.length, "thumbnails");

    set((state) => {
      const newCache = new Map(state.previewCache);
      for (const id of ids) {
        newCache.delete(id);
      }
      return {
        thumbnails: state.thumbnails.filter((t) => !idsSet.has(t.id)),
        previewCache: newCache,
      };
    });

    // Delete all files
    for (const id of ids) {
      await deleteThumbnailFiles(id);
    }

    try {
      const database = await getDb();
      await database.execute("BEGIN TRANSACTION");
      for (const id of ids) {
        await database.execute("DELETE FROM thumbnails WHERE id = $1", [id]);
      }
      await database.execute("COMMIT");
      console.log("[Gallery] Batch delete completed:", ids.length);
    } catch (error) {
      console.error("[Gallery] Failed to batch delete:", error);
      try {
        const database = await getDb();
        await database.execute("ROLLBACK");
      } catch {}
      set({ dbError: String(error) });
    }
  },

  loadFromDb: async () => {
    console.log("[Gallery] Loading thumbnails from DB...");
    try {
      const database = await getDb();
      // Only load metadata - NO image data!
      const result = await database.select<ThumbnailItem[]>(
        "SELECT id, name, createdAt, updatedAt, canvasWidth, canvasHeight FROM thumbnails ORDER BY updatedAt DESC"
      );
      console.log(
        "[Gallery] Loaded",
        result.length,
        "thumbnails (metadata only)"
      );
      set({ thumbnails: result, isLoaded: true, dbError: null });
    } catch (error) {
      console.error("[Gallery] Failed to load:", error);
      set({ isLoaded: true, dbError: String(error) });
    }
  },

  // Lazy loading methods
  loadPreviewForId: async (id) => {
    const cached = get().previewCache.get(id);
    if (cached) {
      return cached;
    }

    const previewUrl = await loadPreview(id);
    if (previewUrl) {
      set((state) => ({
        previewCache: new Map(state.previewCache).set(id, previewUrl),
      }));
    }
    return previewUrl;
  },

  loadFullImageForId: async (id) => {
    return loadFullImage(id);
  },

  loadLayerDataForId: async (id) => {
    const data = await loadLayerData(id);
    return data as Layer[] | null;
  },
}));

// Initialize on module load
useGalleryStore.getState().loadFromDb();
