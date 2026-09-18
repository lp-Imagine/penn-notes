/**
 * Decap 写作提示：仅登录进入写作台后显示；登录页 / 恢复会话时不出现。
 */
(function () {
  var TIP_ID = "penn-admin-publish-tip";
  var DISMISS_KEY = "penn-admin-publish-tip-dismissed";

  function dismissed() {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch (e) {
      /* ignore */
    }
    removeTip();
  }

  function removeTip() {
    var el = document.getElementById(TIP_ID);
    if (el) el.remove();
  }

  function isLoginSurface() {
    if (document.body.classList.contains("penn-admin-login")) return true;
    if (document.documentElement.classList.contains("penn-admin-login")) return true;
    if (document.querySelector("[data-penn-login-shell]:not([hidden])")) return true;
    if (document.querySelector('[class*="AuthenticationPage"]')) return true;
    if (document.querySelector('button[class*="LoginButton"]')) return true;
    return false;
  }

  function isEditorReady() {
    return !!(
      document.querySelector('[class*="AppHeaderContent"]') ||
      document.querySelector('[class*="CollectionTop"]') ||
      document.querySelector('[class*="CollectionContainer"]') ||
      document.querySelector('[class*="Entries"]') ||
      document.querySelector('[class*="EditorContainer"]')
    );
  }

  function ensureTip() {
    if (dismissed()) {
      removeTip();
      return;
    }
    if (isLoginSurface() || !isEditorReady()) {
      removeTip();
      return;
    }
    if (document.getElementById(TIP_ID)) return;

    var tip = document.createElement("div");
    tip.id = TIP_ID;
    tip.className = "penn-admin-publish-tip";
    tip.setAttribute("role", "status");
    tip.innerHTML =
      "<p><strong>发布提示</strong>：封面可选。本地图由 CI 收口到 COS；裂图时查 Actions 日志 " +
      "<code>ensure-cos-note-images</code>。</p>" +
      '<button type="button" class="penn-admin-publish-tip-close" aria-label="关闭提示">×</button>';
    tip.querySelector("button").addEventListener("click", dismiss);

    var header =
      document.querySelector('[class*="AppHeaderContent"]') ||
      document.querySelector("#nc-root");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(tip, header);
    } else if (document.body) {
      document.body.prepend(tip);
    }
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    ensureTip();
    if ((document.getElementById(TIP_ID) || tries > 120) && isEditorReady()) {
      clearInterval(timer);
    }
  }, 500);

  document.addEventListener("DOMContentLoaded", ensureTip);

  if (typeof MutationObserver !== "undefined") {
    var obs = new MutationObserver(function () {
      ensureTip();
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden"],
    });
  }
})();
