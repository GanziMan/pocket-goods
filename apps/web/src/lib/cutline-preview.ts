import type { OutputSize } from "@/lib/order-pricing";
import { OUTPUT_SIZE_MM } from "@/lib/output-size";

const CUTLINE_OFFSET_MM = 2;

export type Point = { x: number; y: number };
export type MaskBounds = { minX: number; minY: number; maxX: number; maxY: number };

export type CutlinePreviewResult = {
  safe: boolean;
  reason?: string;
  warning?: string;
  contours: Point[][];
  cutRegionCount: number;
  islandCount: number;
  cutlineOffsetMm: number;
};

type MaskComponent = {
  id: number;
  pixels: number[];
  bounds: MaskBounds;
};

type ConnectedComponents = {
  components: MaskComponent[];
  labels: Int32Array;
};

export function buildCutlinePreview(imageData: ImageData, outputSize: OutputSize): CutlinePreviewResult {
  const { width, height } = imageData;
  const cutlineOffsetPx = getCutlineOffsetPx(width, height, outputSize);
  const alphaMask = extractAlphaMask(imageData);
  const dilatedMask = dilateMask(alphaMask, width, height, cutlineOffsetPx);
  const bounds = getMaskBounds(dilatedMask, width, height);

  if (!bounds) {
    return {
      safe: false,
      reason: "이미지가 비어 있어 칼선을 만들 수 없습니다.",
      contours: [],
      cutRegionCount: 0,
      islandCount: 0,
      cutlineOffsetMm: CUTLINE_OFFSET_MM,
    };
  }

  const { components, labels } = findConnectedComponents(dilatedMask, width, height);
  const contours = components
    .map((component) => traceComponentCutline(component, labels, width, height))
    .filter((contour): contour is Point[] => Boolean(contour));

  if (!contours.length) {
    return {
      safe: false,
      reason: "이미지 외곽을 찾을 수 없어 칼선을 만들 수 없습니다.",
      contours: [],
      cutRegionCount: 0,
      islandCount: components.length,
      cutlineOffsetMm: CUTLINE_OFFSET_MM,
    };
  }

  const cutRegionCount = contours.length;
  const safe = bounds.minX > 0 && bounds.minY > 0 && bounds.maxX < width - 1 && bounds.maxY < height - 1;
  const warning =
    cutRegionCount > 1
      ? `칼선이 ${cutRegionCount}개의 분리 영역으로 나뉩니다. 한 이미지 안에서도 투명 여백으로 떨어진 그림 조각은 ${CUTLINE_OFFSET_MM}mm 칼선 확장 영역 밖이면 각각 별도 칼선으로 제작됩니다. 하나로 만들려면 이미지를 겹치거나 간격을 줄여주세요.`
      : undefined;

  return {
    safe,
    reason: safe
      ? undefined
      : "이미지 또는 칼선이 작업 영역 바깥쪽에 너무 가깝습니다. 캔버스 안쪽으로 옮긴 뒤 주문해주세요.",
    warning,
    contours,
    cutRegionCount,
    islandCount: components.length,
    cutlineOffsetMm: CUTLINE_OFFSET_MM,
  };
}

export function drawSmoothClosedPath(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }
  ctx.closePath();
}

function extractAlphaMask(imageData: ImageData): Uint8Array {
  const mask = new Uint8Array(imageData.width * imageData.height);
  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = imageData.data[i * 4 + 3] > 18 ? 1 : 0;
  }
  return mask;
}

function dilateMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const output = new Uint8Array(mask.length);
  const r2 = radius * radius;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          if (dx * dx + dy * dy > r2) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            output[ny * width + nx] = 1;
          }
        }
      }
    }
  }
  return output;
}

function getMaskBounds(mask: Uint8Array, width: number, height: number): MaskBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

function getCutlineOffsetPx(width: number, height: number, outputSize: OutputSize): number {
  const size = OUTPUT_SIZE_MM[outputSize];
  const pxPerMm = Math.min(width / size.width, height / size.height);
  return Math.max(2, Math.round(CUTLINE_OFFSET_MM * pxPerMm));
}

function findConnectedComponents(mask: Uint8Array, width: number, height: number): ConnectedComponents {
  const labels = new Int32Array(mask.length);
  const components: MaskComponent[] = [];
  const minPixels = Math.max(24, Math.round(width * height * 0.00002));
  let nextId = 1;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || labels[start]) continue;

    const id = nextId;
    nextId += 1;
    const stack = [start];
    const pixels: number[] = [];
    const bounds: MaskBounds = {
      minX: width,
      minY: height,
      maxX: -1,
      maxY: -1,
    };
    labels[start] = id;

    while (stack.length) {
      const index = stack.pop()!;
      pixels.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);

      const neighbors = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor < 0 || !mask[neighbor] || labels[neighbor]) continue;
        labels[neighbor] = id;
        stack.push(neighbor);
      }
    }

    if (pixels.length >= minPixels) {
      components.push({ id, pixels, bounds });
    }
  }

  return { components, labels };
}

function traceComponentCutline(
  component: MaskComponent,
  labels: Int32Array,
  width: number,
  height: number,
): Point[] | null {
  const points: Point[] = [];

  for (const index of component.pixels) {
    const x = index % width;
    const y = Math.floor(index / width);
    if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) continue;

    if (
      labels[index - 1] !== component.id ||
      labels[index + 1] !== component.id ||
      labels[index - width] !== component.id ||
      labels[index + width] !== component.id
    ) {
      points.push({ x, y });
    }
  }

  return points.length > 24 ? smoothRadialContour(points, 160) : null;
}

function smoothRadialContour(points: Point[], samples: number): Point[] {
  const center = points.reduce(
    (acc, point) => ({ x: acc.x + point.x / points.length, y: acc.y + point.y / points.length }),
    { x: 0, y: 0 },
  );

  const buckets: Point[][] = Array.from({ length: samples }, () => []);
  for (const point of points) {
    const angle = Math.atan2(point.y - center.y, point.x - center.x);
    const bucket = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * samples) % samples;
    buckets[bucket].push(point);
  }

  const contour: Point[] = [];
  for (const bucket of buckets) {
    if (!bucket.length) continue;
    let farthest = bucket[0];
    let farthestDistance = -1;
    for (const point of bucket) {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const distance = dx * dx + dy * dy;
      if (distance > farthestDistance) {
        farthest = point;
        farthestDistance = distance;
      }
    }
    contour.push(farthest);
  }

  return chaikin(contour, 2);
}

function chaikin(points: Point[], iterations: number): Point[] {
  let result = points;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next: Point[] = [];
    for (let i = 0; i < result.length; i += 1) {
      const p0 = result[i];
      const p1 = result[(i + 1) % result.length];
      next.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
      next.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
    }
    result = next;
  }
  