import { create } from "zustand";

interface GalleryUIState {
  // Last clicked item index for scroll restoration
  lastClickedIndex: number | null;
  setLastClickedIndex: (index: number | null) => void;
  // Scroll offset for restoration when navigating back
  scrollOffset: number;
  setScrollOffset: (offset: number) => void;
}

export const useGalleryUIStore = create<GalleryUIState>()((set) => ({
  lastClickedIndex: null,
  setLastClickedIndex: (index) => set({ lastClickedIndex: index }),
  scrollOffset: 0,
  setScrollOffset: (offset) => set({ scrollOffset: offset }),
}));
