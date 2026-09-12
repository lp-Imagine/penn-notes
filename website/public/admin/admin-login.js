/**
 * Decap 登录页皮肤：外置 Penn Notes 登录壳，不改动 React 管理的节点。
 * 之前把 LoginButton appendChild / 清空子节点会导致登录后 insertBefore 崩溃。
 */
(function () {
  var LABEL = "使用 GitHub 登录";

  var SHELL_HTML =
    '<div class="penn-login-shell" data-penn-login-shell>' +
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

  function showShell(page) {
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

  function hideShell() {
    var shell = document.querySelector("[data-penn-login-shell]");
    if (shell) shell.hidden = true;
    document.documentElement.classList.remove("penn-admin-login");
    document.body.classList.remove("penn-admin-login");
  }

  function scan() {
    var page = findAuthPage();
    if (page) showShell(page);
    else hideShell();
  }

  var scheduled = false;
  var mo = new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      scan();
    });
  });

  function start() {
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
