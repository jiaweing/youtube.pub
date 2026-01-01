import type { Layer, TextLayer } from "@/stores/use-editor-store";

interface ShadowPropertiesProps {
  layer: TextLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}

export function ShadowProperties({ layer, onUpdate }: ShadowPropertiesProps) {
  return (
    <div className="border-border border-t pt-4">
      <span className="mb-2 block text-muted-foreground text-xs">Shadow</span>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-muted-foreground text-xs">
            Color
          </label>
          <input
            className="h-8 w-full cursor-pointer rounded border border-border"
            onChange={(e) => onUpdate({ shadowColor: e.target.value })}
            type="color"
            value={
              layer.shadowColor.startsWith("rgba")
                ? "#000000"
                : layer.shadowColor
            }
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-muted-foreground text-xs">
            Blur
          </label>
          <input
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
            onChange={(e) => onUpdate({ shadowBlur: Number(e.target.value) })}
            type="number"
            value={layer.shadowBlur}
          />
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-muted-foreground text-xs">
            Offset X
          </label>
          <input
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
            onChange={(e) =>
              onUpdate({ shadowOffsetX: Number(e.target.value) })
            }
            type="number"
            value={layer.shadowOffsetX}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-muted-foreground text-xs">
            Offset Y
          </label>
          <input
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
            onChange={(e) =>
              onUpdate({ shadowOffsetY: Number(e.target.value) })
            }
            type="number"
            value={layer.shadowOffsetY}
          />
        </div>
      </div>
    </div>
  );
}
