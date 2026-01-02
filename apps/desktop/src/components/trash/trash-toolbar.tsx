import { Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrashToolbarProps {
  isSelectionMode: boolean;
  selectedCount: number;
  trashItemCount: number;
  isProcessing: boolean;
  onExitSelectionMode: () => void;
  onRestoreSelected: () => void;
  onDeleteSelected: () => void;
  onRestoreAll: () => void;
  onEmptyTrash: () => void;
  onEnterSelectionMode: () => void;
}

export function TrashToolbar({
  isSelectionMode,
  selectedCount,
  trashItemCount,
  isProcessing,
  onExitSelectionMode,
  onRestoreSelected,
  onDeleteSelected,
  onRestoreAll,
  onEmptyTrash,
  onEnterSelectionMode,
}: TrashToolbarProps) {
  return (
    <div className="flex h-12 items-center justify-between border-border border-t bg-background/50 px-4 backdrop-blur-sm">
      {isSelectionMode ? (
        <div className="flex flex-1 items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              aria-label="Clear Selection"
              onClick={onExitSelectionMode}
              size="icon-sm"
              title="Clear selection"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
            <span className="font-medium text-sm">
              {selectedCount} selected
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={isProcessing || selectedCount === 0}
                onClick={onRestoreSelected}
                size="sm"
                variant="ghost"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 size-4" />
                )}
                Restore
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>Ctrl+E</span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="text-destructive hover:text-destructive"
                disabled={isProcessing || selectedCount === 0}
                onClick={onDeleteSelected}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>Delete or Backspace</span>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <>
          <div /> {/* Spacer for left side */}
          <div className="flex items-center gap-2">
            {trashItemCount > 0 && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={onRestoreAll} size="sm" variant="ghost">
                      <RotateCcw className="mr-2 size-4" />
                      Restore All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Ctrl+Shift+E</span>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="text-destructive hover:text-destructive"
                      onClick={onEmptyTrash}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Empty Trash
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Ctrl+Shift+D</span>
                  </TooltipContent>
                </Tooltip>
                <div className="h-4 w-px bg-border" />
              </>
            )}
            <Button
              aria-label="Enter Selection Mode"
              onClick={onEnterSelectionMode}
              size="sm"
              variant="ghost"
            >
              Select
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
