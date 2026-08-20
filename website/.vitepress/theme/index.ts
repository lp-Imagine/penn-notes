import mediumZoom, { type Zoom } from "medium-zoom";
import { nextTick, onMounted, watch, defineComponent, h } from "vue";
import { useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import AboutFriends from "./AboutFriends.vue";
import NewsArchive from "./NewsArchive.vue";
import NewsDigestEnhance from "./NewsDigestEnhance.vue";
import NewsRssSubscribe from "./NewsRssSubscribe.vue";
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
    nextTick(() => refreshZoom());
  }, 80);
}

const Layout = defineComponent({
  name: "PennLayout",
  setup(_props, { slots }) {
    const route = useRoute();
    return () => {
      const isHome =
        route.path === "/" || route.path.endsWith("/index.html");
      const layoutClass = ["site-layout", isHome ? "home-layout" : ""]
        .filter(Boolean)
        .join(" ");
      return h(
        DefaultTheme.Layout,
        { class: layoutClass },
        {
          ...slots,
          "doc-top": () => [slots["doc-top"]?.(), h(NewsDigestEnhance)],
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
      },
    );
  },
  enhanceApp({ app }) {
    app.component("AboutFriends", AboutFriends);
    app.component("NewsArchive", NewsArchive);
    app.component("NewsRssSubscribe", NewsRssSubscribe);
  },
};
