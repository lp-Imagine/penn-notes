/**
 * Decap 离开页确认：用站内弹窗替代 window.confirm
 *（仅处理 onLeavePage；删除/发布等其它 confirm 仍走原生，避免无法同步续跑）
 */
(function () {
  var nativeConfirm = window.confirm.bind(window);
  var leaveRe =
    /确定要离开此页面|leave this page|leave without saving|未保存.*离开/i;
  var pendingHash = null;
  var allowOnce = false;
  var open = false;

  function isLeaveMessage(msg) {
    return leaveRe.test(String(msg || ""));
  }

  function collectionHomeHash() {
    var m = String(location.hash || "").match(/#?\/collections\/([^/?#]+)/);
    return m ? "#/collections/" + m[1] : "#/";
  }

  function ensureStyle() {
    if (document.getElementById("penn-admin-confirm-style")) return;
    var style = document.createElement("style");
    style.id = "penn-admin-confirm-style";
    style.textContent =
      ".penn-admin-confirm{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;}" +
      ".penn-admin-confirm[hidden]{display:none!important;}" +
      ".penn-admin-confirm-scrim{position:absolute;inset:0;border:0;margin:0;padding:0;cursor:pointer;background:rgba(15,23,42,.42);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);}" +
      ".penn-admin-confirm-card{position:relative;z-index:1;width:min(400px,100%);padding:22px 22px 18px;border:1px solid #e2e5ee;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04),0 18px 48px rgba(15,23,42,.18);animation:penn-admin-confirm-in .16s ease-out;}" +
      "@keyframes penn-admin-confirm-in{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}" +
      ".penn-admin-confirm-kicker{margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9aa0ad;}" +
      ".penn-admin-confirm-title{margin:0;font-size:17px;font-weight:720;letter-spacing:-.02em;line-height:1.35;color:#1a1b1f;}" +
      ".penn-admin-confirm-detail{margin:10px 0 0;font-size:13.5px;line-height:1.55;color:#6b6f7b;}" +
      ".penn-admin-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px;}" +
      ".penn-admin-confirm-btn{appearance:none;min-height:38px;padding:0 16px;border-radius:999px;border:1px solid #e2e5ee;background:#fff;color:#1a1b1f;font-size:13.5px;font-weight:600;cursor:pointer;}" +
      ".penn-admin-confirm-btn:hover{background:#eef1f8;}" +
      ".penn-admin-confirm-btn.is-primary{border-color:#3b5bdb;background:#3b5bdb;color:#fff;box-shadow:0 6px 16px rgba(59,91,219,.18);}" +
      ".penn-admin-confirm-btn.is-primary:hover{filter:brightness(1.05);background:#2f4fc4;}" +
      ".penn-admin-confirm-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(59,91,219,.22);}";
    document.head.appendChild(style);
  }

  function ensureDom() {
    ensureStyle();
    var root = document.getElementById("penn-admin-confirm");
    if (root) return root;
    root = document.createElement("div");
    root.id = "penn-admin-confirm";
    root.className = "penn-admin-confirm";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.innerHTML =
      '<button type="button" class="penn-admin-confirm-scrim" aria-label="取消" data-penn-confirm="no"></button>' +
      '<div class="penn-admin-confirm-card">' +
      '<p class="penn-admin-confirm-kicker">Penn Notes</p>' +
      '<p class="penn-admin-confirm-title" id="penn-admin-confirm-title"></p>' +
      '<p class="penn-admin-confirm-detail">未保存的修改将会丢失。</p>' +
      '<div class="penn-admin-confirm-actions">' +
      '<button type="button" class="penn-admin-confirm-btn" data-penn-confirm="no">取消</button>' +
      '<button type="button" class="penn-admin-confirm-btn is-primary" data-penn-confirm="yes">确定离开</button>' +
      "</div></div>";
    document.body.appendChild(root);
    return root;
  }

  function closeModal() {
    var root = document.getElementById("penn-admin-confirm");
    if (root) root.hidden = true;
    open = false;
  }

  function showLeaveModal(message) {
    var root = ensureDom();
    var title = root.querySelector("#penn-admin-confirm-title");
    if (title) title.textContent = String(message || "你确定要离开此页面吗？");
    root.hidden = false;
    open = true;
    var primary = root.querySelector('[data-penn-confirm="yes"]');
    if (primary) primary.focus();

    return new Promise(function (resolve) {
      function onKey(e) {
        if (e.key === "Escape") finish(false);
        if (e.key === "Enter") finish(true);
      }
      function finish(ok) {
        root.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey, true);
        closeModal();
        resolve(ok);
      }
      function onClick(e) {
        var btn = e.target.closest("[data-penn-confirm]");
        if (!btn) return;
        finish(btn.getAttribute("data-penn-confirm") === "yes");
      }
      root.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey, true);
    });
  }

  function resumeNavigation() {
    var target = pendingHash || collectionHomeHash();
    pendingHash = null;
    if (!target) return;
    if (target.charAt(0) !== "#") target = "#" + target;
    allowOnce = true;
    location.hash = target;
  }

  // 捕获侧栏 / 顶栏等 hash 链接，便于确认后继续跳转
  document.addEventListener(
    "click",
    function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      var href = a.getAttribute("href") || "";
      if (href.indexOf("#/") === 0) pendingHash = href;
      else if (href.indexOf("/admin/#/") >= 0) {
        pendingHash = "#" + href.split("#")[1];
      }
    },
    true
  );

  window.confirm = function (message) {
    if (allowOnce) {
      allowOnce = false;
      return true;
    }
    if (!isLeaveMessage(message)) {
      return nativeConfirm(message);
    }
    if (open) return false;

    showLeaveModal(message).then(function (ok) {
      if (ok) resumeNavigation();
      else pendingHash = null;
    });
    // 先取消本次路由跳转，用户点「确定离开」后再手动续跳
    return false;
  };
})();
