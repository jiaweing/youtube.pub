import { useEffect, useRef, useState } from "react";
import { ShadowProperties } from "@/components/editor/shadow-properties";
import { ShapeProperties } from "@/components/editor/shape-properties";
import { TextProperties } from "@/components/editor/text-properties";
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

async function getSystemFonts(): Promise<string[]> {
  try {
    if ("queryLocalFonts" in window) {
      const fonts = await (
        window as unknown as {
          queryLocalFonts: () => Promise<
            { fullName: string; family: string }[]
          >;
        }
      ).queryLocalFonts();
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
            <TextProperties
              fontFamilies={fontFamilies}
              layer={activeLayer as TextLayer}
              onUpdate={updateWithHistory}
            />
            <ShadowProperties
              layer={activeLayer as TextLayer}
              onUpdate={updateWithHistory}
            />
          </>
        )}

        {/* Shape-specific properties */}
        {activeLayer.type === "shape" && (
          <ShapeProperties
            layer={activeLayer as ShapeLayer}
            onUpdate={updateWithHistory}
          />
        )}

        {/* Image-specific */}
        {activeLayer.type === "image" && (
          <p className="text-muted-foreground text-xs">
            Drag handles to resize and rotate.
          </p>
        )}
      </div>
    </div>
  );
}
