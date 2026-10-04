import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFRawStream, PDFString } from "pdf-lib";
import { DAMAGED, NO_PAYLOAD, ProductError, fail } from "./errors";
import { MAX_CONTAINER } from "./payload";

const KEY = PDFName.of("StegoLabPayload");
const ATTACHMENT = "stegolab.payload";
export async function openPdf(data: Uint8Array): Promise<PDFDocument> {
  try {
    const doc = await PDFDocument.load(data, { updateMetadata: false, throwOnInvalidObject: true, parseSpeed: 100 });
    if (doc.isEncrypted) fail("Password-protected PDF carriers are not supported.");
    if (doc.getPageCount() < 1 || doc.getPageCount() > 200 || doc.context.enumerateIndirectObjects().length > 30_000) fail("Use a PDF with up to 200 pages and a simpler structure.");
    for (const [, object] of doc.context.enumerateIndirectObjects()) {
      if (object instanceof PDFDict && (object.get(PDFName.of("Type")) === PDFName.of("Sig") || object.get(PDFName.of("FT")) === PDFName.of("Sig"))) fail("Signed PDF carriers are not supported.");
    }
    return doc;
  } catch (error) {
    if (error instanceof ProductError) throw error;
    fail("The PDF could not be processed.");
  }
}
export function pdfHasPayload(doc: PDFDocument): boolean { return doc.catalog.has(KEY); }

// Retain pre-existing attachments, including PDFs using a nested name tree.
function attachmentEntries(tree: PDFDict, result: Array<[string, PDFDict]>, visited: Set<PDFDict>, depth = 0) {
  if (depth > 16 || visited.has(tree) || result.length > 1024) fail("The PDF could not be processed.");
  visited.add(tree);
  const names = tree.lookupMaybe(PDFName.of("Names"), PDFArray);
  if (names) {
    if (names.size() % 2 || names.size() > 2048) fail("The PDF could not be processed.");
    for (let i = 0; i < names.size(); i += 2) {
      const name = names.lookup(i);
      if (!(name instanceof PDFString || name instanceof PDFHexString)) fail("The PDF could not be processed.");
      result.push([name.decodeText(), names.lookup(i + 1, PDFDict)]);
    }
  }
  const kids = tree.lookupMaybe(PDFName.of("Kids"), PDFArray);
  if (kids) { if (kids.size() > 1024) fail("The PDF could not be processed."); for (let i = 0; i < kids.size(); i++) attachmentEntries(kids.lookup(i, PDFDict), result, visited, depth + 1); }
}

export async function embedPdf(data: Uint8Array, payload: Uint8Array): Promise<Uint8Array> {
  const doc = await openPdf(data);
  if (pdfHasPayload(doc)) fail("This file already contains StegoLab data. Choose an original carrier.");
  try {
    const names = doc.catalog.lookupMaybe(PDFName.of("Names"), PDFDict) ?? doc.context.obj({});
    const tree = names.lookupMaybe(PDFName.of("EmbeddedFiles"), PDFDict);
    const entries: Array<[string, PDFDict]> = [];
    if (tree) attachmentEntries(tree, entries, new Set());
    if (entries.some(([name]) => name === ATTACHMENT)) fail("This PDF already has a StegoLab attachment. Choose an original carrier.");
    // Keep our stream uncompressed: extraction checks size without inflating untrusted data.
    const stream = doc.context.stream(payload, { Type: "EmbeddedFile", Subtype: "application/octet-stream", Params: { Size: payload.length } });
    const streamRef = doc.context.register(stream);
    const spec = doc.context.obj({ Type: "Filespec", F: PDFString.of(ATTACHMENT), UF: PDFHexString.fromText(ATTACHMENT), EF: { F: streamRef, UF: streamRef }, Desc: PDFHexString.fromText("StegoLab embedded data"), AFRelationship: "Data" });
    const specRef = doc.context.register(spec);
    entries.push([ATTACHMENT, spec]); entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    const pairs = doc.context.obj([]);
    for (const [name, fileSpec] of entries) { pairs.push(PDFHexString.fromText(name)); pairs.push(fileSpec); }
    names.set(PDFName.of("EmbeddedFiles"), doc.context.obj({ Names: pairs }));
    doc.catalog.set(PDFName.of("Names"), names);
    const associated = doc.catalog.lookupMaybe(PDFName.of("AF"), PDFArray) ?? doc.context.obj([]);
    associated.push(specRef); doc.catalog.set(PDFName.of("AF"), associated);
    doc.catalog.set(KEY, streamRef);
    return await doc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false });
  } catch (error) {
    if (error instanceof ProductError) throw error;
    fail("The PDF could not be processed.");
  }
}

export async function extractPdf(data: Uint8Array): Promise<Uint8Array> {
  const doc = await openPdf(data);
  if (!pdfHasPayload(doc)) fail(NO_PAYLOAD);
  try {
    const stream = doc.catalog.lookup(KEY);
    if (!(stream instanceof PDFRawStream) || stream.dict.has(PDFName.of("Filter")) || stream.dict.get(PDFName.of("Type")) !== PDFName.of("EmbeddedFile")) fail(DAMAGED);
    const bytes = stream.getContents();
    if (!bytes.length || bytes.length > MAX_CONTAINER) fail(DAMAGED);
    return new Uint8Array(bytes);
  } catch { fail(DAMAGED); }
}
