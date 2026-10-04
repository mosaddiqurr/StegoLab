// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bmpLayout, detectImage, embedBmp, embedJpeg, embedWebp, extractBmp, extractJpeg, extractWebp, pixelCapacity } from "./images";
import { concat } from "./payload";

function bmp(width = 64, height = 64, bpp = 24) {
  const stride = Math.ceil(width * bpp / 32) * 4, data = new Uint8Array(54 + stride * height), view = new DataView(data.buffer);
  data.set([66,77]); view.setUint32(2,data.length,true); view.setUint32(10,54,true); view.setUint32(14,40,true);
  view.setInt32(18,width,true); view.setInt32(22,-height,true); view.setUint16(26,1,true); view.setUint16(28,bpp,true); data.fill(126,54); return data;
}
describe("format-specific framing", () => {
  it("preserves BMP padding and alpha; checks capacity exactly", () => {
    const data = bmp(65, 64, 32), size = pixelCapacity(65 * 64 * 3), payload = new Uint8Array(size).fill(171);
    const out = embedBmp(data,payload); expect(extractBmp(out)).toEqual(payload);
    for (let i = 57; i < out.length; i += 4) expect(out[i]).toBe(data[i]);
    expect(() => embedBmp(data,new Uint8Array(size + 1))).toThrow("capacity");
    expect(() => extractBmp(data)).toThrow("No StegoLab");
    const odd = bmp(65, 64); expect(extractBmp(embedBmp(odd, new Uint8Array([1,2,3])))).toEqual(new Uint8Array([1,2,3]));
  });
  it("rejects invalid BMP dimensions, truncated pixels and compressed variants", () => {
    const data = bmp(); expect(() => bmpLayout(data.subarray(0,-1))).toThrow();
    new DataView(data.buffer).setUint32(30,1,true); expect(() => bmpLayout(data)).toThrow("uncompressed");
  });
  it("splits large JPEG payloads into ordered APP15 segments, preserving other segments", () => {
    const jpeg = new Uint8Array([255,216,255,224,0,4,11,12,255,192,0,8,8,0,64,0,64,1,255,218,0,2,0,255,217]);
    const payload = Uint8Array.from({length: 140_000},(_,i) => i % 251), out = embedJpeg(jpeg,payload);
    expect(detectImage(out)).toBe("JPEG"); expect(extractJpeg(out)).toEqual(payload);
    expect(Array.from(out.slice(-17))).toEqual(Array.from(jpeg.slice(-17)));
    const damaged = new Uint8Array(out); damaged[13] = 9; expect(() => extractJpeg(damaged)).toThrow();
    expect(() => extractJpeg(jpeg)).toThrow("No StegoLab");
  });
  it("adds padded WebP RIFF chunks and updates the exact file size", () => {
    const head = new TextEncoder().encode("RIFFxxxxWEBPVP8L");
    const data = concat(head, new Uint8Array([5,0,0,0,47,0,0,0,0,0])); new DataView(data.buffer).setUint32(4,data.length-8,true);
    const payload = new Uint8Array([0,255,4]), out = embedWebp(data,payload);
    expect(extractWebp(out)).toEqual(payload); expect(new DataView(out.buffer).getUint32(4,true)).toBe(out.length-8);
    expect(() => extractWebp(data)).toThrow("No StegoLab"); expect(() => extractWebp(out.subarray(0,-1))).toThrow();
  });
});
