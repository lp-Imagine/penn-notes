/**
 * Decap 媒体库上传：校验 GitHub 写权限后把图片写入 COS
 * penn-notes/decap/<12位sha1>.ext。浏览器只拿到 CDN 地址，原文件不进 git。
 * 对象键格式须与 scripts/gc-cos-decap-images.mjs 的 NEW_KEY_RE 一致。
 */
import crypto from "node:crypto";
import { uploadBuffer, cosConfigured } from "../../scripts/cos-upload.mjs";
import { prepareImage } from "../../scripts/prepare-image.mjs";
import { createDailyLimiter, createRateLimiter } from "./rate-limit.mjs";

const MAX_IN = 8 * 1024 * 1024;
const REPO = process.env.DECAP_GITHUB_REPO || "lp-Imagine/penn-notes";
const AUTH_TTL_MS = 10 * 60 * 1000;
const minuteLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
const dailyLimiter = createDailyLimiter({ max: 200, timeZone: "Asia/Shanghai" });

/** @type {Map<string, { exp: number, ok: boolean }>} */
const authCache = new Map();

export function clearDecapImageAuthCache() {
  authCache.clear();
}

export function decapImageObjectKey(buf, ext) {
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12);
  return `penn-notes/decap/${hash}.${ext}`;
}

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

function bearerToken(req) {
  const raw = String(req.headers.authorization || "");
  const m = raw.match(/^(?:Bearer|token)\s+(\S+)$/i);
  return m ? m[1] : "";
}

/**
 * @param {string} token
 * @param {{ fetchImpl?: typeof fetch, repo?: string, now?: () => number }} [opts]
 */
export async function assertRepoPush(token, opts = {}) {
  if (!token) {
    const err = new Error("unauthorized");
    err.status = 401;
    throw err;
  }
  const fetchImpl = opts.fetchImpl || fetch;
  const repo = opts.repo || REPO;
  const now = opts.now || Date.now;
  const cacheKey = crypto.createHash("sha256").update(`${repo}\n${token}`).digest("hex");
  const hit = authCache.get(cacheKey);
  if (hit && hit.exp > now()) {
    if (!hit.ok) {
      const err = new Error("forbidden");
      err.status = 403;
      throw err;
    }
    return;
  }

  let res;
  let netErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetchImpl(`https://api.github.com/repos/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "penn-notes-decap-media",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(15000),
      });
      netErr = null;
      break;
    } catch (err) {
      netErr = err;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  if (!res) {
    const err = new Error("github");
    err.status = 502;
    err.cause = netErr;
    throw err;
  }

  if (res.status === 401) {
    authCache.set(cacheKey, { exp: now() + 30_000, ok: false });
    const err = new Error("unauthorized");
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const err = new Error("github");
    err.status = 502;
    throw err;
  }
  const data = await res.json();
  const ok = data?.permissions?.push === true;
  authCache.set(cacheKey, { exp: now() + AUTH_TTL_MS, ok });
  if (!ok) {
    const err = new Error("forbidden");
    err.status = 403;
    throw err;
  }
}

function filenameFor(ctype) {
  if (ctype.includes("png")) return "upload.png";
  if (ctype.includes("gif")) return "upload.gif";
  if (ctype.includes("webp")) return "upload.webp";
  if (ctype.includes("avif")) return "upload.avif";
  return "upload.jpg";
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {{ cors: Record<string, string>, clientIp: string, send: Function }} ctx
 */
export async function handleDecapImage(req, res, { cors, clientIp, send }) {
  const minute = minuteLimiter.check(`decap-img:${clientIp}`);
  if (!minute.ok) {
    send(
      res,
      429,
      { error: "rate_limited", message: "上传太频繁，请稍后再试" },
      { ...cors, "Retry-After": String(minute.retryAfterSec) },
    );
    return;
  }
  const day = dailyLimiter.check(`decap-img-day:${clientIp}`);
  if (!day.ok) {
    send(res, 429, { error: "rate_limited", message: "今日上传次数已用完" }, cors);
    return;
  }

  try {
    await assertRepoPush(bearerToken(req));
  } catch (err) {
    const status = err.status === 401 || err.status === 403 ? err.status : 502;
    const message =
      status === 401
        ? "请先登录后再上传"
        : status === 403
          ? "当前账号没有仓库写权限"
          : "暂时无法确认登录状态，请再试一次";
    const error =
      status === 502 ? "auth_unavailable" : status === 401 ? "unauthorized" : "forbidden";
    send(res, status, { error, message }, cors);
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
    prepared = await prepareImage(raw, { filename: filenameFor(ctype), allowWebp: true });
  } catch {
    send(res, 400, { error: "invalid_image", message: "无法处理这张图片" }, cors);
    return;
  }
  if (
    !prepared.contentType.startsWith("image/") ||
    !["jpg", "png", "gif", "webp", "avif"].includes(prepared.ext)
  ) {
    send(res, 415, { error: "unsupported", message: "只能上传图片" }, cors);
    return;
  }

  const key = decapImageObjectKey(prepared.buf, prepared.ext);
  try {
    const url = await uploadBuffer(key, prepared.buf, { contentType: prepared.contentType });
    send(res, 200, { url }, cors);
  } catch (err) {
    console.error("decap-image upload failed:", err?.message || err);
    send(res, 502, { error: "upload_failed", message: "图片上传失败" }, cors);
  }
}
