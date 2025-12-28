import type Konva from "konva";
import { useCallback, useEffect, useRef } from "react";
import {
  Ellipse,
  Image,
  Layer,
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

export function KonvaCanvas({ width, height, onExportRef }: KonvaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

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

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, layerId: string) => {
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

        {/* Transformer for selected element */}
        <Transformer
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
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
          ref={transformerRef}
          rotateEnabled={true}
        />
      </Layer>
    </Stage>
  );
}
