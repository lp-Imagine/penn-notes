/**
 * Tencent COS helpers for article images.
 *
 * Env (GitHub Secrets / local .env):
 *   COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION, COS_CDN_BASE
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import COS from "cos-nodejs-sdk-v5";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ENV_KEYS = [
  "COS_SECRET_ID",
  "COS_SECRET_KEY",
  "COS_BUCKET",
  "COS_REGION",
  "COS_CDN_BASE",
];

/** Load root `.env` into process.env (does not override existing). */
export function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

export function cosConfig() {
  const cfg = {
    secretId: process.env.COS_SECRET_ID || "",
    secretKey: process.env.COS_SECRET_KEY || "",
    bucket: process.env.COS_BUCKET || "",
    region: process.env.COS_REGION || "",
    cdnBase: (process.env.COS_CDN_BASE || "").replace(/\/+$/, ""),
  };
  return cfg;
}

export function cosConfigured() {
  const c = cosConfig();
  return Boolean(
    c.secretId && c.secretKey && c.bucket && c.region && c.cdnBase,
  );
}

export function requireCosConfig() {
  loadDotEnv();
  if (!cosConfigured()) {
    const missing = ENV_KEYS.filter((k) => !process.env[k]);
    throw new Error(
      `COS env incomplete; missing: ${missing.join(", ") || "(empty values)"}`,
    );
  }
  return cosConfig();
}

export function cdnUrl(key) {
  const base = cosConfig().cdnBase;
  const k = String(key).replace(/^\/+/, "");
  return `${base}/${k}`;
}

export function isCdnUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  const base = cosConfig().cdnBase;
  if (base && url.startsWith(base + "/")) return true;
  return false;
}

function contentTypeFor(fileOrKey) {
  const ext = path.extname(fileOrKey).toLowerCase();
  const map = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".svg": "image/svg+xml",
  };
  return map[ext] || "application/octet-stream";
}

let _client = null;

function client() {
  if (_client) return _client;
  const c = requireCosConfig();
  _client = new COS({
    SecretId: c.secretId,
    SecretKey: c.secretKey,
  });
  return _client;
}

function cosCall(method, params) {
  const cos = client();
  const c = cosConfig();
  return new Promise((resolve, reject) => {
    cos[method](
      {
        Bucket: c.bucket,
        Region: c.region,
        ...params,
      },
      (err, data) => (err ? reject(err) : resolve(data)),
    );
  });
}

export async function headObject(key) {
  try {
    await cosCall("headObject", { Key: key.replace(/^\/+/, "") });
    return true;
  } catch (err) {
    const status = err?.statusCode || err?.status;
    if (status === 404) return false;
    // Some COS errors use code
    if (err?.code === "NoSuchKey" || err?.error?.Code === "NoSuchKey") {
      return false;
    }
    throw err;
  }
}

/**
 * Upload buffer; skip Put when object exists (unless force).
 * @returns {Promise<string>} CDN URL
 */
export async function uploadBuffer(key, body, opts = {}) {
  const {
    contentType = contentTypeFor(key),
    skipIfExists = true,
    force = false,
  } = opts;
  const Key = key.replace(/^\/+/, "");
  if (skipIfExists && !force) {
    const exists = await headObject(Key);
    if (exists) return cdnUrl(Key);
  }
  await cosCall("putObject", {
    Key,
    Body: body,
    ContentType: contentType,
    ContentLength: body.length,
  });
  return cdnUrl(Key);
}

/**
 * Upload local file → CDN URL.
 */
export async function uploadFile(localPath, key, opts = {}) {
  const buf = fs.readFileSync(localPath);
  return uploadBuffer(key, buf, {
    contentType: contentTypeFor(key || localPath),
    ...opts,
  });
}

export { ENV_KEYS, root as repoRoot };
