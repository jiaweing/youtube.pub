import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Icon to display */
  icon: ReactNode;
  /** Main title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional action button */
  action?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
  };
}

/**
 * Empty state component for galleries and pages without content.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="text-muted-foreground opacity-40">{icon}</div>
      <div className="text-center">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-muted-foreground text-sm">{description}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} variant="ghost">
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}
