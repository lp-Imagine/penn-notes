/**
 * Decap CMS GitHub OAuth proxy (Netlify-compat handshake).
 * Decap opens /api/decap-auth → GitHub → /api/decap-auth/callback → postMessage token.
 */
import { URL } from "node:url";

function htmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function authSuccessPage(provider, token) {
  const payload = JSON.stringify({ token, provider });
  // Decap listens for authorization:<provider>:success:<json>
  const msg = `authorization:${provider}:success:${payload}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8" /><title>授权成功</title></head>
<body>
<p>授权成功，可关闭此窗口。</p>
<script>
(function () {
  function receiveMessage(e) {
    console.log("decap-auth: receiveMessage %o", e);
    window.opener.postMessage(${JSON.stringify(msg)}, e.origin);
  }
  window.addEventListener("message", receiveMessage, false);
  console.log("decap-auth: sending authorizing message");
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body>
</html>`;
}

function authErrorPage(message) {
  const safe = htmlEscape(message || "authorization failed");
  const msg = `authorization:github:error:${JSON.stringify({ message: String(message || "error") })}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8" /><title>授权失败</title></head>
<body>
<p>授权失败：${safe}</p>
<script>
(function () {
  function receiveMessage(e) {
    window.opener.postMessage(${JSON.stringify(msg)}, e.origin);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body>
</html>`;
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @param {{ clientId: string, clientSecret: string, publicOrigin: string }} cfg
 */
export async function handleDecapAuth(req, res, url, cfg) {
  const { clientId, clientSecret, publicOrigin } = cfg;
  if (!clientId || !clientSecret) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Decap OAuth 未配置：请设置 GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET");
    return true;
  }

  const callbackUri = `${publicOrigin.replace(/\/$/, "")}/api/decap-auth/callback`;

  if (
    (req.method === "GET" || req.method === "HEAD") &&
    url.pathname === "/api/decap-auth"
  ) {
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", callbackUri);
    authorize.searchParams.set("scope", "public_repo,repo,user:email");
    res.writeHead(302, { Location: authorize.toString() });
    res.end();
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/decap-auth/callback") {
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    const errDesc = url.searchParams.get("error_description");
    if (err || !code) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(authErrorPage(errDesc || err || "missing code"));
      return true;
    }

    try {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "penn-notes-decap-auth",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: callbackUri,
        }),
      });
      const data = await tokenRes.json();
      if (!data.access_token) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(authErrorPage(data.error_description || data.error || "no access_token"));
        return true;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(authSuccessPage("github", data.access_token));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(authErrorPage(e instanceof Error ? e.message : String(e)));
    }
    return true;
  }

  return false;
}
