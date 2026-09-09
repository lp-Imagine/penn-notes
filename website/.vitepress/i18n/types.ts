/** UI 文案 locale（与 html lang / messages 键一致） */
export type UiLocale = "zh-CN" | "zh-TW" | "en";

/** VitePress locales 配置键：root 对应简体 */
export type LocaleKey = "root" | "zh-TW" | "en";

export type MessageTree = {
  skipToContent: string;
  readingTime: (minutes: number) => string;
  focusMode: { enter: string; exit: string };
  backToTop: string;
  sidebarToggle: string;
  navMore: string;
  localeSwitcher: { label: string; zhCN: string; zhTW: string; en: string };
  comments: { title: string; hint: string; ariaLabel: string };
  summary: {
    label: string;
    ariaLabel: string;
    expand: string;
    collapse: string;
  };
  related: { title: string };
  searchFilter: {
    ariaLabel: string;
    all: string;
    notes: string;
    news: string;
    empty: string;
  };
  siteRuntime: {
    badge: string;
    format: (years: number, days: number) => string;
  };
  notFound: {
    title: string;
    quote: string;
    linkLabel: string;
    linkText: string;
  };
  search: {
    buttonText: string;
    buttonAriaLabel: string;
    displayDetails: string;
    resetButtonTitle: string;
    backButtonTitle: string;
    noResultsText: string;
    selectText: string;
    selectKeyAriaLabel: string;
    navigateText: string;
    navigateUpKeyAriaLabel: string;
    navigateDownKeyAriaLabel: string;
    closeText: string;
    closeKeyAriaLabel: string;
  };
  outline: string;
  sidebarMenuLabel: string;
  lastUpdated: string;
  docFooter: { prev: string; next: string };
  returnToTopLabel: string;
  darkModeSwitchLabel: string;
  footer: {
    tagline: string;
    notesRss: string;
    newsRss: string;
  };
  outdateNotice: {
    messagePrev: string;
    messageNext: string;
  };
  nav: {
    home: string;
    catalog: string;
    news: string;
    tags: string;
    topics: string;
    archive: string;
    lists: string;
    collect: string;
    books: string;
    recent: string;
    friends: string;
    categories: string;
    web: string;
    ui: string;
    engineering: string;
    backend: string;
    tech: string;
    agent: string;
    computer: string;
    misc: string;
    sites: string;
    about: string;
  };
};
