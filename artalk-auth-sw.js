/* 控制中心在 iframe 里发请求，页面上的 fetch 补丁盖不到。这里把 Bearer 抄进 ?token=。 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/artalk/api/")) return;
  if (url.searchParams.has("token")) return;
  const match = /^Bearer\s+(\S+)/i.exec(req.headers.get("Authorization") || "");
  if (!match) return;
  url.searchParams.set("token", match[1]);
  const copy = req.clone();
  event.respondWith(
    fetch(new Request(url.toString(), copy)).catch(() => fetch(req)),
  );
});
