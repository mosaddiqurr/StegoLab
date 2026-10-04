import { CAPACITY, DAMAGED, NO_PAYLOAD, fail } from "./errors";
import { MAX_CONTAINER, concat, equal } from "./payload";

export type ImageFormat = "PNG" | "JPEG" | "BMP" | "WebP";
export const MAX_PIXELS = 16_000_000;
const enc = new TextEncoder();
const FRAME = enc.encode("STG2");
const JPEG_MAGIC = enc.encode("STGLJ2");
const CHUNK_BYTES = 65_519;
export const IMAGE_MIME: Record<ImageFormat, string> = { PNG: "image/png", JPEG: "image/jpeg", BMP: "image/bmp", WebP: "image/webp" };
export const IMAGE_EXTENSION: Record<ImageFormat, string> = { PNG: "png", JPEG: "jpg", BMP: "bmp", WebP: "webp" };
const ascii = (data: Uint8Array, start: number, end: number) => String.fromCharCode(...data.subarray(start, end));
const viewOf = (data: Uint8Array) => new DataView(data.buffer, data.byteOffset, data.byteLength);

export function detectImage(data: Uint8Array): ImageFormat | undefined {
  if (equal(data.subarray(0, 8), new Uint8Array([137,80,78,71,13,10,26,10]))) return "PNG";
  if (data[0] === 255 && data[1] === 216 && data[2] === 255) return "JPEG";
  if (ascii(data, 0, 2) === "BM") return "BMP";
  if (ascii(data, 0, 4) === "RIFF" && ascii(data, 8, 12) === "WEBP") return "WebP";
}
function dimensions(width: number, height: number) {
  if (!width || !height || width * height > MAX_PIXELS || width > 16_384 || height > 16_384) fail("Use an image up to 16 megapixels and 16,384 pixels per side.");
  return { width, height };
}
export function pngDimensions(data: Uint8Array) {
  if (data.length < 33 || ascii(data, 12, 16) !== "IHDR" || viewOf(data).getUint32(8) !== 13) fail(DAMAGED);
  // Animation would be flattened by canvas, so it is deliberately not accepted.
  let offset = 8, ended = false;
  while (offset + 12 <= data.length) {
    const length = viewOf(data).getUint32(offset), tag = ascii(data, offset + 4, offset + 8);
    if (length > data.length - offset - 12) fail(DAMAGED);
    if (tag === "acTL") fail("Animated images are not supported.");
    offset += length + 12;
    if (tag === "IEND") { ended = true; break; }
  }
  if (!ended || offset !== data.length) fail(DAMAGED);
  return dimensions(viewOf(data).getUint32(16), viewOf(data).getUint32(20));
}
export async function decodePixels(data: Uint8Array, format: ImageFormat): Promise<ImageData> {
  const expected = format === "PNG" ? pngDimensions(data) : format === "JPEG" ? jpegParts(data).size : webpParts(data).size;
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(new Blob([new Uint8Array(data)], { type: IMAGE_MIME[format] }), { imageOrientation: "none" }); }
  catch { fail("The image could not be processed."); }
  try {
    if (bitmap.width !== expected.width || bitmap.height !== expected.height) fail(DAMAGED);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) fail("This browser cannot process this image.");
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally { bitmap.close(); }
}
export function opaqueSlots(pixels: ImageData): number {
  let slots = 0;
  for (let i = 3; i < pixels.data.length; i += 4) if (pixels.data[i] === 255) slots += 3;
  return slots;
}
function* pngPositions(pixels: ImageData): Generator<number> {
  for (let i = 0; i < pixels.data.length; i += 4) if (pixels.data[i + 3] === 255) { yield i; yield i + 1; yield i + 2; }
}
export function pixelCapacity(slots: number): number { return Math.max(0, Math.min(MAX_CONTAINER, Math.floor(slots / 8) - 8)); }
function writePixels(bytes: Uint8Array | Uint8ClampedArray, positions: Generator<number>, payload: Uint8Array, capacity: number) {
  if (payload.length > capacity) fail(CAPACITY);
  const prefix = new Uint8Array(8); prefix.set(FRAME); viewOf(prefix).setUint32(4, payload.length);
  for (const byte of concat(prefix, payload)) for (let bit = 7; bit >= 0; bit--) {
    const next = positions.next(); if (next.done) fail(CAPACITY);
    bytes[next.value] = (bytes[next.value] & 254) | ((byte >> bit) & 1);
  }
}
function readPixels(bytes: Uint8Array | Uint8ClampedArray, positions: Generator<number>, capacity: number): Uint8Array {
  const read = (length: number) => {
    const result = new Uint8Array(length);
    for (let i = 0; i < length; i++) for (let bit = 7; bit >= 0; bit--) {
      const next = positions.next(); if (next.done) fail(NO_PAYLOAD);
      result[i] |= (bytes[next.value] & 1) << bit;
    }
    return result;
  };
  const prefix = read(8);
  if (!equal(prefix.subarray(0, 4), FRAME)) fail(NO_PAYLOAD);
  const length = viewOf(prefix).getUint32(4);
  if (!length || length > capacity || length > MAX_CONTAINER) fail(DAMAGED);
  return read(length);
}
export async function embedPng(pixels: ImageData, payload: Uint8Array): Promise<Uint8Array> {
  const copy = new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height);
  writePixels(copy.data, pngPositions(copy), payload, pixelCapacity(opaqueSlots(copy)));
  const canvas = document.createElement("canvas"); canvas.width = copy.width; canvas.height = copy.height;
  const context = canvas.getContext("2d"); if (!context) fail("This browser cannot process this image.");
  context.putImageData(copy, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error()), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}
export function extractPng(pixels: ImageData): Uint8Array { return readPixels(pixels.data, pngPositions(pixels), pixelCapacity(opaqueSlots(pixels))); }

export function bmpLayout(data: Uint8Array) {
  if (data.length < 54) fail(DAMAGED);
  const view = viewOf(data), dib = view.getUint32(14, true), offset = view.getUint32(10, true);
  const width = view.getInt32(18, true), signedHeight = view.getInt32(22, true), height = Math.abs(signedHeight);
  const bpp = view.getUint16(28, true), compression = view.getUint32(30, true);
  if (dib < 40 || offset < 14 + dib || view.getUint16(26, true) !== 1 || ![24,32].includes(bpp) || compression !== 0) fail("Use an uncompressed 24-bit or 32-bit BMP image.");
  if (width <= 0) fail(DAMAGED);
  dimensions(width, height);
  const stride = Math.ceil(width * bpp / 32) * 4;
  if (view.getUint32(2, true) !== data.length || offset + stride * height > data.length) fail(DAMAGED);
  return { width, height, offset, stride, bytesPerPixel: bpp / 8 };
}
function* bmpPositions(data: Uint8Array): Generator<number> {
  const { width, height, offset, stride, bytesPerPixel } = bmpLayout(data);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < 3; c++) yield offset + y * stride + x * bytesPerPixel + c;
}
export function embedBmp(data: Uint8Array, payload: Uint8Array): Uint8Array {
  const layout = bmpLayout(data), copy = new Uint8Array(data);
  writePixels(copy, bmpPositions(copy), payload, pixelCapacity(layout.width * layout.height * 3));
  return copy;
}
export function extractBmp(data: Uint8Array): Uint8Array {
  const layout = bmpLayout(data); return readPixels(data, bmpPositions(data), pixelCapacity(layout.width * layout.height * 3));
}

interface JpegSegment { start: number; end: number; marker: number; body: Uint8Array }
export function jpegParts(data: Uint8Array) {
  if (data.length < 4 || data[0] !== 255 || data[1] !== 216 || data[data.length - 2] !== 255 || data[data.length - 1] !== 217) fail(DAMAGED);
  const parts: JpegSegment[] = []; let offset = 2, size: { width: number; height: number } | undefined;
  while (offset < data.length) {
    const start = offset;
    if (data[offset++] !== 255) fail(DAMAGED);
    while (data[offset] === 255) offset++;
    const marker = data[offset++];
    if (marker === 218) { if (!size) fail(DAMAGED); return { parts, tail: data.subarray(start), size }; }
    if (marker === 0 || marker === 216 || marker === 217 || marker === undefined || offset + 2 > data.length) fail(DAMAGED);
    const length = viewOf(data).getUint16(offset);
    if (length < 2 || offset + length > data.length) fail(DAMAGED);
    const body = data.subarray(offset + 2, offset + length);
    if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
      if (body.length < 6) fail(DAMAGED);
      size = dimensions(viewOf(body).getUint16(3), viewOf(body).getUint16(1));
    }
    parts.push({ start, end: offset + length, marker, body }); offset += length;
  }
  return fail(DAMAGED);
}
const isJpegPayload = (part: JpegSegment) => part.marker === 239 && equal(part.body.subarray(0, 6), JPEG_MAGIC);
export function embedJpeg(data: Uint8Array, payload: Uint8Array): Uint8Array {
  const { parts, tail } = jpegParts(data);
  const count = Math.ceil(payload.length / CHUNK_BYTES), output = [data.subarray(0, 2)];
  for (let i = 0; i < count; i++) {
    const chunk = payload.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES), segment = new Uint8Array(16 + chunk.length), view = viewOf(segment);
    segment[0] = 255; segment[1] = 239; view.setUint16(2, segment.length - 2); segment.set(JPEG_MAGIC, 4);
    view.setUint16(10, i); view.setUint16(12, count); view.setUint16(14, chunk.length); segment.set(chunk, 16); output.push(segment);
  }
  for (const part of parts) if (!isJpegPayload(part)) output.push(data.subarray(part.start, part.end));
  output.push(tail); return concat(...output);
}
export function extractJpeg(data: Uint8Array): Uint8Array {
  const candidates = jpegParts(data).parts.filter(isJpegPayload);
  if (!candidates.length) fail(NO_PAYLOAD);
  if (candidates.length > Math.ceil(MAX_CONTAINER / CHUNK_BYTES)) fail(DAMAGED);
  const chunks: Uint8Array[] = []; let length = 0;
  for (const [i, part] of candidates.entries()) {
    if (part.body.length < 12) fail(DAMAGED);
    const view = viewOf(part.body);
    if (view.getUint16(6) !== i || view.getUint16(8) !== candidates.length || view.getUint16(10) !== part.body.length - 12) fail(DAMAGED);
    const chunk = part.body.subarray(12); length += chunk.length; if (length > MAX_CONTAINER) fail(DAMAGED); chunks.push(chunk);
  }
  return concat(...chunks);
}

export function webpParts(data: Uint8Array) {
  if (data.length < 20 || viewOf(data).getUint32(4, true) !== data.length - 8) fail(DAMAGED);
  const parts: Array<{ tag: string; bytes: Uint8Array; body: Uint8Array }> = [];
  let offset = 12, size: { width: number; height: number } | undefined;
  while (offset + 8 <= data.length) {
    const tag = ascii(data, offset, offset + 4), length = viewOf(data).getUint32(offset + 4, true), end = offset + 8 + length + (length % 2);
    if (end > data.length) fail(DAMAGED);
    const body = data.subarray(offset + 8, offset + 8 + length);
    if (tag === "ANIM" || tag === "ANMF" || (tag === "VP8X" && (body[0] & 2))) fail("Animated images are not supported.");
    if (tag === "VP8X" && length >= 10) size = dimensions(1 + body[4] + (body[5] << 8) + (body[6] << 16), 1 + body[7] + (body[8] << 8) + (body[9] << 16));
    if (!size && tag === "VP8 " && length >= 10 && ascii(body, 3, 6) === "\x9d\x01\x2a") size = dimensions(viewOf(body).getUint16(6, true) & 16383, viewOf(body).getUint16(8, true) & 16383);
    if (!size && tag === "VP8L" && length >= 5 && body[0] === 47) { const bits = viewOf(body).getUint32(1, true); size = dimensions(1 + (bits & 16383), 1 + ((bits >>> 14) & 16383)); }
    parts.push({ tag, bytes: data.subarray(offset, end), body }); offset = end;
  }
  if (offset !== data.length || !size || !parts.some(part => ["VP8 ", "VP8L"].includes(part.tag))) fail(DAMAGED);
  return { parts, size };
}
export function embedWebp(data: Uint8Array, payload: Uint8Array): Uint8Array {
  const parts = webpParts(data).parts.filter(part => part.tag !== "STGL");
  const chunk = new Uint8Array(8 + payload.length + (payload.length % 2)); chunk.set(enc.encode("STGL")); viewOf(chunk).setUint32(4, payload.length, true); chunk.set(payload, 8);
  const output = concat(data.subarray(0, 12), ...parts.map(part => part.bytes), chunk); viewOf(output).setUint32(4, output.length - 8, true); return output;
}
export function extractWebp(data: Uint8Array): Uint8Array {
  const candidates = webpParts(data).parts.filter(part => part.tag === "STGL");
  if (!candidates.length) fail(NO_PAYLOAD);
  if (candidates.length !== 1 || candidates[0].body.length > MAX_CONTAINER) fail(DAMAGED);
  return new Uint8Array(candidates[0].body);
}
