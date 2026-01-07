import {
  Crop,
  Film,
  Instagram,
  Monitor,
  Smartphone,
  Square,
  Twitter,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (width: number, height: number, name: string) => void;
}

const PRESETS = [
  {
    id: "ig-feed",
    label: "Instagram Feed",
    width: 1080,
    height: 1440,
    icon: Instagram,
    description: "3:4 • 1080x1440",
  },
  {
    id: "ig-reels",
    label: "Instagram Reels",
    width: 1080,
    height: 1920,
    icon: Smartphone,
    description: "9:16 • 1080x1920",
  },
  {
    id: "ig-story",
    label: "Instagram Story",
    width: 1080,
    height: 1920,
    icon: Smartphone,
    description: "9:16 • 1080x1920",
  },
  {
    id: "ig-super-long",
    label: "Super Long Video",
    width: 5120,
    height: 1080,
    icon: Film,
    description: "5120x1080",
  },
  {
    id: "square",
    label: "Square",
    width: 1080,
    height: 1080,
    icon: Square,
    description: "1:1 • 1080x1080",
  },
  {
    id: "twitter",
    label: "Twitter / X Post",
    width: 1200,
    height: 675,
    icon: Twitter,
    description: "16:9 • 1200x675",
  },
  {
    id: "presentation",
    label: "Presentation",
    width: 1920,
    height: 1080,
    icon: Monitor,
    description: "16:9 • 1920x1080",
  },
];

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: NewProjectDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    PRESETS[0].id
  );
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const [isCustom, setIsCustom] = useState(false);

  const getAspectRatioStyle = (width: number, height: number) => {
    const ratio = width / height;
    // Fit within a 48x48 box
    let w = 48;
    let h = 48;
    if (ratio > 1) {
      h = w / ratio;
    } else {
      w = h * ratio;
    }
    return { width: `${w}px`, height: `${h}px` };
  };

  const handleCreate = () => {
    let w = customWidth;
    let h = customHeight;
    let name = "New Project";

    if (isCustom) {
      name = `Custom (${w}x${h})`;
    } else {
      const preset = PRESETS.find((p) => p.id === selectedPreset);
      if (preset) {
        w = preset.width;
        h = preset.height;
        name = preset.label;
      }
    }

    onCreate(w, h, name);
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {PRESETS.map((preset) => (
              <button
                className={cn(
                  "flex flex-col gap-3 rounded-xl border-2 bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-muted/50",
                  selectedPreset === preset.id &&
                    !isCustom &&
                    "border-primary bg-muted/30 ring-2 ring-primary/20 ring-offset-2"
                )}
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset.id);
                  setIsCustom(false);
                }}
                type="button"
              >
                <div className="flex flex-1 items-center justify-center py-2">
                  <div
                    className="rounded-sm border-2 border-primary/20 bg-primary/10 transition-colors group-hover:border-primary/40"
                    style={getAspectRatioStyle(preset.width, preset.height)}
                  />
                </div>
                <div>
                  <div className="font-medium text-sm">{preset.label}</div>
                  <div className="text-muted-foreground text-xs">
                    {preset.description}
                  </div>
                </div>
              </button>
            ))}

            <button
              className={cn(
                "flex flex-col gap-3 rounded-xl border-2 bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-muted/50",
                isCustom &&
                  "border-primary bg-muted/30 ring-2 ring-primary/20 ring-offset-2"
              )}
              onClick={() => setIsCustom(true)}
              type="button"
            >
              <div className="flex flex-1 items-center justify-center py-2">
                <Crop className="size-8 text-muted-foreground/50" />
              </div>
              <div>
                <div className="font-medium text-sm">Custom Size</div>
                <div className="text-muted-foreground text-xs">
                  Set dimensions
                </div>
              </div>
            </button>
          </div>

          {isCustom && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/50 p-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  max={8000}
                  min={100}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  type="number"
                  value={customWidth}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  max={8000}
                  min={100}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  type="number"
                  value={customHeight}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleCreate} size="lg">
              Create Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
