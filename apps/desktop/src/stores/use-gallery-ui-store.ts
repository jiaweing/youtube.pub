import { create } from "zustand";

interface GalleryUIState {
  // Last clicked item index for scroll restoration
  lastClickedIndex: number | null;
  setLastClickedIndex: (index: number | null) => void;
}

export const useGalleryUIStore = create<GalleryUIState>()((set) => ({
  lastClickedIndex: null,
  setLastClickedIndex: (index) => set({ lastClickedIndex: index }),
}));
