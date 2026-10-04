// @vitest-environment node
import { expect, it } from "vitest";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { embedPdf, extractPdf, openPdf } from "./pdf";
import { packPayload, unpackPayload } from "./payload";

it("preserves PDF pages and existing attachments while adding an inspectable bounded container", async () => {
  const doc = await PDFDocument.create(); doc.addPage([200,200]);
  await doc.attach(new Uint8Array([1,2,3]), "original.bin");
  const original = await doc.save();
  const input = { type: "text" as const, data: new TextEncoder().encode("Synthetic PDF message"), filename: "message.txt", mime: "text/plain" };
  const payload = await packPayload(input, "Synthetic PDF password");
  const output = await embedPdf(original,payload), read = await extractPdf(output);
  expect(read).toEqual(payload); expect((await unpackPayload(read,"Synthetic PDF password")).data).toEqual(input.data);
  const reopened = await openPdf(output); expect(reopened.getPageCount()).toBe(1);
  expect(new TextDecoder().decode(output)).toContain("stegolab.payload");
  await expect(extractPdf(original)).rejects.toThrow("No StegoLab");
  await expect(embedPdf(output,payload)).rejects.toThrow("already contains");
  const stream = reopened.catalog.lookup(PDFName.of("StegoLabPayload")) as PDFRawStream;
  stream.dict.set(PDFName.of("Filter"),PDFName.of("FlateDecode"));
  await expect(extractPdf(await reopened.save({ useObjectStreams:false }))).rejects.toThrow("damaged");
});

it("rejects signed PDF carriers before rewriting", async () => {
  const doc = await PDFDocument.create(); doc.addPage();
  const signature = doc.context.register(doc.context.obj({ Type: "Sig", Filter: "Adobe.PPKLite" }));
  doc.catalog.set(PDFName.of("SyntheticSignature"), signature);
  await expect(openPdf(await doc.save({useObjectStreams:false}))).rejects.toThrow("Signed PDF carriers");
});
