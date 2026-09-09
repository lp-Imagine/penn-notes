import type { MessageTree, UiLocale } from "./types";

export type { MessageTree, UiLocale };

const zhCN: MessageTree = {
  skipToContent: "跳到正文",
  readingTime: (m) => `约 ${m} 分钟读完`,
  focusMode: { enter: "沉浸式阅读", exit: "退出沉浸式阅读" },
  backToTop: "回到顶部",
  sidebarToggle: "收起/展开左侧菜单",
  navMore: "更多导航",
  localeSwitcher: {
    label: "切换语言",
    zhCN: "简体",
    zhTW: "繁體",
    en: "EN",
  },
  comments: {
    title: "评论",
    hint: "使用 GitHub 账号登录后即可留言；需能正常访问 GitHub。",
    ariaLabel: "评论",
  },
  summary: {
    label: "速览",
    ariaLabel: "文章速览",
    expand: "展开",
    collapse: "收起",
  },
  related: { title: "相关阅读" },
  searchFilter: {
    ariaLabel: "按栏目筛选搜索结果",
    all: "全部",
    notes: "笔记",
    news: "AI 动态",
    empty: "当前筛选下没有结果，试试「全部」或其它栏目",
  },
  siteRuntime: {
    badge: "安全运行",
    format: (y, d) => `${y} 年 ${d} 天`,
  },
  notFound: {
    title: "页面不存在",
    quote: "该页面不存在或链接已失效。",
    linkLabel: "返回首页",
    linkText: "返回首页",
  },
  search: {
    buttonText: "搜索笔记 / 动态",
    buttonAriaLabel: "搜索笔记与 AI 动态",
    displayDetails: "显示正文摘要",
    resetButtonTitle: "清除",
    backButtonTitle: "关闭",
    noResultsText: "未找到与",
    selectText: "选择",
    selectKeyAriaLabel: "回车键",
    navigateText: "移动",
    navigateUpKeyAriaLabel: "上方向键",
    navigateDownKeyAriaLabel: "下方向键",
    closeText: "关闭",
    closeKeyAriaLabel: "Esc 键",
  },
  outline: "章节索引",
  sidebarMenuLabel: "目录",
  lastUpdated: "上次更新",
  docFooter: { prev: "上一篇", next: "下一篇" },
  returnToTopLabel: "返回顶部",
  darkModeSwitchLabel: "外观",
  footer: {
    tagline: "认真生活，随便折腾",
    notesRss: "文章 RSS",
    newsRss: "AI 动态 RSS",
  },
  outdateNotice: {
    messagePrev: "本文距上次更新已过",
    messageNext: "天，内容可能已过时，请以最新文档为准。",
  },
  nav: {
    home: "首页",
    catalog: "目录",
    news: "AI 动态",
    tags: "标签",
    topics: "阅读路径",
    archive: "归档",
    lists: "清单",
    collect: "收藏",
    books: "书单",
    recent: "近况",
    friends: "友链动态",
    categories: "分类",
    web: "JS & 框架",
    ui: "样式",
    engineering: "工程化",
    backend: "后端",
    tech: "工具",
    agent: "AI Agent",
    computer: "浏览器",
    misc: "杂项",
    sites: "小站",
    about: "关于",
  },
};

const zhTW: MessageTree = {
  skipToContent: "跳到正文",
  readingTime: (m) => `約 ${m} 分鐘讀完`,
  focusMode: { enter: "沉浸式閱讀", exit: "退出沉浸式閱讀" },
  backToTop: "回到頂部",
  sidebarToggle: "收合/展開左側選單",
  navMore: "更多導覽",
  localeSwitcher: {
    label: "切換語言",
    zhCN: "简体",
    zhTW: "繁體",
    en: "EN",
  },
  comments: {
    title: "評論",
    hint: "使用 GitHub 帳號登入後即可留言；需能正常存取 GitHub。",
    ariaLabel: "評論",
  },
  summary: {
    label: "速覽",
    ariaLabel: "文章速覽",
    expand: "展開",
    collapse: "收合",
  },
  related: { title: "相關閱讀" },
  searchFilter: {
    ariaLabel: "依欄目篩選搜尋結果",
    all: "全部",
    notes: "筆記",
    news: "AI 動態",
    empty: "目前篩選下沒有結果，試試「全部」或其它欄目",
  },
  siteRuntime: {
    badge: "安全運行",
    format: (y, d) => `${y} 年 ${d} 天`,
  },
  notFound: {
    title: "頁面不存在",
    quote: "該頁面不存在或連結已失效。",
    linkLabel: "返回首頁",
    linkText: "返回首頁",
  },
  search: {
    buttonText: "搜尋筆記 / 動態",
    buttonAriaLabel: "搜尋筆記與 AI 動態",
    displayDetails: "顯示正文摘要",
    resetButtonTitle: "清除",
    backButtonTitle: "關閉",
    noResultsText: "找不到與",
    selectText: "選擇",
    selectKeyAriaLabel: "Enter 鍵",
    navigateText: "移動",
    navigateUpKeyAriaLabel: "上方向鍵",
    navigateDownKeyAriaLabel: "下方向鍵",
    closeText: "關閉",
    closeKeyAriaLabel: "Esc 鍵",
  },
  outline: "章節索引",
  sidebarMenuLabel: "目錄",
  lastUpdated: "上次更新",
  docFooter: { prev: "上一篇", next: "下一篇" },
  returnToTopLabel: "返回頂部",
  darkModeSwitchLabel: "外觀",
  footer: {
    tagline: "認真生活，隨便折騰",
    notesRss: "文章 RSS",
    newsRss: "AI 動態 RSS",
  },
  outdateNotice: {
    messagePrev: "本文距上次更新已過",
    messageNext: "天，內容可能已過時，請以最新文件為準。",
  },
  nav: {
    home: "首頁",
    catalog: "目錄",
    news: "AI 動態",
    tags: "標籤",
    topics: "閱讀路徑",
    archive: "歸檔",
    lists: "清單",
    collect: "收藏",
    books: "書單",
    recent: "近況",
    friends: "友鏈動態",
    categories: "分類",
    web: "JS & 框架",
    ui: "樣式",
    engineering: "工程化",
    backend: "後端",
    tech: "工具",
    agent: "AI Agent",
    computer: "瀏覽器",
    misc: "雜項",
    sites: "小站",
    about: "關於",
  },
};

const en: MessageTree = {
  skipToContent: "Skip to content",
  readingTime: (m) => `${m} min read`,
  focusMode: { enter: "Focus mode", exit: "Exit focus mode" },
  backToTop: "Back to top",
  sidebarToggle: "Collapse/expand sidebar",
  navMore: "More navigation",
  localeSwitcher: {
    label: "Switch language",
    zhCN: "简体",
    zhTW: "繁體",
    en: "EN",
  },
  comments: {
    title: "Comments",
    hint: "Sign in with GitHub to leave a comment. GitHub access is required.",
    ariaLabel: "Comments",
  },
  summary: {
    label: "Summary",
    ariaLabel: "Article summary",
    expand: "Expand",
    collapse: "Collapse",
  },
  related: { title: "Related" },
  searchFilter: {
    ariaLabel: "Filter search results by section",
    all: "All",
    notes: "Notes",
    news: "AI News",
    empty: "No results for this filter — try All or another section",
  },
  siteRuntime: {
    badge: "Uptime",
    format: (y, d) => `${y}y ${d}d`,
  },
  notFound: {
    title: "Page not found",
    quote: "This page does not exist or the link is broken.",
    linkLabel: "Back to home",
    linkText: "Back to home",
  },
  search: {
    buttonText: "Search notes / news",
    buttonAriaLabel: "Search notes and AI news",
    displayDetails: "Show article excerpt",
    resetButtonTitle: "Clear",
    backButtonTitle: "Close",
    noResultsText: "No results for",
    selectText: "to select",
    selectKeyAriaLabel: "Enter",
    navigateText: "to navigate",
    navigateUpKeyAriaLabel: "Up arrow",
    navigateDownKeyAriaLabel: "Down arrow",
    closeText: "to close",
    closeKeyAriaLabel: "Escape",
  },
  outline: "On this page",
  sidebarMenuLabel: "Menu",
  lastUpdated: "Last updated",
  docFooter: { prev: "Previous", next: "Next" },
  returnToTopLabel: "Return to top",
  darkModeSwitchLabel: "Appearance",
  footer: {
    tagline: "Live earnestly, tinker freely",
    notesRss: "Notes RSS",
    newsRss: "AI News RSS",
  },
  outdateNotice: {
    messagePrev: "This article was last updated",
    messageNext: "days ago and may be outdated. Please verify against current docs.",
  },
  nav: {
    home: "Home",
    catalog: "Browse",
    news: "AI News",
    tags: "Tags",
    topics: "Paths",
    archive: "Archive",
    lists: "Lists",
    collect: "Bookmarks",
    books: "Books",
    recent: "Recent",
    friends: "Friends",
    categories: "Topics",
    web: "JS & Frameworks",
    ui: "UI / CSS",
    engineering: "Engineering",
    backend: "Backend",
    tech: "Tools",
    agent: "AI Agent",
    computer: "Browser",
    misc: "Misc",
    sites: "Sites",
    about: "About",
  },
};

export const messages: Record<UiLocale, MessageTree> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  en,
};

/** 将 VitePress `lang` / html lang 归一到 UI locale */
export function resolveUiLocale(lang?: string): UiLocale {
  const raw = (lang || "").toLowerCase();
  if (raw.startsWith("zh-tw") || raw.includes("hant")) return "zh-TW";
  if (raw.startsWith("en")) return "en";
  return "zh-CN";
}

export function getMessages(lang?: string): MessageTree {
  return messages[resolveUiLocale(lang)];
}

/** 非 Vue 场景（theme setup / DOM 脚本）取文案 */
export function getUiText(lang?: string): MessageTree {
  return getMessages(lang);
}

export function dateLocaleForLang(lang?: string): string {
  const ui = resolveUiLocale(lang);
  if (ui === "zh-TW") return "zh-TW";
  if (ui === "en") return "en-US";
  return "zh-CN";
}
