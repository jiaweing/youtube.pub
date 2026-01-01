import { Copy, Loader2, Trash2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectionToolbarProps {
  selectedCount: number;
  isDuplicating: boolean;
  onClearSelection: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRemoveBackground: () => void;
}

export function SelectionToolbar({
  selectedCount,
  isDuplicating,
  onClearSelection,
  onDuplicate,
  onDelete,
  onRemoveBackground,
}: SelectionToolbarProps) {
  return (
    <div className="flex flex-1 items-center justify-center gap-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={onClearSelection}
          size="icon-sm"
          title="Clear selection"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
        <span className="font-medium text-sm">{selectedCount} selected</span>
      </div>
      <div className="h-4 w-px bg-border" />
      <Button
        disabled={isDuplicating}
        onClick={onDuplicate}
        size="sm"
        variant="ghost"
      >
        {isDuplicating ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Copy className="mr-2 size-4" />
        )}
        {isDuplicating ? "Duplicating..." : "Duplicate"}
      </Button>
      <Button
        className="text-destructive hover:text-destructive"
        onClick={onDelete}
        size="sm"
        variant="ghost"
      >
        <Trash2 className="mr-2 size-4" />
        Delete
      </Button>
      <Button onClick={onRemoveBackground} size="sm" variant="ghost">
        <Wand2 className="mr-2 size-4" />
        Remove BG
      </Button>
    </div>
  );
}
