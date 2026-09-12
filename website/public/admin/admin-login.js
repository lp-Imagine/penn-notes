/**
 * Decap 登录页：注入 Penn Notes 品牌文案，藏掉默认 Decap 标志。
 * 登录成功后 AuthenticationPage 卸载，无需额外清理。
 */
(function () {
  var LABEL = "使用 GitHub 登录";

  var BRAND_HTML =
    '<div class="penn-login-brand" data-penn-login-brand>' +
    '<img class="penn-login-logo" src="/img/logo.svg" width="64" height="64" alt="" />' +
    '<p class="penn-login-name">Penn Notes</p>' +
    "<h1 class=\"penn-login-title\">写笔记</h1>" +
    '<p class="penn-login-lead">用 GitHub 登录后，即可在浏览器里新建与编辑站点笔记；保存会提交到仓库，并由 CI 构建发布。</p>' +
    "</div>";

  var FOOT_HTML =
    '<p class="penn-login-foot" data-penn-login-foot>' +
    '<a class="penn-login-home" href="/">← 返回博客</a>' +
    '<span class="penn-login-sep" aria-hidden="true">·</span>' +
    '<span class="penn-login-hint">需要仓库写权限</span>' +
    "</p>";

  var PANEL_HEAD_HTML =
    '<div class="penn-login-panel-head" data-penn-login-panel-head>' +
    '<p class="penn-login-panel-kicker">写作台</p>' +
    '<p class="penn-login-panel-desc">登录后直接进入笔记编辑</p>' +
    "</div>";

  function isAuthPage(el) {
    if (!el || el.nodeType !== 1) return false;
    return (el.getAttribute("class") || "").indexOf("AuthenticationPage") !== -1;
  }

  function findAuthPage(root) {
    if (isAuthPage(root)) return root;
    if (!root || !root.querySelector) return null;
    // Decap 3.x 类名是 StyledAuthenticationPage
    return (
      root.querySelector('[class*="StyledAuthenticationPage"]') ||
      root.querySelector('[class*="AuthenticationPage"]') ||
      (function () {
        var btn = root.querySelector('button[class*="LoginButton"]');
        return btn ? btn.closest("section") : null;
      })()
    );
  }

  var normalizing = false;

  function localizeAuthError(page) {
    var nodes = page.querySelectorAll("p");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.hasAttribute("data-penn-login-foot")) continue;
      if (el.closest("[data-penn-login-brand], [data-penn-login-panel-head]")) continue;
      var text = (el.textContent || "").trim();
      if (!text) continue;
      if (
        /^fetch failed$/i.test(text) ||
        /failed to fetch/i.test(text) ||
        /networkerror/i.test(text) ||
        /load failed/i.test(text)
      ) {
        el.textContent =
          "连接 GitHub 不稳定，请再点一次「使用 GitHub 登录」重试";
        el.classList.add("penn-login-error");
      }
    }
  }

  /** 清空 Decap 按钮内部图标/碎片节点，只保留一句文案（图标交给 CSS ::before） */
  function normalizeLoginButton(page) {
    if (normalizing) return;
    var btn =
      page.querySelector('button[class*="LoginButton"]') ||
      page.querySelector('[class*="LoginButton"]');
    if (!btn) return;

    var dirty =
      btn.querySelector("svg, [class*='Icon'], span, img") ||
      btn.childNodes.length !== 1 ||
      (btn.textContent || "").trim() !== LABEL;

    if (!dirty && btn.dataset.pennBtn === "1") return;

    normalizing = true;
    try {
      btn.dataset.pennBtn = "1";
      while (btn.firstChild) btn.removeChild(btn.firstChild);
      btn.appendChild(document.createTextNode(LABEL));
      btn.setAttribute("aria-label", LABEL);
    } finally {
      normalizing = false;
    }
  }

  function ensureActionPanel(page) {
    var btn =
      page.querySelector('button[class*="LoginButton"]') ||
      page.querySelector('[class*="LoginButton"]');
    if (!btn) return;

    var panel = page.querySelector("[data-penn-login-panel]");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "penn-login-panel";
      panel.setAttribute("data-penn-login-panel", "");
      panel.insertAdjacentHTML("afterbegin", PANEL_HEAD_HTML);
      btn.parentNode.insertBefore(panel, btn);
    }

    if (btn.parentNode !== panel) {
      panel.appendChild(btn);
    }

    var foot = page.querySelector("[data-penn-login-foot]");
    if (foot && foot.parentNode !== panel) {
      panel.appendChild(foot);
    }

    // 错误信息也放进右侧栏，避免打乱左右构图
    Array.prototype.forEach.call(page.children, function (child) {
      if (child.nodeType !== 1) return;
      if (child.hasAttribute("data-penn-login-brand")) return;
      if (child.hasAttribute("data-penn-login-panel")) return;
      if (child.hasAttribute("data-penn-hidden-brand")) return;
      if (child.tagName === "P") panel.appendChild(child);
    });
  }

  function enhance(page) {
    document.documentElement.classList.add("penn-admin-login");
    document.body.classList.add("penn-admin-login");

    if (page.dataset.pennLogin !== "1") {
      page.dataset.pennLogin = "1";

      // 藏 Decap 默认粉标，保留登录按钮与错误文案
      Array.prototype.forEach.call(page.children, function (child) {
        if (child.nodeType !== 1) return;
        if (child.hasAttribute("data-penn-login-brand")) return;
        if (child.hasAttribute("data-penn-login-foot")) return;
        if (child.hasAttribute("data-penn-login-panel")) return;
        if (
          child.querySelector &&
          child.querySelector('button[class*="LoginButton"], [class*="LoginButton"]')
        ) {
          return;
        }
        var cls = child.getAttribute("class") || "";
        if (cls.indexOf("LoginButton") !== -1 || child.tagName === "BUTTON") return;
        var looksBrand =
          child.tagName === "SVG" ||
          child.tagName === "IMG" ||
          cls.indexOf("Icon") !== -1 ||
          cls.indexOf("Logo") !== -1 ||
          cls.indexOf("DecapLogo") !== -1 ||
          (child.tagName === "SPAN" && child.querySelector("svg"));
        if (looksBrand) {
          child.setAttribute("data-penn-hidden-brand", "1");
          child.style.display = "none";
        }
      });

      if (!page.querySelector("[data-penn-login-brand]")) {
        page.insertAdjacentHTML("afterbegin", BRAND_HTML);
      }
      if (!page.querySelector("[data-penn-login-foot]")) {
        page.insertAdjacentHTML("beforeend", FOOT_HTML);
      }
    }

    // Decap 可能反复重绘按钮，每次扫描都规范化并挂到右侧面板
    normalizeLoginButton(page);
    ensureActionPanel(page);
    localizeAuthError(page);
  }

  function clearLoginClass() {
    if (findAuthPage(document)) return;
    document.documentElement.classList.remove("penn-admin-login");
    document.body.classList.remove("penn-admin-login");
  }

  function scan() {
    var page = findAuthPage(document);
    if (page) enhance(page);
    else clearLoginClass();
  }

  var mo = new MutationObserver(function () {
    scan();
  });

  function start() {
    scan();
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
