/**
 * Artalk 管理接口认 Authorization，也认 ?token=。
 * 反代丢掉 Authorization 时，把 Bearer 抄进查询参数，登录态才能留下来。
 */
export function artalkApiUrlWithToken(rawUrl, authorization, pageHref) {
  const base = pageHref || "https://penn-notes.draftly.cn/";
  let url;
  let page;
  try {
    page = new URL(base);
    url = new URL(String(rawUrl), page);
  } catch {
    return null;
  }
  if (url.origin !== page.origin) return null;
  if (!url.pathname.startsWith("/artalk/api/")) return null;
  if (url.searchParams.has("token")) return null;
  const match = /^Bearer\s+(\S+)/i.exec(String(authorization || ""));
  if (!match) return null;
  url.searchParams.set("token", match[1]);
  return url.toString();
}
