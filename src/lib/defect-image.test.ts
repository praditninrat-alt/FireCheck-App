import { describe, expect, it } from "vitest";
import { decodeDefectImageDataUrl, isValidDefectImage } from "@/lib/defect-image";

describe("defect image validation", () => {
  it("accepts supported image signatures", () => {
    expect(isValidDefectImage("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff]))).toBe(true);
    expect(isValidDefectImage("image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(isValidDefectImage("image/webp", Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe(true);
  });

  it("rejects a MIME type that does not match the image signature", () => {
    expect(isValidDefectImage("image/png", Uint8Array.from([0xff, 0xd8, 0xff]))).toBe(false);
  });

  it("rejects empty or oversized image content", () => {
    expect(isValidDefectImage("image/jpeg", new Uint8Array())).toBe(false);
    expect(isValidDefectImage("image/jpeg", new Uint8Array(5 * 1024 * 1024 + 1))).toBe(false);
  });

  it("decodes a supported base64 data URL", () => {
    const data = Buffer.from([0xff, 0xd8, 0xff]).toString("base64");
    const result = decodeDefectImageDataUrl(`data:image/jpeg;base64,${data}`);
    expect(result?.mimeType).toBe("image/jpeg");
    expect(Array.from(result?.data ?? [])).toEqual([0xff, 0xd8, 0xff]);
  });
});
