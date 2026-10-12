/**
 * Logo validation by magic bytes. PNG, JPEG and WebP only (no SVG: it can carry
 * scripts). The declared MIME type and file extension are ignored.
 */
export const LOGO_MAX_BYTES = 1024 * 1024;

export type LogoType = "png" | "jpeg" | "webp";

export const LOGO_MIME: Record<LogoType, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function detectImageType(bytes: Uint8Array): LogoType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return "webp";
  }
  return null;
}

export type LogoValidation =
  | { ok: true; type: LogoType; mime: string }
  | { ok: false; error: string };

export function validateLogo(bytes: Uint8Array): LogoValidation {
  if (bytes.length === 0) return { ok: false, error: "The file is empty" };
  if (bytes.length > LOGO_MAX_BYTES) return { ok: false, error: "Logo must be 1 MB or smaller" };
  const type = detectImageType(bytes);
  if (!type)
    return { ok: false, error: "Logo must be a PNG, JPEG or WebP image (SVG is not allowed)" };
  return { ok: true, type, mime: LOGO_MIME[type] };
}

export function toDataUri(bytes: Uint8Array): string | null {
  const type = detectImageType(bytes);
  if (!type || bytes.length > LOGO_MAX_BYTES) return null;
  return `data:${LOGO_MIME[type]};base64,${Buffer.from(bytes).toString("base64")}`;
}
