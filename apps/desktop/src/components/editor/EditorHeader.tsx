import { ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";
import { TitleBar } from "@/components/TitleBar";
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
    <TitleBar
      className="h-12 border-b-0"
      showIcon={false}
      title={
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger
              className={buttonVariants({
                size: "icon-sm",
                variant: "ghost",
              })}
              onClick={handleBack}
            >
              <ArrowLeft className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Back to Gallery</TooltipContent>
          </Tooltip>
          {isEditingName ? (
            <input
              autoFocus
              className="max-w-50 border-none bg-transparent font-medium text-sm outline-none"
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
              className="cursor-text truncate font-medium text-muted-foreground text-sm hover:text-foreground"
              onClick={() => {
                setIsEditingName(true);
                setTimeout(() => nameInputRef.current?.focus(), 0);
              }}
            >
              {projectName}
            </span>
          )}
        </div>
      }
    />
  );
}
