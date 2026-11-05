import { MAX_DEFECT_IMAGE_BYTES } from "@/lib/defect-image-constants";

export function isValidDefectImage(mimeType: string, data: Uint8Array): boolean {
  if (data.byteLength === 0 || data.byteLength > MAX_DEFECT_IMAGE_BYTES) return false;
  if (mimeType === "image/jpeg") return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === "image/png") {
    return data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 &&
      data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a;
  }
  if (mimeType === "image/webp") {
    return String.fromCharCode(...data.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...data.slice(8, 12)) === "WEBP";
  }
  return false;
}

export function decodeDefectImageDataUrl(value: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return null;
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");
  if (buffer.toString("base64") !== base64 || !isValidDefectImage(mimeType, buffer)) return null;
  const data = new Uint8Array(new ArrayBuffer(buffer.byteLength));
  data.set(buffer);
  return { mimeType, data };
}
