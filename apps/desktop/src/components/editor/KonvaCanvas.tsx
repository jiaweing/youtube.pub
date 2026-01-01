import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Stage, Transformer } from "react-konva";
import {
  renderImageLayer,
  renderShapeLayer,
  renderTextLayer,
} from "@/components/editor/layer-renderers";
import {
  type Layer as EditorLayer,
  type ImageLayer as ImageLayerType,
  type ShapeLayer as ShapeLayerType,
  type TextLayer as TextLayerType,
  useEditorStore,
} from "@/stores/use-editor-store";

interface KonvaCanvasProps {
  width: number;
  height: number;
  onExportRef?: React.MutableRefObject<(() => string) | null>;
}

const SNAP_THRESHOLD = 8;

interface SnapGuides {
  vertical: number[];
  horizontal: number[];
}

export function KonvaCanvas({ width, height, onExportRef }: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({
    vertical: [],
    horizontal: [],
  });

  const {
    layers,
    activeLayerId,
    activeTool,
    setActiveLayer,
    updateLayer,
    addTextLayer,
    addShapeLayer,
    pushHistory,
  } = useEditorStore();

  // Expose export function
  useEffect(() => {
    if (onExportRef) {
      onExportRef.current = () => {
        if (stageRef.current) {
          transformerRef.current?.hide();
          const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1 });
          transformerRef.current?.show();
          return dataUrl;
        }
        return "";
      };
    }
  }, [onExportRef]);

  // Update transformer when selection changes
  useEffect(() => {
    if (!(transformerRef.current && stageRef.current)) return;

    const selectedNode = stageRef.current.findOne(`#${activeLayerId}`);
    if (selectedNode && activeTool === "select") {
      transformerRef.current.nodes([selectedNode]);
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [activeLayerId, activeTool]);

  const calculateSnap = useCallback(
    (node: Konva.Node) => {
      const box = node.getClientRect();
      const nodeLeft = box.x;
      const nodeRight = box.x + box.width;
      const nodeTop = box.y;
      const nodeBottom = box.y + box.height;
      const nodeCenterX = box.x + box.width / 2;
      const nodeCenterY = box.y + box.height / 2;

      const canvasCenterX = width / 2;
      const canvasCenterY = height / 2;

      const guides: SnapGuides = { vertical: [], horizontal: [] };
      let snapDeltaX = 0;
      let snapDeltaY = 0;

      if (Math.abs(nodeLeft) < SNAP_THRESHOLD) {
        snapDeltaX = -nodeLeft;
        guides.vertical.push(0);
      } else if (Math.abs(nodeRight - width) < SNAP_THRESHOLD) {
        snapDeltaX = width - nodeRight;
        guides.vertical.push(width);
      } else if (Math.abs(nodeCenterX - canvasCenterX) < SNAP_THRESHOLD) {
        snapDeltaX = canvasCenterX - nodeCenterX;
        guides.vertical.push(canvasCenterX);
      }

      if (Math.abs(nodeTop) < SNAP_THRESHOLD) {
        snapDeltaY = -nodeTop;
        guides.horizontal.push(0);
      } else if (Math.abs(nodeBottom - height) < SNAP_THRESHOLD) {
        snapDeltaY = height - nodeBottom;
        guides.horizontal.push(height);
      } else if (Math.abs(nodeCenterY - canvasCenterY) < SNAP_THRESHOLD) {
        snapDeltaY = canvasCenterY - nodeCenterY;
        guides.horizontal.push(canvasCenterY);
      }

      return { snapDeltaX, snapDeltaY, guides };
    },
    [width, height]
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === e.target.getStage()) {
        if (activeTool === "text") {
          const pos = e.target.getStage()?.getPointerPosition();
          if (pos) {
            addTextLayer("Your Text");
            const newLayerId = useEditorStore.getState().activeLayerId;
            if (newLayerId) {
              updateLayer(newLayerId, { x: pos.x, y: pos.y });
            }
          }
        } else if (activeTool === "rect" || activeTool === "ellipse") {
          const pos = e.target.getStage()?.getPointerPosition();
          if (pos) {
            addShapeLayer(activeTool);
            const newLayerId = useEditorStore.getState().activeLayerId;
            if (newLayerId) {
              updateLayer(newLayerId, { x: pos.x, y: pos.y });
            }
          }
        } else {
          setActiveLayer(null);
        }
        return;
      }

      const clickedId = e.target.id();
      if (clickedId) {
        setActiveLayer(clickedId);
      }
    },
    [activeTool, setActiveLayer, addTextLayer, addShapeLayer, updateLayer]
  );

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const { snapDeltaX, snapDeltaY, guides } = calculateSnap(node);

      if (snapDeltaX !== 0) node.x(node.x() + snapDeltaX);
      if (snapDeltaY !== 0) node.y(node.y() + snapDeltaY);

      setSnapGuides(guides);
    },
    [calculateSnap]
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, layerId: string) => {
      setSnapGuides({ vertical: [], horizontal: [] });
      updateLayer(layerId, { x: e.target.x(), y: e.target.y() });
    },
    [updateLayer]
  );

  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>, layer: EditorLayer) => {
      const node = e.target;

      if (layer.type === "text") {
        const scaleX = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);

        updateLayer(layer.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          fontSize: Math.round((layer as TextLayerType).fontSize * scaleX),
        });
      } else {
        updateLayer(layer.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
        });
      }
    },
    [updateLayer]
  );

  const renderLayer = (layer: EditorLayer) => {
    if (!layer.visible) return null;

    const commonProps = {
      layer,
      activeTool,
      imageCache,
      onDragStart: pushHistory,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
      onTransformStart: pushHistory,
      onTransformEnd: handleTransformEnd,
      onSelect: setActiveLayer,
    };

    switch (layer.type) {
      case "image":
        return renderImageLayer({
          ...commonProps,
          layer: layer as ImageLayerType,
        });
      case "text":
        return renderTextLayer({
          ...commonProps,
          layer: layer as TextLayerType,
        });
      case "shape":
        return renderShapeLayer({
          ...commonProps,
          layer: layer as ShapeLayerType,
        });
      default:
        return null;
    }
  };

  return (
    <Stage
      height={height}
      onClick={
        handleStageClick as (e: Konva.KonvaEventObject<MouseEvent>) => void
      }
      onTap={
        handleStageClick as (e: Konva.KonvaEventObject<TouchEvent>) => void
      }
      ref={stageRef}
      style={{ background: "#1a1a1a" }}
      width={width}
    >
      <Layer>
        <Rect fill="#262626" height={height} width={width} x={0} y={0} />

        {layers.map(renderLayer)}

        {snapGuides.vertical.map((x) => (
          <Line
            key={`snap-v-${x}`}
            points={[x, 0, x, height]}
            stroke="#f472b6"
            strokeWidth={1}
          />
        ))}
        {snapGuides.horizontal.map((y) => (
          <Line
            key={`snap-h-${y}`}
            points={[0, y, width, y]}
            stroke="#f472b6"
            strokeWidth={1}
          />
        ))}

        <Transformer
          anchorCornerRadius={2}
          anchorFill="#fff"
          anchorSize={16}
          anchorStroke="#a855f7"
          borderStroke="#a855f7"
          borderStrokeWidth={2}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) return oldBox;

            const snappedBox = { ...newBox };
            const guides: SnapGuides = { vertical: [], horizontal: [] };
            const canvasCenterX = width / 2;
            const canvasCenterY = height / 2;

            if (Math.abs(newBox.x) < SNAP_THRESHOLD) {
              snappedBox.width += snappedBox.x;
              snappedBox.x = 0;
              guides.vertical.push(0);
            }
            if (Math.abs(newBox.x + newBox.width - width) < SNAP_THRESHOLD) {
              snappedBox.width = width - snappedBox.x;
              guides.vertical.push(width);
            }
            if (Math.abs(newBox.y) < SNAP_THRESHOLD) {
              snappedBox.height += snappedBox.y;
              snappedBox.y = 0;
              guides.horizontal.push(0);
            }
            if (Math.abs(newBox.y + newBox.height - height) < SNAP_THRESHOLD) {
              snappedBox.height = height - snappedBox.y;
              guides.horizontal.push(height);
            }
            const boxCenterX = newBox.x + newBox.width / 2;
            if (Math.abs(boxCenterX - canvasCenterX) < SNAP_THRESHOLD) {
              snappedBox.x += canvasCenterX - boxCenterX;
              guides.vertical.push(canvasCenterX);
            }
            const boxCenterY = newBox.y + newBox.height / 2;
            if (Math.abs(boxCenterY - canvasCenterY) < SNAP_THRESHOLD) {
              snappedBox.y += canvasCenterY - boxCenterY;
              guides.horizontal.push(canvasCenterY);
            }

            setSnapGuides(guides);
            return snappedBox;
          }}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
          onTransformEnd={() => setSnapGuides({ vertical: [], horizontal: [] })}
          ref={transformerRef}
          rotateAnchorOffset={24}
          rotateEnabled={true}
        />
      </Layer>
    </Stage>
  );
}
