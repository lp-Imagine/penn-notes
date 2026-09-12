/**
 * Decap CMS GitHub OAuth proxy (Netlify-compat handshake).
 * Decap opens /api/decap-auth → GitHub → /api/decap-auth/callback → postMessage token.
 *
 * 国内机房访问 github.com 偶发失败时，用重试 + 加固握手降低「要点好几次」的概率。
 */
import { URL } from "node:url";

const TOKEN_URL = "https://github.com/login/oauth/access_token";
const MAX_TOKEN_ATTEMPTS = 4;
const TOKEN_TIMEOUT_MS = 18000;

function htmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function friendlyNetworkError(err) {
  const raw = err instanceof Error ? err.message : String(err || "error");
  const lower = raw.toLowerCase();
  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("cert") ||
    lower.includes("aborted") ||
    lower.includes("timeout")
  ) {
    return "连接 GitHub 超时或中断，请再点一次「使用 GitHub 登录」重试";
  }
  return raw;
}

/**
 * 换 token：网络抖动时自动重试；OAuth 业务错误（如 code 已用）不重试。
 */
async function exchangeAccessToken({ clientId, clientSecret, code, redirectUri }) {
  let lastErr = null;

  for (let attempt = 1; attempt <= MAX_TOKEN_ATTEMPTS; attempt++) {
    try {
      const tokenRes = await fetch(TOKEN_URL, {
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
          redirect_uri: redirectUri,
        }),
        signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
      });

      let data;
      try {
        data = await tokenRes.json();
      } catch {
        throw new Error(`GitHub token 响应无法解析（HTTP ${tokenRes.status}）`);
      }

      if (data.access_token) {
        if (attempt > 1) {
          console.info(`decap-auth: token ok on attempt ${attempt}`);
        }
        return data.access_token;
      }

      const oauthErr = data.error_description || data.error || "no access_token";
      // code 失效 / 参数错误：重试无意义
      if (
        data.error === "bad_verification_code" ||
        data.error === "incorrect_client_credentials" ||
        data.error === "redirect_uri_mismatch"
      ) {
        throw new Error(oauthErr);
      }

      lastErr = new Error(oauthErr);
      console.warn(
        `decap-auth: token attempt ${attempt}/${MAX_TOKEN_ATTEMPTS} rejected: ${oauthErr}`,
      );
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      console.warn(
        `decap-auth: token attempt ${attempt}/${MAX_TOKEN_ATTEMPTS} failed: ${lastErr.message}`,
      );
      // bad_verification_code 等不要空转
      if (
        /bad_verification_code|incorrect_client|redirect_uri_mismatch/i.test(
          lastErr.message,
        )
      ) {
        break;
      }
    }

    if (attempt < MAX_TOKEN_ATTEMPTS) {
      await sleep(350 * 2 ** (attempt - 1));
    }
  }

  throw lastErr || new Error("fetch failed");
}

function authSuccessPage(provider, token) {
  const payload = JSON.stringify({ token, provider });
  // Decap listens for authorization:<provider>:success:<json>
  const msg = `authorization:${provider}:success:${payload}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8" /><title>授权成功</title></head>
<body>
<p>授权成功，正在返回编辑器…</p>
<script>
(function () {
  var msg = ${JSON.stringify(msg)};
  var sent = false;
  function send() {
    if (!window.opener) return;
    try {
      window.opener.postMessage(msg, "*");
      sent = true;
    } catch (e) {}
  }
  function receiveMessage(e) {
    // Decap 握手回复后立刻回传 token
    send();
  }
  window.addEventListener("message", receiveMessage, false);
  try {
    window.opener.postMessage("authorizing:github", "*");
  } catch (e) {}
  // 兜底：握手竞态时补发几次，减少要点好几次才成功的情况
  setTimeout(send, 40);
  setTimeout(send, 200);
  setTimeout(send, 600);
  setTimeout(function () {
    if (sent) {
      try { window.close(); } catch (e) {}
    }
  }, 1200);
})();
</script>
</body>
</html>`;
}

function authErrorPage(message) {
  const friendly = friendlyNetworkError(message);
  const safe = htmlEscape(friendly);
  const msg = `authorization:github:error:${JSON.stringify({ message: friendly })}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8" /><title>授权失败</title></head>
<body>
<p>授权失败：${safe}</p>
<p>请关闭此窗口，回到原页面再点一次登录。</p>
<script>
(function () {
  var msg = ${JSON.stringify(msg)};
  function send() {
    if (!window.opener) return;
    try { window.opener.postMessage(msg, "*"); } catch (e) {}
  }
  function receiveMessage() { send(); }
  window.addEventListener("message", receiveMessage, false);
  try { window.opener.postMessage("authorizing:github", "*"); } catch (e) {}
  setTimeout(send, 40);
  setTimeout(send, 300);
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
      const accessToken = await exchangeAccessToken({
        clientId,
        clientSecret,
        code,
        redirectUri: callbackUri,
      });
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(authSuccessPage("github", accessToken));
    } catch (e) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(authErrorPage(e instanceof Error ? e.message : String(e)));
    }
    return true;
  }

  return false;
}
