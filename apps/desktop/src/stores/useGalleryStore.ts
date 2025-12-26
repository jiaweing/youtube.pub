import { createStore, del, get, set } from "idb-keyval";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ThumbnailItem {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

interface GalleryState {
  thumbnails: ThumbnailItem[];
  addThumbnail: (dataUrl: string, name?: string) => void;
  updateThumbnail: (id: string, dataUrl: string) => void;
  deleteThumbnail: (id: string) => void;
}

const thumbnailStore = createStore("thumbnails-db", "thumbnails");

export const useGalleryStore = create<GalleryState>()(
  persist(
    (setState, getState) => ({
      thumbnails: [],
      addThumbnail: (dataUrl, name) => {
        const newItem: ThumbnailItem = {
          id: crypto.randomUUID(),
          name: name || `Thumbnail ${getState().thumbnails.length + 1}`,
          dataUrl,
          createdAt: Date.now(),
        };
        setState((state) => ({
          thumbnails: [newItem, ...state.thumbnails],
        }));
      },
      updateThumbnail: (id, dataUrl) => {
        setState((state) => ({
          thumbnails: state.thumbnails.map((t) =>
            t.id === id ? { ...t, dataUrl } : t
          ),
        }));
      },
      deleteThumbnail: (id) => {
        setState((state) => ({
          thumbnails: state.thumbnails.filter((t) => t.id !== id),
        }));
      },
    }),
    {
      name: "gallery-storage",
      storage: {
        getItem: async (name) => {
          const value = await get(name, thumbnailStore);
          return value ?? null;
        },
        setItem: async (name, value) => {
          await set(name, value, thumbnailStore);
        },
        removeItem: async (name) => {
          await del(name, thumbnailStore);
        },
      },
    }
  )
);
