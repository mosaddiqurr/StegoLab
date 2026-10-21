import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { bitPlane } from "../lib/analysis";
import { embedPixels } from "../lib/images";
import { ImageCanvas } from "../ui";

const WIDTH = 420, HEIGHT = 280, PAYLOAD = 12_000;

/** A procedural scene. Smooth gradients make the untouched low bits visibly structured, so the payload region stands out. */
function drawScene(): ImageData | undefined {
  const canvas = document.createElement("canvas"); canvas.width = WIDTH; canvas.height = HEIGHT;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;
  const sky = context.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, "#1c2127"); sky.addColorStop(0.5, "#4a4030"); sky.addColorStop(1, "#d6a650");
  context.fillStyle = sky; context.fillRect(0, 0, WIDTH, HEIGHT);
  const sun = context.createRadialGradient(132, 172, 4, 132, 172, 84);
  sun.addColorStop(0, "rgba(255,226,160,1)"); sun.addColorStop(0.35, "rgba(232,182,92,.85)"); sun.addColorStop(1, "rgba(232,182,92,0)");
  context.fillStyle = sun; context.fillRect(0, 0, WIDTH, HEIGHT);
  const ridges: Array<[string, number, number, number]> = [["#2b2a27", 196, 26, 0.013], ["#1d1f22", 222, 18, 0.021], ["#121417", 250, 12, 0.034]];
  for (const [color, base, amplitude, frequency] of ridges) {
    context.beginPath(); context.moveTo(0, HEIGHT);
    for (let x = 0; x <= WIDTH; x += 3) context.lineTo(x, base - Math.sin(x * frequency) * amplitude - Math.sin(x * frequency * 2.7 + 1) * amplitude * 0.4);
    context.lineTo(WIDTH, HEIGHT); context.closePath(); context.fillStyle = color; context.fill();
  }
  return context.getImageData(0, 0, WIDTH, HEIGHT);
}

export function LsbDemo() {
  const [split, setSplit] = useState(100);
  const images = useMemo(() => {
    const original = drawScene();
    if (!original) return;
    // Random bytes stand in for an encrypted payload, which is statistically indistinguishable from noise.
    const stego = embedPixels(original, crypto.getRandomValues(new Uint8Array(PAYLOAD)));
    return { stego, plane: bitPlane(stego, "rgb", 0) };
  }, []);
  useEffect(() => { const timer = setTimeout(() => setSplit(52), 450); return () => clearTimeout(timer); }, []);
  if (!images) return null;
  return <figure className="lsb-demo">
    <div className="lsb-stage" style={{ "--split": split + "%" } as CSSProperties}>
      <ImageCanvas image={images.stego} label="Image carrying 12 KB of hidden data" />
      <ImageCanvas image={images.plane} className="lsb-plane" label="Lowest bit plane of the same image" />
      <span className="lsb-handle" aria-hidden="true" />
      <span className="lsb-tag left" aria-hidden="true">What you see</span>
      <span className="lsb-tag right" aria-hidden="true">Bit plane 0</span>
      <input type="range" min={0} max={100} value={split} aria-label="Reveal the lowest bit plane" onChange={event => setSplit(Number(event.target.value))} />
    </div>
    <figcaption>Computed live in your browser: 12 KB of random bytes written into the lowest bit of each colour channel. The noisy band is the payload. Drag to compare.</figcaption>
  </figure>;
}
