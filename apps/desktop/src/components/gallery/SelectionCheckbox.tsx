import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectionCheckboxProps {
  /** Whether the item is currently selected */
  isSelected: boolean;
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** Optional class name for the container */
  className?: string;
}

/**
 * Selection checkbox overlay for gallery/trash items.
 * Shows a check icon when selected, or an empty circle when in selection mode but not selected.
 */
export function SelectionCheckbox({
  isSelected,
  isSelectionMode,
  className,
}: SelectionCheckboxProps) {
  // Only show when in selection mode or when selected
  if (!(isSelectionMode || isSelected)) {
    return null;
  }

  return (
    <div className={cn("absolute top-2 left-2 z-20", className)}>
      {isSelected ? (
        <div className="flex size-6 items-center justify-center rounded-full bg-white text-black shadow-md">
          <Check className="size-4" />
        </div>
      ) : (
        <div className="flex size-6 items-center justify-center rounded-full border-2 border-white/80 bg-black/30 shadow-md">
          <Circle className="size-4 text-transparent" />
        </div>
      )}
    </div>
  );
}
