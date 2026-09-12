import type { UiLocale } from "./types";

/** 页面壳层文案（正文 Markdown 除外） */
export type PageMessages = {
  common: {
    all: string;
    loading: string;
    loadMore: string;
    loadedAll: (n: number) => string;
    readMore: string;
    articleCount: (n: number) => string;
    pieceCount: (n: number) => string;
    unknown: string;
    copy: string;
    copied: string;
  };
  home: {
    tagline: string;
    sub: (total: number) => string;
    readLatest: string;
    todayNews: string;
    browseAria: string;
    latestNotes: string;
    viewMore: string;
    latestNews: string;
    allNews: string;
    emptyNotes: string;
    newsEmptyPrefix: string;
    goSection: string;
  };
  section: {
    kicker: string;
    count: (n: number) => string;
    groupCount: (n: number) => string;
  };
  archive: {
    shownCount: (total: number, shown: number) => string;
    month: (m: number) => string;
  };
  tags: {
    filterAria: string;
    moreTags: (n: number) => string;
    collapseTags: string;
    stats: (notes: number, tags: number, tagged: number) => string;
    emptyTitle: string;
    emptyDesc: string;
  };
  topics: {
    filterAria: string;
    stats: (paths: number, articles: number) => string;
  };
  series: {
    aria: string;
    label: string;
  };
  news: {
    filterAria: string;
    emptyTitle: string;
    emptyDesc: string;
    emptySection: (name: string) => string;
    loadedAllItems: (n: number) => string;
    countItems: (n: number) => string;
    digestTitle: string;
    digestDesc: string;
    digestCount: (n: number) => string;
    latestDigest: string;
    readDigest: string;
    recent: string;
    byMonth: string;
    dateFull: (y: number, m: number, d: number) => string;
    rssTitle: string;
    rssCopied: string;
    rssCopyAria: string;
    rssHint: string;
    readOriginal: string;
    emptyDay: string;
    sections: {
      all: string;
      industry: string;
      product: string;
      model: string;
      opensource: string;
      tools: string;
      frontend: string;
    };
  };
  friends: {
    kicker: string;
    title: string;
    lead: string;
    empty: string;
    emptyHint: string;
    stats: (items: number, feeds: number) => string;
    updatedAt: (time: string) => string;
    viewAll: string;
  };
  aboutFriends: {
    title: string;
    lead: string;
    swapTitle: string;
    swapLead: string;
    copySite: string;
  };
  recent: {
    title: string;
    lead: string;
    count: (n: number) => string;
    goNews: string;
    goArchive: string;
    bannerHtml: string;
    bannerBefore: string;
    bannerAfter: string;
    footerBefore: string;
    footerMid: string;
    footerAfter: string;
    tagManual: string;
    tagNews: string;
    newsPicks: (headlinesJoined: string, extra: string) => string;
    newsUpdated: string;
    readDigest: string;
    etcN: (n: number) => string;
  };
  music: {
    aria: string;
    loading: string;
    unavailable: string;
    unknownArtist: string;
    capsule: string;
    tapCover: string;
    play: string;
    pause: string;
    prev: string;
    next: string;
    expand: string;
    dock: string;
    expandList: string;
    collapseList: string;
    skipNotice: string;
    removeNotice: (name: string) => string;
    rateLimited: string;
    timeout: string;
  };
  assistant: {
    name: string;
    tagline: string;
    fab: string;
    close: string;
    clear: string;
    share: string;
    copied: string;
    expand: string;
    shrink: string;
    send: string;
    stop: string;
    placeholder: string;
    voice: string;
    reading: string;
    explain: string;
    summarize: string;
    clearSelection: string;
    waiting: string;
    useful: string;
    inaccurate: string;
    submit: string;
    sources: (n: number) => string;
    jump: string;
    emptyHint: string;
    confirmClear: string;
    confirmOk: string;
    confirmCancel: string;
    fontSize: string;
    fontSmaller: string;
    fontLarger: string;
    copyAnswer: string;
    exportCard: string;
    exported: string;
    exportTitle: string;
    feedbackUpDone: string;
    feedbackDownDone: string;
    feedbackPlaceholder: string;
    openSource: string;
    open: string;
    listening: string;
    sendHint: string;
    disclaimer: string;
    resize: string;
    pageSwitched: string;
    pageSwitchedTo: (label: string) => string;
    currentPrefix: string;
    firstUse: string;
    home: string;
    currentPage: string;
    copyFail: string;
    exportFail: string;
    exportUnsupported: string;
    voiceFail: string;
    restoredChat: string;
    stopped: string;
    askPrefix: string;
    answerSuffix: string;
  };
  code: {
    expandAll: (n: number) => string;
    collapse: string;
    toggleAria: string;
  };
  books: {
    kicker: string;
    lead: string;
    countAll: (total: number, done: number, reading: number, plan: number) => string;
    countFiltered: (shown: number, statusLabel: string, total: number) => string;
    filterAria: string;
    done: string;
    reading: string;
    plan: string;
    toCollect: string;
    toRecent: string;
    published: string;
    stars: (n: number) => string;
    note: string;
    noteBefore: string;
    leaveComment: string;
    noteAfter: string;
  };
  collect: {
    kicker: string;
    lead: string;
    count: (links: number, groups: number) => string;
    browseNotes: string;
    aboutFeedback: string;
  };
  about: {
    role: string;
    intro: string;
    browseNotes: string;
    skillsTitle: string;
    skillFrontend: string;
    skillFrontendDesc: string;
    skillEng: string;
    skillEngDesc: string;
    skillBackend: string;
    skillBackendDesc: string;
    placesTitle: string;
    placesDesc: string;
    newsDesc: string;
    draftlyDesc: string;
    writeNotesDesc: string;
    interviewDesc: string;
    navDesc: string;
    collectDesc: string;
    booksDesc: string;
    recentDesc: string;
    notesRssDesc: string;
    newsRssDesc: string;
    webDesc: string;
    engDesc: string;
    backendDesc: string;
    uiDesc: string;
    githubDesc: string;
  };
  pageHero: {
    archiveKicker: string;
    archiveTitle: string;
    archiveLead: string;
    tagsKicker: string;
    tagsTitle: string;
    tagsLead: string;
    topicsKicker: string;
    topicsTitle: string;
    topicsLead: string;
    newsKicker: string;
    newsTitle: string;
    newsLead: string;
    newsMeta: (items: number, digests: number) => string;
    newsJumpAria: string;
    newsDigests: string;
    newsFeed: string;
    newsFeedDesc: string;
  };
  sectionDescs: {
    web: string;
    ui: string;
    engineering: string;
    backend: string;
    tech: string;
    computer: string;
    agent: string;
    misc: string;
  };
};

const zhCN: PageMessages = {
  common: {
    all: "全部",
    loading: "加载中…",
    loadMore: "继续下滑加载更多",
    loadedAll: (n) => `已加载全部 ${n} 篇`,
    readMore: "阅读全文",
    articleCount: (n) => `${n} 篇`,
    pieceCount: (n) => `${n} 条`,
    unknown: "未知",
    copy: "复制",
    copied: "已复制",
  },
  home: {
    tagline: "认真生活，随便折腾",
    sub: (total) => `积跬步以至千里 · 共 ${total} 篇文章`,
    readLatest: "阅读最新文章",
    todayNews: "今日 AI 动态",
    browseAria: "浏览栏目",
    latestNotes: "最新文章",
    viewMore: "查看更多",
    latestNews: "最新动态",
    allNews: "全部动态",
    emptyNotes: "暂无文章",
    newsEmptyPrefix: "AI 动态每天 7:00 左右更新 · ",
    goSection: "前往栏目",
  },
  section: {
    kicker: "栏目",
    count: (n) => `共 ${n} 篇文章`,
    groupCount: (n) => `${n} 篇文章`,
  },
  archive: {
    shownCount: (total, shown) => `共 ${total} 篇，已显示 ${shown} 篇`,
    month: (m) => `${m} 月`,
  },
  tags: {
    filterAria: "标签筛选",
    moreTags: (n) => `更多标签 ${n}`,
    collapseTags: "收起标签",
    stats: (notes, tags, tagged) =>
      `${notes} 篇 · ${tags} 标签 · ${tagged} 篇已标注`,
    emptyTitle: "暂无匹配文章",
    emptyDesc: "试试切换其他标签",
  },
  topics: {
    filterAria: "系列筛选",
    stats: (paths, articles) => `${paths} 条阅读路径 · ${articles} 篇文章`,
  },
  series: {
    aria: "系列导航",
    label: "系列 ·",
  },
  news: {
    filterAria: "栏目筛选",
    emptyTitle: "暂无动态",
    emptyDesc: "每天早上 7:00 左右自动更新，稍后再来看看。",
    emptySection: (name) => `「${name}」栏目暂无内容，试试切换其他栏目。`,
    loadedAllItems: (n) => `已加载全部 ${n} 条`,
    countItems: (n) => `${n} 条`,
    digestTitle: "日报归档",
    digestDesc: "按期查阅每日精选",
    digestCount: (n) => `${n} 期`,
    latestDigest: "最新一期",
    readDigest: "阅读完整日报 →",
    recent: "近期",
    byMonth: "按月查阅",
    dateFull: (y, m, d) => `${y} 年 ${m} 月 ${d} 日`,
    rssTitle: "RSS 订阅",
    rssCopied: "已复制订阅地址",
    rssCopyAria: "复制 RSS 地址",
    rssHint: "点击复制地址，粘贴到 Feedly 等阅读器",
    readOriginal: "阅读原文",
    emptyDay: "（本日无新条目）",
    sections: {
      all: "全部",
      industry: "业界",
      product: "产品",
      model: "模型",
      opensource: "开源",
      tools: "开发者工具",
      frontend: "前端",
    },
  },
  friends: {
    kicker: "Friends",
    title: "友链动态",
    lead: "订阅友链站点的最近更新，和本站一起逛逛。",
    empty: "暂时还没有拉取到友链文章。",
    emptyHint: "构建时会自动同步订阅源，稍后再来看看。",
    stats: (items, feeds) => `最近 ${items} 条 · ${feeds} 个订阅源`,
    updatedAt: (time) => `更新于 ${time}（缓存）`,
    viewAll: "查看全部友链",
  },
  aboutFriends: {
    title: "友情链接",
    lead: "一些常逛的博客与站点",
    swapTitle: "互换友链",
    swapLead: "欢迎互换友链，复制站点信息后发我。",
    copySite: "复制站点信息",
  },
  recent: {
    title: "近况",
    lead: "碎碎念与站内动态摘要",
    count: (n) => `共 ${n} 条`,
    goNews: "去看 AI 动态",
    goArchive: "浏览文章归档",
    bannerHtml:
      "<strong>AI 动态</strong>日报会自动出现在时间线里；站点碎碎念仍手写。全文请看 AI 动态。",
    bannerBefore: "日报会自动出现在时间线里；站点碎碎念仍手写。全文请看 ",
    bannerAfter: "。",
    footerBefore: "追每日资讯 → ",
    footerMid: " · 读长文 → ",
    footerAfter: "",
    tagManual: "碎碎念",
    tagNews: "AI 动态",
    newsPicks: (headlinesJoined, extra) =>
      `今日精选：${headlinesJoined}${extra}。`,
    newsUpdated: "AI 动态日报已更新。",
    readDigest: "阅读日报",
    etcN: (n) => ` 等 ${n} 条`,
  },
  music: {
    aria: "音乐胶囊",
    loading: "加载中",
    unavailable: "暂不可用",
    unknownArtist: "未知艺人",
    capsule: "音乐胶囊",
    tapCover: "点击封面播放",
    play: "播放",
    pause: "暂停",
    prev: "上一首",
    next: "下一首",
    expand: "展开胶囊",
    dock: "收起贴边",
    expandList: "展开列表",
    collapseList: "收起列表",
    skipNotice: "该曲暂无法播放（版权/会员限制），已跳过",
    removeNotice: (name) => `「${name}」暂无法播放，已从列表移除`,
    rateLimited: "音源额度用尽",
    timeout: "加载超时",
  },
  assistant: {
    name: "Penn 导读",
    tagline: "读懂本站 · 随时追问",
    fab: "站内导读",
    close: "关闭",
    clear: "清空",
    share: "分享",
    copied: "已复制",
    expand: "全屏",
    shrink: "小窗",
    send: "发送",
    stop: "停止",
    placeholder: "问问本站…",
    voice: "语音输入",
    reading: "在看",
    explain: "解释",
    summarize: "总结这节",
    clearSelection: "清除选中",
    waiting: "读取文章",
    useful: "有用",
    inaccurate: "不准",
    submit: "提交",
    sources: (n) => `参考 ${n} 篇`,
    jump: "滚到引用",
    emptyHint: "想快速摸清本站，可以从下面的问题开始。",
    confirmClear: "清空当前对话？",
    confirmOk: "清空",
    confirmCancel: "取消",
    fontSize: "字号",
    fontSmaller: "减小字号",
    fontLarger: "增大字号",
    copyAnswer: "复制回答",
    exportCard: "导出卡片图（发群/周报）",
    exported: "已下载卡片图",
    exportTitle: "导出分享卡片",
    feedbackUpDone: "已标有用",
    feedbackDownDone: "已标不准",
    feedbackPlaceholder: "哪里不准？（可选）",
    openSource: "打开参考文章",
    open: "打开",
    listening: "正在听，再说一次或点停止…",
    sendHint: "Enter 发送，Shift+Enter 换行",
    disclaimer: "AI 生成可能有误，注意核实",
    resize: "拖拽调整大小",
    pageSwitched: "已切换页面",
    pageSwitchedTo: (label) => `已切换到《${label}》，可继续问或清空`,
    currentPrefix: "当前：",
    firstUse: "第一次用？先从下面几问摸清本站。",
    home: "首页",
    currentPage: "当前页",
    copyFail: "复制失败，请手动选择文字",
    exportFail: "导出失败",
    exportUnsupported: "当前浏览器不支持导出卡片",
    voiceFail: "无法启动语音识别",
    restoredChat: "已恢复上次对话（保留 7 天，可点清空）",
    stopped: "（已停止生成）",
    askPrefix: "问：",
    answerSuffix: "回答",
  },
  code: {
    expandAll: (n) => `展开全部 · ${n} 行`,
    collapse: "收起代码",
    toggleAria: "展开或收起代码块",
  },
  books: {
    kicker: "Bookshelf",
    lead: "闲下来看看书；记录读过、在读与计划中的技术书。",
    countAll: (total, done, reading, plan) =>
      `共 ${total} 本 · ${done} 本已读 · ${reading} 本在读 · ${plan} 本计划中`,
    countFiltered: (shown, statusLabel, total) =>
      `当前 ${shown} 本${statusLabel}（共 ${total} 本）`,
    filterAria: "按阅读状态筛选",
    done: "已读",
    reading: "在读",
    plan: "计划中",
    toCollect: "外链收藏",
    toRecent: "近况",
    published: "出版：",
    stars: (n) => `推荐指数 ${n} 星`,
    note: "说明：书单从旧博客迁移并持续更新；想交流某本书欢迎留言。",
    noteBefore: "说明：书单从旧博客迁移并持续更新；想交流某本书欢迎 ",
    leaveComment: "留言",
    noteAfter: "。",
  },
  collect: {
    kicker: "Reading List",
    lead: "外链精选，不定期更新；偏前端与工程化，方便以后重读。",
    count: (links, groups) => `共 ${links} 篇外链 · ${groups} 个分类`,
    browseNotes: "浏览本站文章",
    aboutFeedback: "关于 & 反馈",
  },
  about: {
    role: "Penn · Web 前端工程师",
    intro:
      "这是我的技术博客：写前端与工程化的踩坑、取舍与可复用经验，也覆盖后端（Node.js、数据库）与浏览器实践；同时每日精选 AI / 科技动态。欢迎订阅 RSS，文中疏漏欢迎指正。",
    browseNotes: "浏览文章",
    skillsTitle: "技能（认真版玩笑）",
    skillFrontend: "前端",
    skillFrontendDesc: "JavaScript、Vue、React、CSS —— 拼写和运行时都略懂",
    skillEng: "工程化",
    skillEngDesc: "Git 不只会 pull / push，npm 和配置文件也会一起翻车",
    skillBackend: "后端",
    skillBackendDesc: "Node.js 能起服务，MySQL 会写 SELECT *",
    placesTitle: "常去的地方",
    placesDesc: "栏目入口与订阅",
    newsDesc: "每天自动更新的科技 / AI 精选",
    draftlyDesc: "公众号内容工作台：选题到推送草稿箱",
    writeNotesDesc: "Decap CMS：登录 GitHub 后在线新建 / 编辑笔记",
    interviewDesc: "AI 面试助手，按简历与 JD 练题",
    navDesc: "网址导航小站，常用站点速达",
    collectDesc: "外链精选，前端与工程化好文",
    booksDesc: "在读与计划中的技术书",
    recentDesc: "站点与个人的零碎更新；资讯见 AI 动态",
    notesRssDesc: "订阅博客更新",
    newsRssDesc: "订阅每日精选，Feedly / Follow 可用",
    webDesc: "JavaScript、Vue、React 实践",
    engDesc: "Git、npm 与开发工具链",
    backendDesc: "Node.js、MySQL 与服务端",
    uiDesc: "HTML、CSS、布局与动效",
    githubDesc: "开源与仓库主页",
  },
  pageHero: {
    archiveKicker: "Archive",
    archiveTitle: "文章归档",
    archiveLead: "按年月查看全部文章，从新到旧排列",
    tagsKicker: "Browse",
    tagsTitle: "标签",
    tagsLead: "按主题筛选文章，发现同标签内容",
    topicsKicker: "Learning Paths",
    topicsTitle: "阅读路径",
    topicsLead: "把同一系列的笔记排成路径，按顺序读完一整块主题",
    newsKicker: "每日精选",
    newsTitle: "AI 动态",
    newsLead: "业界、产品、模型、开源与开发者工具 — 按日整理，点进日报可读全文",
    newsMeta: (items, digests) =>
      `${items} 条动态 · ${digests} 期日报 · 约 7:00 自动更新`,
    newsJumpAria: "页内导航",
    newsDigests: "日报归档",
    newsFeed: "动态流",
    newsFeedDesc: "单条要闻筛选浏览，向下滚动自动加载",
  },
  sectionDescs: {
    web: "JavaScript 基础、Vue / React、UI 组件实践",
    ui: "HTML、CSS、布局与动效",
    engineering: "Git、npm、配置与开发工具链",
    backend: "Node.js、数据库与服务端实践",
    tech: "常用文档、GitHub 技巧与资源收藏",
    computer: "浏览器渲染与 Chrome 扩展",
    agent: "Agent 实战、工作流、提示词与工具链",
    misc: "职场、生活、方法论与其它不成体系的随笔",
  },
};

const zhTW: PageMessages = {
  common: {
    all: "全部",
    loading: "載入中…",
    loadMore: "繼續下滑載入更多",
    loadedAll: (n) => `已載入全部 ${n} 篇`,
    readMore: "閱讀全文",
    articleCount: (n) => `${n} 篇`,
    pieceCount: (n) => `${n} 則`,
    unknown: "未知",
    copy: "複製",
    copied: "已複製",
  },
  home: {
    tagline: "認真生活，隨便折騰",
    sub: (total) => `積跬步以至千里 · 共 ${total} 篇文章`,
    readLatest: "閱讀最新文章",
    todayNews: "今日 AI 動態",
    browseAria: "瀏覽欄目",
    latestNotes: "最新文章",
    viewMore: "查看更多",
    latestNews: "最新動態",
    allNews: "全部動態",
    emptyNotes: "暫無文章",
    newsEmptyPrefix: "AI 動態每天 7:00 左右更新 · ",
    goSection: "前往欄目",
  },
  section: {
    kicker: "欄目",
    count: (n) => `共 ${n} 篇文章`,
    groupCount: (n) => `${n} 篇文章`,
  },
  archive: {
    shownCount: (total, shown) => `共 ${total} 篇，已顯示 ${shown} 篇`,
    month: (m) => `${m} 月`,
  },
  tags: {
    filterAria: "標籤篩選",
    moreTags: (n) => `更多標籤 ${n}`,
    collapseTags: "收合標籤",
    stats: (notes, tags, tagged) =>
      `${notes} 篇 · ${tags} 標籤 · ${tagged} 篇已標註`,
    emptyTitle: "暫無符合文章",
    emptyDesc: "試試切換其他標籤",
  },
  topics: {
    filterAria: "系列篩選",
    stats: (paths, articles) => `${paths} 條閱讀路徑 · ${articles} 篇文章`,
  },
  series: {
    aria: "系列導覽",
    label: "系列 ·",
  },
  news: {
    filterAria: "欄目篩選",
    emptyTitle: "暫無動態",
    emptyDesc: "每天早上 7:00 左右自動更新，稍後再來看看。",
    emptySection: (name) => `「${name}」欄目暫無內容，試試切換其他欄目。`,
    loadedAllItems: (n) => `已載入全部 ${n} 則`,
    countItems: (n) => `${n} 則`,
    digestTitle: "日報彙整",
    digestDesc: "按期查閱每日精選",
    digestCount: (n) => `${n} 期`,
    latestDigest: "最新一期",
    readDigest: "閱讀完整日報 →",
    recent: "近期",
    byMonth: "按月查閱",
    dateFull: (y, m, d) => `${y} 年 ${m} 月 ${d} 日`,
    rssTitle: "RSS 訂閱",
    rssCopied: "已複製訂閱地址",
    rssCopyAria: "複製 RSS 地址",
    rssHint: "點擊複製地址，貼到 Feedly 等閱讀器",
    readOriginal: "閱讀原文",
    emptyDay: "（本日無新條目）",
    sections: {
      all: "全部",
      industry: "業界",
      product: "產品",
      model: "模型",
      opensource: "開源",
      tools: "開發者工具",
      frontend: "前端",
    },
  },
  friends: {
    kicker: "Friends",
    title: "友鏈動態",
    lead: "訂閱友鏈站點的最近更新，和本站一起逛逛。",
    empty: "暫時還沒有拉取到友鏈文章。",
    emptyHint: "建置時會自動同步訂閱源，稍後再來看看。",
    stats: (items, feeds) => `最近 ${items} 則 · ${feeds} 個訂閱源`,
    updatedAt: (time) => `更新於 ${time}（快取）`,
    viewAll: "查看全部友鏈",
  },
  aboutFriends: {
    title: "友情連結",
    lead: "一些常逛的部落格與站點",
    swapTitle: "互換友鏈",
    swapLead: "歡迎互換友鏈，複製站點資訊後傳給我。",
    copySite: "複製站點資訊",
  },
  recent: {
    title: "近況",
    lead: "碎碎念與站內動態摘要",
    count: (n) => `共 ${n} 則`,
    goNews: "去看 AI 動態",
    goArchive: "瀏覽文章彙整",
    bannerHtml:
      "<strong>AI 動態</strong>日報會自動出現在時間軸裡；站點碎碎念仍手寫。全文請看 AI 動態。",
    bannerBefore: "日報會自動出現在時間軸裡；站點碎碎念仍手寫。全文請看 ",
    bannerAfter: "。",
    footerBefore: "追每日資訊 → ",
    footerMid: " · 讀長文 → ",
    footerAfter: "",
    tagManual: "碎碎念",
    tagNews: "AI 動態",
    newsPicks: (headlinesJoined, extra) =>
      `今日精選：${headlinesJoined}${extra}。`,
    newsUpdated: "AI 動態日報已更新。",
    readDigest: "閱讀日報",
    etcN: (n) => ` 等 ${n} 則`,
  },
  music: {
    aria: "音樂膠囊",
    loading: "載入中",
    unavailable: "暫不可用",
    unknownArtist: "未知藝人",
    capsule: "音樂膠囊",
    tapCover: "點擊封面播放",
    play: "播放",
    pause: "暫停",
    prev: "上一首",
    next: "下一首",
    expand: "展開膠囊",
    dock: "收起貼邊",
    expandList: "展開列表",
    collapseList: "收合列表",
    skipNotice: "該曲暫無法播放（版權/會員限制），已跳過",
    removeNotice: (name) => `「${name}」暫無法播放，已從列表移除`,
    rateLimited: "音源額度用盡",
    timeout: "載入逾時",
  },
  assistant: {
    name: "Penn 導讀",
    tagline: "讀懂本站 · 隨時追問",
    fab: "站內導讀",
    close: "關閉",
    clear: "清空",
    share: "分享",
    copied: "已複製",
    expand: "全螢幕",
    shrink: "小窗",
    send: "傳送",
    stop: "停止",
    placeholder: "問問本站…",
    voice: "語音輸入",
    reading: "在看",
    explain: "解釋",
    summarize: "總結這節",
    clearSelection: "清除選取",
    waiting: "讀取文章",
    useful: "有用",
    inaccurate: "不準",
    submit: "提交",
    sources: (n) => `參考 ${n} 篇`,
    jump: "滾到引用",
    emptyHint: "想快速摸清本站，可以從下面的問題開始。",
    confirmClear: "清空目前對話？",
    confirmOk: "清空",
    confirmCancel: "取消",
    fontSize: "字級",
    fontSmaller: "減小字級",
    fontLarger: "增大字級",
    copyAnswer: "複製回答",
    exportCard: "匯出卡片圖（發群/週報）",
    exported: "已下載卡片圖",
    exportTitle: "匯出分享卡片",
    feedbackUpDone: "已標有用",
    feedbackDownDone: "已標不準",
    feedbackPlaceholder: "哪裡不準？（可選）",
    openSource: "打開參考文章",
    open: "打開",
    listening: "正在聽，再說一次或點停止…",
    sendHint: "Enter 傳送，Shift+Enter 換行",
    disclaimer: "AI 生成可能有誤，請注意核實",
    resize: "拖曳調整大小",
    pageSwitched: "已切換頁面",
    pageSwitchedTo: (label) => `已切換到《${label}》，可繼續問或清空`,
    currentPrefix: "目前：",
    firstUse: "第一次用？先從下面幾問摸清本站。",
    home: "首頁",
    currentPage: "目前頁",
    copyFail: "複製失敗，請手動選取文字",
    exportFail: "匯出失敗",
    exportUnsupported: "目前瀏覽器不支援匯出卡片",
    voiceFail: "無法啟動語音辨識",
    restoredChat: "已恢復上次對話（保留 7 天，可點清空）",
    stopped: "（已停止生成）",
    askPrefix: "問：",
    answerSuffix: "回答",
  },
  code: {
    expandAll: (n) => `展開全部 · ${n} 行`,
    collapse: "收合程式碼",
    toggleAria: "展開或收合程式碼區塊",
  },
  books: {
    kicker: "Bookshelf",
    lead: "閒下來看看書；記錄讀過、在讀與計劃中的技術書。",
    countAll: (total, done, reading, plan) =>
      `共 ${total} 本 · ${done} 本已讀 · ${reading} 本在讀 · ${plan} 本計劃中`,
    countFiltered: (shown, statusLabel, total) =>
      `目前 ${shown} 本${statusLabel}（共 ${total} 本）`,
    filterAria: "按閱讀狀態篩選",
    done: "已讀",
    reading: "在讀",
    plan: "計劃中",
    toCollect: "外鏈收藏",
    toRecent: "近況",
    published: "出版：",
    stars: (n) => `推薦指數 ${n} 星`,
    note: "說明：書單從舊部落格遷移並持續更新；想交流某本書歡迎留言。",
    noteBefore: "說明：書單從舊部落格遷移並持續更新；想交流某本書歡迎 ",
    leaveComment: "留言",
    noteAfter: "。",
  },
  collect: {
    kicker: "Reading List",
    lead: "外鏈精選，不定期更新；偏前端與工程化，方便以後重讀。",
    count: (links, groups) => `共 ${links} 篇外鏈 · ${groups} 個分類`,
    browseNotes: "瀏覽本站文章",
    aboutFeedback: "關於 & 回饋",
  },
  about: {
    role: "Penn · Web 前端工程師",
    intro:
      "這是我的技術部落格：寫前端與工程化的踩坑、取捨與可複用經驗，也涵蓋後端（Node.js、資料庫）與瀏覽器實作；同時每日精選 AI / 科技動態。歡迎訂閱 RSS，文中疏漏歡迎指正。",
    browseNotes: "瀏覽文章",
    skillsTitle: "技能（認真版玩笑）",
    skillFrontend: "前端",
    skillFrontendDesc: "JavaScript、Vue、React、CSS —— 拼寫和執行時都略懂",
    skillEng: "工程化",
    skillEngDesc: "Git 不只會 pull / push，npm 和設定檔也會一起翻車",
    skillBackend: "後端",
    skillBackendDesc: "Node.js 能起服務，MySQL 會寫 SELECT *",
    placesTitle: "常去的地方",
    placesDesc: "欄目入口與訂閱",
    newsDesc: "每天自動更新的科技 / AI 精選",
    draftlyDesc: "公眾號內容工作台：選題到推送草稿箱",
    writeNotesDesc: "Decap CMS：登入 GitHub 後線上新建 / 編輯筆記",
    interviewDesc: "AI 面試助手，依履歷與 JD 練題",
    navDesc: "網址導航小站，常用站點速達",
    collectDesc: "外鏈精選，前端與工程化好文",
    booksDesc: "在讀與計劃中的技術書",
    recentDesc: "站點與個人的零碎更新；資訊見 AI 動態",
    notesRssDesc: "訂閱部落格更新",
    newsRssDesc: "訂閱每日精選，Feedly / Follow 可用",
    webDesc: "JavaScript、Vue、React 實作",
    engDesc: "Git、npm 與開發工具鏈",
    backendDesc: "Node.js、MySQL 與伺服端",
    uiDesc: "HTML、CSS、佈局與動效",
    githubDesc: "開源與倉庫主頁",
  },
  pageHero: {
    archiveKicker: "Archive",
    archiveTitle: "文章彙整",
    archiveLead: "按年月查看全部文章，從新到舊排列",
    tagsKicker: "Browse",
    tagsTitle: "標籤",
    tagsLead: "按主題篩選文章，發現同標籤內容",
    topicsKicker: "Learning Paths",
    topicsTitle: "閱讀路徑",
    topicsLead: "把同一系列的筆記排成路徑，按順序讀完一整塊主題",
    newsKicker: "每日精選",
    newsTitle: "AI 動態",
    newsLead: "業界、產品、模型、開源與開發者工具 — 按日整理，點進日報可讀全文",
    newsMeta: (items, digests) =>
      `${items} 則動態 · ${digests} 期日報 · 約 7:00 自動更新`,
    newsJumpAria: "頁內導覽",
    newsDigests: "日報彙整",
    newsFeed: "動態流",
    newsFeedDesc: "單則要聞篩選瀏覽，向下捲動自動載入",
  },
  sectionDescs: {
    web: "JavaScript 基礎、Vue / React、UI 元件實作",
    ui: "HTML、CSS、佈局與動效",
    engineering: "Git、npm、設定與開發工具鏈",
    backend: "Node.js、資料庫與伺服端實作",
    tech: "常用文件、GitHub 技巧與資源收藏",
    computer: "瀏覽器渲染與 Chrome 擴充功能",
    agent: "Agent 實戰、工作流、提示詞與工具鏈",
    misc: "職場、生活、方法論與其它不成體系的隨筆",
  },
};

const en: PageMessages = {
  common: {
    all: "All",
    loading: "Loading…",
    loadMore: "Scroll for more",
    loadedAll: (n) => `All ${n} loaded`,
    readMore: "Read more",
    articleCount: (n) => `${n} notes`,
    pieceCount: (n) => `${n} items`,
    unknown: "Unknown",
    copy: "Copy",
    copied: "Copied",
  },
  home: {
    tagline: "Live earnestly, tinker freely",
    sub: (total) => `Small steps add up · ${total} notes`,
    readLatest: "Read latest",
    todayNews: "Today’s AI news",
    browseAria: "Browse sections",
    latestNotes: "Latest notes",
    viewMore: "View more",
    latestNews: "Latest news",
    allNews: "All news",
    emptyNotes: "No notes yet",
    newsEmptyPrefix: "AI news updates around 07:00 · ",
    goSection: "Open section",
  },
  section: {
    kicker: "Section",
    count: (n) => `${n} articles`,
    groupCount: (n) => `${n} articles`,
  },
  archive: {
    shownCount: (total, shown) => `${shown} of ${total} shown`,
    month: (m) => {
      const names = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return names[m - 1] || String(m);
    },
  },
  tags: {
    filterAria: "Filter by tag",
    moreTags: (n) => `More tags ${n}`,
    collapseTags: "Collapse tags",
    stats: (notes, tags, tagged) =>
      `${notes} notes · ${tags} tags · ${tagged} tagged`,
    emptyTitle: "No matching notes",
    emptyDesc: "Try another tag",
  },
  topics: {
    filterAria: "Filter by series",
    stats: (paths, articles) => `${paths} paths · ${articles} articles`,
  },
  series: {
    aria: "Series navigation",
    label: "Series ·",
  },
  news: {
    filterAria: "Filter by section",
    emptyTitle: "No news yet",
    emptyDesc: "Updates around 07:00 each morning — check back later.",
    emptySection: (name) => `Nothing in “${name}” yet. Try another section.`,
    loadedAllItems: (n) => `All ${n} loaded`,
    countItems: (n) => `${n}`,
    digestTitle: "Daily digests",
    digestDesc: "Browse daily picks by issue",
    digestCount: (n) => `${n} issues`,
    latestDigest: "Latest",
    readDigest: "Read full digest →",
    recent: "Recent",
    byMonth: "By month",
    dateFull: (y, m, d) => {
      const names = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${names[m - 1] || m} ${d}, ${y}`;
    },
    rssTitle: "RSS",
    rssCopied: "Feed URL copied",
    rssCopyAria: "Copy RSS URL",
    rssHint: "Copy and paste into Feedly or another reader",
    readOriginal: "Read original",
    emptyDay: "(No new items today)",
    sections: {
      all: "All",
      industry: "Industry",
      product: "Product",
      model: "Models",
      opensource: "Open source",
      tools: "Dev tools",
      frontend: "Frontend",
    },
  },
  friends: {
    kicker: "Friends",
    title: "Friends’ updates",
    lead: "Recent posts from friend sites.",
    empty: "No friend posts pulled yet.",
    emptyHint: "Feeds sync on build — check back later.",
    stats: (items, feeds) => `${items} recent · ${feeds} feeds`,
    updatedAt: (time) => `Updated ${time} (cached)`,
    viewAll: "All friends",
  },
  aboutFriends: {
    title: "Friends",
    lead: "Blogs and sites I often visit",
    swapTitle: "Exchange links",
    swapLead: "Happy to swap — copy site info and send it over.",
    copySite: "Copy site info",
  },
  recent: {
    title: "Recent",
    lead: "Notes and site highlights",
    count: (n) => `${n} items`,
    goNews: "AI news",
    goArchive: "Browse archive",
    bannerHtml:
      "<strong>AI news</strong> digests show up on this timeline automatically; site notes are still written by hand. Full feed → AI news.",
    bannerBefore:
      " digests show up on this timeline automatically; site notes are still written by hand. Full feed → ",
    bannerAfter: ".",
    footerBefore: "Daily news → ",
    footerMid: " · Longer reads → ",
    footerAfter: "",
    tagManual: "Note",
    tagNews: "AI news",
    newsPicks: (headlinesJoined, extra) =>
      `Today’s picks: ${headlinesJoined}${extra}.`,
    newsUpdated: "AI news digest updated.",
    readDigest: "Read digest",
    etcN: (n) => ` +${n} more`,
  },
  music: {
    aria: "Music capsule",
    loading: "Loading",
    unavailable: "Unavailable",
    unknownArtist: "Unknown artist",
    capsule: "Music",
    tapCover: "Tap cover to play",
    play: "Play",
    pause: "Pause",
    prev: "Previous",
    next: "Next",
    expand: "Expand",
    dock: "Dock",
    expandList: "Show playlist",
    collapseList: "Hide playlist",
    skipNotice: "Track unavailable (rights/membership) — skipped",
    removeNotice: (name) => `“${name}” unavailable — removed from list`,
    rateLimited: "Source rate-limited",
    timeout: "Load timed out",
  },
  assistant: {
    name: "Penn Guide",
    tagline: "Know the site · ask anytime",
    fab: "Site guide",
    close: "Close",
    clear: "Clear",
    share: "Share",
    copied: "Copied",
    expand: "Expand",
    shrink: "Compact",
    send: "Send",
    stop: "Stop",
    placeholder: "Ask about this site…",
    voice: "Voice input",
    reading: "Reading",
    explain: "Explain",
    summarize: "Summarize",
    clearSelection: "Clear selection",
    waiting: "Reading article",
    useful: "Helpful",
    inaccurate: "Off",
    submit: "Submit",
    sources: (n) => `${n} sources`,
    jump: "Jump to cite",
    emptyHint: "Start with a question below to explore the site.",
    confirmClear: "Clear this chat?",
    confirmOk: "Clear",
    confirmCancel: "Cancel",
    fontSize: "Font size",
    fontSmaller: "Smaller text",
    fontLarger: "Larger text",
    copyAnswer: "Copy answer",
    exportCard: "Export card image (share / weekly note)",
    exported: "Card image downloaded",
    exportTitle: "Export share card",
    feedbackUpDone: "Marked helpful",
    feedbackDownDone: "Marked off",
    feedbackPlaceholder: "What was off? (optional)",
    openSource: "Open cited article",
    open: "Open",
    listening: "Listening… speak again or tap stop",
    sendHint: "Enter to send, Shift+Enter for a new line",
    disclaimer: "AI can be wrong — please double-check",
    resize: "Drag to resize",
    pageSwitched: "Page switched",
    pageSwitchedTo: (label) =>
      `Switched to “${label}” — keep asking or clear the chat`,
    currentPrefix: "Now: ",
    firstUse: "First time here? Start with a few questions below.",
    home: "Home",
    currentPage: "This page",
    copyFail: "Copy failed — select the text manually",
    exportFail: "Export failed",
    exportUnsupported: "This browser can’t export cards",
    voiceFail: "Couldn’t start voice recognition",
    restoredChat: "Restored last chat (kept 7 days; clear anytime)",
    stopped: "(Generation stopped)",
    askPrefix: "Q: ",
    answerSuffix: " answer",
  },
  code: {
    expandAll: (n) => `Expand all · ${n} lines`,
    collapse: "Collapse",
    toggleAria: "Expand or collapse code block",
  },
  books: {
    kicker: "Bookshelf",
    lead: "Books for downtime — finished, reading, and on the list.",
    countAll: (total, done, reading, plan) =>
      `${total} books · ${done} done · ${reading} reading · ${plan} planned`,
    countFiltered: (shown, statusLabel, total) =>
      `${shown} ${statusLabel} (of ${total})`,
    filterAria: "Filter by reading status",
    done: "Done",
    reading: "Reading",
    plan: "Planned",
    toCollect: "Link collection",
    toRecent: "Recent",
    published: "Published: ",
    stars: (n) => `${n}-star pick`,
    note: "Note: migrated from the old blog and kept current. Want to chat about a book? Leave a comment.",
    noteBefore:
      "Note: migrated from the old blog and kept current. Want to chat about a book? ",
    leaveComment: "Leave a comment",
    noteAfter: ".",
  },
  collect: {
    kicker: "Reading List",
    lead: "Curated external links, updated now and then — mostly frontend & engineering, for rereading later.",
    count: (links, groups) => `${links} links · ${groups} groups`,
    browseNotes: "Browse site notes",
    aboutFeedback: "About & feedback",
  },
  about: {
    role: "Penn · Web frontend engineer",
    intro:
      "A technical blog on frontend and engineering trade-offs you can reuse, plus backend (Node.js, databases) and browser practice — with a daily AI / tech digest. Subscribe via RSS; corrections welcome.",
    browseNotes: "Browse notes",
    skillsTitle: "Skills (half-joking)",
    skillFrontend: "Frontend",
    skillFrontendDesc:
      "JavaScript, Vue, React, CSS — spelling and runtime, both roughly",
    skillEng: "Engineering",
    skillEngDesc:
      "Git is more than pull / push; npm and config files crash together",
    skillBackend: "Backend",
    skillBackendDesc: "Node.js can serve; MySQL can SELECT *",
    placesTitle: "Usual spots",
    placesDesc: "Sections and feeds",
    newsDesc: "Daily tech / AI picks, auto-updated",
    draftlyDesc: "WeChat content desk: ideas to draft inbox",
    writeNotesDesc: "Decap CMS: sign in with GitHub to write or edit notes",
    interviewDesc: "AI interview coach from resume + JD",
    navDesc: "Link portal for everyday sites",
    collectDesc: "Curated links on frontend & engineering",
    booksDesc: "Tech books reading and planned",
    recentDesc: "Site & personal scraps; news lives under AI news",
    notesRssDesc: "Subscribe to blog updates",
    newsRssDesc: "Daily picks — Feedly / Follow ready",
    webDesc: "JavaScript, Vue, React practice",
    engDesc: "Git, npm, and toolchains",
    backendDesc: "Node.js, MySQL, and servers",
    uiDesc: "HTML, CSS, layout, motion",
    githubDesc: "Open source and profile",
  },
  pageHero: {
    archiveKicker: "Archive",
    archiveTitle: "Archive",
    archiveLead: "All notes by date, newest first",
    tagsKicker: "Browse",
    tagsTitle: "Tags",
    tagsLead: "Filter notes by topic and find related posts",
    topicsKicker: "Learning Paths",
    topicsTitle: "Learning paths",
    topicsLead: "Series notes lined up so you can finish one theme in order",
    newsKicker: "Daily picks",
    newsTitle: "AI news",
    newsLead:
      "Industry, product, models, open source, and tools — daily digests with full write-ups",
    newsMeta: (items, digests) =>
      `${items} items · ${digests} digests · updates ~07:00`,
    newsJumpAria: "On-page navigation",
    newsDigests: "Digest archive",
    newsFeed: "Feed",
    newsFeedDesc: "Browse single items; scroll to load more",
  },
  sectionDescs: {
    web: "JavaScript basics, Vue / React, UI components",
    ui: "HTML, CSS, layout, and motion",
    engineering: "Git, npm, config, and toolchains",
    backend: "Node.js, databases, and server practice",
    tech: "Docs, GitHub tips, and resource bookmarks",
    computer: "Browser rendering and Chrome extensions",
    agent: "Agent practice, workflows, prompts, and tools",
    misc: "Work, life, methods, and other loose essays",
  },
};

export const pageMessages: Record<UiLocale, PageMessages> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  en,
};

/** 新闻栏目：数据里仍是简体中文 section 名 */
export const NEWS_SECTION_DATA: { id: keyof PageMessages["news"]["sections"]; data: string | null }[] = [
  { id: "all", data: null },
  { id: "industry", data: "业界" },
  { id: "product", data: "产品" },
  { id: "model", data: "模型" },
  { id: "opensource", data: "开源" },
  { id: "tools", data: "开发者工具" },
  { id: "frontend", data: "前端" },
];
