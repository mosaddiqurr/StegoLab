import { CAPACITY, NO_PAYLOAD, ProductError, fail } from "./errors";
import { IMAGE_EXTENSION, IMAGE_MIME, bmpLayout, decodePixels, detectImage, embedBmp, embedJpeg, embedPng, embedWebp, extractBmp, extractJpeg, extractPng, extractWebp, opaqueSlots, pixelCapacity, type ImageFormat } from "./images";
import { MAX_CONTAINER, MAX_PAYLOAD, equal, inspectPayload, packPayload, packedSize, unpackPayload, type PayloadInput, type RecoveredPayload } from "./payload";

export const MAX_CARRIER = 40 * 1024 * 1024;
export const ACCEPT_CARRIERS = ".png,.jpg,.jpeg,.bmp,.webp,.pdf,image/png,image/jpeg,image/bmp,image/webp,application/pdf";
export type CarrierFormat = ImageFormat | "PDF";
export interface Carrier { bytes: Uint8Array; name: string; format: CarrierFormat; capacity: number; pixels?: ImageData; width?: number; height?: number; pages?: number }
export interface Output { bytes: Uint8Array; filename: string; mime: string }
export const FORMAT_DETAILS: Record<CarrierFormat, string> = {
  PNG: "PNG output · one bit per RGB channel in fully opaque pixels. Keep the downloaded image unchanged; resizing or editing can remove its data.",
  BMP: "BMP output · one bit per RGB channel. Uncompressed 24-bit and 32-bit BMP images are supported. Keep the downloaded image unchanged.",
  JPEG: "JPEG output · data is stored in application segments. The original compressed image is preserved. Metadata stripping or re-saving may remove the data.",
  WebP: "WebP output · data is stored in a custom RIFF chunk. The original compressed image is preserved. Metadata stripping or re-saving may remove the data.",
  PDF: "PDF output · payloads use an embedded-data container and may be visible to PDF attachment or forensic tools. Rewriting a PDF may remove the data. Signed and password-protected PDFs are not suitable carriers.",
};

export async function prepareCarrier(file: File): Promise<Carrier> {
  if (!file.size) fail("Choose a non-empty carrier file.");
  if (file.size > MAX_CARRIER) fail("Choose a carrier smaller than 40 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
  const format = pdf ? "PDF" : detectImage(bytes);
  if (!format) fail("Unsupported file format.");
  let capacity = MAX_CONTAINER, pixels: ImageData | undefined, width: number | undefined, height: number | undefined, pages: number | undefined;
  if (format === "PNG") { pixels = await decodePixels(bytes, format); capacity = pixelCapacity(opaqueSlots(pixels)); ({ width, height } = pixels); }
  else if (format === "BMP") { const layout = bmpLayout(bytes); capacity = pixelCapacity(layout.width * layout.height * 3); ({ width, height } = layout); }
  else if (format === "PDF") { const { openPdf } = await import("./pdf"); pages = (await openPdf(bytes)).getPageCount(); }
  else ({ width, height } = await decodePixels(bytes, format));
  return { bytes, name: file.name, format, capacity, pixels, width, height, pages };
}

export function availableBytes(carrier: Carrier, filename: string, mime: string, encrypted: boolean): number {
  return Math.max(0, Math.min(MAX_PAYLOAD, carrier.capacity - packedSize(0, filename, mime, encrypted)));
}
/** True when even an empty payload cannot fit, e.g. a PNG whose pixels are all translucent. */
export function hasNoCapacity(carrier: Carrier): boolean { return carrier.capacity < packedSize(0, "message.txt", "text/plain", false); }
/** Pixel formats store data in the image itself; the others use a container segment and leave pixels untouched. */
export const PIXEL_FORMATS: readonly CarrierFormat[] = ["PNG", "BMP"];
export const METHOD: Record<CarrierFormat, string> = { PNG: "Least-significant bit", BMP: "Least-significant bit", JPEG: "APP15 segments", WebP: "RIFF chunk", PDF: "Embedded file stream" };
export async function readContainer(carrier: Carrier): Promise<Uint8Array> {
  switch (carrier.format) {
    case "PNG": return extractPng(carrier.pixels!);
    case "BMP": return extractBmp(carrier.bytes);
    case "JPEG": return extractJpeg(carrier.bytes);
    case "WebP": return extractWebp(carrier.bytes);
    case "PDF": { const { extractPdf } = await import("./pdf"); return extractPdf(carrier.bytes); }
  }
}

export async function embedCarrier(carrier: Carrier, input: PayloadInput, password?: string): Promise<Output> {
  if (input.data.length > MAX_PAYLOAD) fail("The payload exceeds the 8 MB limit.");
  if (packedSize(input.data.length, input.filename, input.mime, password !== undefined) > carrier.capacity) fail(CAPACITY);
  try { await readContainer(carrier); fail("This file already contains StegoLab data. Choose an original carrier."); }
  catch (error) { if (!(error instanceof ProductError) || error.message !== NO_PAYLOAD) throw error; }
  const payload = await packPayload(input, password);
  let bytes: Uint8Array;
  switch (carrier.format) {
    case "PNG": bytes = await embedPng(carrier.pixels!, payload); break;
    case "BMP": bytes = embedBmp(carrier.bytes, payload); break;
    case "JPEG": bytes = embedJpeg(carrier.bytes, payload); break;
    case "WebP": bytes = embedWebp(carrier.bytes, payload); break;
    case "PDF": { const { embedPdf } = await import("./pdf"); bytes = await embedPdf(carrier.bytes, payload); break; }
  }
  if (bytes.length > MAX_CARRIER) fail("The generated file exceeds the 40 MB limit. Choose a smaller carrier.");
  const extension = carrier.format === "PDF" ? "pdf" : IMAGE_EXTENSION[carrier.format];
  const mime = carrier.format === "PDF" ? "application/pdf" : IMAGE_MIME[carrier.format];
  // A download is only offered after the saved/redecoded output contains the exact packed data.
  const reopened = await prepareCarrier(new File([new Uint8Array(bytes)], `stegolab.${extension}`, { type: mime }));
  if (!equal(await readContainer(reopened), payload)) fail("The output could not be verified. Try another carrier.");
  return { bytes, filename: `stegolab-${carrier.format === "PDF" ? "document" : "image"}.${extension}`, mime };
}
export async function inspectCarrier(carrier: Carrier): Promise<{ container: Uint8Array; encrypted: boolean }> {
  const container = await readContainer(carrier); return { container, ...await inspectPayload(container) };
}
export async function extractCarrier(carrier: Carrier, password?: string): Promise<RecoveredPayload> {
  return unpackPayload(await readContainer(carrier), password);
}
