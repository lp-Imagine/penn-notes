/**
 * Decap 写作提示：封面可选；本地图 COS 收口失败看 CI。
 * 不改 Decap React；仅注入顶栏提示条。
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
    var el = document.getElementById(TIP_ID);
    if (el) el.remove();
  }

  function ensureTip() {
    if (dismissed() || document.getElementById(TIP_ID)) return;
    if (!document.querySelector("#nc-root")) return;

    var tip = document.createElement("div");
    tip.id = TIP_ID;
    tip.className = "penn-admin-publish-tip";
    tip.setAttribute("role", "status");
    tip.innerHTML =
      '<p><strong>发布提示</strong>：封面可选，无图也可发布。若上传了本地图，发布后由 CI 收口到 COS；' +
      '正文大图仍是 /uploads/ 或封面裂图时，打开 GitHub Actions 日志搜 ' +
      '<code>ensure-cos-note-images</code> / <code>gc-cos-decap</code>。</p>' +
      '<button type="button" class="penn-admin-publish-tip-close" aria-label="关闭提示">×</button>';
    tip.querySelector("button").addEventListener("click", dismiss);

    var root = document.querySelector("#nc-root");
    if (root && root.firstChild) root.insertBefore(tip, root.firstChild);
    else document.body.prepend(tip);
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    ensureTip();
    if (document.getElementById(TIP_ID) || tries > 40) clearInterval(timer);
  }, 500);

  document.addEventListener("DOMContentLoaded", ensureTip);
})();
