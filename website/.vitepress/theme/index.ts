import mediumZoom, { type Zoom } from "medium-zoom";
import { nextTick, onMounted, watch, defineComponent, h } from "vue";
import { getScrollOffset, useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import AboutFriends from "./AboutFriends.vue";
import Comments from "./Comments.vue";
import NewsArchive from "./NewsArchive.vue";
import NewsDigestEnhance from "./NewsDigestEnhance.vue";
import NewsRssSubscribe from "./NewsRssSubscribe.vue";
import NotesArchive from "./NotesArchive.vue";
import RelatedPosts from "./RelatedPosts.vue";
import SeriesNav from "./SeriesNav.vue";
import TagsBrowse from "./TagsBrowse.vue";
import "./custom.css";

let zoom: Zoom | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let observer: MutationObserver | undefined;

const NOTE_SECTIONS = ["web", "ui", "tech", "computer", "agent", "misc"];

/** 剥离 base 后的站点路径，如 /web/javascript/foo */
function sitePath(routePath: string, base = "/") {
  const b = (base || "/").replace(/\/$/, "");
  if (b && b !== "/" && routePath.startsWith(b)) {
    return routePath.slice(b.length) || "/";
  }
  return routePath || "/";
}

/** 笔记正文详情页（非栏目索引、非 AI 动态、非关于/首页） */
function isNoteArticleDetail(path: string) {
  if (path.startsWith("/news")) return false;
  if (path === "/about" || path === "/about/") return false;
  if (path === "/" || path.endsWith("/index.html")) return false;

  for (const section of NOTE_SECTIONS) {
    const prefix = `/${section}/`;
    if (path.startsWith(prefix)) {
      const rest = path.slice(prefix.length).replace(/\/$/, "");
      return rest.length > 0;
    }
    if (path === `/${section}` || path === `/${section}/`) return false;
  }
  return false;
}

/** AI 动态日报详情（不含 /news/ 归档首页） */
function isNewsDigestDetail(path: string) {
  return /\/news\/\d{4}-\d{2}\/ai-news-/.test(path);
}

function currentSitePath() {
  if (typeof location === "undefined") return "/";
  return sitePath(location.pathname);
}

function isReadableDetail(path = currentSitePath()) {
  return isNoteArticleDetail(path) || isNewsDigestDetail(path);
}

const SIDEBAR_KEY = "penn-sidebar-collapsed";
let sidebarToggleBtn: HTMLButtonElement | null = null;
let sidebarObserver: MutationObserver | undefined;

function applySidebarToggleState() {
  if (!sidebarToggleBtn) return;
  const collapsed = document.documentElement.classList.contains("sidebar-collapsed");
  sidebarToggleBtn.classList.toggle("is-collapsed", collapsed);
}

function createSidebarToggle() {
  if (sidebarToggleBtn || typeof document === "undefined") return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sidebar-toggle";
  btn.setAttribute("aria-label", "收起/展开左侧菜单");
  btn.innerHTML = '<span class="sidebar-toggle-chevron"></span>';
  btn.addEventListener("click", () => {
    const collapsed = document.documentElement.classList.toggle("sidebar-collapsed");
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore storage errors
    }
    applySidebarToggleState();
  });
  document.body.appendChild(btn);
  sidebarToggleBtn = btn;
  applySidebarToggleState();
}

function updateSidebarToggleVisibility() {
  if (!sidebarToggleBtn) return;
  // 只有带左侧菜单的页面（文章详情等）显示按钮；SPA 切换路由时跟随更新
  const hasSidebar = Boolean(document.querySelector(".VPContent.has-sidebar"));
  document.body.classList.toggle("has-vp-sidebar", hasSidebar);
}

// ---- 侧栏滚动条：滚动中短暂显示 ----
let sidebarScrollHideTimer: ReturnType<typeof setTimeout> | undefined;

function bindSidebarOverlayScrollbar() {
  const sidebar = document.querySelector<HTMLElement>(".VPSidebar");
  if (!sidebar || sidebar.dataset.overlayScrollBound === "1") return;
  sidebar.dataset.overlayScrollBound = "1";
  sidebar.addEventListener(
    "scroll",
    () => {
      sidebar.classList.add("is-scrolling");
      clearTimeout(sidebarScrollHideTimer);
      sidebarScrollHideTimer = setTimeout(() => {
        sidebar.classList.remove("is-scrolling");
      }, 700);
    },
    { passive: true },
  );
}

// ---- 顶栏分类：按宽度把装不下的项收进「...」----
// VitePress Extra「...」只放外观/社交。分类项要按顶栏可视宽度自己收纳。
let navOverflowBound = false;
let navOverflowRaf = 0;
let navOverflowObserver: ResizeObserver | undefined;
let navOverflowFlyout: HTMLDivElement | null = null;

function navMenuItems(menu: HTMLElement) {
  return [...menu.children].filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      !el.classList.contains("penn-nav-more") &&
      (el.matches("a") || el.classList.contains("VPNavBarMenuGroup")),
  );
}

function extraIsVisible() {
  const extra = document.querySelector<HTMLElement>(".VPNavBarExtra");
  if (!extra) return false;
  return getComputedStyle(extra).display !== "none";
}

function extraOverflowGroup() {
  const extra = document.querySelector<HTMLElement>(".VPNavBarExtra .VPMenu");
  if (!extra) return null;
  let group = extra.querySelector<HTMLElement>(".penn-nav-overflow-items");
  if (!group) {
    group = document.createElement("div");
    group.className = "penn-nav-overflow-items group";
    extra.prepend(group);
  }
  return group;
}

function ensureNavOverflowFlyout(menu: HTMLElement) {
  if (navOverflowFlyout?.isConnected) return navOverflowFlyout;
  const el = document.createElement("div");
  el.className = "penn-nav-more VPFlyout";
  el.innerHTML = `
    <button type="button" class="button" aria-label="更多导航" aria-haspopup="true" aria-expanded="false">
      <span class="vpi-more-horizontal icon"></span>
    </button>
    <div class="menu">
      <div class="VPMenu">
        <div class="penn-nav-overflow-items group"></div>
      </div>
    </div>
  `;
  const btn = el.querySelector<HTMLButtonElement>("button");
  const setOpen = (open: boolean) => {
    el.classList.toggle("is-open", open);
    btn?.setAttribute("aria-expanded", open ? "true" : "false");
  };
  btn?.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!el.classList.contains("is-open"));
  });
  el.addEventListener("mouseenter", () => setOpen(true));
  el.addEventListener("mouseleave", () => setOpen(false));
  document.addEventListener("click", (e) => {
    if (!el.contains(e.target as Node)) setOpen(false);
  });
  menu.after(el);
  navOverflowFlyout = el;
  return el;
}

function fillOverflowGroup(group: HTMLElement, hidden: HTMLElement[]) {
  group.replaceChildren();
  for (const item of hidden) {
    const href = item.getAttribute("href") || item.querySelector("a")?.getAttribute("href") || "";
    const text = (item.textContent || "").trim();
    const a = document.createElement("a");
    a.className = "penn-nav-overflow-link";
    if (href) a.setAttribute("href", href);
    a.textContent = text;
    if (item.classList.contains("active") || item.querySelector(".active")) {
      a.classList.add("active");
    }
    group.appendChild(a);
  }
}

function updateNavOverflow() {
  const menu = document.querySelector<HTMLElement>(".VPNavBarMenu");
  if (!menu) return;

  const items = navMenuItems(menu);
  if (!items.length) return;

  const desktop = window.matchMedia("(min-width: 768px)").matches;
  if (!desktop) {
    for (const item of items) item.classList.remove("is-nav-overflow");
    navOverflowFlyout?.classList.remove("is-visible");
    extraOverflowGroup()?.replaceChildren();
    return;
  }

  for (const item of items) item.classList.remove("is-nav-overflow");
  navOverflowFlyout?.classList.remove("is-visible");

  const extraVisible = extraIsVisible();
  const flyout = extraVisible ? navOverflowFlyout : ensureNavOverflowFlyout(menu);
  flyout?.classList.remove("is-visible");

  const widths = items.map((item) => item.getBoundingClientRect().width);
  const menuWidth = menu.clientWidth;
  const total = widths.reduce((sum, w) => sum + w, 0);
  const fitsAll = total <= menuWidth - 4;
  const flyoutWidth = extraVisible ? 0 : 40;
  const available = fitsAll ? menuWidth : Math.max(0, menuWidth - flyoutWidth - 4);

  let hideFrom = items.length;
  let used = 0;
  for (let i = 0; i < items.length; i++) {
    if (used + widths[i] > available) {
      hideFrom = Math.max(1, i);
      break;
    }
    used += widths[i];
  }

  if (hideFrom >= items.length) {
    extraOverflowGroup()?.replaceChildren();
    flyout?.classList.remove("is-visible");
    return;
  }

  const hidden = items.slice(hideFrom);
  for (const item of hidden) item.classList.add("is-nav-overflow");

  if (extraVisible) {
    const group = extraOverflowGroup();
    if (group) {
      fillOverflowGroup(group, hidden);
    } else {
      const fallback = ensureNavOverflowFlyout(menu);
      const fallbackGroup = fallback.querySelector<HTMLElement>(".penn-nav-overflow-items");
      if (fallbackGroup) fillOverflowGroup(fallbackGroup, hidden);
      fallback.classList.add("is-visible");
    }
  } else if (flyout) {
    const group = flyout.querySelector<HTMLElement>(".penn-nav-overflow-items");
    if (group) fillOverflowGroup(group, hidden);
    flyout.classList.add("is-visible");
  }
}

function setupNavOverflow() {
  if (navOverflowBound || typeof document === "undefined") return;
  navOverflowBound = true;
  const schedule = () => {
    if (navOverflowRaf) cancelAnimationFrame(navOverflowRaf);
    navOverflowRaf = requestAnimationFrame(updateNavOverflow);
  };
  window.addEventListener("resize", schedule);
  const nav = document.querySelector(".VPNavBar");
  if (nav && typeof ResizeObserver !== "undefined") {
    navOverflowObserver = new ResizeObserver(schedule);
    navOverflowObserver.observe(nav);
  }
  schedule();
}

// ---- 阅读进度条（笔记正文 + AI 动态日报详情）----
let progressBar: HTMLDivElement | null = null;

function updateReadingProgress() {
  if (!progressBar) return;
  const show = isReadableDetail();
  progressBar.classList.toggle("is-hidden", !show);
  if (!show) {
    progressBar.style.transform = "scaleX(0)";
    return;
  }
  const scrollEl = document.scrollingElement || document.documentElement;
  const scrollTop = window.scrollY ?? scrollEl.scrollTop;
  const max = scrollEl.scrollHeight - scrollEl.clientHeight;
  const ratio = max > 0 ? Math.min(1, scrollTop / max) : 0;
  progressBar.style.transform = `scaleX(${ratio})`;
}

function setupReadingProgress() {
  if (progressBar || typeof document === "undefined") return;
  const bar = document.createElement("div");
  bar.className = "reading-progress is-hidden";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  progressBar = bar;
  window.addEventListener(
    "scroll",
    () => requestAnimationFrame(updateReadingProgress),
    { passive: true },
  );
  window.addEventListener("resize", updateReadingProgress);
  updateReadingProgress();
}

// ---- 章节索引高亮 ----
// VitePress 默认：有左侧栏时要 ≥1280px 才 spy。本站从 ~1000px 就显示右侧大纲，
// 中间宽度不会加 .active。中文标题 href 编码也可能对不上。这里自己跟一次。
let outlineSpyBound = false;
let outlineSpyRaf = 0;
let pinnedOutlineLink: HTMLAnchorElement | null = null;
let pinTimer: ReturnType<typeof setTimeout> | undefined;

function outlineHash(href: string) {
  const hash = href.split("#")[1] || "";
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

function findHeading(id: string) {
  if (!id) return null;
  return (
    document.getElementById(id) ||
    document.getElementById(encodeURIComponent(id)) ||
    document.querySelector<HTMLElement>(
      `[id="${CSS.escape(id)}"], [id="${CSS.escape(encodeURIComponent(id))}"]`,
    )
  );
}

/** 获取页面中所有有效的大纲容器（桌面右侧 + 移动端下拉） */
function outlineContainers(): HTMLElement[] {
  const els: HTMLElement[] = [];
  const aside = document.querySelector<HTMLElement>(".VPDocAsideOutline.has-outline");
  if (aside) els.push(aside);
  // 移动端"章节索引"下拉菜单（不管是否展开，都要维护 active 状态）
  const dropdown = document.querySelector<HTMLElement>(".VPLocalNavOutlineDropdown");
  if (dropdown) els.push(dropdown);
  return els;
}

function applyOutlineActive(active: HTMLAnchorElement | null) {
  const containers = outlineContainers();
  if (!containers.length) return;
  for (const outline of containers) {
    const links = [...outline.querySelectorAll<HTMLAnchorElement>("a.outline-link")];
    for (const link of links) {
      // 通过 href 匹配，而不是引用相等，避免桌面/移动两套 DOM 互相干扰
      const isActive =
        active !== null && outlineHash(link.getAttribute("href") || "") === outlineHash(active.getAttribute("href") || "");
      link.classList.toggle("active", isActive);
    }
    const marker = outline.querySelector<HTMLElement>(".outline-marker");
    if (!marker) continue;
    if (active) {
      // 找到本容器中对应 active href 的 link，计算 marker 位置
      const matchedLink = links.find(
        (l) => outlineHash(l.getAttribute("href") || "") === outlineHash(active.getAttribute("href") || ""),
      );
      if (matchedLink) {
        const top = matchedLink.offsetTop + Math.max(0, (matchedLink.offsetHeight - 18) / 2);
        marker.style.top = `${top}px`;
        marker.style.opacity = "1";
      }
    } else {
      marker.style.opacity = "0";
    }
  }
}

function updateOutlineActive() {
  const containers = outlineContainers();
  if (!containers.length) return;

  if (pinnedOutlineLink?.isConnected) {
    applyOutlineActive(pinnedOutlineLink);
    return;
  }

  // 收集所有 outline-link（去重 href），用于判断当前滚动位置
  const seen = new Set<string>();
  const links: HTMLAnchorElement[] = [];
  for (const outline of containers) {
    for (const link of outline.querySelectorAll<HTMLAnchorElement>("a.outline-link")) {
      const href = link.getAttribute("href") || "";
      if (!seen.has(href)) {
        seen.add(href);
        links.push(link);
      }
    }
  }
  if (!links.length) return;

  const offset = Math.max(getScrollOffset(), 64) + 8;
  let active: HTMLAnchorElement | null = null;
  for (const link of links) {
    const heading = findHeading(outlineHash(link.getAttribute("href") || ""));
    if (!heading) continue;
    if (heading.getBoundingClientRect().top <= offset) active = link;
  }

  applyOutlineActive(active);
}

function onOutlineClick(e: Event) {
  const target = e.target as HTMLElement | null;
  const a = target?.closest?.("a.outline-link");
  if (!(a instanceof HTMLAnchorElement)) return;
  const id = outlineHash(a.getAttribute("href") || "");
  const heading = findHeading(id);
  if (!heading) return;
  e.preventDefault();
  pinnedOutlineLink = a;
  applyOutlineActive(a);
  heading.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `${location.pathname}${location.search}#${encodeURIComponent(id)}`);
  clearTimeout(pinTimer);
  pinTimer = setTimeout(() => {
    pinnedOutlineLink = null;
    updateOutlineActive();
  }, 600);
}

function setupOutlineSpy() {
  if (outlineSpyBound || typeof document === "undefined") return;
  outlineSpyBound = true;
  const onScroll = () => {
    if (outlineSpyRaf) return;
    outlineSpyRaf = requestAnimationFrame(() => {
      outlineSpyRaf = 0;
      updateOutlineActive();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("hashchange", updateOutlineActive);
  document.addEventListener("click", onOutlineClick, true);
  updateOutlineActive();
}

// ---- 移动端：回到顶部 ----
const BACK_TOP_SHOW_Y = 420;
let backTopBtn: HTMLButtonElement | null = null;

function setupBackToTop() {
  if (backTopBtn || typeof document === "undefined") return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "back-to-top";
  btn.setAttribute("aria-label", "回到顶部");
  btn.innerHTML =
    '<svg class="back-to-top-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  btn.addEventListener("click", () => {
    btn.blur();
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
  document.body.appendChild(btn);
  backTopBtn = btn;

  const update = () => {
    const show =
      window.scrollY > BACK_TOP_SHOW_Y &&
      !window.matchMedia("(min-width: 960px)").matches;
    btn.classList.toggle("is-visible", show);
  };
  window.addEventListener("scroll", () => requestAnimationFrame(update), {
    passive: true,
  });
  window.addEventListener("resize", update);
  update();
}

// ---- 预计阅读时间（笔记正文 + AI 动态日报详情）----
// 中文 350 字/分（技术文精读）、英文/数字词 200 词/分，
// 代码块单独计时（约 25 行/分，最多计 5 分钟，避免把快速扫代码的读者算太高）
function clearReadingTime(doc: Element) {
  doc.querySelectorAll(".reading-time, .reading-time-standalone").forEach((n) => n.remove());
}

function estimateReadingMinutes(doc: Element) {
  const clone = doc.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(
      "script, style, .article-meta, .article-cover, .reading-time, .reading-time-standalone",
    )
    .forEach((n) => n.remove());
  let codeLines = 0;
  clone.querySelectorAll("pre").forEach((pre) => {
    codeLines += (pre.textContent?.match(/\n/g)?.length ?? 0) + 1;
    pre.remove();
  });
  const text = (clone.textContent ?? "").replace(/\s+/g, "");
  const cn = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const en =
    (text.match(/[a-zA-Z]+/g) ?? []).length +
    (text.match(/[0-9]+/g) ?? []).length;
  return Math.max(
    1,
    Math.round(cn / 350 + en / 200 + Math.min(codeLines / 25, 5)),
  );
}

function updateReadingTime() {
  nextTick(() => {
    const doc = document.querySelector(".vp-doc");
    if (!doc) return;
    const path = currentSitePath();
    const isNote = isNoteArticleDetail(path);
    const isNews = isNewsDigestDetail(path);
    if (!isNote && !isNews) {
      clearReadingTime(doc);
      return;
    }
    const minutes = estimateReadingMinutes(doc);
    const label = `约 ${minutes} 分钟读完`;

    if (isNote) {
      const meta = doc.querySelector(".article-meta");
      if (!meta) return;
      let el = meta.querySelector<HTMLElement>(".reading-time");
      if (!el) {
        el = document.createElement("span");
        el.className = "reading-time";
        meta.appendChild(el);
      }
      el.textContent = ` · ${label}`;
      return;
    }

    let el = doc.querySelector<HTMLElement>(".reading-time-standalone");
    if (!el) {
      el = document.createElement("p");
      el.className = "article-meta reading-time-standalone";
      const h1 = doc.querySelector("h1");
      if (h1) h1.insertAdjacentElement("afterend", el);
      else doc.prepend(el);
    }
    const date =
      doc.querySelector("time[datetime]")?.getAttribute("datetime") || "";
    const key = `${date}|${minutes}`;
    if (el.dataset.rendered === key) return;
    el.dataset.rendered = key;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      el.replaceChildren();
      const time = document.createElement("time");
      time.dateTime = date;
      time.textContent = date;
      const span = document.createElement("span");
      span.className = "reading-time";
      span.textContent = ` · ${label}`;
      el.append(time, span);
    } else {
      el.textContent = label;
    }
  });
}

// ---- 新闻配图：加载失败或站标占位时直接隐藏，不留破图/logo ----
const LOGO_SRC_RE =
  /1613febb1fb7|gstatic\.com\/.*gnews|google-og-image|favicon\.ico|apple-touch-icon/i;

function hideBrokenNewsImage(img: HTMLImageElement) {
  img.classList.add("news-img-hidden");
  img.setAttribute("hidden", "");
  img.removeAttribute("src");
  img.style.display = "none";
  // 归档/首页卡片：去掉 media 布局类，避免留白
  const card = img.closest(
    ".news-item-card--media, .news-card--media, .section-card--media",
  );
  if (card) {
    card.classList.remove(
      "news-item-card--media",
      "news-card--media",
      "section-card--media",
    );
    img.closest(".news-item-media, .section-card-media")?.remove();
  }
}

function bindNewsImageFallback(rootEl: ParentNode = document) {
  const imgs = rootEl.querySelectorAll<HTMLImageElement>(
    '.vp-doc img[alt="配图"], .news-item-thumb, .news-card-thumb, .section-card-thumb',
  );
  imgs.forEach((img) => {
    if (img.dataset.newsImgBound === "1") return;
    img.dataset.newsImgBound = "1";
    const src = img.getAttribute("src") || "";
    if (LOGO_SRC_RE.test(src)) {
      hideBrokenNewsImage(img);
      return;
    }
    img.addEventListener(
      "error",
      () => {
        hideBrokenNewsImage(img);
      },
      { once: true },
    );
    // 已缓存失败的图：complete && naturalWidth===0
    if (img.complete && img.naturalWidth === 0 && src) {
      hideBrokenNewsImage(img);
    }
  });
}

function collectImages(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLImageElement>(".vp-doc img"),
  ).filter((img) => {
    if (img.classList.contains("no-zoom")) return false;
    if (img.classList.contains("about-friend-avatar")) return false;
    if (img.classList.contains("VPImage")) return false;
    if (img.classList.contains("section-card-thumb")) return false;
    if (img.classList.contains("news-img-hidden")) return false;
    if (img.closest("a")) return false;
    return Boolean(img.getAttribute("src"));
  });
}

function refreshZoom() {
  zoom?.detach();
  zoom = undefined;
  const images = collectImages();
  if (!images.length) return;
  zoom = mediumZoom(images, {
    background: "rgba(0, 0, 0, 0.84)",
    margin: 16,
  });
}

function scheduleRefresh() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    nextTick(() => {
      bindNewsImageFallback();
      refreshZoom();
      updateReadingTime();
      updateReadingProgress();
      updateOutlineActive();
    });
  }, 80);
}

const Layout = defineComponent({
  name: "PennLayout",
  setup(_props, { slots }) {
    const route = useRoute();
    return () => {
      const path = sitePath(route.path);
      const isHome = path === "/" || path.endsWith("/index.html");
      const layoutClass = ["site-layout", isHome ? "home-layout" : ""]
        .filter(Boolean)
        .join(" ");
      const showArticleExtras = isNoteArticleDetail(path);
      return h(
        DefaultTheme.Layout,
        { class: layoutClass },
        {
          ...slots,
          "doc-before": () => [
            slots["doc-before"]?.(),
            h(NewsDigestEnhance),
            showArticleExtras ? h(SeriesNav, { key: `series-${path}` }) : null,
          ],
          "doc-after": () => [
            slots["doc-after"]?.(),
            showArticleExtras
              ? h(RelatedPosts, { key: `related-${path}` })
              : null,
            showArticleExtras
              ? h(Comments, { key: `giscus-${path}` })
              : null,
          ],
        },
      );
    };
  },
});

export default {
  extends: DefaultTheme,
  Layout,
  // VitePress theme-level setup (runs on client; official medium-zoom pattern)
  setup() {
    const route = useRoute();
    onMounted(() => {
      scheduleRefresh();
      const content = document.querySelector(".VPContent") || document.getElementById("app");
      if (content && !observer) {
        observer = new MutationObserver(() => scheduleRefresh());
        observer.observe(content, { childList: true, subtree: true });
      }
      // 左侧菜单收起/展开：恢复记忆状态（仅桌面端生效，移动端不加类以免影响目录抽屉）+ 创建按钮 + 跟随路由更新可见性
      try {
        const collapsed =
          localStorage.getItem(SIDEBAR_KEY) === "1" &&
          window.matchMedia("(min-width: 960px)").matches;
        if (collapsed) document.documentElement.classList.add("sidebar-collapsed");
      } catch {
        // ignore storage errors
      }
      const onViewportResize = () => {
        const isDesktop = window.matchMedia("(min-width: 960px)").matches;
        if (isDesktop) {
          // 恢复桌面端记忆状态
          try {
            if (localStorage.getItem(SIDEBAR_KEY) === "1") {
              document.documentElement.classList.add("sidebar-collapsed");
            }
          } catch {
            // ignore
          }
        } else {
          // 移动端移除收起类，保证「目录」抽屉可正常打开
          document.documentElement.classList.remove("sidebar-collapsed");
        }
        updateSidebarToggleVisibility();
      };
      window.addEventListener("resize", onViewportResize);
      createSidebarToggle();
      updateSidebarToggleVisibility();
      bindSidebarOverlayScrollbar();
      setupReadingProgress();
      setupOutlineSpy();
      setupNavOverflow();
      setupBackToTop();
      updateReadingTime();
      bindNewsImageFallback();
      const vpContent = document.querySelector(".VPContent");
      if (vpContent && !sidebarObserver) {
        sidebarObserver = new MutationObserver(() => updateSidebarToggleVisibility());
        sidebarObserver.observe(vpContent, { attributes: true, attributeFilter: ["class"] });
      }
    });
    watch(
      () => route.path,
      () => {
        scheduleRefresh();
        updateSidebarToggleVisibility();
        bindSidebarOverlayScrollbar();
        updateReadingTime();
        updateReadingProgress();
        requestAnimationFrame(updateOutlineActive);
        requestAnimationFrame(updateNavOverflow);
        pinnedOutlineLink = null;
      },
    );
  },
  enhanceApp({ app }) {
    app.component("AboutFriends", AboutFriends);
    app.component("NewsArchive", NewsArchive);
    app.component("NewsRssSubscribe", NewsRssSubscribe);
    app.component("TagsBrowse", TagsBrowse);
    app.component("NotesArchive", NotesArchive);
  },
};
