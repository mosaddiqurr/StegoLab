import { chromium } from "@playwright/test";
import { PDFDocument } from "../frontend/node_modules/pdf-lib/cjs/index.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const fixtureRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".fixtures");
export default async function generate() {
  await fs.mkdir(fixtureRoot, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const images = await page.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
      const context = canvas.getContext("2d");
      const image = context.createImageData(512,512);
      for (let y=0; y<512; y++) for (let x=0; x<512; x++) {
        const i = (y * 512 + x) * 4; image.data[i] = (x*3+y)%256; image.data[i+1] = (y*2+x)%256; image.data[i+2] = (x+y*3)%256; image.data[i+3]=255;
      }
      context.putImageData(image,0,0);
      const outputs = { png: canvas.toDataURL("image/png"), jpg: canvas.toDataURL("image/jpeg",.9), webp: canvas.toDataURL("image/webp",.9) };
      for (let i=3;i<image.data.length;i+=4) if (i < image.data.length / 2) image.data[i]=128;
      context.putImageData(image,0,0); outputs.transparent = canvas.toDataURL("image/png");
      return outputs;
    });
    for (const [format,data] of Object.entries(images)) await fs.writeFile(path.join(fixtureRoot, format === "transparent" ? "transparent.png" : "clean." + format),Buffer.from(data.split(",")[1],"base64"));
    await fs.copyFile(path.join(fixtureRoot,"clean.jpg"),path.join(fixtureRoot,"clean.jpeg"));
  } finally { await browser.close(); }
  for (const bpp of [24,32]) {
    const width=512,height=512,stride=width*bpp/8,data=Buffer.alloc(54+stride*height),view=new DataView(data.buffer,data.byteOffset,data.byteLength);
    data.write("BM"); view.setUint32(2,data.length,true); view.setUint32(10,54,true); view.setUint32(14,40,true); view.setInt32(18,width,true); view.setInt32(22,height,true); view.setUint16(26,1,true); view.setUint16(28,bpp,true);
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) { const i=54+y*stride+x*bpp/8; data[i]=(x+y)%256;data[i+1]=x%256;data[i+2]=y%256;if(bpp===32)data[i+3]=255; }
    await fs.writeFile(path.join(fixtureRoot,bpp===24?"clean.bmp":"rgba.bmp"),data);
  }
  const pdf=await PDFDocument.create(); pdf.addPage([400,500]).drawText("Synthetic StegoLab carrier",{x:40,y:440,size:16});
  await fs.writeFile(path.join(fixtureRoot,"clean.pdf"),await pdf.save());
  await fs.writeFile(path.join(fixtureRoot,"payload.bin"),Buffer.from(Array.from({length:8192},(_,i)=>(i*17)%256)));
  await fs.writeFile(path.join(fixtureRoot,"large.bin"),Buffer.alloc(140_000,173));
}
