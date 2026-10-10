/**
 * Decap 登录页皮肤：外置 Penn Notes 登录壳，不改动 React 管理的节点。
 * 刷新时 Decap 会短暂挂载 AuthenticationPage 再恢复会话；
 * 有本地 token 时用 boot 遮罩，避免登录页跳闪。
 */
(function () {
  var LABEL = "使用 GitHub 登录";
  var SHOW_DELAY_MS = 320;
  var RESTORE_FAIL_MS = 2800;
  var USER_KEY = "netlify-cms-user";

  var SHELL_HTML =
    '<div class="penn-login-shell" data-penn-login-shell hidden>' +
    '<div class="penn-login-frame">' +
    '<div class="penn-login-brand">' +
    '<img class="penn-login-logo" src="/img/logo.svg" width="64" height="64" alt="" />' +
    '<p class="penn-login-name">Penn Notes</p>' +
    "<h1 class=\"penn-login-title\">写笔记</h1>" +
    '<p class="penn-login-lead">用 GitHub 登录后，即可在浏览器里新建与编辑站点笔记；保存会提交到仓库，并由 CI 构建发布。</p>' +
    "</div>" +
    '<div class="penn-login-panel">' +
    '<div class="penn-login-panel-head">' +
    '<p class="penn-login-panel-kicker">写作台</p>' +
    '<p class="penn-login-panel-desc">登录后直接进入笔记编辑</p>' +
    "</div>" +
    '<button type="button" class="penn-login-cta" data-penn-login-cta>' +
    LABEL +
    "</button>" +
    '<p class="penn-login-error" data-penn-login-error hidden></p>' +
    '<p class="penn-login-foot">' +
    '<a class="penn-login-home" href="/">← 返回博客</a>' +
    '<span class="penn-login-sep" aria-hidden="true">·</span>' +
    '<span class="penn-login-hint">需要仓库写权限</span>' +
    "</p>" +
    "</div>" +
    "</div>" +
    "</div>";

  var BOOT_HTML =
    '<div class="penn-admin-boot" data-penn-admin-boot hidden aria-live="polite">' +
    '<div class="penn-admin-boot-card">' +
    '<img class="penn-admin-boot-logo" src="/img/logo.svg" width="40" height="40" alt="" />' +
    '<p class="penn-admin-boot-text">正在恢复会话…</p>' +
    "</div>" +
    "</div>";

  var showTimer = null;
  var restoreFailTimer = null;
  var scheduled = false;

  function isAuthPage(el) {
    if (!el || el.nodeType !== 1) return false;
    return (el.getAttribute("class") || "").indexOf("AuthenticationPage") !== -1;
  }

  function findAuthPage() {
    return (
      document.querySelector('[class*="StyledAuthenticationPage"]') ||
      document.querySelector('[class*="AuthenticationPage"]') ||
      (function () {
        var btn = document.querySelector('button[class*="LoginButton"]');
        if (!btn) return null;
        var section = btn.closest("section");
        return section && isAuthPage(section) ? section : null;
      })()
    );
  }

  function findDecapLoginButton() {
    return document.querySelector('button[class*="LoginButton"]');
  }

  function isAppReady() {
    return !!(
      document.querySelector('[class*="AppHeaderContent"]') ||
      document.querySelector('[class*="CollectionContainer"]') ||
      document.querySelector('[class*="Entries"]') ||
      document.querySelector('[class*="EditorContainer"]')
    );
  }

  function hasStoredSession() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      if (!raw) return false;
      var user = JSON.parse(raw);
      if (!user || typeof user !== "object") return false;
      return !!(user.token || user.access_token || user.jwt);
    } catch (e) {
      return false;
    }
  }

  function clearShowTimer() {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
  }

  function clearRestoreFailTimer() {
    if (restoreFailTimer) {
      clearTimeout(restoreFailTimer);
      restoreFailTimer = null;
    }
  }

  function ensureShell() {
    var shell = document.querySelector("[data-penn-login-shell]");
    if (shell) return shell;
    document.body.insertAdjacentHTML("afterbegin", SHELL_HTML);
    shell = document.querySelector("[data-penn-login-shell]");
    var cta = shell.querySelector("[data-penn-login-cta]");
    cta.addEventListener("click", function () {
      var real = findDecapLoginButton();
      if (real) real.click();
    });
    return shell;
  }

  function ensureBoot() {
    var boot = document.querySelector("[data-penn-admin-boot]");
    if (boot) return boot;
    document.body.insertAdjacentHTML("afterbegin", BOOT_HTML);
    return document.querySelector("[data-penn-admin-boot]");
  }

  function readDecapError(page) {
    if (!page) return "";
    var nodes = page.querySelectorAll("p");
    for (var i = 0; i < nodes.length; i++) {
      var text = (nodes[i].textContent || "").trim();
      if (!text) continue;
      if (nodes[i].closest("[data-penn-login-shell]")) continue;
      return text;
    }
    return "";
  }

  function friendlyError(text) {
    if (!text) return "";
    if (
      /^fetch failed$/i.test(text) ||
      /failed to fetch/i.test(text) ||
      /networkerror/i.test(text) ||
      /load failed/i.test(text) ||
      /连接 GitHub/i.test(text)
    ) {
      return "连接 GitHub 不稳定，请再点一次「使用 GitHub 登录」重试";
    }
    return text;
  }

  function showBoot() {
    hideShell(true);
    var boot = ensureBoot();
    boot.hidden = false;
    document.documentElement.classList.add("penn-admin-booting");
    document.body.classList.add("penn-admin-booting");
  }

  function hideBoot() {
    var boot = document.querySelector("[data-penn-admin-boot]");
    if (boot) boot.hidden = true;
    document.documentElement.classList.remove("penn-admin-booting");
    document.body.classList.remove("penn-admin-booting");
  }

  function showShell(page) {
    clearShowTimer();
    clearRestoreFailTimer();
    hideBoot();
    var shell = ensureShell();
    shell.hidden = false;
    document.documentElement.classList.add("penn-admin-login");
    document.body.classList.add("penn-admin-login");

    var errEl = shell.querySelector("[data-penn-login-error]");
    var msg = friendlyError(readDecapError(page));
    if (msg) {
      errEl.hidden = false;
      errEl.textContent = msg;
    } else {
      errEl.hidden = true;
      errEl.textContent = "";
    }
  }

  function hideShell(keepBoot) {
    clearShowTimer();
    var shell = document.querySelector("[data-penn-login-shell]");
    if (shell) shell.hidden = true;
    document.documentElement.classList.remove("penn-admin-login");
    document.body.classList.remove("penn-admin-login");
    if (!keepBoot) hideBoot();
  }

  function scheduleShowShell() {
    if (showTimer) return;
    if (document.body.classList.contains("penn-admin-login")) {
      showShell(findAuthPage());
      return;
    }
    showTimer = setTimeout(function () {
      showTimer = null;
      var page = findAuthPage();
      if (!page || isAppReady()) return;
      if (hasStoredSession()) return;
      showShell(page);
    }, SHOW_DELAY_MS);
  }

  function beginSessionRestore() {
    showBoot();
    if (restoreFailTimer) return;
    restoreFailTimer = setTimeout(function () {
      restoreFailTimer = null;
      var page = findAuthPage();
      if (page && !isAppReady()) {
        showShell(page);
      } else {
        hideBoot();
      }
    }, RESTORE_FAIL_MS);
  }

  function scan() {
    if (isAppReady()) {
      clearRestoreFailTimer();
      hideShell();
      return;
    }

    var page = findAuthPage();
    if (!page) {
      clearShowTimer();
      // Decap 尚未挂载：有会话则先 boot，避免白屏后突然冒出登录页
      if (hasStoredSession()) beginSessionRestore();
      else hideShell();
      return;
    }

    if (hasStoredSession()) {
      clearShowTimer();
      beginSessionRestore();
      return;
    }

    scheduleShowShell();
  }

  var mo = new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      scan();
    });
  });

  function start() {
    // 尽早挡住「已登录刷新」时的 AuthenticationPage 闪现
    if (hasStoredSession()) showBoot();
    scan();
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
