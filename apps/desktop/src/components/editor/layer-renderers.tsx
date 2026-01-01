import type Konva from "konva";
import { Ellipse, Image, Rect, Text } from "react-konva";
import type {
  Layer as EditorLayer,
  ImageLayer as ImageLayerType,
  ShapeLayer as ShapeLayerType,
  TextLayer as TextLayerType,
} from "@/stores/use-editor-store";

interface LayerRenderProps {
  layer: EditorLayer;
  activeTool: string;
  imageCache: React.MutableRefObject<Map<string, HTMLImageElement>>;
  onDragStart: () => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>, layerId: string) => void;
  onTransformStart: () => void;
  onTransformEnd: (
    e: Konva.KonvaEventObject<Event>,
    layer: EditorLayer
  ) => void;
  onSelect: (layerId: string) => void;
}

export function renderImageLayer(
  props: LayerRenderProps & { layer: ImageLayerType }
) {
  const {
    layer,
    activeTool,
    imageCache,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformStart,
    onTransformEnd,
    onSelect,
  } = props;

  let image = imageCache.current.get(layer.dataUrl);
  if (!image) {
    image = new window.Image();
    image.src = layer.dataUrl;
    imageCache.current.set(layer.dataUrl, image);
  }

  return (
    <Image
      draggable={!layer.locked && activeTool === "select"}
      height={layer.height}
      id={layer.id}
      image={image}
      key={layer.id}
      onClick={() => onSelect(layer.id)}
      onDragEnd={(e) => onDragEnd(e, layer.id)}
      onDragMove={onDragMove}
      onDragStart={onDragStart}
      onTap={() => onSelect(layer.id)}
      onTransformEnd={(e) => onTransformEnd(e, layer)}
      onTransformStart={onTransformStart}
      opacity={layer.opacity}
      rotation={layer.rotation}
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      width={layer.width}
      x={layer.x}
      y={layer.y}
    />
  );
}

export function renderTextLayer(
  props: LayerRenderProps & { layer: TextLayerType }
) {
  const {
    layer,
    activeTool,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformStart,
    onTransformEnd,
    onSelect,
  } = props;

  return (
    <Text
      draggable={!layer.locked && activeTool === "select"}
      fill={layer.fill}
      fontFamily={layer.fontFamily}
      fontSize={layer.fontSize}
      fontStyle={layer.fontStyle}
      id={layer.id}
      key={layer.id}
      onClick={() => onSelect(layer.id)}
      onDragEnd={(e) => onDragEnd(e, layer.id)}
      onDragMove={onDragMove}
      onDragStart={onDragStart}
      onTap={() => onSelect(layer.id)}
      onTransformEnd={(e) => onTransformEnd(e, layer)}
      onTransformStart={onTransformStart}
      opacity={layer.opacity}
      rotation={layer.rotation}
      shadowBlur={layer.shadowBlur}
      shadowColor={layer.shadowColor}
      shadowOffsetX={layer.shadowOffsetX}
      shadowOffsetY={layer.shadowOffsetY}
      stroke={layer.stroke}
      strokeWidth={layer.strokeWidth}
      text={layer.text}
      x={layer.x}
      y={layer.y}
    />
  );
}

export function renderShapeLayer(
  props: LayerRenderProps & { layer: ShapeLayerType }
) {
  const {
    layer,
    activeTool,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformStart,
    onTransformEnd,
    onSelect,
  } = props;

  const commonProps = {
    id: layer.id,
    x: layer.x,
    y: layer.y,
    rotation: layer.rotation,
    opacity: layer.opacity,
    draggable: !layer.locked && activeTool === "select",
    onDragStart,
    onDragMove,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(e, layer.id),
    onTransformStart,
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) =>
      onTransformEnd(e, layer),
    onClick: () => onSelect(layer.id),
    onTap: () => onSelect(layer.id),
  };

  if (layer.shapeType === "ellipse") {
    return (
      <Ellipse
        key={layer.id}
        {...commonProps}
        fill={layer.fill}
        radiusX={layer.width / 2}
        radiusY={layer.height / 2}
        scaleX={layer.scaleX}
        scaleY={layer.scaleY}
        stroke={layer.stroke}
        strokeWidth={layer.strokeWidth}
      />
    );
  }

  return (
    <Rect
      key={layer.id}
      {...commonProps}
      cornerRadius={layer.cornerRadius}
      fill={layer.fill}
      height={layer.height}
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      stroke={layer.stroke}
      strokeWidth={layer.strokeWidth}
      width={layer.width}
    />
  );
}
