/** VitePress relativePath → pathname（与 scripts/penn-base.mjs 一致，可在浏览器运行） */

export function canonicalPath(relativePath: string): string {
  const posix = String(relativePath || "").replace(/\\/g, "/");
  const isDirIndex = /(^|\/)index\.md$/.test(posix);
  const rel = posix
    .replace(/\.md$/, "")
    .replace(/\/index$/, "")
    .replace(/^index$/, "");
  if (!rel) return "/";
  return isDirIndex ? `/${rel}/` : `/${rel}`;
}

/** 文章 canonical URL（siteUrl 来自 theme 配置，避免浏览器端读 process.env） */
export function getPageCanonicalUrl(
  relativePath: string,
  siteUrl: string,
): string {
  const origin = siteUrl.replace(/\/+$/, "");
  const path = canonicalPath(relativePath);
  return path === "/" ? `${origin}/` : `${origin}${path}`;
}

/** 展示用短路径，如 /tech/github/foo */
export function getPageLinkPath(canonicalUrl: string): string {
  try {
    return decodeURI(new URL(canonicalUrl).pathname);
  } catch {
    return canonicalUrl;
  }
}

/** 复制 / 分享用完整 canonical URL */
export function resolveLivePageUrl(siteUrl: string): string {
  if (typeof window === "undefined") return siteUrl;
  const origin = siteUrl.replace(/\/+$/, "");
  return origin + decodeURI(window.location.pathname);
}
