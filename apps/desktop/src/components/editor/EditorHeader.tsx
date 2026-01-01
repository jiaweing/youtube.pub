import { ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EditorHeaderProps {
  projectName: string;
  hasUnsavedChanges: boolean;
  onClose: () => void;
  onShowConfirmClose: () => void;
  onNameChange: (name: string) => void;
}

export function EditorHeader({
  projectName,
  hasUnsavedChanges,
  onClose,
  onShowConfirmClose,
  onNameChange,
}: EditorHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      onShowConfirmClose();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="flex shrink-0 items-center gap-3 border-border border-b px-3 py-2"
      data-tauri-drag-region
    >
      <Tooltip>
        <TooltipTrigger
          className={`${buttonVariants({
            size: "icon-sm",
            variant: "ghost",
          })} relative z-101`}
          onClick={handleBack}
        >
          <ArrowLeft className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Back to Gallery</TooltipContent>
      </Tooltip>
      {isEditingName ? (
        <input
          className="relative z-101 max-w-50 border-none bg-transparent text-sm outline-none"
          defaultValue={projectName}
          onBlur={(e) => {
            onNameChange(e.target.value);
            setIsEditingName(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
            if (e.key === "Escape") {
              setIsEditingName(false);
            }
          }}
          ref={nameInputRef}
        />
      ) : (
        <span
          className="relative z-101 cursor-text truncate text-muted-foreground text-sm hover:text-foreground"
          onClick={() => {
            setIsEditingName(true);
            setTimeout(() => nameInputRef.current?.focus(), 0);
          }}
          onKeyDown={() => {}}
        >
          {projectName}
        </span>
      )}
    </div>
  );
}
