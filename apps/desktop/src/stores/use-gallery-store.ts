import { create } from "zustand";
import { getDb } from "@/lib/db";
import {
  loadFullImage,
  loadLayerData,
  loadPreview,
  saveLayerData,
  saveThumbnail,
} from "@/lib/thumbnail-storage";
import { useTrashStore } from "@/stores/use-trash-store";

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
  restoreThumbnail: (trashItem: {
    id: string;
    name: string;
    originalCreatedAt: number;
    originalUpdatedAt: number;
    canvasWidth?: number;
    canvasHeight?: number;
  }) => Promise<void>;
  loadFromDb: () => Promise<void>;

  // Lazy loading
  loadPreviewForId: (id: string) => Promise<string | null>;
  loadFullImageForId: (id: string) => Promise<string | null>;
  loadLayerDataForId: (id: string) => Promise<Layer[] | null>;
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
    const itemName =
      name ||
      `;
Thumbnail;
$;
{
  get().thumbnails.length + 1;
}
`;

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
      name: `;
$;
{
  original.name;
}
Copy`,
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
    const newPreviews = new Map<string, string>();

    // Process each original in parallel
    const promises = originals.map(async (original, i) => {
      const fullImage = await loadFullImage(original.id);
      if (!fullImage) {
        return null;
      }

      const newId = crypto.randomUUID();
      const { previewUrl } = await saveThumbnail(newId, fullImage);

      // Copy layer data if exists
      const layers = await loadLayerData(original.id);
      if (layers) {
        await saveLayerData(newId, layers);
      }

      newPreviews.set(newId, previewUrl);

      return {
        id: newId,
        name: `${original.name} (Copy)`,
        createdAt: now + i,
        updatedAt: now + i,
        canvasWidth: original.canvasWidth,
        canvasHeight: original.canvasHeight,
        previewUrl,
      };
    });

    const results = await Promise.all(promises);
    const newItems = results.filter(
      (item): item is ThumbnailItem => item !== null
    );

    // Single state update
    set((state) => ({
      thumbnails: [...newItems, ...state.thumbnails],
      previewCache: new Map([...state.previewCache, ...newPreviews]),
    }));

    // Batch DB insert
    try {
      const database = await getDb();
      await database.execute("BEGIN TRANSACTION");

      // Chunk inserts to avoid SQLite parameter limits (safe limit ~900 params)
      // 6 params per item implies max 150 items per chunk. Using 50 for safety.
      const BATCH_SIZE = 50;
      for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
        const chunk = newItems.slice(i, i + BATCH_SIZE);
        const placeholders = chunk
          .map(
            (_, idx) =>
              `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6})`
          )
          .join(", ");

        const values = chunk.flatMap((item) => [
          item.id,
          item.name,
          item.createdAt,
          item.updatedAt,
          item.canvasWidth || null,
          item.canvasHeight || null,
        ]);

        await database.execute(
          `INSERT INTO thumbnails (id, name, createdAt, updatedAt, canvasWidth, canvasHeight) VALUES ${placeholders}`,
          values
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
    const thumbnail = get().thumbnails.find((t) => t.id === id);
    if (!thumbnail) {
      return;
    }

    // Move to trash
    await useTrashStore.getState().moveToTrash({
      id: thumbnail.id,
      name: thumbnail.name,
      createdAt: thumbnail.createdAt,
      updatedAt: thumbnail.updatedAt,
      canvasWidth: thumbnail.canvasWidth,
      canvasHeight: thumbnail.canvasHeight,
    });

    // Remove from gallery state
    set((state) => {
      const newCache = new Map(state.previewCache);
      newCache.delete(id);
      return {
        thumbnails: state.thumbnails.filter((t) => t.id !== id),
        previewCache: newCache,
      };
    });

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
    const thumbnailsToTrash = get().thumbnails.filter((t) => idsSet.has(t.id));
    console.log(
      "[Gallery] Moving",
      thumbnailsToTrash.length,
      "thumbnails to trash"
    );

    // Move to trash
    await useTrashStore.getState().moveToTrashBatch(
      thumbnailsToTrash.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        canvasWidth: t.canvasWidth,
        canvasHeight: t.canvasHeight,
      }))
    );

    // Remove from gallery state
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

    try {
      const database = await getDb();
      await database.execute("BEGIN TRANSACTION");

      // Chunk deletes
      const BATCH_SIZE = 500;
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const chunk = ids.slice(i, i + BATCH_SIZE);
        const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(", ");
        await database.execute(
          `DELETE FROM thumbnails WHERE id IN (${placeholders})`,
          chunk
        );
      }

      await database.execute("COMMIT");
      console.log("[Gallery] Batch move to trash completed:", ids.length);
    } catch (error) {
      console.error("[Gallery] Failed to batch delete:", error);
      try {
        const database = await getDb();
        await database.execute("ROLLBACK");
      } catch {}
      set({ dbError: String(error) });
    }
  },

  restoreThumbnail: async (trashItem) => {
    console.log("[Gallery] Restoring from trash:", trashItem.name);

    const restoredItem: ThumbnailItem = {
      id: trashItem.id,
      name: trashItem.name,
      createdAt: trashItem.originalCreatedAt,
      updatedAt: trashItem.originalUpdatedAt,
      canvasWidth: trashItem.canvasWidth,
      canvasHeight: trashItem.canvasHeight,
    };

    set((state) => ({
      thumbnails: [restoredItem, ...state.thumbnails],
    }));

    try {
      const database = await getDb();
      await database.execute(
        "INSERT INTO thumbnails (id, name, createdAt, updatedAt, canvasWidth, canvasHeight) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          restoredItem.id,
          restoredItem.name,
          restoredItem.createdAt,
          restoredItem.updatedAt,
          restoredItem.canvasWidth || null,
          restoredItem.canvasHeight || null,
        ]
      );
      console.log("[Gallery] Thumbnail restored:", restoredItem.id);
    } catch (error) {
      console.error("[Gallery] Failed to restore thumbnail:", error);
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
