import mediumZoom, { type Zoom } from "medium-zoom";
import { nextTick, onMounted, watch, defineComponent, h } from "vue";
import { useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import AboutFriends from "./AboutFriends.vue";
import Comments from "./Comments.vue";
import NewsArchive from "./NewsArchive.vue";
import NewsDigestEnhance from "./NewsDigestEnhance.vue";
import NewsRssSubscribe from "./NewsRssSubscribe.vue";
import RelatedPosts from "./RelatedPosts.vue";
import "./custom.css";

let zoom: Zoom | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let observer: MutationObserver | undefined;

// ---- 左侧菜单收起/展开 ----
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

// ---- 阅读进度条 ----
let progressBar: HTMLDivElement | null = null;

function setupReadingProgress() {
  if (progressBar || typeof document === "undefined") return;
  const bar = document.createElement("div");
  bar.className = "reading-progress";
  document.body.appendChild(bar);
  progressBar = bar;
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const ratio = max > 0 ? Math.min(1, doc.scrollTop / max) : 0;
    bar.style.transform = `scaleX(${ratio})`;
  };
  window.addEventListener(
    "scroll",
    () => requestAnimationFrame(update),
    { passive: true },
  );
  window.addEventListener("resize", update);
  update();
}

// ---- 预计阅读时间：按正文字数（中文约 400 字/分钟）计算，插入文章头部 meta ----
function updateReadingTime() {
  nextTick(() => {
    const doc = document.querySelector(".vp-doc");
    if (!doc) return;
    const clone = doc.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("pre, code, script, style, .article-meta, .article-cover")
      .forEach((n) => n.remove());
    const text = (clone.textContent ?? "").replace(/\s+/g, "");
    const minutes = Math.max(1, Math.round(text.length / 400));
    const label = `约 ${minutes} 分钟读完`;
    const meta = doc.querySelector(".article-meta");
    if (meta) {
      let el = meta.querySelector<HTMLElement>(".reading-time");
      if (!el) {
        el = document.createElement("span");
        el.className = "reading-time";
        meta.appendChild(el);
      }
      el.textContent = ` · ${label}`;
    } else {
      let el = doc.querySelector<HTMLElement>(".reading-time-standalone");
      if (!el) {
        el = document.createElement("div");
        el.className = "reading-time-standalone";
        doc.prepend(el);
      }
      el.textContent = label;
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
      refreshZoom();
      updateReadingTime();
    });
  }, 80);
}

const Layout = defineComponent({
  name: "PennLayout",
  setup(_props, { slots }) {
    const route = useRoute();
    return () => {
      // route.path 在浏览器里带 base 前缀（如 /penn-notes/agent/...），先剥离再判断
      const base = "/penn-notes";
      const p = route.path.startsWith(base) ? route.path.slice(base.length) : route.path;
      const path = p || "/";
      const isHome = path === "/" || path.endsWith("/index.html");
      const layoutClass = ["site-layout", isHome ? "home-layout" : ""]
        .filter(Boolean)
        .join(" ");
      // 评论只在文章页显示：排除 AI 动态（/news/）与关于页（/about/）
      const showComments = !(
        path.startsWith("/news") ||
        path === "/about" ||
        path === "/about/"
      );
      return h(
        DefaultTheme.Layout,
        { class: layoutClass },
        {
          ...slots,
          "doc-top": () => [slots["doc-top"]?.(), h(NewsDigestEnhance)],
          "doc-after": () => [
            slots["doc-after"]?.(),
            h(RelatedPosts),
            showComments ? h(Comments) : null,
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
      setupReadingProgress();
      updateReadingTime();
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
        updateReadingTime();
      },
    );
  },
  enhanceApp({ app }) {
    app.component("AboutFriends", AboutFriends);
    app.component("NewsArchive", NewsArchive);
    app.component("NewsRssSubscribe", NewsRssSubscribe);
  },
};
