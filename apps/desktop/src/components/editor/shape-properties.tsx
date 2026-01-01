import type { Layer, ShapeLayer } from "@/stores/use-editor-store";

interface ShapePropertiesProps {
  layer: ShapeLayer;
  onUpdate: (updates: Partial<Layer>) => void;
}

export function ShapeProperties({ layer, onUpdate }: ShapePropertiesProps) {
  return (
    <>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-muted-foreground text-xs">
            Fill
          </label>
          <input
            className="h-8 w-full cursor-pointer rounded border border-border"
            onChange={(e) => onUpdate({ fill: e.target.value })}
            type="color"
            value={layer.fill}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-muted-foreground text-xs">
            Stroke
          </label>
          <input
            className="h-8 w-full cursor-pointer rounded border border-border"
            onChange={(e) => onUpdate({ stroke: e.target.value })}
            type="color"
            value={layer.stroke}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-muted-foreground text-xs">
          Stroke Width
        </label>
        <input
          className="w-full"
          max={20}
          min={0}
          onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
          step={1}
          type="range"
          value={layer.strokeWidth}
        />
      </div>
      {layer.shapeType === "rect" && (
        <div>
          <label className="mb-1 block text-muted-foreground text-xs">
            Corner Radius
          </label>
          <input
            className="w-full"
            max={50}
            min={0}
            onChange={(e) => onUpdate({ cornerRadius: Number(e.target.value) })}
            step={1}
            type="range"
            value={layer.cornerRadius}
          />
        </div>
      )}
    </>
  );
}
