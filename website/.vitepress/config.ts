import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type HeadConfig } from "vitepress";
import sidebar from "./sidebar.generated.mjs";
import newsSidebar from "./sidebar.news.generated.mjs";

const BASE = "/penn-notes/";
const GITHUB_PROFILE = "https://github.com/lp-Imagine";

// Absolute URLs: Chrome on GitHub project Pages often ignores late/subpath icon links
// and falls back to https://lp-imagine.github.io/favicon.ico
const ICON_PNG = "https://lp-imagine.github.io/penn-notes/pn-favicon-32.png";
const ICON_ICO = "https://lp-imagine.github.io/penn-notes/favicon.ico";
const ICON_APPLE =
  "https://lp-imagine.github.io/penn-notes/img/pn-apple-touch.png";

// 站点绝对地址（GitHub Pages 部署域名），用于 OG / canonical / JSON-LD
const SITE_URL = "https://lp-imagine.github.io/penn-notes";

const faviconHeadSnippet = [
  `<link rel="icon" href="${ICON_ICO}" sizes="any">`,
  `<link rel="icon" type="image/png" sizes="32x32" href="${ICON_PNG}">`,
  `<link rel="apple-touch-icon" sizes="180x180" href="${ICON_APPLE}">`,
].join("");

function injectFaviconEarly(dir: string) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      injectFaviconEarly(p);
      continue;
    }
    if (!name.endsWith(".html")) continue;
    const html = readFileSync(p, "utf8");
    if (html.includes('data-penn-favicon="1"')) continue;
    if (!/<head>/i.test(html)) continue;
    const snippet = faviconHeadSnippet.replace(
      "<link ",
      '<link data-penn-favicon="1" ',
    );
    writeFileSync(p, html.replace(/<head>/i, `<head>${snippet}`));
  }
}

const mergedSidebar = {
  ...sidebar,
  ...newsSidebar,
};

export default defineConfig({
  title: "Penn Notes",
  description:
    "Penn 的前端笔记：JavaScript、Vue、React、CSS、Git 等学习与总结。",
  lang: "zh-CN",
  base: BASE,
  cleanUrls: true,
  lastUpdated: true,
  appearance: "dark",
  // 站内死链直接失败，外链（http/mailto）不拦；同步稿偶发坏链也能在 CI 暴露
  ignoreDeadLinks: [
    /^https?:\/\//,
    /^mailto:/,
  ],
  // ai-article 同步过来的表格偶尔会多出一个尾随空白列（由 convertTable 的 padding 逻辑触发），
  // 在这里把所有内容为空白/只有 &nbsp; 的最后列 cell 删掉，避免下游文章都各自修。
  async transformPageHtml(html) {
    // 末尾空白 cell：标签 + 可含 &nbsp; / 全角空格 / 空白 / 嵌套空标签（strong/em/span/br 等）
    const EMPTY_CELL =
      /<t[hd](?:\s[^>]*)?>(?:&nbsp;|&#160;|&#xa0;|\s|<(?:strong|em|b|i|code|span)\b[^>]*>(?:\s|&nbsp;|&#160;|&#xa0;)*<\/(?:strong|em|b|i|code|span)>|<br\s*\/?>)*<\/t[hd]>\s*$/i;
    return html.replace(
      /<table\b[^>]*>[\s\S]*?<\/table>/g,
      (table) =>
        table.replace(
          /(<tr\b[^>]*>)([\s\S]*?)(<\/tr>)/g,
          (_m, open, inner, close) =>
            EMPTY_CELL.test(inner)
              ? open + inner.replace(EMPTY_CELL, "") + close
              : open + inner + close,
        ),
    );
  },
  // Post-process built HTML so icons sit at the very start of <head>
  async buildEnd(siteConfig) {
    injectFaviconEarly(siteConfig.outDir);
  },
  // 每页注入 OG / Twitter / JSON-LD（微信/Google 分享卡片）
  transformHead({ pageData, siteData }) {
    const fm = pageData.frontmatter ?? {};
    const title = pageData.title || fm.title || siteData.title;
    const description =
      fm.description ||
      fm.summary ||
      pageData.description ||
      siteData.description;
    const rel = pageData.relativePath
      .replace(/\.md$/, "")
      .replace(/^index$/, "");
    const pageUrl = SITE_URL + "/" + rel;
    const image = (fm.cover ? SITE_URL + fm.cover : null) || ICON_PNG;
    const head: HeadConfig[] = [
      ["meta", { property: "og:type", content: "article" }],
      ["meta", { property: "og:site_name", content: "Penn Notes" }],
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: description }],
      ["meta", { property: "og:url", content: pageUrl }],
      ["meta", { property: "og:image", content: image }],
      ["meta", { name: "twitter:card", content: "summary_large_image" }],
      ["meta", { name: "twitter:title", content: title }],
      ["meta", { name: "twitter:description", content: description }],
      ["meta", { name: "twitter:image", content: image }],
      ["link", { rel: "canonical", href: pageUrl }],
    ];
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      mainEntityOfPage: pageUrl,
      author: { "@type": "Person", name: "Penn", url: GITHUB_PROFILE },
      publisher: { "@type": "Organization", name: "Penn Notes" },
      image,
    };
    if (fm.date) {
      ld.datePublished = String(fm.date);
      ld.dateModified = String(fm.date);
    }
    head.push(["script", { type: "application/ld+json" }, JSON.stringify(ld)]);
    return head;
  },
  head: [
    ["link", { rel: "icon", href: ICON_ICO, sizes: "any" }],
    [
      "link",
      { rel: "icon", type: "image/png", sizes: "32x32", href: ICON_PNG },
    ],
    [
      "link",
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: ICON_APPLE,
      },
    ],
    ["meta", { name: "theme-color", content: "#000000" }],
    [
      "link",
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Penn Notes · AI 动态",
        href: `${BASE}news/feed.xml`,
      },
    ],
    [
      "script",
      {},
      `(function(){try{var k='vitepress-theme-appearance',v=localStorage.getItem(k);if(!v||v==='auto')localStorage.setItem(k,'dark')}catch(e){}})()`,
    ],
  ],
  themeConfig: {
    siteTitle: "Penn Notes",
    logo: {
      light: "/img/logo.svg",
      dark: "/img/logo.svg",
      alt: "Penn Notes",
    },
    notFound: {
      title: "页面不存在",
      quote: "该页面不存在或链接已失效。",
      linkLabel: "返回首页",
      linkText: "返回首页",
    },
    nav: [
      { text: "首页", link: "/" },
      { text: "AI 动态", link: "/news/", activeMatch: "/news/" },
      { text: "JS & 框架", link: "/web/", activeMatch: "/web/" },
      { text: "样式", link: "/ui/", activeMatch: "/ui/" },
      { text: "工具", link: "/tech/", activeMatch: "/tech/" },
      { text: "浏览器", link: "/computer/", activeMatch: "/computer/" },
      { text: "AI Agent", link: "/agent/", activeMatch: "/agent/" },
      { text: "杂项", link: "/misc/", activeMatch: "/misc/" },
      { text: "关于", link: "/about/", activeMatch: "/about/" },
    ],
    sidebar: mergedSidebar,
    socialLinks: [{ icon: "github", link: GITHUB_PROFILE }],
    search: { provider: "local" },
    outline: { level: [2, 3], label: "章节索引" },
    sidebarMenuLabel: "目录",
    lastUpdated: { text: "上次更新" },
    docFooter: { prev: "上一篇", next: "下一篇" },
    returnToTopLabel: "返回顶部",
    footer: {
      message: "Penn Notes · 前端学习笔记",
      copyright: "© 2020-present Penn · 记录前端路上的思考",
    },
    // 文章评论（giscus，基于 GitHub Discussions）
    // 启用步骤：仓库 Settings → Features → 开启 Discussions →
    // 访问 https://giscus.app 按提示安装 giscus App 并配置 →
    // 把生成的 data-repo-id / data-category-id 填到下面，即可生效
    giscus: {
      repo: "lp-Imagine/penn-notes",
      repoId: "R_kgDOH7Mqqg",
      category: "Announcements",
      categoryId: "DIC_kwDOH7Mqqs4DDyOt",
    },
  },
});
