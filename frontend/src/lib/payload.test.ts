// @vitest-environment node
import { describe, expect, it } from "vitest";
import { AUTH_FAILED, DAMAGED } from "./errors";
import { MAX_PAYLOAD, concat, hash, inspectPayload, packPayload, packedSize, safeFilename, unpackPayload } from "./payload";

const text = { type: "text" as const, data: new TextEncoder().encode("Exact text: café · বাংলা · 🔒\nsecond line"), filename: "message.txt", mime: "text/plain" };
describe("versioned payload", () => {
  it("recovers exact Unicode and binary data with bounded metadata", async () => {
    for (const input of [text, { type: "file" as const, data: new Uint8Array([0,255,128,10,13,0]), filename: "résumé.bin", mime: "application/octet-stream" }]) {
      const container = await packPayload(input);
      expect(container.length).toBe(packedSize(input.data.length, input.filename, input.mime, false));
      const result = await unpackPayload(container);
      expect(result.data).toEqual(input.data); expect(result.filename).toBe(input.filename); expect(result.mime).toBe(input.mime);
    }
  });
  it("uses fresh salt/nonce; decrypts only with the correct password", async () => {
    const a = await packPayload(text, "Synthetic test password 🔐");
    const b = await packPayload(text, "Synthetic test password 🔐");
    expect(a).not.toEqual(b); expect((await inspectPayload(a)).encrypted).toBe(true);
    expect((await unpackPayload(a, "Synthetic test password 🔐")).data).toEqual(text.data);
    await expect(unpackPayload(a, "wrong")).rejects.toThrow(AUTH_FAILED);
    await expect(unpackPayload(a)).rejects.toThrow("Enter the password");
  });
  it("authenticates the header even if an attacker recalculates the public checksum", async () => {
    const data = await packPayload(text, "Synthetic test password"); data[32] ^= 1;
    data.set(await hash(data.subarray(0, -32)), data.length - 32);
    await expect(unpackPayload(data, "Synthetic test password")).rejects.toThrow(AUTH_FAILED);
  });
  it("reports a damaged encrypted payload as damaged before asking for a password", async () => {
    const data = await packPayload(text, "Synthetic test password"); data[60] ^= 1;
    await expect(inspectPayload(data)).rejects.toThrow(DAMAGED);
  });
  it("rejects modified bodies, truncation, extra bytes and unbounded KDF work", async () => {
    const data = await packPayload(text);
    const modified = new Uint8Array(data); modified[50] ^= 1;
    for (const invalid of [modified, data.subarray(0, -1), concat(data, new Uint8Array(1))]) await expect(unpackPayload(invalid)).rejects.toThrow();
    new DataView(modified.buffer).setUint32(12, 0xffffffff);
    await expect(inspectPayload(modified)).rejects.toThrow();
  });
  it("bounds size and passwords and strips paths/control characters from download names", async () => {
    expect(safeFilename("C:\\private\\folder\\payload.bin")).toBe("payload.bin");
    expect(safeFilename("../../report\u202e.exe")).toBe("report_.exe");
    expect(new TextEncoder().encode(safeFilename("🧩".repeat(200))).length).toBeLessThanOrEqual(240);
    await expect(packPayload({ ...text, data: new Uint8Array(MAX_PAYLOAD + 1) })).rejects.toThrow("8 MB");
    await expect(packPayload(text, "x".repeat(1025))).rejects.toThrow("shorter password");
  });
  it("does not conceal file contents in an unencrypted payload", async () => {
    const empty = { type: "file" as const, data: new Uint8Array(), filename: "empty.bin", mime: "application/octet-stream" };
    expect((await unpackPayload(await packPayload(empty))).data.length).toBe(0);
  });
});
