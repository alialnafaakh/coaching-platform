import { randomUUID } from "crypto";
import sharp from "sharp";

/** Incoming upload size limit (before decode). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const MAX_IMAGE_WIDTH = 4096;
export const MAX_IMAGE_HEIGHT = 4096;
export const MAX_IMAGE_PIXELS = 16_777_216;

export type UploadErrorCode =
  | "no_file"
  | "file_too_large"
  | "unsupported_image_type"
  | "invalid_image";

export type PreparedCmsImage = {
  buffer: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
  objectPath: string;
};

export type PrepareCmsImageResult =
  | { ok: true; image: PreparedCmsImage }
  | { ok: false; error: UploadErrorCode };

type AllowedFormat = "jpeg" | "png" | "webp";

function isAllowedFormat(format: string | undefined): format is AllowedFormat {
  return format === "jpeg" || format === "png" || format === "webp";
}

function dimensionsOk(width: number | undefined, height: number | undefined): boolean {
  if (!width || !height || width < 1 || height < 1) return false;
  if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) return false;
  if (width * height > MAX_IMAGE_PIXELS) return false;
  return true;
}

/**
 * Validate and re-encode an admin CMS image upload.
 * Never trusts file.name / file.type. Never returns original client bytes.
 */
export async function prepareCmsImage(file: File | null): Promise<PrepareCmsImageResult> {
  if (!file) {
    return { ok: false, error: "no_file" };
  }

  if (typeof file.size !== "number" || file.size <= 0) {
    return { ok: false, error: "invalid_image" };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "file_too_large" };
  }

  let input: Buffer;
  try {
    input = Buffer.from(await file.arrayBuffer());
  } catch {
    return { ok: false, error: "invalid_image" };
  }

  if (input.byteLength === 0) {
    return { ok: false, error: "invalid_image" };
  }
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "file_too_large" };
  }

  const sharpOptions = {
    failOn: "error" as const,
    limitInputPixels: MAX_IMAGE_PIXELS,
    animated: false,
  };

  let format: string | undefined;
  let width: number | undefined;
  let height: number | undefined;

  try {
    const meta = await sharp(input, sharpOptions).metadata();
    format = meta.format;
    width = meta.width;
    height = meta.height;
  } catch {
    return { ok: false, error: "invalid_image" };
  }

  if (!isAllowedFormat(format)) {
    return { ok: false, error: "unsupported_image_type" };
  }

  if (!dimensionsOk(width, height)) {
    return { ok: false, error: "invalid_image" };
  }

  try {
    // Fresh pipeline: auto-orient (strips orientation metadata), then re-encode.
    const pipeline = sharp(input, sharpOptions).rotate();

    let buffer: Buffer;
    let contentType: PreparedCmsImage["contentType"];
    let extension: PreparedCmsImage["extension"];

    if (format === "jpeg") {
      buffer = await pipeline
        .jpeg({
          quality: 85,
          mozjpeg: true,
        })
        .toBuffer();
      contentType = "image/jpeg";
      extension = "jpg";
    } else if (format === "png") {
      buffer = await pipeline
        .png({
          compressionLevel: 8,
        })
        .toBuffer();
      contentType = "image/png";
      extension = "png";
    } else {
      buffer = await pipeline
        .webp({
          quality: 85,
        })
        .toBuffer();
      contentType = "image/webp";
      extension = "webp";
    }

    // Confirm oriented output still within limits.
    const outMeta = await sharp(buffer, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    }).metadata();

    if (!dimensionsOk(outMeta.width, outMeta.height)) {
      return { ok: false, error: "invalid_image" };
    }

    return {
      ok: true,
      image: {
        buffer,
        contentType,
        extension,
        objectPath: `cms/${randomUUID()}.${extension}`,
      },
    };
  } catch {
    return { ok: false, error: "invalid_image" };
  }
}
