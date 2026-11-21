import { ALL_FORMATS, BlobSource, CanvasSink, Input } from 'mediabunny';

import type {
  SourcePaletteColor,
  SourcePaletteRgb,
} from './source-palette.type';
import { isVideoMimeType } from './source-types';

// Small on purpose: main colors survive the shrink, and it keeps the work under a few ms.
const SAMPLE_SIDE = 64;
const VIDEO_FRAME_SECONDS = 0.5;
const MAX_COLORS = 5;
// 16 levels per channel: close shades share a bucket, and 4,096 buckets stay cheap.
const BUCKET_SHIFT = 4;
// RGB distance below which two colors read as the same to the eye.
const MIN_COLOR_DISTANCE = 32;
// Smaller than this is edge blur or noise, not a color of the image.
const MIN_SHARE = 0.02;
const MIN_ALPHA = 128;

/** The main colors of an image or a video's first moments, most used first, as `#rrggbb`. */
export async function computePalette(file: File): Promise<string[]> {
  const pixels = isVideoMimeType(file.type)
    ? await readVideoPixels(file)
    : await readImagePixels(file);

  return pickPalette(pixels);
}

// *** readImagePixels ***
async function readImagePixels(file: File): Promise<Uint8ClampedArray> {
  const bitmap = await createImageBitmap(file, {
    resizeWidth: SAMPLE_SIDE,
    resizeHeight: SAMPLE_SIDE,
  });

  try {
    return readCanvasPixels(bitmap);
  } finally {
    bitmap.close();
  }
}

// *** readVideoPixels ***
async function readVideoPixels(file: File): Promise<Uint8ClampedArray> {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file),
  });

  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) return new Uint8ClampedArray();

    const sink = new CanvasSink(track, {
      width: SAMPLE_SIDE,
      height: SAMPLE_SIDE,
      fit: 'fill',
    });
    // Skip the very first frame, which is often black or a fade in.
    const frame = await sink.getCanvas(VIDEO_FRAME_SECONDS);
    return frame ? readCanvasPixels(frame.canvas) : new Uint8ClampedArray();
  } finally {
    input.dispose();
  }
}

// *** readCanvasPixels ***
function readCanvasPixels(
  image: ImageBitmap | HTMLCanvasElement | OffscreenCanvas,
): Uint8ClampedArray {
  const canvas = new OffscreenCanvas(SAMPLE_SIDE, SAMPLE_SIDE);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The browser cannot read image pixels.');

  context.drawImage(image, 0, 0, SAMPLE_SIDE, SAMPLE_SIDE);
  return context.getImageData(0, 0, SAMPLE_SIDE, SAMPLE_SIDE).data;
}

// *** pickPalette ***
// Count colors in coarse buckets, then fold each bucket into a bigger one that looks the same.
// Counting, not splitting, so an exact color keeps all its pixels and no in-between color is made up.
function pickPalette(data: Uint8ClampedArray): string[] {
  const buckets = countBuckets(data);
  const total = buckets.reduce((sum, { count }) => sum + count, 0);

  return mergeClose(buckets)
    .filter(({ count }) => count / total >= MIN_SHARE)
    .slice(0, MAX_COLORS)
    .map(({ rgb }) => toHex(rgb));
}

// *** countBuckets ***
// Most used first. See-through pixels have no color the user sees.
function countBuckets(data: Uint8ClampedArray): SourcePaletteColor[] {
  const sums = new Map<
    number,
    { r: number; g: number; b: number; count: number }
  >();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < MIN_ALPHA) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const key =
      ((r >> BUCKET_SHIFT) << 16) |
      ((g >> BUCKET_SHIFT) << 8) |
      (b >> BUCKET_SHIFT);
    const sum = sums.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    sums.set(key, {
      r: sum.r + r,
      g: sum.g + g,
      b: sum.b + b,
      count: sum.count + 1,
    });
  }

  return [...sums.values()]
    .map(({ r, g, b, count }) => ({
      rgb: [r, g, b].map((value) =>
        Math.round(value / count),
      ) as SourcePaletteRgb,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

// *** mergeClose ***
// The list is most used first, so a near-duplicate always joins the bigger color.
function mergeClose(colors: SourcePaletteColor[]): SourcePaletteColor[] {
  const kept = colors.reduce<SourcePaletteColor[]>((result, color) => {
    const index = result.findIndex(
      (other) => distance(color.rgb, other.rgb) < MIN_COLOR_DISTANCE,
    );
    if (index === -1) return [...result, color];
    return result.map((other, i) =>
      i === index ? { ...other, count: other.count + color.count } : other,
    );
  }, []);

  return kept.sort((a, b) => b.count - a.count);
}

// *** distance ***
function distance(a: SourcePaletteRgb, b: SourcePaletteRgb): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// *** toHex ***
function toHex(rgb: SourcePaletteRgb): string {
  return `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export { pickPalette };
