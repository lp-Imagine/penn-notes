/**
 * Decap Code 小部件设置侧栏：官方写死英文，locale 盖不到，这里做文案替换。
 */
(function () {
  var map = {
    "Field Settings": "字段设置",
    "Global Settings": "全局设置",
    Mode: "语言",
    Theme: "主题",
    KeyMap: "快捷键",
  };

  function isTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    var cls = el.getAttribute("class") || "";
    return (
      cls.indexOf("SettingsSectionTitle") !== -1 ||
      cls.indexOf("SettingsFieldLabel") !== -1
    );
  }

  function translate(el) {
    if (!isTarget(el)) return;
    var text = (el.textContent || "").trim();
    if (map[text]) el.textContent = map[text];
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    root
      .querySelectorAll(
        '[class*="-SettingsSectionTitle"], [class*="-SettingsFieldLabel"]'
      )
      .forEach(translate);
  }

  var mo = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var nodes = mutations[i].addedNodes;
      for (var j = 0; j < nodes.length; j++) {
        var n = nodes[j];
        if (n.nodeType !== 1) continue;
        translate(n);
        scan(n);
      }
    }
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
