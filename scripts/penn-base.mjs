/**
 * Site URL prefix for dual hosting:
 * - origin (Baota): PENN_BASE=/  → /
 * - GitHub Pages backup: PENN_BASE=/penn-notes/ → /penn-notes/
 */
export function pennBase() {
  const raw = (process.env.PENN_BASE ?? "/").trim() || "/";
  let b = raw.startsWith("/") ? raw : `/${raw}`;
  if (!b.endsWith("/")) b += "/";
  return b;
}

/** Redirect target prefix: "" on origin, "/penn-notes" on Pages. */
export function pennRedirectPrefix() {
  const b = pennBase();
  return b === "/" ? "" : b.replace(/\/+$/, "");
}

export function pennSiteUrl() {
  return (process.env.PENN_SITE_URL ?? "https://penn-notes.draftly.cn").replace(
    /\/+$/,
    "",
  );
}

/**
 * VitePress relativePath → 线上 200 的 pathname。
 * 栏目 index（about/index.md、news/index.md）带尾斜杠，对齐 nginx 目录 301；
 * 文章页不带斜杠。
 */
export function pennCanonicalPath(relativePath) {
  const posix = String(relativePath || "").replace(/\\/g, "/");
  const isDirIndex = /(^|\/)index\.md$/.test(posix);
  const rel = posix
    .replace(/\.md$/, "")
    .replace(/\/index$/, "")
    .replace(/^index$/, "");
  if (!rel) return "/";
  return isDirIndex ? `/${rel}/` : `/${rel}`;
}

export function pennCanonicalUrl(relativePath) {
  const p = pennCanonicalPath(relativePath);
  const base = pennSiteUrl();
  return p === "/" ? `${base}/` : `${base}${p}`;
}
