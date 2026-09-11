/**
 * Decap 自定义预览：按博客笔记文头还原（封面 hero / meta / 摘要 / 正文）
 * 依赖 CDN 暴露的 CMS / createClass / h
 */
(function () {
  var COLLECTIONS = [
    "web",
    "ui",
    "engineering",
    "backend",
    "tech",
    "computer",
    "agent",
    "misc",
  ];

  var GROUP_LABELS = {
    javascript: "JavaScript",
    vue: "Vue",
    react: "React",
    "ui-lib": "UI 组件",
    html: "HTML",
    css: "CSS",
    toolchain: "工具链",
    npm: "npm",
    git: "Git",
    nodejs: "Node.js",
    mysql: "MySQL",
    github: "GitHub",
    docs: "文档",
    browser: "浏览器",
    prompts: "Prompts",
    practice: "实践",
    essays: "随笔",
    misc: "其它",
  };

  function asText(value) {
    if (value == null) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number") return String(value);
    if (typeof value.toISOString === "function") {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value.format === "function") {
      try {
        return value.format("YYYY-MM-DD");
      } catch (_) {
        /* ignore */
      }
    }
    return String(value).trim();
  }

  function formatDate(value) {
    var raw = asText(value);
    if (!raw) return "";
    var m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    var d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      var y = d.getFullYear();
      var mo = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return y + "-" + mo + "-" + day;
    }
    return raw.slice(0, 10);
  }

  function getTags(entry) {
    var tags = entry.getIn(["data", "tags"]);
    if (!tags) return [];
    if (typeof tags.toJS === "function") tags = tags.toJS();
    if (!Array.isArray(tags)) return [];
    return tags
      .map(function (t) {
        return asText(t);
      })
      .filter(Boolean);
  }

  function assetUrl(getAsset, path) {
    if (!path) return "";
    try {
      var asset = getAsset(path);
      if (!asset) return String(path);
      return typeof asset.toString === "function" ? asset.toString() : String(asset);
    } catch (_) {
      return String(path);
    }
  }

  function metaChildren(dateStr, tags, groupLabel, draft) {
    var nodes = [];
    if (dateStr) {
      nodes.push(h("time", { dateTime: dateStr, key: "time" }, dateStr));
    }
    tags.forEach(function (tag, i) {
      nodes.push(h("span", { className: "article-tag", key: "tag-" + i }, tag));
    });
    if (groupLabel) {
      nodes.push(h("span", { className: "article-group", key: "group" }, groupLabel));
    }
    if (draft) {
      nodes.push(h("span", { className: "draft-badge", key: "draft" }, "草稿"));
    }
    return nodes;
  }

  var NotePreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var title = asText(entry.getIn(["data", "title"])) || "未命名笔记";
      var dateStr = formatDate(entry.getIn(["data", "date"]));
      var summary = asText(entry.getIn(["data", "summary"]));
      var group = asText(entry.getIn(["data", "group"]));
      var groupLabel = GROUP_LABELS[group] || group;
      var draft = !!entry.getIn(["data", "draft"]);
      var tags = getTags(entry);
      var coverPath = entry.getIn(["data", "cover"]);
      var coverSrc = assetUrl(getAsset, coverPath);
      var hasCover = !!coverSrc;
      var body = this.props.widgetFor("body");

      var header = hasCover
        ? h(
            "div",
            { className: "article-hero", key: "hero" },
            h("img", {
              className: "article-cover",
              src: coverSrc,
              alt: "「" + title + "」封面",
            }),
            h(
              "div",
              { className: "article-hero-copy" },
              h("h1", null, title),
              h(
                "p",
                { className: "article-meta" },
                metaChildren(dateStr, tags, groupLabel, draft)
              )
            )
          )
        : h(
            "div",
            { className: "article-plain", key: "plain" },
            h("h1", { className: "article-plain-title" }, title),
            h(
              "p",
              { className: "article-plain-meta" },
              metaChildren(dateStr, tags, groupLabel, draft)
            )
          );

      var summaryBlock = summary
        ? h(
            "aside",
            { className: "article-summary", key: "summary", "aria-label": "文章摘要" },
            h("p", { className: "article-summary-label" }, "速览"),
            h("p", { className: "article-summary-text" }, summary)
          )
        : null;

      var bodyBlock = body
        ? h("div", { className: "penn-preview-body", key: "body" }, body)
        : h(
            "p",
            { className: "penn-preview-empty", key: "empty" },
            "正文预览会出现在这里"
          );

      var className =
        "penn-preview note-article" +
        (hasCover ? " has-cover" : "") +
        (summary ? " has-summary" : "");

      return h(
        "div",
        { className: className },
        h("article", { className: "vp-doc" }, header, summaryBlock, bodyBlock)
      );
    },
  });

  CMS.registerPreviewStyle("/admin/preview.css?v=20260911c");
  COLLECTIONS.forEach(function (name) {
    CMS.registerPreviewTemplate(name, NotePreview);
  });
})();
