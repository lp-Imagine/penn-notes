import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type HeadConfig } from "vitepress";
import sidebar from "./sidebar.generated.mjs";
import newsSidebar from "./sidebar.news.generated.mjs";

const BASE = "/";
const GITHUB_PROFILE = "https://github.com/lp-Imagine";

// 自定义域名 penn-notes.draftly.cn（根路径）；绝对 URL 用于 OG / canonical / favicon
const SITE_URL = "https://penn-notes.draftly.cn";
const ICON_PNG = `${SITE_URL}/pn-favicon-32.png`;
const ICON_ICO = `${SITE_URL}/favicon.ico`;
const ICON_APPLE = `${SITE_URL}/img/pn-apple-touch.png`;

// Umami analytics — set env vars to enable
const UMAMI_URL = process.env.UMAMI_URL || "";
const UMAMI_ID = process.env.UMAMI_WEBSITE_ID || "";

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
  appearance: true, // 默认跟随系统，可手动切换
  // 站内死链直接失败，外链（http/mailto）不拦；同步稿偶发坏链也能在 CI 暴露
  ignoreDeadLinks: [
    /^https?:\/\//,
    /^mailto:/,
  ],
  // ai-article 同步过来的表格偶尔会多出一个尾随空白列（由 convertTable 的 padding 逻辑触发），
  // 在这里把所有内容为空白/只有 &nbsp; 的最后列 cell 删掉，避免下游文章都各自修。
  // 同时包一层 .vp-table-scroll，方便 CSS：铺满 + 列多时横向滚动兼容。
  async transformPageHtml(html) {
    // 末尾空白 cell：标签 + 可含 &nbsp; / 全角空格 / 空白 / 嵌套空标签（strong/em/span/br 等）
    const EMPTY_CELL =
      /<t[hd](?:\s[^>]*)?>(?:&nbsp;|&#160;|&#xa0;|\s|<(?:strong|em|b|i|code|span)\b[^>]*>(?:\s|&nbsp;|&#160;|&#xa0;)*<\/(?:strong|em|b|i|code|span)>|<br\s*\/?>)*<\/t[hd]>\s*$/i;
    return html.replace(
      /<table\b[^>]*>[\s\S]*?<\/table>/g,
      (table) => {
        const cleaned = table.replace(
          /(<tr\b[^>]*>)([\s\S]*?)(<\/tr>)/g,
          (_m, open, inner, close) =>
            EMPTY_CELL.test(inner)
              ? open + inner.replace(EMPTY_CELL, "") + close
              : open + inner + close,
        );
        return `<div class="vp-table-scroll">${cleaned}</div>`;
      },
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
    ["meta", { name: "baidu-site-verification", content: "codeva-6kNoNaHFfB" }],
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
    [
      "meta",
      {
        name: "theme-color",
        media: "(prefers-color-scheme: light)",
        content: "#f5f5f7",
      },
    ],
    [
      "meta",
      {
        name: "theme-color",
        media: "(prefers-color-scheme: dark)",
        content: "#000000",
      },
    ],
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
      "link",
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Penn Notes · 笔记更新",
        href: `${BASE}notes/feed.xml`,
      },
    ],
    ...(UMAMI_URL && UMAMI_ID
      ? [
          [
            "script",
            {
              defer: "",
              "data-website-id": UMAMI_ID,
              src: `${UMAMI_URL}/script.js`,
            },
          ] as HeadConfig,
        ]
      : []),
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
      { text: "标签", link: "/tags/", activeMatch: "/tags/" },
      { text: "归档", link: "/archive/", activeMatch: "/archive/" },
      { text: "JS & 框架", link: "/web/", activeMatch: "/web/" },
      { text: "样式", link: "/ui/", activeMatch: "/ui/" },
      { text: "工具", link: "/tech/", activeMatch: "/tech/" },
      { text: "AI Agent", link: "/agent/", activeMatch: "/agent/" },
      { text: "浏览器", link: "/computer/", activeMatch: "/computer/" },
      { text: "杂项", link: "/misc/", activeMatch: "/misc/" },
      { text: "关于", link: "/about/", activeMatch: "/about/" },
    ],
    sidebar: mergedSidebar,
    socialLinks: [{ icon: "github", link: GITHUB_PROFILE }],
    search: {
      provider: "local",
      options: {
        /* 默认简洁结果；保留详情切换按钮，用户可手动开启正文摘要 */
        detailedView: "auto",
        translations: {
          button: {
            buttonText: "搜索",
            buttonAriaLabel: "搜索",
          },
          modal: {
            displayDetails: "显示正文摘要",
            resetButtonTitle: "清除",
            backButtonTitle: "关闭",
            noResultsText: "未找到与",
            footer: {
              selectText: "选择",
              selectKeyAriaLabel: "回车键",
              navigateText: "移动",
              navigateUpKeyAriaLabel: "上方向键",
              navigateDownKeyAriaLabel: "下方向键",
              closeText: "关闭",
              closeKeyAriaLabel: "Esc 键",
            },
          },
        },
      },
    },
    outline: { level: [2, 3], label: "章节索引" },
    sidebarMenuLabel: "目录",
    lastUpdated: { text: "上次更新" },
    docFooter: { prev: "上一篇", next: "下一篇" },
    returnToTopLabel: "返回顶部",
    darkModeSwitchLabel: "外观",
    footer: {
      message:
        '<span class="footer-brand">Penn Notes</span><span class="footer-tagline">前端学习笔记 · 工程备忘 · AI 动态</span>',
      copyright:
        '<span class="footer-links"><a class="footer-link" href="/notes/feed.xml">笔记 RSS</a><a class="footer-link" href="/news/feed.xml">AI 动态 RSS</a></span><span class="footer-meta"><span class="footer-copy">© 2020-present Penn</span><span class="footer-sep" aria-hidden="true">·</span><a class="footer-beian" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">赣ICP备2026017678号-1</a></span>',
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
