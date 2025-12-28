import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Ellipse,
  Image,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from "react-konva";

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
          // Hide transformer during export
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
    if (!(transformerRef.current && stageRef.current)) {
      return;
    }

    const selectedNode = stageRef.current.findOne(`#${activeLayerId}`);
    if (selectedNode && activeTool === "select") {
      transformerRef.current.nodes([selectedNode]);
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [activeLayerId, activeTool]);

  // Calculate snap position and guides
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

      // Check horizontal snaps (x positions)
      // Left edge
      if (Math.abs(nodeLeft) < SNAP_THRESHOLD) {
        snapDeltaX = -nodeLeft;
        guides.vertical.push(0);
      }
      // Right edge
      else if (Math.abs(nodeRight - width) < SNAP_THRESHOLD) {
        snapDeltaX = width - nodeRight;
        guides.vertical.push(width);
      }
      // Center X
      else if (Math.abs(nodeCenterX - canvasCenterX) < SNAP_THRESHOLD) {
        snapDeltaX = canvasCenterX - nodeCenterX;
        guides.vertical.push(canvasCenterX);
      }

      // Check vertical snaps (y positions)
      // Top edge
      if (Math.abs(nodeTop) < SNAP_THRESHOLD) {
        snapDeltaY = -nodeTop;
        guides.horizontal.push(0);
      }
      // Bottom edge
      else if (Math.abs(nodeBottom - height) < SNAP_THRESHOLD) {
        snapDeltaY = height - nodeBottom;
        guides.horizontal.push(height);
      }
      // Center Y
      else if (Math.abs(nodeCenterY - canvasCenterY) < SNAP_THRESHOLD) {
        snapDeltaY = canvasCenterY - nodeCenterY;
        guides.horizontal.push(canvasCenterY);
      }

      return { snapDeltaX, snapDeltaY, guides };
    },
    [width, height]
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Click on stage background
      if (e.target === e.target.getStage()) {
        if (activeTool === "text") {
          const pos = e.target.getStage()?.getPointerPosition();
          if (pos) {
            addTextLayer("Your Text");
            // Update position after creation
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

      // Click on a layer
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

      // Apply snap
      if (snapDeltaX !== 0) {
        node.x(node.x() + snapDeltaX);
      }
      if (snapDeltaY !== 0) {
        node.y(node.y() + snapDeltaY);
      }

      setSnapGuides(guides);
    },
    [calculateSnap]
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, layerId: string) => {
      // Clear snap guides
      setSnapGuides({ vertical: [], horizontal: [] });

      updateLayer(layerId, {
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    [updateLayer]
  );

  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>, layer: EditorLayer) => {
      const node = e.target;

      if (layer.type === "text") {
        // For text, we scale the fontSize instead of the element
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
    if (!layer.visible) {
      return null;
    }

    const commonProps = {
      id: layer.id,
      x: layer.x,
      y: layer.y,
      rotation: layer.rotation,
      opacity: layer.opacity,
      draggable: !layer.locked && activeTool === "select",
      onDragStart: () => pushHistory(),
      onDragMove: handleDragMove,
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
        handleDragEnd(e, layer.id),
      onTransformStart: () => pushHistory(),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) =>
        handleTransformEnd(e, layer),
      onClick: () => setActiveLayer(layer.id),
      onTap: () => setActiveLayer(layer.id),
    };

    switch (layer.type) {
      case "image": {
        const imgLayer = layer as ImageLayerType;
        let image = imageCache.current.get(imgLayer.dataUrl);
        if (!image) {
          image = new window.Image();
          image.src = imgLayer.dataUrl;
          imageCache.current.set(imgLayer.dataUrl, image);
        }
        return (
          <Image
            key={layer.id}
            {...commonProps}
            height={imgLayer.height}
            image={image}
            scaleX={layer.scaleX}
            scaleY={layer.scaleY}
            width={imgLayer.width}
          />
        );
      }

      case "text": {
        const txtLayer = layer as TextLayerType;
        return (
          <Text
            key={layer.id}
            {...commonProps}
            fill={txtLayer.fill}
            fontFamily={txtLayer.fontFamily}
            fontSize={txtLayer.fontSize}
            fontStyle={txtLayer.fontStyle}
            shadowBlur={txtLayer.shadowBlur}
            shadowColor={txtLayer.shadowColor}
            shadowOffsetX={txtLayer.shadowOffsetX}
            shadowOffsetY={txtLayer.shadowOffsetY}
            stroke={txtLayer.stroke}
            strokeWidth={txtLayer.strokeWidth}
            text={txtLayer.text}
          />
        );
      }

      case "shape": {
        const shapeLayer = layer as ShapeLayerType;
        if (shapeLayer.shapeType === "ellipse") {
          return (
            <Ellipse
              key={layer.id}
              {...commonProps}
              fill={shapeLayer.fill}
              radiusX={shapeLayer.width / 2}
              radiusY={shapeLayer.height / 2}
              scaleX={layer.scaleX}
              scaleY={layer.scaleY}
              stroke={shapeLayer.stroke}
              strokeWidth={shapeLayer.strokeWidth}
            />
          );
        }
        return (
          <Rect
            key={layer.id}
            {...commonProps}
            cornerRadius={shapeLayer.cornerRadius}
            fill={shapeLayer.fill}
            height={shapeLayer.height}
            scaleX={layer.scaleX}
            scaleY={layer.scaleY}
            stroke={shapeLayer.stroke}
            strokeWidth={shapeLayer.strokeWidth}
            width={shapeLayer.width}
          />
        );
      }

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
        {/* Checkerboard background for transparency */}
        <Rect fill="#262626" height={height} width={width} x={0} y={0} />

        {/* Render all layers */}
        {layers.map(renderLayer)}

        {/* Snap guide lines */}
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

        {/* Transformer for selected element */}
        <Transformer
          anchorCornerRadius={2}
          anchorFill="#fff"
          anchorSize={16}
          anchorStroke="#a855f7"
          borderStroke="#a855f7"
          borderStrokeWidth={2}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }

            // Snap during resize
            const snappedBox = { ...newBox };
            const guides: SnapGuides = { vertical: [], horizontal: [] };
            const canvasCenterX = width / 2;
            const canvasCenterY = height / 2;

            // Snap left edge
            if (Math.abs(newBox.x) < SNAP_THRESHOLD) {
              snappedBox.width += snappedBox.x;
              snappedBox.x = 0;
              guides.vertical.push(0);
            }
            // Snap right edge
            if (Math.abs(newBox.x + newBox.width - width) < SNAP_THRESHOLD) {
              snappedBox.width = width - snappedBox.x;
              guides.vertical.push(width);
            }
            // Snap top edge
            if (Math.abs(newBox.y) < SNAP_THRESHOLD) {
              snappedBox.height += snappedBox.y;
              snappedBox.y = 0;
              guides.horizontal.push(0);
            }
            // Snap bottom edge
            if (Math.abs(newBox.y + newBox.height - height) < SNAP_THRESHOLD) {
              snappedBox.height = height - snappedBox.y;
              guides.horizontal.push(height);
            }
            // Snap center X
            const boxCenterX = newBox.x + newBox.width / 2;
            if (Math.abs(boxCenterX - canvasCenterX) < SNAP_THRESHOLD) {
              const delta = canvasCenterX - boxCenterX;
              snappedBox.x += delta;
              guides.vertical.push(canvasCenterX);
            }
            // Snap center Y
            const boxCenterY = newBox.y + newBox.height / 2;
            if (Math.abs(boxCenterY - canvasCenterY) < SNAP_THRESHOLD) {
              const delta = canvasCenterY - boxCenterY;
              snappedBox.y += delta;
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
