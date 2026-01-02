import { create } from "zustand";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
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
    logger.info({ itemName: item.name }, "[Trash] Moving to trash");

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
      logger.info({ itemId: item.id }, "[Trash] Item moved to trash");
    } catch (error) {
      logger.error({ err: error }, "[Trash] Failed to move to trash");
    }
  },

  moveToTrashBatch: async (items) => {
    if (items.length === 0) {
      return;
    }

    const deletedAt = Date.now();
    logger.info({ count: items.length }, "[Trash] Batch moving items to trash");

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

      logger.info({ count: trashItems.length }, "[Trash] Batch move completed");
    } catch (error) {
      logger.error({ err: error }, "[Trash] Failed to batch move");

      // Rollback files
      logger.info("[Trash] Rolling back file moves...");
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

    logger.info({ itemName: item.name }, "[Trash] Restoring from trash");

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
      logger.info({ itemId: id }, "[Trash] Item restored");
    } catch (error) {
      logger.error({ err: error }, "[Trash] Failed to restore");
    }

    return item;
  },

  restoreFromTrashBatch: async (ids) => {
    if (ids.length === 0) {
      return [];
    }

    const idsSet = new Set(ids);
    const items = get().trashItems.filter((t) => idsSet.has(t.id));

    logger.info({ count: items.length }, "[Trash] Batch restoring items");

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

      logger.info({ count: items.length }, "[Trash] Batch restore completed");
    } catch (error) {
      logger.error({ err: error }, "[Trash] Failed to batch restore");
      throw error;
    }

    return items;
  },

  deletePermanently: async (id) => {
    logger.info({ itemId: id }, "[Trash] Permanently deleting");

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
      logger.error({ err: error }, "[Trash] Failed to delete permanently");
    }
  },

  deletePermanentlyBatch: async (ids) => {
    if (ids.length === 0) {
      return;
    }

    const idsSet = new Set(ids);
    logger.info(
      { count: ids.length },
      "[Trash] Batch permanently deleting items"
    );

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

      logger.info(
        { count: ids.length },
        "[Trash] Batch permanent delete completed"
      );
    } catch (error) {
      logger.error(
        { err: error },
        "[Trash] Failed to batch delete permanently"
      );
      throw error;
    }
  },

  emptyTrash: async () => {
    const items = get().trashItems;
    logger.info({ count: items.length }, "[Trash] Emptying trash items");

    for (const item of items) {
      await deleteFromTrash(item.id);
    }

    set({ trashItems: [], previewCache: new Map() });

    try {
      const database = await getDb();
      await database.execute("DELETE FROM trash");
      logger.info("[Trash] Trash emptied");
    } catch (error) {
      logger.error({ err: error }, "[Trash] Failed to empty trash");
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

    logger.info(
      { count: expiredItems.length },
      "[Trash] Cleaning up expired items"
    );

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
      logger.info("[Trash] Cleanup completed");
    } catch (error) {
      logger.error({ err: error }, "[Trash] Failed to cleanup expired");
    }
  },

  loadFromDb: async () => {
    logger.info("[Trash] Loading from DB...");
    try {
      const database = await getDb();
      const result = await database.select<TrashItem[]>(
        "SELECT id, name, deletedAt, originalCreatedAt, originalUpdatedAt, canvasWidth, canvasHeight FROM trash ORDER BY deletedAt DESC"
      );
      logger.info({ count: result.length }, "[Trash] Loaded items");
      set({ trashItems: result, isLoaded: true });

      // Auto-cleanup expired items
      get().cleanupExpired();
    } catch (error) {
      logger.error({ err: error }, "[Trash] Failed to load");
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
