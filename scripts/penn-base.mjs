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

/**
 * 给手写 HTML 里的根绝对路径补上 PENN_BASE（Pages 备份用）。
 * - `/news/` + base=/penn-notes/ → `/penn-notes/news/`
 * - 已带 base、协议相对 `//…`、非 `/` 开头 → 原样
 */
export function pennWithBasePath(pathname, base = pennBase()) {
  const raw = String(pathname || "");
  if (!raw.startsWith("/") || raw.startsWith("//")) return raw;
  const prefix = String(base || "/").replace(/\/+$/, "");
  if (!prefix || prefix === "/") return raw;
  if (raw === prefix || raw.startsWith(`${prefix}/`)) return raw;
  return `${prefix}${raw}`;
}

/**
 * 改写 HTML 中的 href="/…"、src="/…"，避免 VitePress 不处理 raw HTML 时
 * GitHub Pages（PENN_BASE=/penn-notes/）链到 github.io 根路径。
 */
export function pennRewriteRootUrlsInHtml(html, base = pennBase()) {
  const prefix = String(base || "/").replace(/\/+$/, "");
  if (!prefix || prefix === "/") return html;
  return String(html).replace(
    /\b(href|src)="(\/[^"]*)"/gi,
    (full, attr, path) => {
      const next = pennWithBasePath(path, base);
      return next === path ? full : `${attr}="${next}"`;
    },
  );
}
