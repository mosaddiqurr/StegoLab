import { AUTH_FAILED, DAMAGED, fail } from "./errors";

export const MAX_PAYLOAD = 8 * 1024 * 1024;
export const MAX_CONTAINER = MAX_PAYLOAD + 1024;
export const KDF_ITERATIONS = 600_000;
const HEADER = 44;
const INNER = 42;
const CHECKSUM = 32;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export interface PayloadInput { type: "text" | "file"; data: Uint8Array; filename: string; mime: string }
export interface RecoveredPayload extends PayloadInput { sha256: string; encrypted: boolean }

export function safeFilename(value: string, fallback = "recovered.bin"): string {
  const leaf = value.replaceAll("\\", "/").split("/").pop() ?? "";
  const clean = leaf.replace(/[\x00-\x1f\x7f<>:"|?*\u202a-\u202e\u2066-\u2069]/g, "_").replace(/^[ .]+|[ .]+$/g, "");
  let result = "";
  for (const char of clean) { if (encoder.encode(result + char).length > 240) break; result += char; }
  return result || fallback;
}
export function safeMime(value: string): string {
  return value.length <= 160 && /^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(value)
    ? value : "application/octet-stream";
}
export function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}
export function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
export async function hash(data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  if (!globalThis.crypto?.subtle) fail("Use HTTPS or localhost to open StegoLab in this browser.");
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(data)));
}
export function hex(data: Uint8Array): string { return Array.from(data, b => b.toString(16).padStart(2, "0")).join(""); }
export function packedSize(bytes: number, filename: string, mime: string, encrypted: boolean): number {
  return HEADER + INNER + CHECKSUM + encoder.encode(safeFilename(filename)).length + encoder.encode(safeMime(mime)).length + bytes + (encrypted ? 16 : 0);
}
async function keyFor(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const bytes = encoder.encode(password);
  if (!bytes.length) fail("Enter a password.");
  if (bytes.length > 1024) fail("Use a shorter password (up to 1024 UTF-8 bytes).");
  const material = await crypto.subtle.importKey("raw", bytes, "PBKDF2", false, ["deriveKey"]);
  bytes.fill(0);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: new Uint8Array(salt), iterations: KDF_ITERATIONS, hash: "SHA-256" }, material,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function packPayload(input: PayloadInput, password?: string): Promise<Uint8Array<ArrayBuffer>> {
  if (input.data.length > MAX_PAYLOAD) fail("The payload exceeds the 8 MB limit.");
  const filename = encoder.encode(safeFilename(input.filename));
  const mime = encoder.encode(safeMime(input.mime));
  const inner = new Uint8Array(INNER);
  const meta = new DataView(inner.buffer);
  inner[0] = input.type === "text" ? 0 : 1;
  meta.setUint16(2, filename.length); meta.setUint16(4, mime.length); meta.setUint32(6, input.data.length);
  inner.set(await hash(input.data), 10);
  const plain = concat(inner, filename, mime, input.data);
  const prefix = new Uint8Array(HEADER);
  prefix.set(encoder.encode("SLP2")); prefix[4] = 2; prefix[5] = password === undefined ? 0 : 1;
  const view = new DataView(prefix.buffer);
  view.setUint32(8, plain.length + (password === undefined ? 0 : 16));
  let body: Uint8Array = plain;
  if (password !== undefined) {
    view.setUint32(12, KDF_ITERATIONS);
    crypto.getRandomValues(prefix.subarray(16, 32)); crypto.getRandomValues(prefix.subarray(32, 44));
    const key = await keyFor(password, prefix.subarray(16, 32));
    body = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: prefix.subarray(32, 44), additionalData: prefix, tagLength: 128 }, key, plain));
    plain.fill(0);
  }
  const framed = concat(prefix, body);
  return concat(framed, await hash(framed));
}

export async function inspectPayload(container: Uint8Array): Promise<{ encrypted: boolean }> {
  if (container.length < HEADER + INNER + CHECKSUM || container.length > MAX_CONTAINER) fail(DAMAGED);
  if (!equal(container.subarray(0, 4), encoder.encode("SLP2")) || container[4] !== 2) fail("This StegoLab payload version is not supported.");
  const view = new DataView(container.buffer, container.byteOffset, container.byteLength);
  const encrypted = container[5] === 1;
  if (container[5] > 1 || view.getUint16(6) !== 0 || view.getUint32(8) !== container.length - HEADER - CHECKSUM) fail(DAMAGED);
  if (view.getUint32(12) !== (encrypted ? KDF_ITERATIONS : 0)) fail(DAMAGED);
  if (!encrypted && container.subarray(16, HEADER).some(b => b !== 0)) fail(DAMAGED);
  if (!equal(await hash(container.subarray(0, -CHECKSUM)), container.subarray(-CHECKSUM))) fail(encrypted ? AUTH_FAILED : DAMAGED);
  return { encrypted };
}

export async function unpackPayload(container: Uint8Array, password?: string): Promise<RecoveredPayload> {
  const { encrypted } = await inspectPayload(container);
  let plain = container.slice(HEADER, -CHECKSUM);
  if (encrypted) {
    if (!password) fail("Enter the password for this file.");
    const key = await keyFor(password, container.subarray(16, 32));
    try {
      plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(container.subarray(32, 44)), additionalData: new Uint8Array(container.subarray(0, HEADER)), tagLength: 128 }, key, plain));
    } catch { fail(AUTH_FAILED); }
  }
  try {
    if (plain.length < INNER || plain[0] > 1 || plain[1] !== 0) fail(DAMAGED);
    const view = new DataView(plain.buffer, plain.byteOffset, plain.byteLength);
    const nameLength = view.getUint16(2), mimeLength = view.getUint16(4), length = view.getUint32(6);
    if (!nameLength || nameLength > 240 || !mimeLength || mimeLength > 160 || length > MAX_PAYLOAD || INNER + nameLength + mimeLength + length !== plain.length) fail(DAMAGED);
    const filename = decoder.decode(plain.subarray(INNER, INNER + nameLength));
    const mime = decoder.decode(plain.subarray(INNER + nameLength, INNER + nameLength + mimeLength));
    if (safeFilename(filename) !== filename || safeMime(mime) !== mime) fail(DAMAGED);
    const data = plain.slice(INNER + nameLength + mimeLength);
    const digest = await hash(data);
    if (!equal(digest, plain.subarray(10, 42))) fail(encrypted ? AUTH_FAILED : DAMAGED);
    if (plain[0] === 0) decoder.decode(data);
    return { type: plain[0] === 0 ? "text" : "file", data, filename, mime, sha256: hex(digest), encrypted };
  } catch (error) {
    if (error instanceof TypeError) fail(DAMAGED);
    throw error;
  } finally { plain.fill(0); }
}
