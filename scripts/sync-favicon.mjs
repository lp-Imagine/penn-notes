#!/usr/bin/env node
/**
 * 从 website/public/img/logo.svg 同步生成浏览器图标：
 * - pn-favicon-32.png
 * - img/pn-apple-touch.png
 * - favicon.ico
 *
 * 用法：node scripts/sync-favicon.mjs
 * 依赖：sharp（可临时 npm i -D sharp）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "website/public");
const svgPath = join(pub, "img/logo.svg");

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("需要 sharp：先执行 npm i -D sharp（或 npm i --no-save sharp）");
  process.exit(1);
}

const svg = readFileSync(svgPath);

async function png(size) {
  return sharp(svg, { density: 384 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

function pngsToIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];
  for (const buf of pngBuffers) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    entries.push({ w, h, size: buf.length, offset, buf });
    offset += buf.length;
  }
  const out = Buffer.alloc(offset);
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);
  let entryAt = 6;
  for (const e of entries) {
    out.writeUInt8(e.w >= 256 ? 0 : e.w, entryAt);
    out.writeUInt8(e.h >= 256 ? 0 : e.h, entryAt + 1);
    out.writeUInt8(0, entryAt + 2);
    out.writeUInt8(0, entryAt + 3);
    out.writeUInt16LE(1, entryAt + 4);
    out.writeUInt16LE(32, entryAt + 6);
    out.writeUInt32LE(e.size, entryAt + 8);
    out.writeUInt32LE(e.offset, entryAt + 12);
    e.buf.copy(out, e.offset);
    entryAt += 16;
  }
  return out;
}

const [p16, p32, p180] = await Promise.all([png(16), png(32), png(180)]);
writeFileSync(join(pub, "pn-favicon-32.png"), p32);
writeFileSync(join(pub, "img/pn-apple-touch.png"), p180);
writeFileSync(join(pub, "favicon.ico"), pngsToIco([p16, p32]));
console.log("synced favicons from", pathToFileURL(svgPath).pathname);
