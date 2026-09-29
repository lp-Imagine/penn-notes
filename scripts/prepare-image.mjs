/**
 * 上传前处理特别大的图片。边长和体积都在阈值内时保持原图字节。
 *
 * - 长边 > 1920 或体积 > 800KB：缩小到长边 1920，并重新编码
 * - allowWebp：JPEG / PNG / WebP 超限时转为 WebP（评论、新闻、笔记，对象键由调用方重写）
 * - GIF 保持原样（避免丢掉动画）
 */
import sharp from "sharp";

export const PREPARE_MAX_EDGE = 1920;
export const PREPARE_MAX_BYTES = 800 * 1024;

const MIME = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

function normalizeExt(ext) {
  const e = String(ext || "")
    .toLowerCase()
    .replace(/^\./, "");
  if (e === "jpeg") return "jpg";
  if (MIME[e]) return e;
  return "";
}

function extFromName(filename) {
  const m = String(filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return normalizeExt(m ? m[1] : "");
}

function mimeFor(ext) {
  return MIME[normalizeExt(ext)] || "application/octet-stream";
}

/**
 * @param {Buffer} buf
 * @param {{ filename?: string, allowWebp?: boolean }} [opts]
 * @returns {Promise<{ buf: Buffer, ext: string, contentType: string, changed: boolean }>}
 */
export async function prepareImage(buf, opts = {}) {
  const input = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  const allowWebp = opts.allowWebp !== false;
  const named = extFromName(opts.filename);

  let meta;
  try {
    meta = await sharp(input, { animated: false }).metadata();
  } catch {
    return {
      buf: input,
      ext: named || "jpg",
      contentType: mimeFor(named || "jpg"),
      changed: false,
    };
  }

  const format = normalizeExt(meta.format === "jpeg" ? "jpg" : meta.format || named);
  if (!format || format === "gif" || format === "svg") {
    return {
      buf: input,
      ext: format === "svg" ? named || "svg" : format || named || "gif",
      contentType: format === "gif" ? "image/gif" : mimeFor(named),
      changed: false,
    };
  }

  const edge = Math.max(meta.width || 0, meta.height || 0);
  const oversized = edge > PREPARE_MAX_EDGE || input.length > PREPARE_MAX_BYTES;
  if (!oversized) {
    return {
      buf: input,
      ext: format,
      contentType: mimeFor(format),
      changed: false,
    };
  }

  let pipeline = sharp(input, { animated: false }).rotate();
  if (edge > PREPARE_MAX_EDGE) {
    pipeline = pipeline.resize({
      width: PREPARE_MAX_EDGE,
      height: PREPARE_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const toWebp = allowWebp && (format === "jpg" || format === "png" || format === "webp");
  const outExt = toWebp ? "webp" : format === "png" ? "png" : format === "webp" ? "webp" : "jpg";
  if (outExt === "webp") pipeline = pipeline.webp({ quality: 82 });
  else if (outExt === "png") pipeline = pipeline.png({ compressionLevel: 9 });
  else pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });

  const out = await pipeline.toBuffer();
  if (out.length >= input.length && edge <= PREPARE_MAX_EDGE) {
    return {
      buf: input,
      ext: format,
      contentType: mimeFor(format),
      changed: false,
    };
  }
  return {
    buf: out,
    ext: outExt,
    contentType: mimeFor(outExt),
    changed: true,
  };
}
