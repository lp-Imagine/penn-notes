import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type HeadConfig } from "vitepress";
import { pennCalloutsPlugin } from "./markdown-callouts";
import { pennBase, pennCanonicalUrl, pennSiteUrl, pennRewriteRootUrlsInHtml } from "../../scripts/penn-base.mjs";
import sidebar from "./sidebar.generated.mjs";
import newsSidebar from "./sidebar.news.generated.mjs";
import musicDefaults from "../data/music.json";
import { buildThemeConfig } from "./i18n/theme-config";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE = pennBase();
const GITHUB_PROFILE = "https://github.com/lp-Imagine";

const SITE_URL = pennSiteUrl();
const ICON_VER = "20260908";
const ICON_SVG = `${SITE_URL}/img/logo.svg?v=${ICON_VER}`;
const ICON_PNG = `${SITE_URL}/pn-favicon-32.png?v=${ICON_VER}`;
const ICON_ICO = `${SITE_URL}/favicon.ico?v=${ICON_VER}`;
const ICON_APPLE = `${SITE_URL}/img/pn-apple-touch.png?v=${ICON_VER}`;

const UMAMI_URL = process.env.UMAMI_URL || "";
const UMAMI_ID = process.env.UMAMI_WEBSITE_ID || "";

const IS_PAGES_BACKUP = BASE.replace(/\/$/, "") === "/penn-notes";
const ASSISTANT_API_BASE = (process.env.ASSISTANT_API_BASE || "").trim();
const ASSISTANT_ENABLED =
  process.env.ASSISTANT_ENABLED === "true" ||
  (!IS_PAGES_BACKUP && process.env.ASSISTANT_ENABLED !== "false");
const ASSISTANT_DEV_TARGET = `http://${process.env.ASSISTANT_HOST || "127.0.0.1"}:${process.env.ASSISTANT_PORT || "8787"}`;

const MUSIC_ENABLED =
  process.env.MUSIC_ENABLED === "true" ||
  (process.env.MUSIC_ENABLED !== "false" && Boolean(musicDefaults.enabled));
const MUSIC_METING_API = (process.env.METING_API || musicDefaults.metingApi || "").trim();
const MUSIC_PLAYLIST_ID = (process.env.MUSIC_PLAYLIST_ID || musicDefaults.id || "").trim();
const MUSIC_SERVER = (process.env.MUSIC_SERVER || musicDefaults.server || "netease").trim();
const MUSIC_TYPE = (process.env.MUSIC_TYPE || musicDefaults.type || "playlist").trim();
const MUSIC_PROVIDER = (
  process.env.MUSIC_PROVIDER ||
  (musicDefaults as { provider?: string }).provider ||
  "meting"
).trim();
const MUSIC_MYHKW_PLAYER_ID = (
  process.env.MUSIC_MYHKW_PLAYER_ID ||
  (musicDefaults as { myhkwPlayerId?: string }).myhkwPlayerId ||
  ""
).trim();

const faviconHeadSnippet = [
  `<link rel="icon" type="image/svg+xml" href="${ICON_SVG}">`,
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

const sharedThemeExtras = {
  socialLinks: [{ icon: "github" as const, link: GITHUB_PROFILE }],
  siteRuntime: {
    since: "2020-01-03",
  },
  assistant: {
    enabled: ASSISTANT_ENABLED,
    apiBase: ASSISTANT_API_BASE,
  },
  music: {
    enabled: MUSIC_ENABLED,
    provider: MUSIC_PROVIDER,
    server: MUSIC_SERVER,
    type: MUSIC_TYPE,
    id: MUSIC_PLAYLIST_ID,
    volume: musicDefaults.volume ?? 0.7,
    order: musicDefaults.order ?? "random",
    loop: musicDefaults.loop ?? "all",
    metingApi: MUSIC_METING_API,
    myhkwPlayerId: MUSIC_MYHKW_PLAYER_ID,
    myhkwMobile: (musicDefaults as { myhkwMobile?: boolean }).myhkwMobile !== false,
    myhkwAutoplay: Boolean((musicDefaults as { myhkwAutoplay?: boolean }).myhkwAutoplay),
    myhkwPosition:
      (musicDefaults as { myhkwPosition?: "l" | "r" }).myhkwPosition === "r" ? "r" : "l",
  },
  giscus: {
    repo: "lp-Imagine/penn-notes",
    repoId: "R_kgDOH7Mqqg",
    category: "Comments",
    categoryId: "DIC_kwDOH7Mqqs4DDyOt",
  },
};

const themeExtras = {
  base: BASE,
  sidebar: mergedSidebar,
  shared: sharedThemeExtras,
};

export default defineConfig({
  title: "Penn Notes",
  base: BASE,
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  ignoreDeadLinks: [
    /^https?:\/\//,
    /^mailto:/,
  ],
  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark-dimmed",
    },
    config(md) {
      pennCalloutsPlugin(md);
    },
  },
  async transformPageHtml(html) {
    const EMPTY_CELL =
      /<t[hd](?:\s[^>]*)?>(?:&nbsp;|&#160;|&#xa0;|\s|<(?:strong|em|b|i|code|span)\b[^>]*>(?:\s|&nbsp;|&#160;|&#xa0;)*<\/(?:strong|em|b|i|code|span)>|<br\s*\/?>)*<\/t[hd]>\s*$/i;
    let out = html.replace(
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
    out = pennRewriteRootUrlsInHtml(out, BASE);
    return out;
  },
  async buildEnd(siteConfig) {
    injectFaviconEarly(siteConfig.outDir);
  },
  vite: {
    server: {
      proxy: {
        "/api/assistant": {
          target: ASSISTANT_DEV_TARGET,
          changeOrigin: true,
        },
        "/api/decap-auth": {
          target: ASSISTANT_DEV_TARGET,
          changeOrigin: true,
        },
        "/api/meting": {
          target: "https://api.injahow.cn",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/meting/, "/meting/"),
        },
      },
    },
  },
  transformHead({ pageData, siteData }) {
    const fm = pageData.frontmatter ?? {};
    const title = pageData.title || fm.title || siteData.title;
    const description =
      fm.description ||
      fm.summary ||
      pageData.description ||
      siteData.description;
    const pageUrl = pennCanonicalUrl(pageData.relativePath);
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
  lang: "zh-CN",
  description:
    "Penn 的技术博客：前端、工程化、后端实践，以及每日 AI 动态。",
  themeConfig: buildThemeConfig("zh-CN", themeExtras),
  head: [
    ["meta", { name: "baidu-site-verification", content: "codeva-6kNoNaHFfB" }],
    [
      "script",
      {},
      `(function(){try{var k='penn-ui-locale';var v=localStorage.getItem(k)||'';if(!v){var m=document.cookie.match(/(?:^|; )penn-ui-locale=([^;]*)/);v=m?decodeURIComponent(m[1]):'';}if(v==='zh-TW'||v==='en'||v==='zh-CN'){document.documentElement.lang=v==='en'?'en':v;document.documentElement.setAttribute('data-ui-locale',v);}}catch(e){}})();`,
    ],
    ["link", { rel: "icon", type: "image/svg+xml", href: ICON_SVG }],
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
        title: "Penn Notes · 文章更新",
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
});
