import { Bold, Italic } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Layer, TextLayer } from "@/stores/use-editor-store";

interface TextPropertiesProps {
  layer: TextLayer;
  fontFamilies: string[];
  onUpdate: (updates: Partial<Layer>) => void;
}

export function TextProperties({
  layer,
  fontFamilies,
  onUpdate,
}: TextPropertiesProps) {
  const toggleBold = () => {
    const current = layer.fontStyle;
    const isBold = current.includes("bold");
    const isItalic = current.includes("italic");
    let newStyle: TextLayer["fontStyle"] = "normal";
    if (!isBold && isItalic) {
      newStyle = "bold italic";
    } else if (!isBold) {
      newStyle = "bold";
    } else if (isItalic) {
      newStyle = "italic";
    }
    onUpdate({ fontStyle: newStyle });
  };

  const toggleItalic = () => {
    const current = layer.fontStyle;
    const isBold = current.includes("bold");
    const isItalic = current.includes("italic");
    let newStyle: TextLayer["fontStyle"] = "normal";
    if (isBold && !isItalic) {
      newStyle = "bold italic";
    } else if (!isItalic) {
      newStyle = "italic";
    } else if (isBold) {
      newStyle = "bold";
    }
    onUpdate({ fontStyle: newStyle });
  };

  return (
    <>
      <div>
        <label className="mb-1 block text-muted-foreground text-xs">Text</label>
        <input
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          onChange={(e) => onUpdate({ text: e.target.value })}
          type="text"
          value={layer.text}
        />
      </div>
      <div>
        <label className="mb-1 block text-muted-foreground text-xs">
          Font Family
        </label>
        <select
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          value={layer.fontFamily}
        >
          {fontFamilies.map((f) => (
            <option key={f} style={{ fontFamily: f }} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-muted-foreground text-xs">
            Size
          </label>
          <input
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            type="number"
            value={layer.fontSize}
          />
        </div>
        <div className="flex gap-1 pt-5">
          <Button
            onClick={toggleBold}
            size="icon-sm"
            variant={layer.fontStyle.includes("bold") ? "secondary" : "ghost"}
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            onClick={toggleItalic}
            size="icon-sm"
            variant={layer.fontStyle.includes("italic") ? "secondary" : "ghost"}
          >
            <Italic className="size-3.5" />
          </Button>
        </div>
      </div>
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
            value={layer.stroke || "#000000"}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-muted-foreground text-xs">
          Stroke Width
        </label>
        <input
          className="w-full"
          max={10}
          min={0}
          onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
          step={1}
          type="range"
          value={layer.strokeWidth}
        />
      </div>
    </>
  );
}
