/**
 * Rewrite local article image paths → COS CDN absolute URLs.
 * Only touches /news/, /sync/, /img/legacy/ (not site logo under /img/).
 */
import { cosConfig } from "./cos-upload.mjs";

const PATH_RE =
  /(^|[\s("'=:])(\/(?:news|sync|img\/legacy)\/[^\s)"']+)/g;

export function rewriteLocalImagePaths(text, cdnBase = cosConfig().cdnBase) {
  if (!text || !cdnBase) return { text, count: 0 };
  const base = cdnBase.replace(/\/+$/, "");
  let count = 0;
  const out = text.replace(PATH_RE, (full, pre, p) => {
    // Already absolute on this CDN
    if (full.includes(base)) return full;
    count++;
    return `${pre}${base}${p}`;
  });
  return { text: out, count };
}

export { PATH_RE };
