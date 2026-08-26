/**
 * Rewrite local article image paths → COS CDN absolute URLs.
 * Only touches image files under /news/, /sync/, /img/legacy/
 * (never feed.xml, html, etc.).
 */
import { cosConfig } from "./cos-upload.mjs";

const PATH_RE =
  /(^|[\s("'=:])(\/(?:news|sync|img\/legacy)\/[^\s)"']+\.(?:jpe?g|png|gif|webp|avif|svg))(?=[\s)"']|$)/gi;

export function rewriteLocalImagePaths(text, cdnBase = cosConfig().cdnBase) {
  if (!text || !cdnBase) return { text, count: 0 };
  const base = cdnBase.replace(/\/+$/, "");
  let count = 0;
  const out = text.replace(PATH_RE, (full, pre, p) => {
    if (full.includes(base)) return full;
    count++;
    return `${pre}${base}${p}`;
  });
  return { text: out, count };
}

export { PATH_RE };
