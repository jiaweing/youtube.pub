import { Bold, Italic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type Layer,
  type ShapeLayer,
  type TextLayer,
  useEditorStore,
} from "@/stores/use-editor-store";

const FALLBACK_FONTS = [
  "Inter",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Courier New",
  "Impact",
  "Comic Sans MS",
];
// Get unique font names from system (includes weight variants like "Inter Bold")
async function getSystemFonts(): Promise<string[]> {
  try {
    // queryLocalFonts is available in Chromium-based browsers
    if ("queryLocalFonts" in window) {
      const fonts = await (
        window as unknown as {
          queryLocalFonts: () => Promise<
            { fullName: string; family: string }[]
          >;
        }
      ).queryLocalFonts();
      // Use fullName to get variants like "Inter Bold", "Inter Medium" etc.
      const fontNames = [...new Set(fonts.map((f) => f.fullName))].sort();
      return fontNames.length > 0 ? fontNames : FALLBACK_FONTS;
    }
  } catch (error) {
    console.warn("Could not query local fonts:", error);
  }
  return FALLBACK_FONTS;
}
export function PropertiesPanel() {
  const { layers, activeLayerId, updateLayer, pushHistory } = useEditorStore();
  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const [fontFamilies, setFontFamilies] = useState<string[]>(FALLBACK_FONTS);
  const lastPushRef = useRef<number>(0);
  // Load system fonts on mount
  useEffect(() => {
    getSystemFonts().then(setFontFamilies);
  }, []);
  if (!activeLayer) {
    return (
      <div className="flex h-full w-full items-center justify-center border-border border-l bg-background p-4">
        <p className="text-center text-muted-foreground text-sm">
          Select a layer to edit properties
        </p>
      </div>
    );
  }
  // Debounced history push - only push if 500ms since last
  const pushHistoryDebounced = () => {
    const now = Date.now();
    if (now - lastPushRef.current > 500) {
      pushHistory();
      lastPushRef.current = now;
    }
  };

  const updateWithHistory = (updates: Partial<Layer>) => {
    pushHistoryDebounced();
    updateLayer(activeLayer.id, updates);
  };
  return (
    <div className="w-full shrink-0 overflow-y-auto border-border border-l bg-background">
      <div className="border-border border-b px-4 py-3">
        <span className="font-semibold text-muted-foreground text-xs uppercase">
          Properties
        </span>
      </div>
      <div className="space-y-4 p-4">
        {/* Common: Opacity */}
        <div>
          <label className="mb-1 block text-muted-foreground text-xs">
            Opacity
          </label>
          <input
            className="w-full"
            max={1}
            min={0}
            onChange={(e) =>
              updateWithHistory({ opacity: Number(e.target.value) })
            }
            step={0.05}
            type="range"
            value={activeLayer.opacity}
          />
        </div>
        {/* Text-specific properties */}
        {activeLayer.type === "text" && (
          <>
            <div>
              <label className="mb-1 block text-muted-foreground text-xs">
                Text
              </label>
              <input
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(e) => updateWithHistory({ text: e.target.value })}
                type="text"
                value={(activeLayer as TextLayer).text}
              />
            </div>
            <div>
              <label className="mb-1 block text-muted-foreground text-xs">
                Font Family
              </label>
              <select
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(e) =>
                  updateWithHistory({ fontFamily: e.target.value })
                }
                value={(activeLayer as TextLayer).fontFamily}
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
                  onChange={(e) =>
                    updateWithHistory({ fontSize: Number(e.target.value) })
                  }
                  type="number"
                  value={(activeLayer as TextLayer).fontSize}
                />
              </div>
              <div className="flex gap-1 pt-5">
                <Button
                  onClick={() => {
                    const current = (activeLayer as TextLayer).fontStyle;
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
                    updateWithHistory({ fontStyle: newStyle });
                  }}
                  size="icon-sm"
                  variant={
                    (activeLayer as TextLayer).fontStyle.includes("bold")
                      ? "secondary"
                      : "ghost"
                  }
                >
                  <Bold className="size-3.5" />
                </Button>
                <Button
                  onClick={() => {
                    const current = (activeLayer as TextLayer).fontStyle;
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
                    updateWithHistory({ fontStyle: newStyle });
                  }}
                  size="icon-sm"
                  variant={
                    (activeLayer as TextLayer).fontStyle.includes("italic")
                      ? "secondary"
                      : "ghost"
                  }
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
                  onChange={(e) => updateWithHistory({ fill: e.target.value })}
                  type="color"
                  value={(activeLayer as TextLayer).fill}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-muted-foreground text-xs">
                  Stroke
                </label>
                <input
                  className="h-8 w-full cursor-pointer rounded border border-border"
                  onChange={(e) =>
                    updateWithHistory({ stroke: e.target.value })
                  }
                  type="color"
                  value={(activeLayer as TextLayer).stroke || "#000000"}
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
                onChange={(e) =>
                  updateWithHistory({ strokeWidth: Number(e.target.value) })
                }
                step={1}
                type="range"
                value={(activeLayer as TextLayer).strokeWidth}
              />
            </div>
            {/* Shadow */}
            <div className="border-border border-t pt-4">
              <span className="mb-2 block text-muted-foreground text-xs">
                Shadow
              </span>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-muted-foreground text-xs">
                    Color
                  </label>
                  <input
                    className="h-8 w-full cursor-pointer rounded border border-border"
                    onChange={(e) =>
                      updateWithHistory({ shadowColor: e.target.value })
                    }
                    type="color"
                    value={
                      (activeLayer as TextLayer).shadowColor.startsWith("rgba")
                        ? "#000000"
                        : (activeLayer as TextLayer).shadowColor
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-muted-foreground text-xs">
                    Blur
                  </label>
                  <input
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                    onChange={(e) =>
                      updateWithHistory({ shadowBlur: Number(e.target.value) })
                    }
                    type="number"
                    value={(activeLayer as TextLayer).shadowBlur}
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
                      updateWithHistory({
                        shadowOffsetX: Number(e.target.value),
                      })
                    }
                    type="number"
                    value={(activeLayer as TextLayer).shadowOffsetX}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-muted-foreground text-xs">
                    Offset Y
                  </label>
                  <input
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                    onChange={(e) =>
                      updateWithHistory({
                        shadowOffsetY: Number(e.target.value),
                      })
                    }
                    type="number"
                    value={(activeLayer as TextLayer).shadowOffsetY}
                  />
                </div>
              </div>
            </div>
          </>
        )}
        {/* Shape-specific properties */}
        {activeLayer.type === "shape" && (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-muted-foreground text-xs">
                  Fill
                </label>
                <input
                  className="h-8 w-full cursor-pointer rounded border border-border"
                  onChange={(e) => updateWithHistory({ fill: e.target.value })}
                  type="color"
                  value={(activeLayer as ShapeLayer).fill}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-muted-foreground text-xs">
                  Stroke
                </label>
                <input
                  className="h-8 w-full cursor-pointer rounded border border-border"
                  onChange={(e) =>
                    updateWithHistory({ stroke: e.target.value })
                  }
                  type="color"
                  value={(activeLayer as ShapeLayer).stroke}
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
                onChange={(e) =>
                  updateWithHistory({ strokeWidth: Number(e.target.value) })
                }
                step={1}
                type="range"
                value={(activeLayer as ShapeLayer).strokeWidth}
              />
            </div>
            {(activeLayer as ShapeLayer).shapeType === "rect" && (
              <div>
                <label className="mb-1 block text-muted-foreground text-xs">
                  Corner Radius
                </label>
                <input
                  className="w-full"
                  max={50}
                  min={0}
                  onChange={(e) =>
                    updateWithHistory({ cornerRadius: Number(e.target.value) })
                  }
                  step={1}
                  type="range"
                  value={(activeLayer as ShapeLayer).cornerRadius}
                />
              </div>
            )}
          </>
        )}
        {/* Image-specific: just opacity which is already covered */}
        {activeLayer.type === "image" && (
          <p className="text-muted-foreground text-xs">
            Drag handles to resize and rotate.
          </p>
        )}
      </div>
    </div>
  );
}
