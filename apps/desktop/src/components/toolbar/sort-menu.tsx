import {
  ArrowDownAZ,
  ArrowUpZA,
  Calendar,
  ChevronDown,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type SortField, useGalleryStore } from "@/stores/use-gallery-store";

const sortOptions: {
  field: SortField;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    field: "updatedAt",
    label: "Last Edited",
    icon: <Clock className="size-3" />,
  },
  {
    field: "createdAt",
    label: "Date Added",
    icon: <Calendar className="size-3" />,
  },
  { field: "name", label: "Name", icon: <ArrowDownAZ className="size-3" /> },
];

export function SortMenu() {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortField = useGalleryStore((s) => s.sortField);
  const sortOrder = useGalleryStore((s) => s.sortOrder);
  const setSortField = useGalleryStore((s) => s.setSortField);
  const setSortOrder = useGalleryStore((s) => s.setSortOrder);

  const currentSortOption = sortOptions.find((o) => o.field === sortField);

  return (
    <div className="relative">
      <Button
        className="gap-1"
        onClick={() => setShowSortMenu(!showSortMenu)}
        size="sm"
        variant="ghost"
      >
        {currentSortOption?.icon}
        <span className="text-xs">{currentSortOption?.label}</span>
        {sortOrder === "desc" ? (
          <ArrowDownAZ className="size-3 text-muted-foreground" />
        ) : (
          <ArrowUpZA className="size-3 text-muted-foreground" />
        )}
        <ChevronDown className="size-3 text-muted-foreground" />
      </Button>
      {showSortMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSortMenu(false)}
            onKeyDown={() => {}}
          />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-44 rounded-lg border border-border bg-card p-1 shadow-lg">
            {sortOptions.map((opt) => (
              <Button
                className="w-full justify-start"
                key={opt.field}
                onClick={() => {
                  setSortField(opt.field);
                  setShowSortMenu(false);
                }}
                size="sm"
                variant={sortField === opt.field ? "secondary" : "ghost"}
              >
                {opt.icon}
                <span className="ml-2">{opt.label}</span>
              </Button>
            ))}
            <div className="my-1 h-px bg-border" />
            <Button
              className="w-full justify-start"
              onClick={() => {
                setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                setShowSortMenu(false);
              }}
              size="sm"
              variant="ghost"
            >
              {sortOrder === "desc" ? (
                <>
                  <ArrowUpZA className="size-3" />
                  <span className="ml-2">Oldest First / A-Z</span>
                </>
              ) : (
                <>
                  <ArrowDownAZ className="size-3" />
                  <span className="ml-2">Newest First / Z-A</span>
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
