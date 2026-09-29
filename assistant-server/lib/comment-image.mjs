/**
 * 评论图片：浏览器把原图 POST 到本接口，服务端压缩后写入 COS
 * penn-notes/comments/。不把 COS 密钥交给浏览器。
 */
import crypto from "node:crypto";
import { uploadBuffer, cosConfigured } from "../../scripts/cos-upload.mjs";
import { prepareImage } from "../../scripts/prepare-image.mjs";
import { createDailyLimiter, createRateLimiter } from "./rate-limit.mjs";

const MAX_IN = 8 * 1024 * 1024;
const minuteLimiter = createRateLimiter({ windowMs: 60_000, max: 8 });
const dailyLimiter = createDailyLimiter({ max: 40, timeZone: "Asia/Shanghai" });

function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        const err = new Error("payload too large");
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {{ cors: Record<string, string>, clientIp: string, send: Function }} ctx
 */
export async function handleCommentImage(req, res, { cors, clientIp, send }) {
  const minute = minuteLimiter.check(clientIp);
  if (!minute.ok) {
    send(
      res,
      429,
      { error: "rate_limited", message: "上传太频繁，请稍后再试" },
      { ...cors, "Retry-After": String(minute.retryAfterSec) },
    );
    return;
  }
  const day = dailyLimiter.check(`comment-img:${clientIp}`);
  if (!day.ok) {
    send(res, 429, { error: "rate_limited", message: "今日上传次数已用完" }, cors);
    return;
  }
  if (!cosConfigured()) {
    send(res, 503, { error: "cos_unconfigured", message: "图片存储未配置" }, cors);
    return;
  }

  let raw;
  try {
    raw = await readRaw(req, MAX_IN);
  } catch (err) {
    const status = err.status === 413 ? 413 : 400;
    send(
      res,
      status,
      { error: "bad_body", message: status === 413 ? "图片不能超过 8MB" : "读取上传失败" },
      cors,
    );
    return;
  }
  if (!raw.length) {
    send(res, 400, { error: "empty", message: "没有收到图片" }, cors);
    return;
  }

  const ctype = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (ctype && !ctype.startsWith("image/")) {
    send(res, 415, { error: "unsupported", message: "只能上传图片" }, cors);
    return;
  }

  let prepared;
  try {
    prepared = await prepareImage(raw, {
      filename: ctype.includes("png")
        ? "upload.png"
        : ctype.includes("gif")
          ? "upload.gif"
          : ctype.includes("webp")
            ? "upload.webp"
            : "upload.jpg",
      allowWebp: true,
    });
  } catch (err) {
    send(res, 400, { error: "invalid_image", message: "无法处理这张图片" }, cors);
    return;
  }
  if (!prepared.contentType.startsWith("image/") || prepared.ext === "svg") {
    send(res, 415, { error: "unsupported", message: "只能上传图片" }, cors);
    return;
  }

  const hash = crypto.createHash("sha1").update(prepared.buf).digest("hex").slice(0, 16);
  const key = `penn-notes/comments/${hash}.${prepared.ext}`;
  try {
    const url = await uploadBuffer(key, prepared.buf, {
      contentType: prepared.contentType,
    });
    send(res, 200, { url }, cors);
  } catch (err) {
    console.error("comment-image upload failed:", err?.message || err);
    send(res, 502, { error: "upload_failed", message: "图片上传失败" }, cors);
  }
}
