// ── Types ──────────────────────────────────────────────

export interface ProcessOptions {
  maxDimension?: number;   // default: 2048
  quality?: number;        // default: 0.85
  maxFileSize?: number;    // default: 20MB (bytes)
  minDimension?: number;   // default: 200
  detectFace?: boolean;    // default: false
}

export interface ProcessResult {
  file: File;
  originalSize: number;
  processedSize: number;
  wasHeic: boolean;
  wasResized: boolean;
  warnings: ProcessWarning[];
}

export type ProcessWarning =
  | { type: "no-face-detected" }
  | { type: "face-detection-unavailable" };

export interface ValidationError {
  type: "file-too-large" | "file-too-small" | "unsupported-type" | "invalid-image";
}

// ── Constants ──────────────────────────────────────────

const DEFAULTS = {
  maxDimension: 2048,
  quality: 0.85,
  maxFileSize: 20 * 1024 * 1024, // 20 MB
  minDimension: 200,
} as const;

const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

const MAX_PIXELS = 100_000_000; // 100MP — Canvas memory safety limit

// ── HEIC Detection & Conversion ────────────────────────

export function isHeicFile(file: File): boolean {
  if (file.type === "image/heic" || file.type === "image/heif") return true;
  // Android may not set MIME for HEIC files
  return /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  // Safari handles HEIC natively — check if we can decode it
  if (await canDecodeNatively(file)) {
    return file;
  }

  const heic2any = (await import("heic2any")).default;
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  const name = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
  return new File([resultBlob], name, { type: "image/jpeg" });
}

async function canDecodeNatively(file: File): Promise<boolean> {
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = new window.Image();
      img.src = url;
      await img.decode();
      return img.naturalWidth > 0;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return false;
  }
}

// ── Validation ─────────────────────────────────────────

export async function validateImage(
  file: File,
  opts?: Pick<ProcessOptions, "maxFileSize" | "minDimension">,
): Promise<ValidationError[]> {
  const maxFileSize = opts?.maxFileSize ?? DEFAULTS.maxFileSize;
  const minDimension = opts?.minDimension ?? DEFAULTS.minDimension;
  const errors: ValidationError[] = [];

  // Size check
  if (file.size > maxFileSize) {
    errors.push({ type: "file-too-large" });
  }

  // Type check — after potential HEIC conversion, type should be standard
  const effectiveType = file.type || guessType(file.name);
  if (!SUPPORTED_TYPES.has(effectiveType)) {
    errors.push({ type: "unsupported-type" });
  }

  // Dimension check — load image to verify
  try {
    const { width, height } = await getImageDimensions(file);
    if (width < minDimension || height < minDimension) {
      errors.push({ type: "file-too-small" });
    }
    if (width * height > MAX_PIXELS) {
      errors.push({ type: "invalid-image" });
    }
  } catch {
    errors.push({ type: "invalid-image" });
  }

  return errors;
}

function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg",
    png: "image/png", webp: "image/webp",
    gif: "image/gif", heic: "image/heic", heif: "image/heif",
  };
  return map[ext ?? ""] ?? "";
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

// ── Compress & Resize ──────────────────────────────────

export async function compressAndResize(
  file: File,
  opts?: Pick<ProcessOptions, "maxDimension" | "quality">,
): Promise<{ file: File; wasResized: boolean }> {
  const maxDimension = opts?.maxDimension ?? DEFAULTS.maxDimension;
  const quality = opts?.quality ?? DEFAULTS.quality;

  // Skip GIF to preserve animation
  if (file.type === "image/gif") {
    return { file, wasResized: false };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new window.Image();
    img.src = url;
    await img.decode();

    const { naturalWidth: w, naturalHeight: h } = img;

    // Check if resize is needed
    const needsResize = w > maxDimension || h > maxDimension;
    // Always compress to JPEG (unless already small enough and right format)
    const isAlreadySmall = !needsResize && file.type === "image/jpeg" && file.size < 500_000;
    if (isAlreadySmall) {
      return { file, wasResized: false };
    }

    let targetW = w;
    let targetH = h;
    if (needsResize) {
      const ratio = Math.min(maxDimension / w, maxDimension / h);
      targetW = Math.round(w * ratio);
      targetH = Math.round(h * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    // EXIF orientation is auto-corrected by modern browsers when drawing to canvas
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        quality,
      );
    });

    const name = file.name.replace(/\.\w+$/, ".jpg");
    return {
      file: new File([blob], name, { type: "image/jpeg" }),
      wasResized: needsResize,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── Face Detection ─────────────────────────────────────

interface FaceDetectionResult {
  faceDetected: boolean;
  skipped: boolean;
}

export async function detectFace(file: File): Promise<FaceDetectionResult> {
  // Optimistic: if API unavailable or fails, assume face is present (don't block user)
  if (typeof window === "undefined" || !("FaceDetector" in window)) {
    return { faceDetected: true, skipped: true };
  }

  try {
    const bitmap = await createImageBitmap(file);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).FaceDetector();
    const faces = await detector.detect(bitmap);
    bitmap.close();
    return { faceDetected: faces.length > 0, skipped: false };
  } catch {
    return { faceDetected: true, skipped: true };
  }
}

// ── Pipeline ───────────────────────────────────────────

export type ProcessStep = "converting" | "validating" | "compressing" | "detecting-face";

export async function processImage(
  file: File,
  opts?: ProcessOptions,
  onStep?: (step: ProcessStep) => void,
): Promise<{ result: ProcessResult } | { errors: ValidationError[] }> {
  const wasHeic = isHeicFile(file);
  const originalSize = file.size;
  const warnings: ProcessWarning[] = [];

  // Step 1: HEIC conversion
  let current = file;
  if (wasHeic) {
    onStep?.("converting");
    current = await convertHeicToJpeg(file);
  }

  // Step 2: Validation
  onStep?.("validating");
  const errors = await validateImage(current, opts);
  if (errors.length > 0) {
    return { errors };
  }

  // Step 3: Compress & Resize (EXIF auto-corrected)
  onStep?.("compressing");
  const { file: compressed, wasResized } = await compressAndResize(current, opts);
  current = compressed;

  // Step 4: Face detection (optional)
  if (opts?.detectFace) {
    onStep?.("detecting-face");
    const { faceDetected, skipped } = await detectFace(current);
    if (skipped) {
      warnings.push({ type: "face-detection-unavailable" });
    } else if (!faceDetected) {
      warnings.push({ type: "no-face-detected" });
    }
  }

  return {
    result: {
      file: current,
      originalSize,
      processedSize: current.size,
      wasHeic,
      wasResized,
      warnings,
    },
  };
}
