import { create } from "zustand";
import { getDb } from "@/lib/db";
import {
  deleteFromTrash,
  loadTrashPreview,
  moveFilesToTrash,
  restoreFilesFromTrash,
} from "@/lib/thumbnail-storage";

export interface TrashItem {
  id: string;
  name: string;
  deletedAt: number;
  originalCreatedAt: number;
  originalUpdatedAt: number;
  canvasWidth?: number;
  canvasHeight?: number;
  // Lazy loaded
  previewUrl?: string;
}

interface TrashState {
  trashItems: TrashItem[];
  isLoaded: boolean;
  previewCache: Map<string, string>;

  // Actions
  moveToTrash: (item: {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    canvasWidth?: number;
    canvasHeight?: number;
  }) => Promise<void>;
  moveToTrashBatch: (
    items: {
      id: string;
      name: string;
      createdAt: number;
      updatedAt: number;
      canvasWidth?: number;
      canvasHeight?: number;
    }[]
  ) => Promise<void>;
  restoreFromTrash: (id: string) => Promise<TrashItem | null>;
  restoreFromTrashBatch: (ids: string[]) => Promise<TrashItem[]>;
  deletePermanently: (id: string) => Promise<void>;
  deletePermanentlyBatch: (ids: string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;
  cleanupExpired: () => Promise<void>;
  loadFromDb: () => Promise<void>;
  loadPreviewForId: (id: string) => Promise<string | null>;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const useTrashStore = create<TrashState>()((set, get) => ({
  trashItems: [],
  isLoaded: false,
  previewCache: new Map(),

  moveToTrash: async (item) => {
    const deletedAt = Date.now();
    console.log("[Trash] Moving to trash:", item.name);

    // Move files to trash directory
    await moveFilesToTrash(item.id);

    const trashItem: TrashItem = {
      id: item.id,
      name: item.name,
      deletedAt,
      originalCreatedAt: item.createdAt,
      originalUpdatedAt: item.updatedAt,
      canvasWidth: item.canvasWidth,
      canvasHeight: item.canvasHeight,
    };

    set((state) => ({
      trashItems: [trashItem, ...state.trashItems],
    }));

    try {
      const database = await getDb();
      await database.execute(
        "INSERT INTO trash (id, name, deletedAt, originalCreatedAt, originalUpdatedAt, canvasWidth, canvasHeight) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          item.id,
          item.name,
          deletedAt,
          item.createdAt,
          item.updatedAt,
          item.canvasWidth || null,
          item.canvasHeight || null,
        ]
      );
      console.log("[Trash] Item moved to trash:", item.id);
    } catch (error) {
      console.error("[Trash] Failed to move to trash:", error);
    }
  },

  moveToTrashBatch: async (items) => {
    if (items.length === 0) {
      return;
    }

    const deletedAt = Date.now();
    console.log("[Trash] Batch moving", items.length, "items to trash");

    // Parallel file moves
    await Promise.all(items.map((item) => moveFilesToTrash(item.id)));

    // Create trash items
    const trashItems: TrashItem[] = items.map((item, i) => ({
      id: item.id,
      name: item.name,
      deletedAt: deletedAt + i,
      originalCreatedAt: item.createdAt,
      originalUpdatedAt: item.updatedAt,
      canvasWidth: item.canvasWidth,
      canvasHeight: item.canvasHeight,
    }));

    set((state) => ({
      trashItems: [...trashItems, ...state.trashItems],
    }));

    // Chunk inserts
    try {
      const database = await getDb();

      // Chunk inserts
      const BATCH_SIZE = 50;
      for (let i = 0; i < trashItems.length; i += BATCH_SIZE) {
        const chunk = trashItems.slice(i, i + BATCH_SIZE);
        const placeholders = chunk
          .map(
            (_, idx) =>
              `($${idx * 7 + 1}, $${idx * 7 + 2}, $${idx * 7 + 3}, $${idx * 7 + 4}, $${idx * 7 + 5}, $${idx * 7 + 6}, $${idx * 7 + 7})`
          )
          .join(", ");

        const values = chunk.flatMap((item) => [
          item.id,
          item.name,
          item.deletedAt,
          item.originalCreatedAt,
          item.originalUpdatedAt,
          item.canvasWidth || null,
          item.canvasHeight || null,
        ]);

        await database.execute(
          `INSERT INTO trash (id, name, deletedAt, originalCreatedAt, originalUpdatedAt, canvasWidth, canvasHeight) VALUES ${placeholders}`,
          values
        );
      }

      console.log("[Trash] Batch move completed:", trashItems.length);
    } catch (error) {
      console.error("[Trash] Failed to batch move:", error);

      // Rollback files
      console.log("[Trash] Rolling back file moves...");
      await Promise.all(items.map((item) => restoreFilesFromTrash(item.id)));

      // Rollback state
      const idsToRemove = new Set(items.map((i) => i.id));
      set((state) => ({
        trashItems: state.trashItems.filter((t) => !idsToRemove.has(t.id)),
      }));

      throw error;
    }
  },

  restoreFromTrash: async (id) => {
    const item = get().trashItems.find((t) => t.id === id);
    if (!item) {
      return null;
    }

    console.log("[Trash] Restoring from trash:", item.name);

    // Move files back from trash
    await restoreFilesFromTrash(id);

    set((state) => {
      const newCache = new Map(state.previewCache);
      newCache.delete(id);
      return {
        trashItems: state.trashItems.filter((t) => t.id !== id),
        previewCache: newCache,
      };
    });

    try {
      const database = await getDb();
      await database.execute("DELETE FROM trash WHERE id = $1", [id]);
      console.log("[Trash] Item restored:", id);
    } catch (error) {
      console.error("[Trash] Failed to restore:", error);
    }

    return item;
  },

  restoreFromTrashBatch: async (ids) => {
    if (ids.length === 0) {
      return [];
    }

    const idsSet = new Set(ids);
    const items = get().trashItems.filter((t) => idsSet.has(t.id));

    console.log("[Trash] Batch restoring", items.length, "items");

    // Parallel file moves
    await Promise.all(items.map((item) => restoreFilesFromTrash(item.id)));

    set((state) => {
      const newCache = new Map(state.previewCache);
      for (const id of ids) {
        newCache.delete(id);
      }
      return {
        trashItems: state.trashItems.filter((t) => !idsSet.has(t.id)),
        previewCache: newCache,
      };
    });

    try {
      const database = await getDb();

      // Chunk deletes
      const BATCH_SIZE = 500;
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const chunk = ids.slice(i, i + BATCH_SIZE);
        const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(", ");
        await database.execute(
          `DELETE FROM trash WHERE id IN (${placeholders})`,
          chunk
        );
      }

      console.log("[Trash] Batch restore completed:", items.length);
    } catch (error) {
      console.error("[Trash] Failed to batch restore:", error);
      throw error;
    }

    return items;
  },

  deletePermanently: async (id) => {
    console.log("[Trash] Permanently deleting:", id);

    // Delete files from trash directory
    await deleteFromTrash(id);

    set((state) => {
      const newCache = new Map(state.previewCache);
      newCache.delete(id);
      return {
        trashItems: state.trashItems.filter((t) => t.id !== id),
        previewCache: newCache,
      };
    });

    try {
      const database = await getDb();
      await database.execute("DELETE FROM trash WHERE id = $1", [id]);
    } catch (error) {
      console.error("[Trash] Failed to delete permanently:", error);
    }
  },

  deletePermanentlyBatch: async (ids) => {
    if (ids.length === 0) {
      return;
    }

    const idsSet = new Set(ids);
    console.log("[Trash] Batch permanently deleting", ids.length, "items");

    // Parallel file deletes
    await Promise.all(ids.map((id) => deleteFromTrash(id)));

    set((state) => {
      const newCache = new Map(state.previewCache);
      for (const id of ids) {
        newCache.delete(id);
      }
      return {
        trashItems: state.trashItems.filter((t) => !idsSet.has(t.id)),
        previewCache: newCache,
      };
    });

    try {
      const database = await getDb();

      // Chunk deletes
      const BATCH_SIZE = 500;
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const chunk = ids.slice(i, i + BATCH_SIZE);
        const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(", ");
        await database.execute(
          `DELETE FROM trash WHERE id IN (${placeholders})`,
          chunk
        );
      }

      console.log("[Trash] Batch permanent delete completed:", ids.length);
    } catch (error) {
      console.error("[Trash] Failed to batch delete permanently:", error);
      throw error;
    }
  },

  emptyTrash: async () => {
    const items = get().trashItems;
    console.log("[Trash] Emptying trash:", items.length, "items");

    for (const item of items) {
      await deleteFromTrash(item.id);
    }

    set({ trashItems: [], previewCache: new Map() });

    try {
      const database = await getDb();
      await database.execute("DELETE FROM trash");
      console.log("[Trash] Trash emptied");
    } catch (error) {
      console.error("[Trash] Failed to empty trash:", error);
    }
  },

  cleanupExpired: async () => {
    const now = Date.now();
    const expiredItems = get().trashItems.filter(
      (item) => now - item.deletedAt > THIRTY_DAYS_MS
    );

    if (expiredItems.length === 0) {
      return;
    }

    console.log("[Trash] Cleaning up", expiredItems.length, "expired items");

    for (const item of expiredItems) {
      await deleteFromTrash(item.id);
    }

    const expiredIds = new Set(expiredItems.map((i) => i.id));
    set((state) => {
      const newCache = new Map(state.previewCache);
      for (const id of expiredIds) {
        newCache.delete(id);
      }
      return {
        trashItems: state.trashItems.filter((t) => !expiredIds.has(t.id)),
        previewCache: newCache,
      };
    });

    try {
      const database = await getDb();
      const cutoff = now - THIRTY_DAYS_MS;
      await database.execute("DELETE FROM trash WHERE deletedAt < $1", [
        cutoff,
      ]);
      console.log("[Trash] Cleanup completed");
    } catch (error) {
      console.error("[Trash] Failed to cleanup expired:", error);
    }
  },

  loadFromDb: async () => {
    console.log("[Trash] Loading from DB...");
    try {
      const database = await getDb();
      const result = await database.select<TrashItem[]>(
        "SELECT id, name, deletedAt, originalCreatedAt, originalUpdatedAt, canvasWidth, canvasHeight FROM trash ORDER BY deletedAt DESC"
      );
      console.log("[Trash] Loaded", result.length, "items");
      set({ trashItems: result, isLoaded: true });

      // Auto-cleanup expired items
      get().cleanupExpired();
    } catch (error) {
      console.error("[Trash] Failed to load:", error);
      set({ isLoaded: true });
    }
  },

  loadPreviewForId: async (id) => {
    const cached = get().previewCache.get(id);
    if (cached) {
      return cached;
    }

    const previewUrl = await loadTrashPreview(id);
    if (previewUrl) {
      set((state) => ({
        previewCache: new Map(state.previewCache).set(id, previewUrl),
      }));
    }
    return previewUrl;
  },
}));

// Initialize on module load
useTrashStore.getState().loadFromDb();
