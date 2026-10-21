import { fail } from "./errors";

export type Channel = "rgb" | "r" | "g" | "b";

// "rgb" counts how many of the three channel bits are set and maps 0-3 onto a graphite-to-gold ramp.
const RAMP = [[17, 20, 24], [92, 78, 50], [160, 126, 60], [233, 186, 92]];
/** Renders one bit plane of an image. Single channels render as greyscale; "rgb" combines all three channels. */
export function bitPlane(source: ImageData, channel: Channel, plane: number): ImageData {
  const input = source.data, output = new Uint8ClampedArray(input.length), mask = 1 << plane;
  const pick = channel === "r" ? 0 : channel === "g" ? 1 : channel === "b" ? 2 : -1;
  for (let i = 0; i < input.length; i += 4) {
    if (pick < 0) { const [r, g, b] = RAMP[(input[i] & mask ? 1 : 0) + (input[i + 1] & mask ? 1 : 0) + (input[i + 2] & mask ? 1 : 0)]; output[i] = r; output[i + 1] = g; output[i + 2] = b; }
    else output[i] = output[i + 1] = output[i + 2] = input[i + pick] & mask ? 255 : 0;
    output[i + 3] = 255;
  }
  return new ImageData(output, source.width, source.height);
}

/** Decodes an image for viewing only. Carrier validation stays in carriers.ts. */
export async function decodeForView(bytes: Uint8Array, mime: string, maxPixels = 16_000_000): Promise<ImageData> {
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: mime }), { imageOrientation: "none", premultiplyAlpha: "none", colorSpaceConversion: "none" }); }
  catch { fail("The image could not be processed."); }
  try {
    if (bitmap.width * bitmap.height > maxPixels) fail("Use an image up to 16 megapixels.");
    const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) fail("This browser cannot process this image.");
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally { bitmap.close(); }
}

export function paint(canvas: HTMLCanvasElement, image: ImageData) {
  canvas.width = image.width; canvas.height = image.height;
  canvas.getContext("2d")?.putImageData(image, 0, 0);
}

/** A rough guessing-entropy estimate for the strength hint. It is guidance only and never blocks a password. */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!password) return { score: 0, label: "" };
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33;
  const unique = new Set(password).size;
  const bits = Math.log2(Math.max(pool, 2)) * Math.min([...password].length, unique * 2);
  if (bits < 45) return { score: 1, label: "Weak" };
  if (bits < 65) return { score: 2, label: "Fair" };
  if (bits < 90) return { score: 3, label: "Strong" };
  return { score: 4, label: "Very strong" };
}
