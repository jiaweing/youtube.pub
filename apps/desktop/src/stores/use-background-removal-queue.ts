import { create } from "zustand";
import { useGalleryStore } from "./use-gallery-store";

export type QueueItemStatus = "pending" | "processing" | "done" | "error";

export interface QueueItem {
  id: string;
  thumbnailId: string;
  name: string;
  status: QueueItemStatus;
  error?: string;
}

interface BackgroundRemovalQueueState {
  queue: QueueItem[];
  isProcessing: boolean;
  addToQueue: (
    items: { thumbnailId: string; name: string; dataUrl: string }[]
  ) => void;
  processQueue: () => Promise<void>;
  removeFromQueue: (id: string) => void;
  clearCompleted: () => void;
}

export const useBackgroundRemovalQueue = create<BackgroundRemovalQueueState>()(
  (set, get) => ({
    queue: [],
    isProcessing: false,

    addToQueue: (items) => {
      const newItems: QueueItem[] = items.map((item) => ({
        id: crypto.randomUUID(),
        thumbnailId: item.thumbnailId,
        name: item.name,
        status: "pending" as const,
      }));

      set((state) => ({
        queue: [...state.queue, ...newItems],
      }));

      // Store dataUrls in a map for processing
      for (const item of items) {
        dataUrlCache.set(item.thumbnailId, item.dataUrl);
      }

      // Start processing if not already
      if (!get().isProcessing) {
        get().processQueue();
      }
    },

    processQueue: async () => {
      const { queue, isProcessing } = get();
      if (isProcessing) {
        return;
      }

      const pendingItem = queue.find((item) => item.status === "pending");
      if (!pendingItem) {
        return;
      }

      set({ isProcessing: true });

      // Update status to processing
      set((state) => ({
        queue: state.queue.map((item) =>
          item.id === pendingItem.id ? { ...item, status: "processing" } : item
        ),
      }));

      try {
        const dataUrl = dataUrlCache.get(pendingItem.thumbnailId);
        if (!dataUrl) {
          throw new Error("Image data not found");
        }

        const { removeBackgroundAsync } = await import(
          "@/lib/background-removal"
        );
        const resultDataUrl = await removeBackgroundAsync(dataUrl);

        // Add the result as a new thumbnail
        const addThumbnail = useGalleryStore.getState().addThumbnail;
        await addThumbnail(resultDataUrl, `${pendingItem.name} (no bg)`);

        // Update status to done
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === pendingItem.id ? { ...item, status: "done" } : item
          ),
        }));

        // Clean up cache
        dataUrlCache.delete(pendingItem.thumbnailId);
      } catch (error) {
        // Update status to error
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === pendingItem.id
              ? { ...item, status: "error", error: String(error) }
              : item
          ),
        }));
      }

      set({ isProcessing: false });

      // Process next item
      const remaining = get().queue.find((item) => item.status === "pending");
      if (remaining) {
        get().processQueue();
      }
    },

    removeFromQueue: (id) =>
      set((state) => ({
        queue: state.queue.filter((item) => item.id !== id),
      })),

    clearCompleted: () =>
      set((state) => ({
        queue: state.queue.filter(
          (item) => item.status !== "done" && item.status !== "error"
        ),
      })),
  })
);

// Cache for image data URLs (temporary storage during processing)
const dataUrlCache = new Map<string, string>();
