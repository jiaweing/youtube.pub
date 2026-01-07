import type Konva from "konva";
import { Ellipse, Group, Image, Rect, Text } from "react-konva";
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
  onDblClick?: (layerId: string) => void;
}

// Helper to draw a rounded rect path for clipping
function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cornerRadius: number | [number, number, number, number]
) {
  const radii = Array.isArray(cornerRadius)
    ? cornerRadius
    : [cornerRadius, cornerRadius, cornerRadius, cornerRadius];
  const [tl, tr, br, bl] = radii;

  ctx.beginPath();
  ctx.moveTo(tl, 0);
  ctx.lineTo(width - tr, 0);
  ctx.arcTo(width, 0, width, tr, tr);
  ctx.lineTo(width, height - br);
  ctx.arcTo(width, height, width - br, height, br);
  ctx.lineTo(bl, height);
  ctx.arcTo(0, height, 0, height - bl, bl);
  ctx.lineTo(0, tl);
  ctx.arcTo(0, 0, tl, 0, tl);
  ctx.closePath();
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

  const hasCornerRadius =
    (typeof layer.cornerRadius === "number" && layer.cornerRadius > 0) ||
    (Array.isArray(layer.cornerRadius) &&
      layer.cornerRadius.some((r: number) => r > 0));

  // If no corner radius, render the simple Image
  if (!hasCornerRadius) {
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

  // Use a Group with clipFunc for rounded corners
  return (
    <Group
      clipFunc={(ctx: CanvasRenderingContext2D) => {
        drawRoundedRectPath(ctx, layer.width, layer.height, layer.cornerRadius);
      }}
      draggable={!layer.locked && activeTool === "select"}
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
      scaleX={layer.scaleX}
      scaleY={layer.scaleY}
      x={layer.x}
      y={layer.y}
    >
      <Image height={layer.height} image={image} width={layer.width} />
    </Group>
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
      onDblClick={() => props.onDblClick?.(layer.id)}
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
