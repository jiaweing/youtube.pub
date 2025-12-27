import Database from "@tauri-apps/plugin-sql";
import { create } from "zustand";
import type { Layer } from "@/stores/useEditorStore";
export interface ThumbnailItem {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
  updatedAt: number;
  layerData?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}
export type SortField = "updatedAt" | "createdAt" | "name";
export type SortOrder = "desc" | "asc";
interface GalleryState {
  thumbnails: ThumbnailItem[];
  isLoaded: boolean;
  dbError: string | null;
  sortField: SortField;
  sortOrder: SortOrder;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  addThumbnail: (dataUrl: string, name?: string) => Promise<void>;
  duplicateThumbnail: (id: string) => Promise<void>;
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
}
let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;
async function initDb(): Promise<Database> {
  console.log("[Gallery] Initializing database...");
  const database = await Database.load("sqlite:gallery.db");
  console.log("[Gallery] Database loaded, creating tables...");
  await database.execute(`
    CREATE TABLE IF NOT EXISTS thumbnails (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dataUrl TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL DEFAULT 0,
      layerData TEXT,
      canvasWidth INTEGER,
      canvasHeight INTEGER
    )
  `);
  // Migrate: add updatedAt column if it doesn't exist
  try {
    await database.execute(
      "ALTER TABLE thumbnails ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0"
    );
  } catch {
    // Column already exists
  }
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
  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
  addThumbnail: async (dataUrl, name) => {
    const now = Date.now();
    const newItem: ThumbnailItem = {
      id: crypto.randomUUID(),
      name: name || `Thumbnail ${get().thumbnails.length + 1}`,
      dataUrl,
      createdAt: now,
      updatedAt: now,
    };
    console.log("[Gallery] Adding thumbnail:", newItem.name);
    set((state) => ({ thumbnails: [newItem, ...state.thumbnails] }));
    try {
      const database = await getDb();
      await database.execute(
        "INSERT INTO thumbnails (id, name, dataUrl, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5)",
        [
          newItem.id,
          newItem.name,
          newItem.dataUrl,
          newItem.createdAt,
          newItem.updatedAt,
        ]
      );
      console.log("[Gallery] Thumbnail saved:", newItem.id);
    } catch (error) {
      console.error("[Gallery] Failed to save thumbnail:", error);
      set({ dbError: String(error) });
    }
  },
  duplicateThumbnail: async (id) => {
    const original = get().thumbnails.find((t) => t.id === id);
    if (!original) {
      return;
    }
    const newItem: ThumbnailItem = {
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      dataUrl: original.dataUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layerData: original.layerData,
      canvasWidth: original.canvasWidth,
      canvasHeight: original.canvasHeight,
    };
    console.log("[Gallery] Duplicating thumbnail:", original.name);
    set((state) => ({ thumbnails: [newItem, ...state.thumbnails] }));
    try {
      const database = await getDb();
      await database.execute(
        "INSERT INTO thumbnails (id, name, dataUrl, createdAt, updatedAt, layerData, canvasWidth, canvasHeight) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          newItem.id,
          newItem.name,
          newItem.dataUrl,
          newItem.createdAt,
          newItem.updatedAt,
          newItem.layerData || null,
          newItem.canvasWidth || null,
          newItem.canvasHeight || null,
        ]
      );
      console.log("[Gallery] Duplicate saved:", newItem.id);
    } catch (error) {
      console.error("[Gallery] Failed to duplicate thumbnail:", error);
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
    const layerData = JSON.stringify(layers);
    const projectId = id || crypto.randomUUID();
    const now = Date.now();
    console.log(
      "[Gallery] Saving project:",
      name,
      "with",
      layers.length,
      "layers"
    );
    const existingItem = get().thumbnails.find((t) => t.id === projectId);
    if (existingItem) {
      set((state) => ({
        thumbnails: state.thumbnails.map((t) =>
          t.id === projectId
            ? {
                ...t,
                name,
                dataUrl: previewDataUrl,
                layerData,
                canvasWidth,
                canvasHeight,
                updatedAt: now,
              }
            : t
        ),
      }));
      try {
        const database = await getDb();
        await database.execute(
          "UPDATE thumbnails SET name = $1, dataUrl = $2, layerData = $3, canvasWidth = $4, canvasHeight = $5, updatedAt = $6 WHERE id = $7",
          [
            name,
            previewDataUrl,
            layerData,
            canvasWidth,
            canvasHeight,
            now,
            projectId,
          ]
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
        dataUrl: previewDataUrl,
        createdAt: now,
        updatedAt: now,
        layerData,
        canvasWidth,
        canvasHeight,
      };
      set((state) => ({ thumbnails: [newItem, ...state.thumbnails] }));
      try {
        const database = await getDb();
        await database.execute(
          "INSERT INTO thumbnails (id, name, dataUrl, createdAt, updatedAt, layerData, canvasWidth, canvasHeight) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [
            projectId,
            name,
            previewDataUrl,
            now,
            now,
            layerData,
            canvasWidth,
            canvasHeight,
          ]
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
    set((state) => ({
      thumbnails: state.thumbnails.map((t) =>
        t.id === id ? { ...t, dataUrl, updatedAt: now } : t
      ),
    }));
    try {
      const database = await getDb();
      await database.execute(
        "UPDATE thumbnails SET dataUrl = $1, updatedAt = $2 WHERE id = $3",
        [dataUrl, now, id]
      );
    } catch (error) {
      console.error("[Gallery] Failed to update thumbnail:", error);
      set({ dbError: String(error) });
    }
  },
  deleteThumbnail: async (id) => {
    set((state) => ({
      thumbnails: state.thumbnails.filter((t) => t.id !== id),
    }));
    try {
      const database = await getDb();
      await database.execute("DELETE FROM thumbnails WHERE id = $1", [id]);
    } catch (error) {
      console.error("[Gallery] Failed to delete:", error);
      set({ dbError: String(error) });
    }
  },
  loadFromDb: async () => {
    console.log("[Gallery] Loading thumbnails from DB...");
    try {
      const database = await getDb();
      const result = await database.select<ThumbnailItem[]>(
        "SELECT id, name, dataUrl, createdAt, updatedAt, layerData, canvasWidth, canvasHeight FROM thumbnails ORDER BY updatedAt DESC"
      );
      console.log("[Gallery] Loaded", result.length, "thumbnails");
      set({ thumbnails: result, isLoaded: true, dbError: null });
    } catch (error) {
      console.error("[Gallery] Failed to load:", error);
      set({ isLoaded: true, dbError: String(error) });
    }
  },
}));
useGalleryStore.getState().loadFromDb();
