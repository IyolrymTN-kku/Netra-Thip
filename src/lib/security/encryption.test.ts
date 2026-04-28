import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.ENCRYPTION_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

describe("AES-256-GCM encryption", () => {
  it("round-trips plaintext correctly", async () => {
    const { encrypt, decrypt } = await import("./encryption");
    const plaintext = "sk-test-openai-key-payload-123";
    const payload = encrypt(plaintext);

    expect(payload.ciphertext).toMatch(/^[0-9a-f]+$/);
    expect(payload.iv).toMatch(/^[0-9a-f]{24}$/);
    expect(payload.authTag).toMatch(/^[0-9a-f]{32}$/);
    expect(decrypt(payload)).toBe(plaintext);
  });

  it("produces a fresh IV per call", async () => {
    const { encrypt } = await import("./encryption");
    const a = encrypt("same input");
    const b = encrypt("same input");
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("rejects tampered authTag", async () => {
    const { encrypt, decrypt } = await import("./encryption");
    const payload = encrypt("sensitive");
    const tampered = {
      ...payload,
      authTag: payload.authTag.replace(/^./, (c) => (c === "0" ? "1" : "0")),
    };
    expect(() => decrypt(tampered)).toThrow(/Decryption failed/);
  });
});
