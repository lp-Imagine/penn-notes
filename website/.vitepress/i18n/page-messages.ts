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
    discoverAria: string;
    discoverTitle: string;
    discoverWeek: string;
    discoverNewsKicker: string;
    discoverNewsMore: string;
    discoverRereadKicker: string;
    discoverRereadGo: string;
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
    progressHint: string;
    progressOf: (done: number, total: number) => string;
    markDone: string;
    unmarkDone: string;
  };
  changelog: {
    lead: string;
    empty: string;
    more: string;
  };
  scraps: {
    empty: string;
    readMore: string;
    back: string;
    navAria: string;
    older: string;
    newer: string;
  };
  lab: {
    stageKicker: string;
    stageTitle: string;
    stageDesc: string;
    stageSample: string;
    themeAria: string;
    currentTheme: string;
    spring: string;
    catalogTitle: string;
    catalogCount: (n: number) => string;
    kindLive: string;
    kindPage: string;
    back: string;
    groupFx: string;
    groupFeat: string;
    groupCss: string;
    flexTitle: string;
    flexLead: string;
    gapLabel: string;
    gapWay: string;
    marginWay: string;
    catalogThemeDesc: string;
    catalogFlexDesc: string;
    catalogClampDesc: string;
    catalogGridDesc: string;
    catalogSnapDesc: string;
    catalogEaseDesc: string;
    catalogMixDesc: string;
    catalogSpotDesc: string;
    catalogTiltDesc: string;
    catalogScrambleDesc: string;
    catalogParticleDesc: string;
    catalogMagDesc: string;
    catalogCmdDesc: string;
    clampTitle: string;
    clampLead: string;
    clampMin: string;
    clampPref: string;
    clampMax: string;
    clampWidth: string;
    clampSample: string;
    clampHint: string;
    gridTitle: string;
    gridLead: string;
    gridMin: string;
    snapTitle: string;
    snapLead: string;
    snapHint: string;
    snapSlide: string;
    easeTitle: string;
    easeLead: string;
    easeReplay: string;
    mixTitle: string;
    mixLead: string;
    mixAmount: string;
    spotTitle: string;
    spotLead: string;
    spotHidden: string;
    spotBody: string;
    spotHint: string;
    tiltTitle: string;
    tiltLead: string;
    tiltCardTitle: string;
    tiltCardDesc: string;
    scrambleTitle: string;
    scrambleLead: string;
    scrambleReplay: string;
    scrambleLine1: string;
    scrambleLine2: string;
    scrambleLine3: string;
    particleTitle: string;
    particleLead: string;
    particleHint: string;
    magTitle: string;
    magLead: string;
    magHint: string;
    magPrimary: string;
    magSecondary: string;
    magGhost: string;
    cmdTitle: string;
    cmdLead: string;
    cmdOpen: string;
    cmdClose: string;
    cmdTip: string;
    cmdPlaceholder: string;
    cmdEmpty: string;
    cmdPreviewTitle: string;
    cmdPreviewBody: string;
    cmdToast: string;
    cmdToastHint: string;
    cmdToastDone: string;
    cmdFocus: string;
    cmdFocusHint: string;
    cmdFocusOn: string;
    cmdFocusOff: string;
    cmdShake: string;
    cmdShakeHint: string;
    cmdShakeDone: string;
    cmdTheme: string;
    cmdThemeHint: string;
    cmdThemeDone: string;
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
    rssSectionsHint: string;
    readOriginal: string;
    emptyDay: string;
    weekTitle: string;
    weekLead: string;
    weekEmpty: string;
    weekPicks: string;
    weekdays: {
      sun: string;
      mon: string;
      tue: string;
      wed: string;
      thu: string;
      fri: string;
      sat: string;
    };
    sourcesTitle: string;
    sourcesLead: string;
    sourcesWhyKicker: string;
    sourcesWhy: string;
    sourcesSnapshot: string;
    sourcesOk: string;
    sourcesFailed: string;
    sourcesRate: string;
    sourcesTarget: string;
    sourcesUpdated: (at: string) => string;
    sourcesNone: string;
    sourcesFailTitle: string;
    sourcesFailHint: string;
    sourcesAllOk: string;
    sourcesOkTitle: string;
    sourcesOkCount: (n: number) => string;
    sourcesItems: (n: number) => string;
    sourcesItemsUnit: string;
    sourcesTop: string;
    sourcesRest: string;
    sourcesQuiet: string;
    sourcesQuietCount: (n: number) => string;
    sourcesErr400: string;
    sourcesErr401: string;
    sourcesErr403: string;
    sourcesErr404: string;
    sourcesErr410: string;
    sourcesErr429: string;
    sourcesErr5xx: string;
    sourcesErrTimeout: string;
    sourcesErrNetwork: string;
    sourcesErrGeneric: string;
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
    filterAria: string;
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
    changelogKicker: string;
    changelogTitle: string;
    changelogLead: string;
    scrapsKicker: string;
    scrapsTitle: string;
    scrapsLead: string;
    labKicker: string;
    labTitle: string;
    labLead: string;
    newsKicker: string;
    newsTitle: string;
    newsLead: string;
    newsMeta: (items: number, digests: number) => string;
    newsJumpAria: string;
    newsDigests: string;
    newsFeed: string;
    newsFeedDesc: string;
    newsWeek: string;
    newsSources: string;
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
    discoverAria: "今日发现",
    discoverTitle: "今日发现",
    discoverWeek: "本周合集",
    discoverNewsKicker: "今日 AI 要点",
    discoverNewsMore: "阅读完整日报",
    discoverRereadKicker: "旧文重读",
    discoverRereadGo: "重读这篇 →",
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
    progressHint: "进度保存在本机浏览器，点左侧可打勾 / 取消；打开文章也会自动记为已读。",
    progressOf: (done, total) => `已读 ${done}/${total}`,
    markDone: "标记为已读",
    unmarkDone: "取消已读",
  },
  changelog: {
    lead: "站内产品与体验更新，不是文章列表。改了什么、为什么改，记在这里。",
    empty: "暂无更新记录",
    more: "了解更多 →",
  },
  scraps: {
    empty: "还没有短笔记，写一条试试。",
    readMore: "读完整条 →",
    back: "← 全部短笔记",
    navAria: "相邻短笔记",
    older: "更早",
    newer: "更新",
  },
  lab: {
    stageKicker: "Live playground",
    stageTitle: "主题变量切换",
    stageDesc: "改 CSS 变量即时换肤，不依赖整站暗色开关。点色板，看右侧预览跟着变。",
    stageSample: "这块面板吃的是本实验注入的变量：背景、文字、强调色。",
    themeAria: "选择主题",
    currentTheme: "当前主题",
    spring: "点一下",
    catalogTitle: "实验目录",
    catalogCount: (n) => `${n} 个`,
    kindLive: "页内",
    kindPage: "独立页",
    back: "← 返回实验页",
    groupFx: "特效实验",
    groupFeat: "功能实验",
    groupCss: "CSS 基础",
    flexTitle: "Flex Gap 实验",
    flexLead: "拖滑块对比 gap 与负 margin 两种间距写法。",
    gapLabel: "间距",
    gapWay: "用 gap",
    marginWay: "用负 margin",
    catalogThemeDesc: "用 CSS 变量即时换肤，不依赖整站暗色开关。",
    catalogFlexDesc: "对比 gap 与旧式负 margin，拖滑块看间距变化。",
    catalogClampDesc: "拖 min / preferred / max，看流体字号怎么卡边界。",
    catalogGridDesc: "auto-fit + minmax，改最小列宽看列数自动变。",
    catalogSnapDesc: "横向滚动卡片，体验 scroll-snap 吸附。",
    catalogEaseDesc: "并排对比 linear / ease / 自定义贝塞尔。",
    catalogMixDesc: "拖比例，看 color-mix 把两色掺在一起。",
    catalogSpotDesc: "黑暗遮罩 + 径向高光，指针划过才露出内容。",
    catalogTiltDesc: "3D 透视跟随指针，带一层 glare 高光。",
    catalogScrambleDesc: "乱码逐字解码，黑客电影感文字特效。",
    catalogParticleDesc: "Canvas 粒子拖尾，跟着指针散开。",
    catalogMagDesc: "靠近按钮会被「吸」过去的 magnetic UI。",
    catalogCmdDesc: "迷你 ⌘K 命令面板：搜索、键盘导航、执行动作。",
    clampTitle: "clamp 流体字号",
    clampLead: "模拟容器宽度，观察 clamp(min, preferred, max) 的实际字号。",
    clampMin: "最小值",
    clampPref: "首选",
    clampMax: "最大值",
    clampWidth: "容器宽",
    clampSample: "流体排版 · Fluid type",
    clampHint: "按当前容器宽估算",
    gridTitle: "Grid auto-fit",
    gridLead: "改最小列宽，看 auto-fit 如何自动增减列数。",
    gridMin: "最小列宽",
    snapTitle: "Scroll Snap",
    snapLead: "横向滑动卡片，停靠点由 scroll-snap 决定。",
    snapHint: "在轨道上左右滑动，或用触控板横滑。",
    snapSlide: "吸附卡片",
    easeTitle: "缓动曲线",
    easeLead: "同一路程、不同 timing-function，看球怎么「赶路」。",
    easeReplay: "重播",
    mixTitle: "color-mix",
    mixLead: "按比例混合两色，现代浏览器原生支持。",
    mixAmount: "A 的占比",
    spotTitle: "聚光灯揭示",
    spotLead: "用径向遮罩做 spotlight：指针到哪，内容亮到哪。",
    spotHidden: "藏在暗处的标题",
    spotBody: "这层文字一直在，只是被暗幕盖住。移动指针，像拿手电扫墙一样把它照出来。",
    spotHint: "在区域内移动指针",
    tiltTitle: "3D 倾斜卡片",
    tiltLead: "根据指针位置做 rotateX / rotateY，并叠一层跟随高光。",
    tiltCardTitle: "可倾斜的面板",
    tiltCardDesc: "把鼠标或手指在卡片上挪动，感受轻微的立体跟随。",
    scrambleTitle: "文字乱码解码",
    scrambleLead: "先刷一串乱码，再逐字落成目标文案。",
    scrambleReplay: "再解一次",
    scrambleLine1: "PENN NOTES LAB",
    scrambleLine2: "解码完成 · Decode complete",
    scrambleLine3: "scramble → plaintext",
    particleTitle: "粒子拖尾",
    particleLead: "Canvas 画一层淡发光粒子，跟着指针飘散。",
    particleHint: "在暗区里移动指针",
    magTitle: "磁力按钮",
    magLead: "指针靠近时，按钮会朝你轻微位移，像被吸过去。",
    magHint: "在按钮附近慢慢移动",
    magPrimary: "主按钮",
    magSecondary: "次按钮",
    magGhost: "幽灵按钮",
    cmdTitle: "命令面板",
    cmdLead: "一个可运行的迷你 ⌘K：过滤命令、键盘选择、执行副作用。",
    cmdOpen: "打开面板",
    cmdClose: "关闭",
    cmdTip: "或按 ⌘/Ctrl + K",
    cmdPlaceholder: "输入命令…",
    cmdEmpty: "没有匹配的命令",
    cmdPreviewTitle: "预览区域",
    cmdPreviewBody: "执行命令后，这里和整页会有可见反馈。",
    cmdToast: "弹出提示",
    cmdToastHint: "在面板里闪一条 toast",
    cmdToastDone: "命令已执行",
    cmdFocus: "切换专注模式",
    cmdFocusHint: "弱化导航，突出内容区",
    cmdFocusOn: "已进入实验专注",
    cmdFocusOff: "已退出实验专注",
    cmdShake: "抖动面板",
    cmdShakeHint: "给预览区来一段 shake",
    cmdShakeDone: "抖完了",
    cmdTheme: "切换面板主题",
    cmdThemeHint: "给命令实验区换一套底色",
    cmdThemeDone: "面板主题已切换",
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
    rssSectionsHint: "也可按栏目订阅下方分源 RSS，或用动态流筛选",
    readOriginal: "阅读原文",
    emptyDay: "（本日无新条目）",
    weekTitle: "本周合集",
    weekLead: "最近 7 期日报与精选条目",
    weekEmpty: "暂无本周内容",
    weekPicks: "本周精选",
    weekdays: {
      sun: "周日",
      mon: "周一",
      tue: "周二",
      wed: "周三",
      thu: "周四",
      fri: "周五",
      sat: "周六",
    },
    sourcesTitle: "订阅源健康",
    sourcesLead: "AI 动态从哪些 RSS 抓来，以及最近一次抓取是否正常",
    sourcesWhyKicker: "这个页面做什么",
    sourcesWhy:
      "「AI 动态」不是人工一篇篇贴的，而是每天自动去几十个 RSS 订阅源拉候选，再筛选进日报。本页是那次抓取的体检报告：哪些源成功、哪些暂时挂了——方便排查「今天少了某家媒体」这类问题。失败多半是源站限流或临时故障，通常会自愈。",
    sourcesSnapshot: "最近一次抓取",
    sourcesOk: "正常",
    sourcesFailed: "失败",
    sourcesRate: "成功率",
    sourcesTarget: "对应日期",
    sourcesUpdated: (at) => `检查于 ${at}`,
    sourcesNone: "暂无健康检查数据（构建后可见）",
    sourcesFailTitle: "本次失败",
    sourcesFailHint: "多为限流或临时故障，不必慌",
    sourcesAllOk: "全部订阅源抓取正常",
    sourcesOkTitle: "本次成功",
    sourcesOkCount: (n) => `${n} 个源`,
    sourcesItems: (n) => `${n} 条`,
    sourcesItemsUnit: "条",
    sourcesTop: "贡献最多",
    sourcesRest: "其余有条目",
    sourcesQuiet: "本轮无新条目",
    sourcesQuietCount: (n) => `${n} 个`,
    sourcesErr400: "请求不被接受",
    sourcesErr401: "需要登录或鉴权",
    sourcesErr403: "源站拒绝访问",
    sourcesErr404: "订阅地址不存在",
    sourcesErr410: "订阅已失效或下线",
    sourcesErr429: "触发限流，稍后再试",
    sourcesErr5xx: "源站服务异常",
    sourcesErrTimeout: "请求超时",
    sourcesErrNetwork: "网络或域名不可达",
    sourcesErrGeneric: "抓取失败，详见原始错误",
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
    filterAria: "按标签筛选",
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
    changelogKicker: "Changelog",
    changelogTitle: "更新日志",
    changelogLead: "站内产品与体验更新，不是文章列表",
    scrapsKicker: "Scraps",
    scrapsTitle: "短笔记",
    scrapsLead: "独立于长文的碎片记录，随时记下想法",
    labKicker: "Lab",
    labTitle: "实验页",
    labLead: "特效、功能原型与 CSS 小实验，动手试",
    newsKicker: "每日精选",
    newsTitle: "AI 动态",
    newsLead: "业界、产品、模型、开源与开发者工具 — 按日整理，点进日报可读全文",
    newsMeta: (items, digests) =>
      `${items} 条动态 · ${digests} 期日报 · 约 7:00 自动更新`,
    newsJumpAria: "页内导航",
    newsDigests: "日报归档",
    newsFeed: "动态流",
    newsFeedDesc: "单条要闻筛选浏览，向下滚动自动加载",
    newsWeek: "本周合集",
    newsSources: "订阅源",
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
    discoverAria: "今日發現",
    discoverTitle: "今日發現",
    discoverWeek: "本週合集",
    discoverNewsKicker: "今日 AI 要點",
    discoverNewsMore: "閱讀完整日報",
    discoverRereadKicker: "舊文重讀",
    discoverRereadGo: "重讀這篇 →",
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
    progressHint: "進度保存在本機瀏覽器，點左側可打勾 / 取消；打開文章也會自動記為已讀。",
    progressOf: (done, total) => `已讀 ${done}/${total}`,
    markDone: "標記為已讀",
    unmarkDone: "取消已讀",
  },
  changelog: {
    lead: "站內產品與體驗更新，不是文章列表。改了什麼、為什麼改，記在這裡。",
    empty: "暫無更新記錄",
    more: "了解更多 →",
  },
  scraps: {
    empty: "還沒有短筆記，寫一條試試。",
    readMore: "讀完整條 →",
    back: "← 全部短筆記",
    navAria: "相鄰短筆記",
    older: "更早",
    newer: "更新",
  },
  lab: {
    stageKicker: "Live playground",
    stageTitle: "主題變數切換",
    stageDesc: "改 CSS 變數即時換膚，不依賴整站暗色開關。點色板，看右側預覽跟著變。",
    stageSample: "這塊面板吃的是本實驗注入的變數：背景、文字、強調色。",
    themeAria: "選擇主題",
    currentTheme: "目前主題",
    spring: "點一下",
    catalogTitle: "實驗目錄",
    catalogCount: (n) => `${n} 個`,
    kindLive: "頁內",
    kindPage: "獨立頁",
    back: "← 返回實驗頁",
    groupFx: "特效實驗",
    groupFeat: "功能實驗",
    groupCss: "CSS 基礎",
    flexTitle: "Flex Gap 實驗",
    flexLead: "拖滑桿對比 gap 與負 margin 兩種間距寫法。",
    gapLabel: "間距",
    gapWay: "用 gap",
    marginWay: "用負 margin",
    catalogThemeDesc: "用 CSS 變數即時換膚，不依賴整站暗色開關。",
    catalogFlexDesc: "對比 gap 與舊式負 margin，拖滑桿看間距變化。",
    catalogClampDesc: "拖 min / preferred / max，看流體字級怎麼卡邊界。",
    catalogGridDesc: "auto-fit + minmax，改最小欄寬看欄數自動變。",
    catalogSnapDesc: "橫向滾動卡片，體驗 scroll-snap 吸附。",
    catalogEaseDesc: "並排對比 linear / ease / 自訂貝茲曲線。",
    catalogMixDesc: "拖比例，看 color-mix 把兩色掺在一起。",
    catalogSpotDesc: "黑暗遮罩 + 徑向高光，指針劃過才露出內容。",
    catalogTiltDesc: "3D 透視跟隨指針，帶一層 glare 高光。",
    catalogScrambleDesc: "亂碼逐字解碼，駭客電影感文字特效。",
    catalogParticleDesc: "Canvas 粒子拖尾，跟著指針散開。",
    catalogMagDesc: "靠近按鈕會被「吸」過去的 magnetic UI。",
    catalogCmdDesc: "迷你 ⌘K 命令面板：搜尋、鍵盤導覽、執行動作。",
    clampTitle: "clamp 流體字級",
    clampLead: "模擬容器寬度，觀察 clamp(min, preferred, max) 的實際字級。",
    clampMin: "最小值",
    clampPref: "首選",
    clampMax: "最大值",
    clampWidth: "容器寬",
    clampSample: "流體排版 · Fluid type",
    clampHint: "依目前容器寬估算",
    gridTitle: "Grid auto-fit",
    gridLead: "改最小欄寬，看 auto-fit 如何自動增減欄數。",
    gridMin: "最小欄寬",
    snapTitle: "Scroll Snap",
    snapLead: "橫向滑動卡片，停靠點由 scroll-snap 決定。",
    snapHint: "在軌道上左右滑動，或用觸控板橫滑。",
    snapSlide: "吸附卡片",
    easeTitle: "緩動曲線",
    easeLead: "同一路程、不同 timing-function，看球怎麼「趕路」。",
    easeReplay: "重播",
    mixTitle: "color-mix",
    mixLead: "按比例混合兩色，現代瀏覽器原生支援。",
    mixAmount: "A 的占比",
    spotTitle: "聚光燈揭示",
    spotLead: "用徑向遮罩做 spotlight：指針到哪，內容亮到哪。",
    spotHidden: "藏在暗處的標題",
    spotBody: "這層文字一直在，只是被暗幕蓋住。移動指針，像拿手電掃牆一樣把它照出來。",
    spotHint: "在區域內移動指針",
    tiltTitle: "3D 傾斜卡片",
    tiltLead: "根據指針位置做 rotateX / rotateY，並疊一層跟隨高光。",
    tiltCardTitle: "可傾斜的面板",
    tiltCardDesc: "把滑鼠或手指在卡片上挪動，感受輕微的立體跟隨。",
    scrambleTitle: "文字亂碼解碼",
    scrambleLead: "先刷一串亂碼，再逐字落成目標文案。",
    scrambleReplay: "再解一次",
    scrambleLine1: "PENN NOTES LAB",
    scrambleLine2: "解碼完成 · Decode complete",
    scrambleLine3: "scramble → plaintext",
    particleTitle: "粒子拖尾",
    particleLead: "Canvas 畫一層淡發光粒子，跟著指針飄散。",
    particleHint: "在暗區裡移動指針",
    magTitle: "磁力按鈕",
    magLead: "指針靠近時，按鈕會朝你輕微位移，像被吸過去。",
    magHint: "在按鈕附近慢慢移動",
    magPrimary: "主按鈕",
    magSecondary: "次按鈕",
    magGhost: "幽靈按鈕",
    cmdTitle: "命令面板",
    cmdLead: "一個可運行的迷你 ⌘K：過濾命令、鍵盤選擇、執行副作用。",
    cmdOpen: "打開面板",
    cmdClose: "關閉",
    cmdTip: "或按 ⌘/Ctrl + K",
    cmdPlaceholder: "輸入命令…",
    cmdEmpty: "沒有符合的命令",
    cmdPreviewTitle: "預覽區域",
    cmdPreviewBody: "執行命令後，這裡和整頁會有可見回饋。",
    cmdToast: "彈出提示",
    cmdToastHint: "在面板裡閃一條 toast",
    cmdToastDone: "命令已執行",
    cmdFocus: "切換專注模式",
    cmdFocusHint: "弱化導覽，突出內容區",
    cmdFocusOn: "已進入實驗專注",
    cmdFocusOff: "已退出實驗專注",
    cmdShake: "抖動面板",
    cmdShakeHint: "給預覽區來一段 shake",
    cmdShakeDone: "抖完了",
    cmdTheme: "切換面板主題",
    cmdThemeHint: "給命令實驗區換一套底色",
    cmdThemeDone: "面板主題已切換",
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
    rssSectionsHint: "也可按欄目訂閱下方分源 RSS，或用動態流篩選",
    readOriginal: "閱讀原文",
    emptyDay: "（本日無新條目）",
    weekTitle: "本週合集",
    weekLead: "最近 7 期日報與精選條目",
    weekEmpty: "暫無本週內容",
    weekPicks: "本週精選",
    weekdays: {
      sun: "週日",
      mon: "週一",
      tue: "週二",
      wed: "週三",
      thu: "週四",
      fri: "週五",
      sat: "週六",
    },
    sourcesTitle: "訂閱源健康",
    sourcesLead: "AI 動態從哪些 RSS 抓來，以及最近一次抓取是否正常",
    sourcesWhyKicker: "這個頁面做什麼",
    sourcesWhy:
      "「AI 動態」不是人工一篇篇貼的，而是每天自動去數十個 RSS 訂閱源拉候選，再篩選進日報。本頁是那次抓取的體檢報告：哪些源成功、哪些暫時掛了——方便排查「今天少了某家媒體」這類問題。失敗多半是源站限流或臨時故障，通常會自癒。",
    sourcesSnapshot: "最近一次抓取",
    sourcesOk: "正常",
    sourcesFailed: "失敗",
    sourcesRate: "成功率",
    sourcesTarget: "對應日期",
    sourcesUpdated: (at) => `檢查於 ${at}`,
    sourcesNone: "暫無健康檢查資料（構建後可見）",
    sourcesFailTitle: "本次失敗",
    sourcesFailHint: "多為限流或臨時故障，不必慌",
    sourcesAllOk: "全部訂閱源抓取正常",
    sourcesOkTitle: "本次成功",
    sourcesOkCount: (n) => `${n} 個源`,
    sourcesItems: (n) => `${n} 則`,
    sourcesItemsUnit: "則",
    sourcesTop: "貢獻最多",
    sourcesRest: "其餘有條目",
    sourcesQuiet: "本輪無新條目",
    sourcesQuietCount: (n) => `${n} 個`,
    sourcesErr400: "請求不被接受",
    sourcesErr401: "需要登入或鑑權",
    sourcesErr403: "源站拒絕存取",
    sourcesErr404: "訂閱地址不存在",
    sourcesErr410: "訂閱已失效或下線",
    sourcesErr429: "觸發限流，稍後再試",
    sourcesErr5xx: "源站服務異常",
    sourcesErrTimeout: "請求逾時",
    sourcesErrNetwork: "網路或域名不可達",
    sourcesErrGeneric: "抓取失敗，詳見原始錯誤",
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
    filterAria: "按標籤篩選",
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
    changelogKicker: "Changelog",
    changelogTitle: "更新日誌",
    changelogLead: "站內產品與體驗更新，不是文章列表",
    scrapsKicker: "Scraps",
    scrapsTitle: "短筆記",
    scrapsLead: "獨立於長文的碎片記錄，隨時記下想法",
    labKicker: "Lab",
    labTitle: "實驗頁",
    labLead: "特效、功能原型與 CSS 小實驗，動手試",
    newsKicker: "每日精選",
    newsTitle: "AI 動態",
    newsLead: "業界、產品、模型、開源與開發者工具 — 按日整理，點進日報可讀全文",
    newsMeta: (items, digests) =>
      `${items} 則動態 · ${digests} 期日報 · 約 7:00 自動更新`,
    newsJumpAria: "頁內導覽",
    newsDigests: "日報彙整",
    newsFeed: "動態流",
    newsFeedDesc: "單則要聞篩選瀏覽，向下捲動自動載入",
    newsWeek: "本週合集",
    newsSources: "訂閱源",
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
    discoverAria: "Today’s picks",
    discoverTitle: "Today’s picks",
    discoverWeek: "This week",
    discoverNewsKicker: "AI highlights",
    discoverNewsMore: "Full daily digest",
    discoverRereadKicker: "Reread",
    discoverRereadGo: "Read again →",
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
    progressHint:
      "Progress is saved in this browser. Tap the left control to toggle; opening an article also marks it read.",
    progressOf: (done, total) => `${done}/${total} read`,
    markDone: "Mark as read",
    unmarkDone: "Unmark read",
  },
  changelog: {
    lead: "Product and UX updates for this site — not an article feed.",
    empty: "No changelog entries yet",
    more: "Learn more →",
  },
  scraps: {
    empty: "No scraps yet — write one.",
    readMore: "Read scrap →",
    back: "← All scraps",
    navAria: "Nearby scraps",
    older: "Older",
    newer: "Newer",
  },
  lab: {
    stageKicker: "Live playground",
    stageTitle: "Theme variables",
    stageDesc:
      "Swap CSS variables live — independent of the site dark mode. Pick a swatch and watch the preview update.",
    stageSample:
      "This panel is driven by the demo’s injected variables: background, text, and accent.",
    themeAria: "Choose theme",
    currentTheme: "Theme",
    spring: "Tap",
    catalogTitle: "Experiments",
    catalogCount: (n) => `${n}`,
    kindLive: "Inline",
    kindPage: "Page",
    back: "← Back to Lab",
    groupFx: "Effects",
    groupFeat: "Feature experiments",
    groupCss: "CSS basics",
    flexTitle: "Flex Gap",
    flexLead: "Drag the slider to compare gap vs negative-margin spacing.",
    gapLabel: "Gap",
    gapWay: "With gap",
    marginWay: "With negative margin",
    catalogThemeDesc: "Swap CSS variables live — independent of site dark mode.",
    catalogFlexDesc: "Compare gap vs negative margin with a slider.",
    catalogClampDesc: "Tweak min / preferred / max and watch fluid type clamp.",
    catalogGridDesc: "auto-fit + minmax — change min column width and columns reflow.",
    catalogSnapDesc: "Swipe a horizontal card strip with scroll-snap.",
    catalogEaseDesc: "Side-by-side linear / ease / custom cubic-bezier.",
    catalogMixDesc: "Drag the mix ratio for color-mix(in srgb, …).",
    catalogSpotDesc: "Dark veil + radial spotlight that reveals content under the cursor.",
    catalogTiltDesc: "Perspective tilt with a glare that follows the pointer.",
    catalogScrambleDesc: "Hacker-movie scramble that resolves into plaintext.",
    catalogParticleDesc: "Canvas particle trail that follows the pointer.",
    catalogMagDesc: "Buttons that drift toward the cursor when nearby.",
    catalogCmdDesc: "Mini ⌘K palette: filter, arrow keys, run actions.",
    clampTitle: "clamp() fluid type",
    clampLead: "Simulate container width and see clamp(min, preferred, max) resolve.",
    clampMin: "Min",
    clampPref: "Preferred",
    clampMax: "Max",
    clampWidth: "Width",
    clampSample: "Fluid type sample",
    clampHint: "Estimated for this width",
    gridTitle: "Grid auto-fit",
    gridLead: "Change the min column size and watch auto-fit add or drop columns.",
    gridMin: "Min column",
    snapTitle: "Scroll Snap",
    snapLead: "Swipe cards sideways — snap points come from scroll-snap.",
    snapHint: "Swipe the track, or use a trackpad horizontal scroll.",
    snapSlide: "Snap card",
    easeTitle: "Easing curves",
    easeLead: "Same distance, different timing-functions — watch the dots travel.",
    easeReplay: "Replay",
    mixTitle: "color-mix",
    mixLead: "Blend two colors by percentage — native in modern browsers.",
    mixAmount: "Share of A",
    spotTitle: "Spotlight reveal",
    spotLead: "A radial mask spotlight — where the pointer goes, content lights up.",
    spotHidden: "Title in the dark",
    spotBody:
      "The copy is always there, just covered. Move the pointer like a flashlight across a wall.",
    spotHint: "Move the pointer inside this area",
    tiltTitle: "3D tilt card",
    tiltLead: "rotateX / rotateY from pointer position, plus a following glare.",
    tiltCardTitle: "A tiltable panel",
    tiltCardDesc: "Move your pointer across the card for a slight 3D follow.",
    scrambleTitle: "Text scramble",
    scrambleLead: "Spray glyphs, then resolve them into the target line.",
    scrambleReplay: "Decode again",
    scrambleLine1: "PENN NOTES LAB",
    scrambleLine2: "Decode complete",
    scrambleLine3: "scramble → plaintext",
    particleTitle: "Particle trail",
    particleLead: "Soft glowing particles on a canvas, trailing the pointer.",
    particleHint: "Move inside the dark stage",
    magTitle: "Magnetic buttons",
    magLead: "Nearby buttons ease toward the cursor — a magnetic UI pull.",
    magHint: "Move slowly near the buttons",
    magPrimary: "Primary",
    magSecondary: "Secondary",
    magGhost: "Ghost",
    cmdTitle: "Command palette",
    cmdLead: "A working mini ⌘K: filter commands, keyboard select, run side effects.",
    cmdOpen: "Open palette",
    cmdClose: "Close",
    cmdTip: "Or press ⌘/Ctrl + K",
    cmdPlaceholder: "Type a command…",
    cmdEmpty: "No matching commands",
    cmdPreviewTitle: "Preview",
    cmdPreviewBody: "Running a command leaves visible feedback here and on the page.",
    cmdToast: "Show toast",
    cmdToastHint: "Flash a toast in the board",
    cmdToastDone: "Command ran",
    cmdFocus: "Toggle focus mode",
    cmdFocusHint: "Dim chrome and emphasize content",
    cmdFocusOn: "Lab focus on",
    cmdFocusOff: "Lab focus off",
    cmdShake: "Shake board",
    cmdShakeHint: "Give the preview a quick shake",
    cmdShakeDone: "Shake done",
    cmdTheme: "Toggle board theme",
    cmdThemeHint: "Swap the command experiment surface",
    cmdThemeDone: "Board theme toggled",
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
    rssSectionsHint: "Or subscribe to a section feed below / filter the stream",
    readOriginal: "Read original",
    emptyDay: "(No new items today)",
    weekTitle: "This week",
    weekLead: "Last 7 digests and selected items",
    weekEmpty: "Nothing this week yet",
    weekPicks: "Week’s picks",
    weekdays: {
      sun: "Sun",
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
    },
    sourcesTitle: "Feed health",
    sourcesLead: "Which RSS feeds power AI news, and how the latest fetch went",
    sourcesWhyKicker: "What this page is",
    sourcesWhy:
      "AI news isn’t hand-pasted. Each day we pull candidates from dozens of RSS feeds, then curate the digest. This page is the fetch report: which sources succeeded and which briefly failed—handy when a familiar outlet is missing. Failures are usually rate limits or blips and often clear on their own.",
    sourcesSnapshot: "Latest fetch",
    sourcesOk: "OK",
    sourcesFailed: "Failed",
    sourcesRate: "Success rate",
    sourcesTarget: "For date",
    sourcesUpdated: (at) => `Checked ${at}`,
    sourcesNone: "No health data yet (appears after build)",
    sourcesFailTitle: "Failed this run",
    sourcesFailHint: "Usually rate limits or temporary outages",
    sourcesAllOk: "All feeds fetched successfully",
    sourcesOkTitle: "Succeeded this run",
    sourcesOkCount: (n) => `${n} feeds`,
    sourcesItems: (n) => `${n} items`,
    sourcesItemsUnit: "items",
    sourcesTop: "Top contributors",
    sourcesRest: "Also returned items",
    sourcesQuiet: "No new items this run",
    sourcesQuietCount: (n) => `${n}`,
    sourcesErr400: "Bad request",
    sourcesErr401: "Auth required",
    sourcesErr403: "Access denied",
    sourcesErr404: "Feed URL not found",
    sourcesErr410: "Feed gone / retired",
    sourcesErr429: "Rate limited — try later",
    sourcesErr5xx: "Upstream server error",
    sourcesErrTimeout: "Request timed out",
    sourcesErrNetwork: "Network or DNS unreachable",
    sourcesErrGeneric: "Fetch failed — see raw error",
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
    filterAria: "Filter by tag",
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
    changelogKicker: "Changelog",
    changelogTitle: "Changelog",
    changelogLead: "Product and UX updates — not an article list",
    scrapsKicker: "Scraps",
    scrapsTitle: "Short notes",
    scrapsLead: "Bite-sized notes outside long-form posts",
    labKicker: "Lab",
    labTitle: "Lab",
    labLead: "Effects, feature prototypes, and CSS playgrounds",
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
    newsWeek: "This week",
    newsSources: "Feed health",
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
