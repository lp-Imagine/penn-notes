import type { DefaultTheme } from "vitepress";
import { getMessages, resolveUiLocale } from "./messages";
import type { UiLocale } from "./types";

export type ThemeConfigExtras = {
  base: string;
  sidebar: DefaultTheme.Config["sidebar"];
  /** 与语言无关、由 config 注入的共享块 */
  shared?: Partial<DefaultTheme.Config> & Record<string, unknown>;
};

export function buildNav(locale: UiLocale): DefaultTheme.NavItem[] {
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
        { text: n.interview, link: "https://interview.draftly.cn" },
        { text: n.navSite, link: "https://nav.draftly.cn" },
      ],
    },
    { text: n.about, link: "/about/", activeMatch: "/about/" },
  ];
}

export function buildFooter(
  locale: UiLocale,
  base: string,
): DefaultTheme.Config["footer"] {
  const m = getMessages(locale);
  return {
    message: `<span class="footer-brand">Penn Notes</span><span class="footer-tagline">${m.footer.tagline}</span>`,
    copyright: `<span class="footer-links"><a class="footer-link" href="${base}notes/feed.xml">${m.footer.notesRss}</a><a class="footer-link" href="${base}news/feed.xml">${m.footer.newsRss}</a></span><span class="footer-meta"><span class="footer-runtime" aria-label="${m.siteRuntime.badge}"><span class="footer-runtime-badge">${m.siteRuntime.badge}</span><span class="footer-runtime-value" id="penn-site-runtime">—</span></span><span class="footer-sep" aria-hidden="true">·</span><span class="footer-copy">© 2020-present Penn</span><span class="footer-sep" aria-hidden="true">·</span><a class="footer-beian" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">赣ICP备2026017678号-1</a></span>`,
  };
}

function searchTranslations(locale: UiLocale) {
  const s = getMessages(locale).search;
  return {
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
  };
}

/**
 * 按偏好热更新 themeConfig 中的壳文案（不改 sidebar 文章标题）。
 * 构建期默认简体；客户端 init / 切语言后调用。
 */
export function applyThemeChrome(
  theme: Record<string, unknown>,
  localeInput: UiLocale | string,
  base: string,
): void {
  const locale = resolveUiLocale(
    localeInput === "en" ? "en-US" : String(localeInput),
  );
  const m = getMessages(locale);
  theme.nav = buildNav(locale);
  theme.footer = buildFooter(locale, base);
  theme.notFound = { ...m.notFound };
  theme.outline = { level: [2, 3], label: m.outline };
  theme.sidebarMenuLabel = m.sidebarMenuLabel;
  theme.lastUpdated = { text: m.lastUpdated };
  theme.docFooter = { ...m.docFooter };
  theme.returnToTopLabel = m.returnToTopLabel;
  theme.darkModeSwitchLabel = m.darkModeSwitchLabel;
  const notice = theme.outdateNotice as
    | { messagePrev?: string; messageNext?: string }
    | undefined;
  if (notice) {
    notice.messagePrev = m.outdateNotice.messagePrev;
    notice.messageNext = m.outdateNotice.messageNext;
  }
  const search = theme.search as
    | { options?: { translations?: unknown } }
    | undefined;
  if (search?.options) {
    search.options.translations = searchTranslations(locale);
  }
}

/**
 * 构建期 themeConfig（默认简体；客户端再用 applyThemeChrome 按偏好覆盖壳文案）。
 */
export function buildThemeConfig(
  localeInput: UiLocale | string,
  extras: ThemeConfigExtras,
): DefaultTheme.Config & Record<string, unknown> {
  const locale = resolveUiLocale(
    localeInput === "en" ? "en-US" : localeInput,
  );
  const m = getMessages(locale);

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
        translations: searchTranslations(locale),
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
