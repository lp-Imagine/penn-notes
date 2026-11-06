/**
 * Decap 原生 confirm/alert → 站内统一弹窗
 *
 * - alert：异步展示即可（返回值无用）
 * - 离开页：先拦路由，确认后再续跳
 * - 本地备份：先保全（返回 true 避免误删），确认后 reload 套用选择
 * - 删除/发布等：先返回 false 取消，确认后再自动点一次原按钮
 */
(function () {
  var nativeConfirm = window.confirm.bind(window);
  var nativeAlert = window.alert.bind(window);

  var leaveRe =
    /确定要离开此页面|leave this page|leave without saving|未保存.*离开/i;
  var backupRe = /本地备份|local backup|local copy|lokální kopie|sikkerhedskopi/i;
  var deleteRe = /删除|delete|remove|撤销发布|unpublish/i;
  var publishRe = /发布|publish/i;

  var pendingHash = null;
  var pendingClick = null;
  var allowOnce = false;
  var open = false;
  var clickClearTimer = null;

  function storageKey(message) {
    return "penn-admin-cfm:" + String(message || "").slice(0, 120);
  }

  function takeCached(message) {
    var key = storageKey(message);
    var v = sessionStorage.getItem(key);
    if (v !== "1" && v !== "0") return null;
    sessionStorage.removeItem(key);
    return v === "1";
  }

  function setCached(message, ok) {
    sessionStorage.setItem(storageKey(message), ok ? "1" : "0");
  }

  function isLeaveMessage(msg) {
    return leaveRe.test(String(msg || ""));
  }
  function isBackupMessage(msg) {
    return backupRe.test(String(msg || ""));
  }
  function isDeleteMessage(msg) {
    return deleteRe.test(String(msg || ""));
  }
  function isPublishMessage(msg) {
    return publishRe.test(String(msg || ""));
  }

  function collectionHomeHash() {
    var m = String(location.hash || "").match(/#?\/collections\/([^/?#]+)/);
    return m ? "#/collections/" + m[1] : "#/";
  }

  function classify(message, mode) {
    if (mode === "alert") {
      return {
        mode: "alert",
        kicker: "提示",
        detail: "",
        cancelLabel: "",
        confirmLabel: "知道了",
        danger: false,
      };
    }
    if (isLeaveMessage(message)) {
      return {
        mode: "confirm",
        kicker: "离开页面",
        detail: "未保存的修改将会丢失。",
        cancelLabel: "取消",
        confirmLabel: "确定离开",
        danger: false,
      };
    }
    if (isBackupMessage(message)) {
      return {
        mode: "confirm",
        kicker: "本地备份",
        detail: "确定将加载备份内容；取消则放弃该备份。",
        cancelLabel: "放弃备份",
        confirmLabel: "加载备份",
        danger: false,
      };
    }
    if (isDeleteMessage(message)) {
      return {
        mode: "confirm",
        kicker: "危险操作",
        detail: "此操作可能无法撤销，请确认后再继续。",
        cancelLabel: "取消",
        confirmLabel: "确定",
        danger: true,
      };
    }
    if (isPublishMessage(message)) {
      return {
        mode: "confirm",
        kicker: "发布",
        detail: "确认后将按当前内容执行发布相关操作。",
        cancelLabel: "取消",
        confirmLabel: "确定",
        danger: false,
      };
    }
    return {
      mode: "confirm",
      kicker: "请确认",
      detail: "",
      cancelLabel: "取消",
      confirmLabel: "确定",
      danger: false,
    };
  }

  function ensureStyle() {
    if (document.getElementById("penn-admin-confirm-style")) return;
    var style = document.createElement("style");
    style.id = "penn-admin-confirm-style";
    style.textContent =
      ".penn-admin-confirm{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;}" +
      ".penn-admin-confirm[hidden]{display:none!important;}" +
      ".penn-admin-confirm-scrim{position:absolute;inset:0;border:0;margin:0;padding:0;cursor:pointer;background:rgba(15,23,42,.42);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);}" +
      ".penn-admin-confirm-card{position:relative;z-index:1;width:min(420px,100%);padding:22px 22px 18px;border:1px solid #e2e5ee;border-radius:16px;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04),0 18px 48px rgba(15,23,42,.18);animation:penn-admin-confirm-in .16s ease-out;}" +
      "@keyframes penn-admin-confirm-in{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}" +
      ".penn-admin-confirm-kicker{margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9aa0ad;}" +
      ".penn-admin-confirm-title{margin:0;font-size:17px;font-weight:720;letter-spacing:-.02em;line-height:1.45;color:#1a1b1f;white-space:pre-wrap;}" +
      ".penn-admin-confirm-detail{margin:10px 0 0;font-size:13.5px;line-height:1.55;color:#6b6f7b;}" +
      ".penn-admin-confirm-detail:empty{display:none;}" +
      ".penn-admin-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px;}" +
      ".penn-admin-confirm-btn{appearance:none;min-height:38px;padding:0 16px;border-radius:999px;border:1px solid #e2e5ee;background:#fff;color:#1a1b1f;font-size:13.5px;font-weight:600;cursor:pointer;}" +
      ".penn-admin-confirm-btn:hover{background:#eef1f8;}" +
      ".penn-admin-confirm-btn.is-primary{border-color:#3b5bdb;background:#3b5bdb;color:#fff;box-shadow:0 6px 16px rgba(59,91,219,.18);}" +
      ".penn-admin-confirm-btn.is-primary:hover{filter:brightness(1.05);background:#2f4fc4;}" +
      ".penn-admin-confirm-btn.is-danger{border-color:#b42318;background:#b42318;color:#fff;box-shadow:0 6px 16px rgba(180,35,24,.18);}" +
      ".penn-admin-confirm-btn.is-danger:hover{filter:brightness(1.05);}" +
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
      '<button type="button" class="penn-admin-confirm-scrim" aria-label="关闭" data-penn-confirm="no"></button>' +
      '<div class="penn-admin-confirm-card">' +
      '<p class="penn-admin-confirm-kicker" id="penn-admin-confirm-kicker">Penn Notes</p>' +
      '<p class="penn-admin-confirm-title" id="penn-admin-confirm-title"></p>' +
      '<p class="penn-admin-confirm-detail" id="penn-admin-confirm-detail"></p>' +
      '<div class="penn-admin-confirm-actions">' +
      '<button type="button" class="penn-admin-confirm-btn" data-penn-confirm="no" id="penn-admin-confirm-cancel">取消</button>' +
      '<button type="button" class="penn-admin-confirm-btn is-primary" data-penn-confirm="yes" id="penn-admin-confirm-ok">确定</button>' +
      "</div></div>";
    document.body.appendChild(root);
    return root;
  }

  function closeModal() {
    var root = document.getElementById("penn-admin-confirm");
    if (root) root.hidden = true;
    open = false;
  }

  function showModal(message, mode) {
    var meta = classify(message, mode);
    var root = ensureDom();
    var kicker = root.querySelector("#penn-admin-confirm-kicker");
    var title = root.querySelector("#penn-admin-confirm-title");
    var detail = root.querySelector("#penn-admin-confirm-detail");
    var cancel = root.querySelector("#penn-admin-confirm-cancel");
    var ok = root.querySelector("#penn-admin-confirm-ok");

    if (kicker) kicker.textContent = meta.kicker;
    if (title) title.textContent = String(message || "");
    if (detail) detail.textContent = meta.detail || "";
    if (cancel) {
      cancel.hidden = meta.mode === "alert";
      cancel.textContent = meta.cancelLabel || "取消";
    }
    if (ok) {
      ok.textContent = meta.confirmLabel || "确定";
      ok.classList.toggle("is-danger", !!meta.danger);
      ok.classList.toggle("is-primary", !meta.danger);
    }

    root.hidden = false;
    open = true;
    if (ok) ok.focus();

    return new Promise(function (resolve) {
      function onKey(e) {
        if (e.key === "Escape") {
          e.preventDefault();
          finish(meta.mode === "alert");
        } else if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        }
      }
      function finish(okClick) {
        root.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKey, true);
        closeModal();
        resolve(!!okClick);
      }
      function onClick(e) {
        var btn = e.target.closest("[data-penn-confirm]");
        if (!btn) return;
        var yes = btn.getAttribute("data-penn-confirm") === "yes";
        // alert 只有确定；点遮罩也算关闭
        if (meta.mode === "alert") finish(true);
        else finish(yes);
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

  function resumeClick() {
    var el = pendingClick;
    pendingClick = null;
    if (!el || !document.contains(el)) return false;
    allowOnce = true;
    try {
      el.click();
      return true;
    } catch (_) {
      allowOnce = false;
      return false;
    }
  }

  document.addEventListener(
    "click",
    function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (a) {
        var href = a.getAttribute("href") || "";
        if (href.indexOf("#/") === 0) pendingHash = href;
        else if (href.indexOf("/admin/#/") >= 0) {
          pendingHash = "#" + href.split("#")[1];
        }
      }
      pendingClick =
        (e.target.closest &&
          e.target.closest("button, a, [role='button'], [class*='Button']")) ||
        null;
      clearTimeout(clickClearTimer);
      clickClearTimer = setTimeout(function () {
        pendingClick = null;
      }, 50);
    },
    true
  );

  window.alert = function (message) {
    if (open) return;
    showModal(message, "alert");
  };

  window.confirm = function (message) {
    if (allowOnce) {
      allowOnce = false;
      return true;
    }

    var cached = takeCached(message);
    if (cached !== null) return cached;

    if (open) return false;

    // 离开编辑页
    if (isLeaveMessage(message)) {
      showModal(message).then(function (ok) {
        if (ok) resumeNavigation();
        else pendingHash = null;
      });
      return false;
    }

    // 本地备份：componentDidUpdate 里 confirm()? load : delete
    // 先返回 true 避免误删；用户选择后再 reload 套用
    if (isBackupMessage(message)) {
      showModal(message).then(function (ok) {
        setCached(message, ok);
        location.reload();
      });
      return true;
    }

    // 删除 / 发布 / 其它：先取消，确认后再代点原按钮
    var clickEl = pendingClick;
    showModal(message).then(function (ok) {
      if (!ok) return;
      pendingClick = clickEl;
      if (!resumeClick()) {
        // 找不到按钮时退回缓存 + 刷新（少见）
        setCached(message, true);
        location.reload();
      }
    });
    return false;
  };

  // 保底：极端情况下仍可调原生（调试用）
  window.__pennNativeConfirm = nativeConfirm;
  window.__pennNativeAlert = nativeAlert;
})();
