import { create } from "zustand";

interface SelectionState {
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelectionMode: () => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  exitSelectionMode: () => void;
}

export const useSelectionStore = create<SelectionState>()((set) => ({
  isSelectionMode: false,
  selectedIds: new Set(),

  toggleSelectionMode: () =>
    set((state) => ({
      isSelectionMode: !state.isSelectionMode,
      selectedIds: state.isSelectionMode ? new Set() : state.selectedIds,
    })),

  toggleSelection: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedIds: newSelected };
    }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),

  clearSelection: () => set({ selectedIds: new Set() }),

  exitSelectionMode: () =>
    set({ isSelectionMode: false, selectedIds: new Set() }),
}));
