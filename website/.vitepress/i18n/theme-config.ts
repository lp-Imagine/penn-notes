import type { DefaultTheme } from "vitepress";
import { getMessages, resolveUiLocale } from "./messages";
import type { UiLocale } from "./types";

export type ThemeConfigExtras = {
  base: string;
  sidebar: DefaultTheme.Config["sidebar"];
  /** 与语言无关、由 config 注入的共享块 */
  shared?: Partial<DefaultTheme.Config> & Record<string, unknown>;
};

function buildNav(locale: UiLocale): DefaultTheme.NavItem[] {
  const n = getMessages(locale).nav;
  return [
    { text: n.home, link: "/" },
    {
      text: n.catalog,
      activeMatch: "/news/|/tags/|/archive/|/topics/",
      items: [
        { text: n.news, link: "/news/", activeMatch: "/news/" },
        { text: n.tags, link: "/tags/", activeMatch: "/tags/" },
        { text: n.topics, link: "/topics/", activeMatch: "/topics/" },
        { text: n.archive, link: "/archive/", activeMatch: "/archive/" },
      ],
    },
    {
      text: n.lists,
      activeMatch: "/collect/|/books/|/recent/|/friends/",
      items: [
        { text: n.collect, link: "/collect/", activeMatch: "/collect/" },
        { text: n.books, link: "/books/", activeMatch: "/books/" },
        { text: n.recent, link: "/recent/", activeMatch: "/recent/" },
        { text: n.friends, link: "/friends/", activeMatch: "/friends/" },
      ],
    },
    {
      text: n.categories,
      activeMatch:
        "/web/|/ui/|/engineering/|/backend/|/tech/|/agent/|/computer/|/misc/",
      items: [
        { text: n.web, link: "/web/", activeMatch: "/web/" },
        { text: n.ui, link: "/ui/", activeMatch: "/ui/" },
        { text: n.engineering, link: "/engineering/", activeMatch: "/engineering/" },
        { text: n.backend, link: "/backend/", activeMatch: "/backend/" },
        { text: n.tech, link: "/tech/", activeMatch: "/tech/" },
        { text: n.agent, link: "/agent/", activeMatch: "/agent/" },
        { text: n.computer, link: "/computer/", activeMatch: "/computer/" },
        { text: n.misc, link: "/misc/", activeMatch: "/misc/" },
      ],
    },
    {
      text: n.sites,
      items: [
        { text: "Draftly", link: "https://draftly.cn" },
        { text: "面镜", link: "https://interview.draftly.cn" },
        { text: "导航", link: "https://nav.draftly.cn" },
      ],
    },
    { text: n.about, link: "/about/", activeMatch: "/about/" },
  ];
}

function buildFooter(locale: UiLocale, base: string): DefaultTheme.Config["footer"] {
  const m = getMessages(locale);
  return {
    message: `<span class="footer-brand">Penn Notes</span><span class="footer-tagline">${m.footer.tagline}</span>`,
    copyright: `<span class="footer-links"><a class="footer-link" href="${base}notes/feed.xml">${m.footer.notesRss}</a><a class="footer-link" href="${base}news/feed.xml">${m.footer.newsRss}</a></span><span class="footer-meta"><span class="footer-runtime" aria-label="${m.siteRuntime.badge}"><span class="footer-runtime-badge">${m.siteRuntime.badge}</span><span class="footer-runtime-value" id="penn-site-runtime">—</span></span><span class="footer-sep" aria-hidden="true">·</span><span class="footer-copy">© 2020-present Penn</span><span class="footer-sep" aria-hidden="true">·</span><a class="footer-beian" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">赣ICP备2026017678号-1</a></span>`,
  };
}

/**
 * 按 locale 生成 themeConfig（nav / footer / search / notFound 等）。
 * sidebar 等 extras 由调用方传入；链接无 locale 前缀，由 VitePress 自动加。
 */
export function buildThemeConfig(
  localeInput: UiLocale | string,
  extras: ThemeConfigExtras,
): DefaultTheme.Config & Record<string, unknown> {
  const locale = resolveUiLocale(
    localeInput === "en" ? "en-US" : localeInput,
  );
  const m = getMessages(locale);
  const s = m.search;

  return {
    ...(extras.shared || {}),
    siteTitle: "Penn Notes",
    logo: {
      light: "/img/logo.svg",
      dark: "/img/logo.svg",
      alt: "Penn Notes",
    },
    notFound: { ...m.notFound },
    nav: buildNav(locale),
    sidebar: extras.sidebar,
    search: {
      provider: "local",
      options: {
        detailedView: "auto",
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 5, text: 2, titles: 3 },
          },
        },
        translations: {
          button: {
            buttonText: s.buttonText,
            buttonAriaLabel: s.buttonAriaLabel,
          },
          modal: {
            displayDetails: s.displayDetails,
            resetButtonTitle: s.resetButtonTitle,
            backButtonTitle: s.backButtonTitle,
            noResultsText: s.noResultsText,
            footer: {
              selectText: s.selectText,
              selectKeyAriaLabel: s.selectKeyAriaLabel,
              navigateText: s.navigateText,
              navigateUpKeyAriaLabel: s.navigateUpKeyAriaLabel,
              navigateDownKeyAriaLabel: s.navigateDownKeyAriaLabel,
              closeText: s.closeText,
              closeKeyAriaLabel: s.closeKeyAriaLabel,
            },
          },
        },
      },
    },
    outline: { level: [2, 3], label: m.outline },
    sidebarMenuLabel: m.sidebarMenuLabel,
    lastUpdated: { text: m.lastUpdated },
    docFooter: { ...m.docFooter },
    returnToTopLabel: m.returnToTopLabel,
    darkModeSwitchLabel: m.darkModeSwitchLabel,
    footer: buildFooter(locale, extras.base),
    outdateNotice: {
      limitDays: 1095,
      messagePrev: m.outdateNotice.messagePrev,
      messageNext: m.outdateNotice.messageNext,
    },
  };
}
