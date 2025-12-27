import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  ArrowDownAZ,
  ArrowUpZA,
  Calendar,
  ChevronDown,
  Clock,
  Grid2X2,
  Grid3X3,
  Image,
  List,
  Plus,
  Video,
} from "lucide-react";
import { useCallback, useState } from "react";

import type { ViewMode } from "@/App";
import { Button } from "@/components/ui/button";
import { type SortField, useGalleryStore } from "@/stores/useGalleryStore";

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onAddVideoClick: () => void;
}

const viewModeIcons: Record<ViewMode, React.ReactNode> = {
  "3": <Grid3X3 className="size-4" />,
  "4": <Grid2X2 className="size-4" />,
  "5": <Grid2X2 className="size-3" />,
  row: <List className="size-4" />,
};

const viewModeTitles: Record<ViewMode, string> = {
  "3": "3×3 Grid",
  "4": "4×4 Grid",
  "5": "5×5 Grid",
  row: "List View",
};

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

export function BottomToolbar({
  viewMode,
  onViewModeChange,
  onAddVideoClick,
}: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const addThumbnail = useGalleryStore((s) => s.addThumbnail);
  const sortField = useGalleryStore((s) => s.sortField);
  const sortOrder = useGalleryStore((s) => s.sortOrder);
  const setSortField = useGalleryStore((s) => s.setSortField);
  const setSortOrder = useGalleryStore((s) => s.setSortOrder);

  const currentSortOption = sortOptions.find((o) => o.field === sortField);

  const handleAddImage = useCallback(async () => {
    setShowMenu(false);
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp", "gif"],
        },
      ],
    });

    if (selected) {
      const files = Array.isArray(selected) ? selected : [selected];
      for (const filePath of files) {
        try {
          const data = await readFile(filePath);
          const blob = new Blob([data]);
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const fileName = filePath.split(/[/\\]/).pop() || "Image";
          addThumbnail(dataUrl, fileName);
        } catch (error) {
          console.error("Failed to load image:", error);
        }
      }
    }
  }, [addThumbnail]);

  const handleAddVideo = useCallback(() => {
    setShowMenu(false);
    onAddVideoClick();
  }, [onAddVideoClick]);

  return (
    <header className="flex items-center justify-between p-2">
      <div className="flex items-center gap-2">
        {/* View mode buttons */}
        <div className="flex gap-1">
          {(["3", "4", "5", "row"] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              size="icon-sm"
              title={viewModeTitles[mode]}
              variant={viewMode === mode ? "secondary" : "ghost"}
            >
              {viewModeIcons[mode]}
            </Button>
          ))}
        </div>

        {/* Sort dropdown */}
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
                      <span className="ml-2">Oldest First / A→Z</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownAZ className="size-3" />
                      <span className="ml-2">Newest First / Z→A</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add button */}
      <div className="relative">
        <Button
          aria-label="Add"
          onClick={() => setShowMenu(!showMenu)}
          size="icon-sm"
        >
          <Plus className="size-4" />
        </Button>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
              onKeyDown={() => {}}
            />
            <div className="absolute right-0 bottom-full z-50 mb-2 w-40 rounded-lg border border-border bg-card p-1 shadow-lg">
              <Button
                className="w-full justify-start"
                onClick={handleAddImage}
                size="sm"
                variant="ghost"
              >
                <Image className="mr-2 size-4" />
                Add Image
              </Button>
              <Button
                className="w-full justify-start"
                onClick={handleAddVideo}
                size="sm"
                variant="ghost"
              >
                <Video className="mr-2 size-4" />
                Upload Video
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
