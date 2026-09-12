/**
 * Decap 登录页：注入 Penn Notes 品牌文案，藏掉默认 Decap 标志。
 * 登录成功后 AuthenticationPage 卸载，无需额外清理。
 */
(function () {
  var BRAND_HTML =
    '<div class="penn-login-brand" data-penn-login-brand>' +
    '<img class="penn-login-logo" src="/img/logo.svg" width="56" height="56" alt="" />' +
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

  function isAuthPage(el) {
    if (!el || el.nodeType !== 1) return false;
    return (el.getAttribute("class") || "").indexOf("AuthenticationPage") !== -1;
  }

  function findAuthPage(root) {
    if (isAuthPage(root)) return root;
    if (!root || !root.querySelector) return null;
    return root.querySelector('[class*="-AuthenticationPage"]');
  }

  function translateLoginButton(page) {
    var btn = page.querySelector('[class*="-LoginButton"]');
    if (!btn) return;
    var text = (btn.textContent || "").trim();
    if (/login with github/i.test(text) || text === "Login with GitHub") {
      btn.textContent = "使用 GitHub 登录";
    }
  }

  function enhance(page) {
    if (!page || page.dataset.pennLogin === "1") return;
    page.dataset.pennLogin = "1";
    document.documentElement.classList.add("penn-admin-login");
    document.body.classList.add("penn-admin-login");

    // 藏 Decap 默认品牌（粉标），保留登录按钮与错误文案
    Array.prototype.forEach.call(page.children, function (child) {
      if (child.nodeType !== 1) return;
      if (child.hasAttribute("data-penn-login-brand")) return;
      if (child.hasAttribute("data-penn-login-foot")) return;
      if (child.querySelector && child.querySelector('[class*="-LoginButton"], button')) {
        return;
      }
      var cls = child.getAttribute("class") || "";
      if (cls.indexOf("LoginButton") !== -1 || child.tagName === "BUTTON") return;
      var looksBrand =
        child.tagName === "SVG" ||
        child.tagName === "IMG" ||
        cls.indexOf("Icon") !== -1 ||
        cls.indexOf("Logo") !== -1 ||
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
    translateLoginButton(page);
  }

  function clearLoginClass() {
    if (findAuthPage(document)) return;
    document.documentElement.classList.remove("penn-admin-login");
    document.body.classList.remove("penn-admin-login");
  }

  function scan(root) {
    var page = findAuthPage(root) || findAuthPage(document);
    if (page) enhance(page);
    else clearLoginClass();
  }

  var mo = new MutationObserver(function () {
    scan(document);
  });

  function start() {
    scan(document);
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
