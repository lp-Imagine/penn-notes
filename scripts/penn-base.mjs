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
