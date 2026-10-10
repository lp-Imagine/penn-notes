<script setup lang="ts">
/**
 * Artalk 评论
 * - 懒加载：滚到评论区附近再初始化
 * - SPA：换页后 update pageKey 并 reload
 * - 配色跟站点 CSS 变量（浅色 / 深色 / 专注模式）
 * - 图片经 /api/comment-images 压缩后进 COS，不直传桶
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData, useRoute, withBase } from "vitepress";
import { useI18n } from "./i18n";
import { artalkApiUrlWithToken } from "./artalk-auth.mjs";

const MAIN_ORIGIN = "https://penn-notes.draftly.cn";

const { theme, site } = useData();
const route = useRoute();
const { t, uiLocale } = useI18n();
const root = ref<HTMLElement | null>(null);
const host = ref<HTMLElement | null>(null);

const artalkConf = theme.value.artalk as { server?: string; site?: string } | undefined;
const enabled = Boolean(artalkConf?.server && artalkConf?.site);

const ARTALK_VARS: Record<string, string> = {
  "--at-color-font": "var(--text)",
  "--at-color-deep": "var(--text)",
  "--at-color-sub": "var(--text-3)",
  "--at-color-grey": "var(--text-3)",
  "--at-color-meta": "var(--text-3)",
  "--at-color-border": "var(--border)",
  "--at-color-light": "var(--accent)",
  "--at-color-bg": "var(--surface)",
  "--at-color-bg-transl": "var(--surface)",
  "--at-color-bg-grey": "var(--bg)",
  "--at-color-bg-grey-transl": "var(--bg)",
  "--at-color-main": "var(--accent)",
  "--at-color-gradient": "linear-gradient(180deg, transparent, var(--surface))",
};

const REPLY_PREVIEW = 2;

function replyExpandLabel(total: number, open: boolean) {
  if (open) {
    if (uiLocale.value === "en") return "Hide replies";
    if (uiLocale.value === "zh-TW") return "收起回覆";
    return "收起回复";
  }
  if (uiLocale.value === "en") return `View all ${total} replies`;
  if (uiLocale.value === "zh-TW") return `查看全部 ${total} 則回覆`;
  return `查看全部 ${total} 条回复`;
}

function listExpandLabel(total: string) {
  if (uiLocale.value === "en") return `View all ${total} comments`;
  if (uiLocale.value === "zh-TW") return `查看全部 ${total} 則評論`;
  return `查看全部 ${total} 条评论`;
}

function replyLabel() {
  if (uiLocale.value === "en") return "Reply";
  if (uiLocale.value === "zh-TW") return "回覆";
  return "回复";
}

function paintArtalk(el: HTMLElement) {
  for (const [key, value] of Object.entries(ARTALK_VARS)) {
    el.style.setProperty(key, value);
  }
  el.style.setProperty("--penn-reply-label", `"${replyLabel()}"`);
}

const AVATAR_TONES: Array<[string, string]> = [
  ["#748ffc", "#3b5bdb"],
  ["#4dabf7", "#1c7ed6"],
  ["#3bc9a0", "#0b8f6d"],
  ["#b197fc", "#7048e8"],
  ["#ffa94d", "#e67700"],
  ["#f783ac", "#d6336c"],
  ["#d4a373", "#9c6644"],
  ["#69db7c", "#2b8a3e"],
];

function avatarTone(name: string): [string, string] {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function avatarLetter(name: string) {
  const text = name.trim();
  if (!text) return "";
  const ch = Array.from(text)[0];
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
}

function initialAvatar(name: string) {
  const [from, to] = avatarTone(name || "访客");
  const letter = avatarLetter(name).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const mark = letter
    ? `<text x="40" y="43" text-anchor="middle" dominant-baseline="middle" font-family="ui-sans-serif,system-ui,-apple-system,'PingFang SC','Noto Sans SC',sans-serif" font-size="32" font-weight="650" fill="#fff">${letter}</text>`
    : `<circle cx="40" cy="32" r="7" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M23 57c2.2-9 8-13 17-13s14.8 4 17 13" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="12" y1="6" x2="70" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect x="1" y="1" width="78" height="78" rx="24" fill="url(#g)"/>${mark}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function paintAvatars(root: ParentNode) {
  root.querySelectorAll<HTMLImageElement>(".atk-comment > .atk-avatar img").forEach((img) => {
    const comment = img.closest(".atk-comment");
    const nick = comment?.querySelector(".atk-nick")?.textContent?.trim() || "";
    const mark = `tile:${nick}`;
    if (img.dataset.pennAvatar === mark && img.src.startsWith("data:image/svg+xml")) return;
    img.dataset.pennAvatar = mark;
    img.alt = nick || "头像";
    img.src = initialAvatar(nick);
  });
  const headerImg = root.querySelector<HTMLImageElement>(".header > .avatar img");
  if (!headerImg) return;
  let name = "";
  try {
    name = String(JSON.parse(localStorage.getItem("ArtalkUser") || "{}").name || "");
  } catch {
    name = "";
  }
  const mark = `tile:${name}`;
  if (headerImg.dataset.pennAvatar === mark && headerImg.src.startsWith("data:image/svg+xml")) return;
  headerImg.dataset.pennAvatar = mark;
  headerImg.alt = name || "头像";
  headerImg.src = initialAvatar(name);
}

function commentPlaceholder() {
  if (uiLocale.value === "en") return "Write a comment…";
  if (uiLocale.value === "zh-TW") return "說點什麼吧…";
  return "说点什么吧…";
}

function paintCommentCopy(root: ParentNode) {
  const text = commentPlaceholder();
  root.querySelectorAll<HTMLTextAreaElement>(".atk-textarea").forEach((el) => {
    if (el.placeholder !== text) el.placeholder = text;
  });
}

function paintEditorAvatar(root: ParentNode) {
  const editor = root.querySelector<HTMLElement>(".atk-main-editor");
  const nameInput = editor?.querySelector<HTMLInputElement>('input[name="name"]');
  if (!editor || !nameInput) return;
  let avatar = editor.querySelector<HTMLImageElement>(".penn-editor-avatar");
  if (!avatar) {
    avatar = document.createElement("img");
    avatar.className = "penn-editor-avatar";
    avatar.alt = "";
    editor.prepend(avatar);
  }
  const name = nameInput.value.trim() || "访客";
  const mark = `tile:${name}`;
  if (avatar.dataset.pennAvatar === mark && avatar.src.startsWith("data:image/svg+xml")) return;
  avatar.dataset.pennAvatar = mark;
  avatar.src = initialAvatar(name);
}

function paintReplyQuotes() {
  const nodes = artalk?.ctx?.getCommentNodes?.() ?? [];
  if (!nodes.length) return;
  const byId = new Map<string, ArtalkCommentNode>();
  for (const node of nodes) {
    const id = node.getData()?.id;
    if (id != null) byId.set(String(id), node);
  }
  for (const node of nodes) {
    const data = node.getData();
    const el = node.$el;
    if (!data?.rid || !el) continue;
    const body = el.querySelector<HTMLElement>(":scope > .atk-comment > .atk-main > .atk-body");
    if (!body) continue;
    const hostId = el.parentElement?.closest<HTMLElement>("[id^='atk-comment-']")?.id.replace(/^atk-comment-/, "");
    if (hostId && hostId === String(data.rid)) {
      body.querySelector(":scope > .atk-reply-to.penn-quote")?.remove();
      continue;
    }
    if (body.querySelector(":scope > .atk-reply-to")) continue;
    const replyTo = node.opts?.replyTo;
    const target = byId.get(String(data.rid));
    const targetData = target?.getData();
    const quoted = replyTo || targetData;
    if (!quoted) continue;
    const quote = document.createElement("div");
    quote.className = "atk-reply-to penn-quote";
    const meta = document.createElement("div");
    meta.className = "atk-meta";
    meta.append(document.createTextNode(`${replyLabel()} `));
    const nick = document.createElement("span");
    nick.className = "atk-nick";
    nick.textContent = `@${quoted.nick || ""}`;
    meta.append(nick, document.createTextNode(":"));
    const content = document.createElement("div");
    content.className = "atk-content";
    const source = target?.$el?.querySelector<HTMLElement>(":scope > .atk-comment > .atk-main > .atk-body > .atk-content");
    if (quoted.is_collapsed) {
      content.textContent = uiLocale.value === "en" ? "Collapsed" : uiLocale.value === "zh-TW" ? "已折疊" : "已折叠";
    } else if (source?.innerHTML.trim()) content.innerHTML = source.innerHTML;
    else if (quoted.content_marked) content.innerHTML = quoted.content_marked;
    else content.textContent = quoted.content || "";
    quote.append(meta, content);
    body.prepend(quote);
  }
}

function paintMoreMenus(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".atk-comment > .atk-main > .atk-footer .atk-actions").forEach((actions) => {
    const admin = [...actions.querySelectorAll<HTMLElement>(".atk-common-action-btn[atk-only-admin-show]:not(.atk-hide)")];
    const menu = actions.querySelector<HTMLElement>(":scope > .penn-more-menu");
    if (!admin.length) {
      actions.querySelector(":scope > .penn-more")?.remove();
      menu?.remove();
      return;
    }
    let more = actions.querySelector<HTMLButtonElement>(":scope > .penn-more");
    let panel = menu;
    if (!more || !panel) {
      more = document.createElement("button");
      more.type = "button";
      more.className = "penn-more";
      more.setAttribute("aria-label", "更多操作");
      more.textContent = "···";
      panel = document.createElement("div");
      panel.className = "penn-more-menu";
      panel.hidden = true;
      more.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = panel!.hidden;
        document.querySelectorAll<HTMLElement>(".penn-more-menu").forEach((item) => {
          item.hidden = true;
        });
        panel!.hidden = !willOpen;
        if (!panel!.hidden) {
          const rect = more!.getBoundingClientRect();
          const width = panel!.offsetWidth || 148;
          const height = panel!.offsetHeight || 180;
          let top = rect.bottom + 6;
          if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
          panel!.style.position = "fixed";
          panel!.style.top = `${top}px`;
          panel!.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`;
          panel!.style.right = "auto";
          panel!.style.bottom = "auto";
        }
      });
      panel.addEventListener("click", () => {
        panel!.hidden = true;
      });
      actions.append(more, panel);
    }
    admin.forEach((btn) => {
      if (btn.parentElement !== panel) panel!.append(btn);
    });
  });
}

function paintReplyExpanders(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".atk-comment > .atk-main > .atk-comment-children").forEach((children) => {
    const replies = [...children.querySelectorAll<HTMLElement>(":scope > .atk-comment-wrap")];
    const total = children.querySelectorAll(".atk-comment").length;
    let btn = children.querySelector<HTMLButtonElement>(":scope > .penn-replies-more");
    if (replies.length <= REPLY_PREVIEW) {
      replies.forEach((item) => item.classList.remove("penn-reply-collapsed"));
      btn?.remove();
      return;
    }
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "penn-replies-more";
      btn.addEventListener("click", () => {
        children.dataset.pennOpen = children.dataset.pennOpen === "1" ? "0" : "1";
        paintReplyExpanders(root);
      });
      children.append(btn);
    }
    const open = children.dataset.pennOpen === "1";
    replies.forEach((item, index) => {
      item.classList.toggle("penn-reply-collapsed", !open && index >= REPLY_PREVIEW);
    });
    const label = replyExpandLabel(total, open);
    if (btn.textContent !== label) btn.textContent = label;
    btn.classList.toggle("is-open", open);
  });
}

function paintListMore(root: ParentNode) {
  const more = root.querySelector<HTMLElement>(".atk-list-read-more");
  const text = more?.querySelector<HTMLElement>(".atk-text");
  if (!more || !text) return;
  const total = root.querySelector(".atk-comment-count-num")?.textContent?.trim();
  if (!total || total === "0") return;
  const label = listExpandLabel(total);
  if (text.textContent !== label) text.textContent = label;
}

function paintCommentLayout(root: ParentNode) {
  paintEditorAvatar(root);
  paintReplyQuotes();
  root.querySelectorAll<HTMLElement>(".atk-comment > .atk-main").forEach((main) => {
    const actions = main.querySelector<HTMLElement>(":scope > .atk-footer .atk-actions");
    const header = main.querySelector<HTMLElement>(":scope > .atk-header");
    if (!actions || !header) return;
    const date = header.querySelector<HTMLElement>(":scope > .atk-date") || actions.querySelector<HTMLElement>(":scope > .atk-date");
    if (date && date.parentElement !== actions) actions.prepend(date);
    const ua = header.querySelector<HTMLElement>(":scope > .atk-ua-wrap");
    if (ua && date) date.insertAdjacentElement("afterend", ua);
  });
  paintMoreMenus(root);
  paintReplyExpanders(root);
  paintListMore(root);
}

let stopAvatarWatch: (() => void) | undefined;

function watchCommentAvatars(el: HTMLElement) {
  paintAvatars(el);
  paintCommentCopy(el);
  paintCommentLayout(el);
  const closeMenus = (event: Event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(".penn-more, .penn-more-menu")) return;
    el.querySelectorAll<HTMLElement>(".penn-more-menu").forEach((menu) => {
      menu.hidden = true;
    });
  };
  document.addEventListener("click", closeMenus);
  document.addEventListener("scroll", closeMenus, true);
  const obs = new MutationObserver(() => {
    paintAvatars(el);
    paintCommentCopy(el);
    paintCommentLayout(el);
  });
  obs.observe(el, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "placeholder"],
  });
  return () => {
    document.removeEventListener("click", closeMenus);
    document.removeEventListener("scroll", closeMenus, true);
    obs.disconnect();
  };
}

type SiteTokens = {
  text: string;
  text2: string;
  text3: string;
  surface: string;
  bg: string;
  border: string;
  accent: string;
  accentSoft: string;
  font: string;
};

function readSiteTokens(): SiteTokens {
  const cs = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    text: pick("--text", "#1d1d1f"),
    text2: pick("--text-2", "#6e6e73"),
    text3: pick("--text-3", "#8e8e93"),
    surface: pick("--surface", "#fff"),
    bg: pick("--bg", "#f5f5f7"),
    border: pick("--border", "#e5e5ea"),
    accent: pick("--accent", "#3b5bdb"),
    accentSoft: pick("--accent-soft", "rgba(59, 91, 219, 0.1)"),
    font: pick("--vp-font-family-base", "inherit"),
  };
}

function sidebarSkinCss(t: SiteTokens) {
  return `
    html, body, #app, .app-wrap {
      background: ${t.surface} !important;
      color: ${t.text};
      font-family: ${t.font};
    }
    .artalk, .artalk.atk-dark-mode {
      --at-color-font: ${t.text};
      --at-color-deep: ${t.text};
      --at-color-sub: ${t.text3};
      --at-color-grey: ${t.text3};
      --at-color-meta: ${t.text3};
      --at-color-border: ${t.border};
      --at-color-bg: ${t.surface};
      --at-color-bg-transl: ${t.surface};
      --at-color-bg-grey: ${t.bg};
      --at-color-bg-grey-transl: ${t.bg};
      --at-color-bg-light: ${t.accentSoft};
      --at-color-main: ${t.accent};
      --at-color-gradient: linear-gradient(180deg, transparent, ${t.surface});
      font-family: ${t.font};
    }
    body .header.header {
      position: sticky;
      top: 0;
      z-index: 5;
      gap: 10px;
      padding: 14px 48px 12px 16px !important;
      border-bottom: 1px solid ${t.border} !important;
      background: ${t.surface} !important;
    }
    body .header .avatar {
      height: auto !important;
      padding: 0 !important;
    }
    body .header .avatar .site,
    body .header .avatar img {
      width: 32px !important;
      height: 32px !important;
      border-radius: 10px !important;
      object-fit: cover;
      box-shadow: none !important;
    }
    body .header .avatar img {
      background: transparent !important;
    }
    body .header .avatar .site {
      background: ${t.accent} !important;
      color: #fff !important;
      font-size: 14px !important;
      font-weight: 650 !important;
      line-height: 32px !important;
    }
    body .header .avatar.clickable,
    body .header .avatar.clickable:hover,
    body .header .avatar.clickable.active {
      border: 0 !important;
      background: transparent !important;
    }
    body .header .close-btn {
      display: none !important;
    }
    body .header .title,
    body .header .title .text {
      margin-left: 0 !important;
      color: ${t.text} !important;
      font-size: 15px !important;
      font-weight: 650 !important;
      letter-spacing: -0.01em;
      line-height: 1.3;
      text-decoration: none !important;
    }
    body .header .title .text::after,
    body .header .title .text.show-mobile::after,
    body .header .title .text.show-desktop::after {
      content: none !important;
      display: none !important;
    }
    body .top-navigation.top-navigation {
      height: auto !important;
      gap: 4px;
      align-items: center;
      padding: 8px 12px 10px !important;
      border-bottom: 1px solid ${t.border} !important;
      background: ${t.surface} !important;
    }
    body .top-navigation .tab-list {
      gap: 4px;
      align-items: center;
    }
    body .top-navigation .page.page,
    body .top-navigation .tab-list > .item:not(.search-btn) {
      height: 28px !important;
      margin: 0 !important;
      padding: 0 10px !important;
      border: 0 !important;
      border-radius: 999px !important;
      background: transparent;
      color: ${t.text2} !important;
      font-size: 13px !important;
      font-weight: 500;
    }
    body .top-navigation .item.active {
      background: ${t.accentSoft} !important;
      color: ${t.accent} !important;
      font-weight: 650 !important;
    }
    body .top-navigation .item:hover,
    body .top-navigation .page:hover {
      background: ${t.bg} !important;
    }
    body .top-navigation .item.active:hover {
      background: ${t.accentSoft} !important;
    }
    body .top-navigation .item.search-btn {
      width: 28px;
      margin-left: auto !important;
      padding: 0 !important;
      border-left: 0 !important;
      justify-content: center;
    }
    body .search-layer.search-layer {
      left: 0 !important;
      right: 0 !important;
      width: auto !important;
      align-items: center;
      gap: 8px;
      box-sizing: border-box;
      height: 100% !important;
      padding: 0 16px !important;
      background: ${t.surface} !important;
    }
    body .search-layer .back-btn,
    body .search-layer .search-btn {
      flex: 0 0 32px;
      width: 32px !important;
      height: 32px !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 8px !important;
      background: transparent !important;
      color: ${t.text2} !important;
    }
    body .search-layer .back-btn .icon {
      width: 16px !important;
      height: 16px !important;
      background-color: ${t.text2} !important;
    }
    body .search-layer input {
      flex: 1;
      height: 32px !important;
      border: 1px solid ${t.border} !important;
      border-radius: 8px !important;
      background: ${t.bg} !important;
      color: ${t.text} !important;
      padding: 0 12px !important;
      font-family: ${t.font};
      font-size: 14px !important;
    }
    body .search-layer input::placeholder {
      color: ${t.text3};
    }
    body .search-layer input:focus {
      border-color: color-mix(in srgb, ${t.accent} 55%, ${t.border}) !important;
      outline: none;
      box-shadow: 0 0 0 3px ${t.accentSoft};
    }
    body .search-layer .search-btn {
      display: flex !important;
      align-items: center;
      justify-content: center;
      background: ${t.accent} !important;
    }
    body .search-layer .search-btn::after {
      content: none !important;
      display: none !important;
    }
    body .search-layer .back-btn:hover {
      background: ${t.bg} !important;
    }
    body .search-layer .search-btn:hover {
      background: ${t.accent} !important;
    }
    body .search-layer .search-btn::before {
      content: "";
      width: 14px;
      height: 14px;
      background: #fff;
      -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E") center / contain no-repeat;
      mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E") center / contain no-repeat;
    }
    body .comments-wrap {
      padding: 8px 0 96px;
      background: transparent !important;
    }
    body .comments-wrap:has(.atk-comment-wrap) {
      background: ${t.bg} !important;
    }
    body .comments-wrap .atk-comment-wrap {
      margin: 8px 12px !important;
      border: 1px solid ${t.border} !important;
      border-radius: 12px !important;
      background: ${t.surface} !important;
      overflow: hidden;
    }
    body .atk-comment {
      padding: 12px 12px 8px !important;
    }
    body .atk-comment > .atk-avatar img {
      width: 36px !important;
      height: 36px !important;
      border-radius: 12px !important;
      box-shadow: none !important;
    }
    body .atk-comment > .atk-main {
      margin-left: 48px !important;
    }
    body .atk-comment > .atk-main > .atk-header {
      gap: 2px 8px;
      margin-bottom: 6px !important;
      color: ${t.text3} !important;
      font-size: 12px !important;
      line-height: 1.4 !important;
    }
    body .atk-nick,
    body .atk-comment > .atk-main > .atk-header .atk-item.atk-nick a {
      color: ${t.text} !important;
      font-size: 13px !important;
      font-weight: 650 !important;
      text-decoration: none !important;
    }
    body .atk-badge,
    body .atk-ua,
    body .atk-region-badge {
      border-radius: 999px;
      color: ${t.text3} !important;
      background: transparent !important;
      font-size: 12px !important;
    }
    body .atk-ua-wrap {
      display: inline-flex !important;
      gap: 6px;
      align-items: center;
    }
    body .comments-wrap .atk-comment > .atk-main > .atk-header .atk-ua-wrap {
      display: none !important;
    }
    body .atk-comment-wrap.atk-unread:before {
      content: none !important;
    }
    body .atk-comment-wrap.atk-unread > .atk-comment > .atk-main > .atk-header .atk-nick::after {
      content: "";
      display: inline-block;
      width: 6px;
      height: 6px;
      margin-left: 6px;
      border-radius: 50%;
      background: ${t.accent};
      vertical-align: 1px;
    }
    body .atk-content {
      color: ${t.text} !important;
      font-size: 14px !important;
      line-height: 1.7 !important;
    }
    body .atk-body > a,
    body .atk-main > a.atk-title,
    body .atk-comment .atk-title {
      display: block;
      margin: 0 0 6px;
      color: ${t.text2} !important;
      font-size: 12px !important;
      font-weight: 500;
      line-height: 1.4;
      text-decoration: none !important;
    }
    body .atk-content a {
      color: ${t.accent};
      text-decoration: none;
    }
    body .atk-content a:hover,
    body .atk-comment .atk-title:hover {
      color: ${t.accent} !important;
    }
    body .atk-content img {
      display: block;
      width: auto !important;
      max-width: 100%;
      max-height: 220px;
      margin: 8px 0;
      border: 1px solid ${t.border};
      border-radius: 10px;
      object-fit: contain;
    }
    body .atk-reply-to {
      margin: 0 0 8px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
    }
    body .atk-reply-to .atk-meta {
      margin: 0 !important;
      color: ${t.text3} !important;
      font-size: 12px !important;
      line-height: 1.4 !important;
    }
    body .atk-reply-to .atk-meta .atk-nick {
      color: ${t.text2} !important;
      font-size: 12px !important;
      font-weight: 650 !important;
    }
    body .atk-reply-to .atk-content {
      margin: 4px 0 0 !important;
      padding: 6px 8px !important;
      border-radius: 8px !important;
      background: ${t.bg} !important;
      color: ${t.text2} !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
    }
    body .atk-footer {
      margin-top: 6px !important;
    }
    body .atk-actions {
      display: flex !important;
      flex-wrap: wrap;
      gap: 4px;
    }
    body .atk-common-action-btn {
      height: 24px;
      margin: 0 !important;
      padding: 0 8px !important;
      border-radius: 999px !important;
      color: ${t.text3} !important;
      font-size: 12px !important;
      line-height: 24px !important;
    }
    body .atk-common-action-btn:hover {
      color: ${t.accent} !important;
      background: ${t.bg} !important;
    }
    body .atk-common-action-btn[atk-only-admin-show] {
      background: ${t.bg} !important;
    }
    body .atk-common-action-btn[atk-only-admin-show]:hover {
      color: ${t.accent} !important;
      background: ${t.accentSoft} !important;
    }
    body .atk-comment-children {
      margin: 4px 0 0 !important;
      padding: 0 !important;
      border: 0 !important;
    }
    body .atk-comment-children > .atk-comment-wrap {
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
    }
    body .atk-comment-children .atk-ua-wrap {
      display: none !important;
    }
    body .atk-pagination {
      gap: 6px;
      padding: 6px 0 18px !important;
    }
    body .atk-pagination > .atk-btn,
    body .atk-pagination > .atk-input {
      min-width: 32px;
      height: 32px !important;
      border-radius: 8px !important;
      border-color: ${t.border} !important;
      background: ${t.surface} !important;
      color: ${t.text2} !important;
    }
    body .atk-list-no-comment {
      position: relative !important;
      display: flex !important;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      height: auto !important;
      min-height: 240px !important;
      margin: 0 !important;
      padding: 28px 20px !important;
      border: 0 !important;
      background: transparent !important;
      color: ${t.text3} !important;
      font-size: 13px !important;
    }
    body .atk-list-no-comment > div {
      display: none !important;
    }
    body .atk-list-no-comment::before {
      content: "";
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${t.accentSoft};
    }
    body .atk-list-no-comment::after {
      content: "暂无内容";
      color: ${t.text3};
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
    }
    body .atk-page-list-wrap .atk-header-action-bar {
      gap: 4px;
      padding: 8px 12px !important;
      border-bottom: 1px solid ${t.border} !important;
      background: ${t.surface} !important;
    }
    body .atk-page-list-wrap .atk-header-action-bar > span {
      height: 28px;
      padding: 0 10px !important;
      border-radius: 999px !important;
      color: ${t.text2} !important;
      font-size: 12px !important;
    }
    body .atk-page-list-wrap .atk-header-action-bar > span:hover {
      background: ${t.bg} !important;
      color: ${t.accent} !important;
    }
    body .atk-page-list .atk-page-item {
      min-height: 0 !important;
      align-items: center !important;
    }
    body .atk-page-list .atk-page-item:not(:last-child) {
      border-bottom: 1px solid ${t.border} !important;
    }
    body .atk-page-list .atk-page-main {
      min-width: 0;
      padding: 14px 4px 14px 16px !important;
    }
    body .atk-page-list .atk-page-main .atk-title {
      margin-bottom: 4px !important;
      color: ${t.text} !important;
      font-size: 15px !important;
      font-weight: 650 !important;
      line-height: 1.4 !important;
    }
    body .atk-page-list .atk-page-main .atk-sub {
      color: ${t.text3} !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
      overflow-wrap: anywhere;
    }
    body .atk-page-list .atk-page-actions {
      padding: 0 12px 0 0 !important;
    }
    body .atk-page-list .atk-page-actions .atk-item {
      width: 32px !important;
      height: 32px !important;
      margin-right: 0 !important;
      border-radius: 8px !important;
    }
    body .atk-page-list .atk-page-actions .atk-item:hover {
      background: ${t.bg} !important;
    }
    body .user-list .user-item {
      padding: 14px 16px !important;
    }
    body .user-list .user-item:not(:last-child) {
      border-bottom: 1px solid ${t.border} !important;
    }
    body .user-list .user-item .title {
      color: ${t.text} !important;
      font-size: 15px !important;
      font-weight: 650 !important;
    }
    body .user-list .user-item .sub {
      margin-top: 2px;
      color: ${t.text3} !important;
      font-size: 12px !important;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    body .user-list .user-item .badge {
      border-radius: 999px !important;
      background: ${t.accentSoft} !important;
      color: ${t.accent} !important;
      font-size: 11px !important;
      font-weight: 650;
      line-height: 18px !important;
      padding: 0 7px !important;
    }
    body .user-list .user-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px !important;
    }
    body .user-list .user-actions > span {
      display: inline-flex;
      align-items: center;
      height: 22px;
      margin: 0 !important;
      padding: 0 8px;
      border-radius: 999px;
      background: ${t.bg};
      color: ${t.text3} !important;
      font-size: 12px !important;
      line-height: 22px;
    }
    body .user-list .user-actions > span:hover {
      background: ${t.accentSoft};
      color: ${t.accent} !important;
    }
    body .settings .pfs {
      padding: 8px 16px 88px !important;
    }
    body .settings .notice {
      margin: 8px 0 16px !important;
      padding: 8px 12px !important;
      border-radius: 8px !important;
      background: ${t.accentSoft} !important;
      color: ${t.accent} !important;
      text-align: left !important;
      font-size: 12px !important;
      line-height: 1.5;
    }
    body .settings .pf-item {
      flex-direction: column !important;
      align-items: stretch;
      gap: 6px;
      margin-bottom: 14px !important;
    }
    body .settings .pf-item > .info {
      padding-right: 0 !important;
    }
    body .settings .pf-item > .info .title,
    body .settings .pf-item > .info > div:first-child {
      color: ${t.text} !important;
      font-size: 13px !important;
      font-weight: 650;
    }
    body .settings .pf-item .sub-title {
      color: ${t.text3} !important;
      font-size: 12px !important;
      line-height: 1.45;
    }
    body .settings .pf-item > .value {
      justify-content: stretch !important;
      min-height: 0 !important;
    }
    body .settings input[type="text"],
    body .settings input[type="password"],
    body .settings input[type="number"],
    body .settings select,
    body .settings textarea {
      width: 100% !important;
      height: 36px !important;
      border: 1px solid ${t.border} !important;
      border-radius: 8px !important;
      background: ${t.bg} !important;
      color: ${t.text} !important;
      padding: 0 10px !important;
      font-size: 14px !important;
    }
    body .settings textarea {
      height: auto !important;
      min-height: 72px;
      padding: 8px 10px !important;
    }
    body .settings input:focus,
    body .settings select:focus,
    body .settings textarea:focus {
      border-color: color-mix(in srgb, ${t.accent} 55%, ${t.border}) !important;
      outline: none;
      box-shadow: 0 0 0 3px ${t.accentSoft};
    }
    body .settings .act-bar {
      height: auto !important;
      padding: 10px 16px !important;
      border-top: 1px solid ${t.border} !important;
      background: ${t.surface} !important;
    }
    body .settings .act-bar button {
      height: 32px;
      padding: 0 14px !important;
      border: 0 !important;
      border-radius: 8px !important;
      background: ${t.accent} !important;
      color: #fff !important;
      font-weight: 650;
    }
    body .user-editor-layer {
      z-index: 220 !important;
      background: ${t.surface} !important;
    }
    body:has(.user-editor-layer) .atk-pagination-wrap {
      display: none !important;
    }
    body .user-editor-layer > .header {
      padding: 16px 16px 4px !important;
      background: ${t.surface} !important;
    }
    body .user-editor-layer > .header .title {
      margin: 0 !important;
      color: ${t.text} !important;
      font-size: 16px !important;
      font-weight: 650 !important;
    }
    body .user-editor-layer .user-log {
      margin: 4px 16px 8px !important;
      padding: 10px 12px !important;
      border-radius: 8px !important;
      background: ${t.bg} !important;
      color: ${t.text2} !important;
      font-size: 12px !important;
      line-height: 1.6 !important;
    }
    body .user-editor-layer .atk-form {
      padding: 8px 16px 24px !important;
    }
    body .user-editor-layer .atk-label {
      margin: 0 0 6px !important;
      color: ${t.text2} !important;
      font-size: 12px !important;
      font-weight: 650;
    }
    body .user-editor-layer .atk-form input,
    body .user-editor-layer .atk-form select,
    body .user-editor-layer .atk-form textarea {
      box-sizing: border-box;
      width: 100% !important;
      height: 36px !important;
      margin: 0 0 14px !important;
      padding: 0 10px !important;
      border: 1px solid ${t.border} !important;
      border-radius: 8px !important;
      background: ${t.bg} !important;
      color: ${t.text} !important;
      font-size: 14px !important;
      line-height: 36px !important;
    }
    body .user-editor-layer .atk-form textarea {
      height: auto !important;
      min-height: 72px;
      padding: 8px 10px !important;
      line-height: 1.5 !important;
    }
    body .user-editor-layer .atk-form input:focus,
    body .user-editor-layer .atk-form select:focus,
    body .user-editor-layer .atk-form textarea:focus {
      border-color: color-mix(in srgb, ${t.accent} 55%, ${t.border}) !important;
      outline: none;
      box-shadow: 0 0 0 3px ${t.accentSoft};
    }
    body .user-editor-layer .atk-form button {
      height: 36px !important;
      margin: 4px 0 0 !important;
      border: 0 !important;
      border-radius: 8px !important;
      background: ${t.accent} !important;
      color: #fff !important;
      font-size: 14px !important;
      font-weight: 650;
    }
    body .settings .pf-grp.level-1 {
      margin: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
    }
    body .settings .pf-grp.level-1 > .pf-head {
      margin: 0 !important;
      padding: 0 16px !important;
      border-bottom: 1px solid ${t.border};
    }
    body .settings .pf-grp.level-1 > .pf-head:hover {
      background: ${t.bg};
    }
    body .settings .pf-grp.level-1 > .pf-head .title {
      padding: 14px 0 14px 16px !important;
      color: ${t.text} !important;
      font-size: 15px !important;
      font-weight: 650 !important;
    }
    body .settings .pf-grp.level-1 > .pf-head .title::before,
    body .settings .pf-grp.level-1.expand > .pf-head .title::before {
      left: 0 !important;
      width: 6px !important;
      height: 6px !important;
      border-radius: 50% !important;
      background: ${t.accent} !important;
    }
    body .settings .pf-grp.level-2 > .pf-head,
    body .settings .pf-grp.level-3 > .pf-head {
      margin: 8px 0 !important;
    }
    body .settings .pf-grp.level-2 > .pf-head .title,
    body .settings .pf-grp.level-3 > .pf-head .title {
      color: ${t.text} !important;
      font-size: 13px !important;
      font-weight: 650 !important;
    }
    body .atk-sidebar .atk-form {
      padding: 12px 16px 24px !important;
    }
    body .atk-sidebar .atk-form .atk-label {
      margin: 0 0 6px !important;
      color: ${t.text} !important;
      font-size: 13px !important;
      font-weight: 650;
    }
    body .atk-sidebar .atk-form .atk-desc {
      margin: 0 0 14px !important;
      color: ${t.text3} !important;
      font-size: 12px !important;
      line-height: 1.5;
    }
    body .atk-sidebar .atk-form .atk-desc a {
      color: ${t.accent};
    }
    body .atk-sidebar .atk-form input:not([type="file"]),
    body .atk-sidebar .atk-form select,
    body .atk-sidebar .atk-form textarea {
      box-sizing: border-box;
      width: 100% !important;
      height: 36px !important;
      margin: 0 0 14px !important;
      padding: 0 10px !important;
      border: 1px solid ${t.border} !important;
      border-radius: 8px !important;
      background: ${t.bg} !important;
      color: ${t.text} !important;
      font-size: 14px !important;
      line-height: 36px !important;
    }
    body .atk-sidebar .atk-form textarea {
      height: auto !important;
      min-height: 72px;
      padding: 8px 10px !important;
      line-height: 1.5 !important;
    }
    body .atk-sidebar .atk-form input[type="file"] {
      margin: 0 0 10px !important;
      padding: 8px 12px !important;
      border: 1px solid ${t.border} !important;
      border-radius: 8px !important;
      background: ${t.bg} !important;
    }
    body .atk-sidebar .atk-form input:focus,
    body .atk-sidebar .atk-form select:focus,
    body .atk-sidebar .atk-form textarea:focus {
      border-color: color-mix(in srgb, ${t.accent} 55%, ${t.border}) !important;
      outline: none;
      box-shadow: 0 0 0 3px ${t.accentSoft};
    }
    body .atk-sidebar .atk-form button {
      height: 36px !important;
      margin-top: 4px !important;
      border: 0 !important;
      border-radius: 8px !important;
      background: ${t.accent} !important;
      color: #fff !important;
      font-size: 14px !important;
      font-weight: 650;
    }
    body .atk-site-list > .atk-header {
      padding: 16px 16px 8px !important;
    }
    body .atk-site-list > .atk-header .atk-title {
      color: ${t.text} !important;
      font-size: 14px !important;
      font-weight: 650;
    }
    body .atk-site-list > .atk-header .atk-actions .atk-item {
      width: 32px !important;
      height: 32px !important;
      border-radius: 8px !important;
      color: ${t.text2};
      font-size: 20px;
    }
    body .atk-site-list > .atk-header .atk-actions .atk-item:hover {
      background: ${t.bg} !important;
      color: ${t.accent};
    }
    body .atk-site-list .atk-site-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 8px 16px 20px;
    }
    body .atk-site-list .atk-site-item {
      flex: 0 0 112px !important;
      margin: 0 !important;
      padding: 16px 8px 12px !important;
      border: 1px solid ${t.border} !important;
      border-radius: 12px !important;
      background: ${t.surface} !important;
    }
    body .atk-site-list .atk-site-logo {
      width: 44px !important;
      height: 44px !important;
      margin: 0 0 8px !important;
      border-radius: 12px !important;
      background: ${t.accent} !important;
      font-size: 16px !important;
      font-weight: 650;
      line-height: 44px !important;
    }
    body .atk-site-list .atk-site-name {
      padding: 0 !important;
      color: ${t.text} !important;
      font-size: 13px !important;
      font-weight: 650;
      line-height: 1.35;
    }
    body .login-form {
      width: min(280px, calc(100% - 32px)) !important;
    }
    body .login-form input {
      border: 1px solid ${t.border} !important;
      border-radius: 8px !important;
      background: ${t.surface} !important;
      color: ${t.text} !important;
      padding: 0 12px !important;
    }
    body .login-form input:focus {
      border-color: color-mix(in srgb, ${t.accent} 55%, ${t.border}) !important;
      outline: none;
      box-shadow: 0 0 0 3px ${t.accentSoft};
    }
    body .login-form button {
      margin-top: 6px;
      border: 0 !important;
      border-radius: 8px !important;
      background: ${t.accent} !important;
      color: #fff !important;
      height: 36px;
      font-weight: 650;
      cursor: pointer;
    }
    body .login-dialog.login-dialog {
      top: 64px !important;
      right: 0;
      bottom: 0;
      left: 0;
      width: auto !important;
      height: auto !important;
      justify-content: flex-start !important;
      padding: 28px 20px 20px !important;
      background: ${t.bg} !important;
    }
    body .login-dialog .logo {
      width: 44px !important;
      height: 44px !important;
      margin: 8px 0 16px !important;
      border-radius: 12px !important;
    }
    body .login-dialog .copyright {
      position: static !important;
      height: auto !important;
      margin-top: 24px;
      color: ${t.text3} !important;
      font-size: 12px !important;
    }
  `;
}

let stopSidebarSkin: (() => void) | undefined;

function paintSidebarFrames() {
  const css = sidebarSkinCss(readSiteTokens());
  document.querySelectorAll<HTMLIFrameElement>(".atk-sidebar-iframe-wrap iframe").forEach((frame) => {
    const apply = () => {
      const doc = frame.contentDocument;
      if (!doc?.head) return;
      const href = doc.location?.href || "";
      if (!href || href === "about:blank") return;
      let style = doc.getElementById("penn-sidebar-skin");
      if (!style) {
        style = doc.createElement("style");
        style.id = "penn-sidebar-skin";
        doc.head.appendChild(style);
      }
      if (style.textContent !== css) style.textContent = css;
      paintAvatars(doc);
      if (doc.body && doc.body.dataset.pennAvatarWatch !== "1") {
        doc.body.dataset.pennAvatarWatch = "1";
        new MutationObserver(() => paintAvatars(doc)).observe(doc.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["src"],
        });
      }
    };
    if (frame.dataset.pennSkin !== "1") {
      frame.dataset.pennSkin = "1";
      frame.addEventListener("load", apply);
    }
    apply();
  });
}

function watchSidebarSkin() {
  let retry = 0;
  const pump = () => {
    window.clearInterval(retry);
    let n = 0;
    retry = window.setInterval(() => {
      paintSidebarFrames();
      n += 1;
      const frame = document.querySelector<HTMLIFrameElement>(".atk-sidebar-iframe-wrap iframe");
      const ready = frame?.contentDocument?.getElementById("penn-sidebar-skin");
      if (ready || n > 25) window.clearInterval(retry);
    }, 120);
  };
  const onClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest("[data-action='open-sidebar']")) return;
    pump();
  };
  document.addEventListener("click", onClick, true);
  const themeObs = new MutationObserver(() => paintSidebarFrames());
  themeObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  let watchedWrap: Element | undefined;
  let layerObs: MutationObserver | undefined;
  const watchLayer = () => {
    const wrap = document.querySelector(".atk-layer-wrap");
    if (!wrap || wrap === watchedWrap) {
      if (wrap?.querySelector(".atk-sidebar-iframe-wrap iframe")) pump();
      return;
    }
    layerObs?.disconnect();
    watchedWrap = wrap;
    layerObs = new MutationObserver(() => {
      if (wrap.querySelector(".atk-sidebar-iframe-wrap iframe")) pump();
    });
    layerObs.observe(wrap, { childList: true, subtree: true });
    if (wrap.querySelector(".atk-sidebar-iframe-wrap iframe")) pump();
  };
  const bodyObs = new MutationObserver(watchLayer);
  bodyObs.observe(document.body, { childList: true });
  watchLayer();
  return () => {
    window.clearInterval(retry);
    document.removeEventListener("click", onClick, true);
    themeObs.disconnect();
    bodyObs.disconnect();
    layerObs?.disconnect();
  };
}

type ArtalkChecker = {
  checkAdmin: (opts?: { onSuccess?: () => void; onCancel?: () => void }) => Promise<unknown>;
};

type ArtalkCommentData = {
  id?: number;
  rid?: number;
  nick?: string;
  content?: string;
  content_marked?: string;
  is_collapsed?: boolean;
};

type ArtalkCommentNode = {
  $el?: HTMLElement;
  opts?: { replyTo?: ArtalkCommentData };
  getData: () => ArtalkCommentData;
  getParent?: () => ArtalkCommentNode | null;
};

type ArtalkInstance = {
  update: (conf: Record<string, unknown>) => void;
  reload: () => void;
  destroy: () => void;
  on?: (name: string, handler: () => void) => void;
  getCommentNodes?: () => ArtalkCommentNode[];
  ctx?: {
    inject?: (name: string) => ArtalkChecker;
    getCommentNodes?: () => ArtalkCommentNode[];
  };
};

let artalk: ArtalkInstance | undefined;
let loadObserver: IntersectionObserver | undefined;
let zhTWLocale: unknown;

function pageKey() {
  const base = site.value.base || "/";
  let path = decodeURI(window.location.pathname);
  if (base !== "/" && path.startsWith(base)) {
    path = "/" + path.slice(base.length).replace(/^\/+/, "");
  }
  path = path.replace(/\/$/, "") || "/";
  return path;
}

function commentImageEndpoint() {
  const hostName = window.location.hostname;
  if (
    hostName === "penn-notes.draftly.cn" ||
    hostName === "localhost" ||
    hostName === "127.0.0.1"
  ) {
    return "/api/comment-images";
  }
  return `${MAIN_ORIGIN}/api/comment-images`;
}

async function artalkLocale() {
  const ui = uiLocale.value;
  if (ui === "en") return "en";
  if (ui === "zh-TW") {
    if (!zhTWLocale) {
      const mod = await import("artalk/i18n/zh-TW");
      zhTWLocale = (mod as { default?: unknown }).default ?? mod;
    }
    return zhTWLocale;
  }
  return "zh-CN";
}

async function uploadCommentImage(file: File) {
  const res = await fetch(commentImageEndpoint(), {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  let data: { url?: string; message?: string } = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || !data.url) {
    throw new Error(data.message || "图片上传失败");
  }
  return data.url;
}

function installArtalkTokenQuery() {
  const hostName = window.location.hostname;
  if (hostName !== "penn-notes.draftly.cn") return;
  const marked = window as Window & { __pennArtalkTokenQuery?: boolean };
  if (marked.__pennArtalkTokenQuery) return;
  marked.__pennArtalkTokenQuery = true;
  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const raw = input instanceof Request ? input.url : String(input);
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      const next = artalkApiUrlWithToken(raw, headers.get("Authorization") || "", window.location.href);
      if (next) {
        if (typeof input === "string" || input instanceof URL) return orig(next, init);
        return orig(new Request(next, input), init);
      }
    } catch {
      /* 补丁失败就走原来的请求 */
    }
    return orig(input as RequestInfo, init);
  };
}

async function ensureArtalkAuthBridge() {
  installArtalkTokenQuery();
  if (window.location.hostname !== "penn-notes.draftly.cn") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(withBase("/artalk-auth-sw.js"));
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 1500);
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          window.clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
    });
  } catch {
    /* 控制中心 iframe 仍依赖 service worker；页面上的 fetch 补丁已经盖住密码框 */
  }
}

let stopAdminNameWatch: (() => void) | undefined;

function readArtalkUser() {
  try {
    return JSON.parse(localStorage.getItem("ArtalkUser") || "{}") as { name?: string; is_admin?: boolean };
  } catch {
    return {};
  }
}

function watchAdminNameLeave(host: HTMLElement, instance: ArtalkInstance) {
  let disposed = false;
  let detach = () => {};
  const attach = () => {
    if (disposed || detach !== empty) return;
    const nameInput = host.querySelector<HTMLInputElement>('.atk-header [name="name"]');
    const checkers = instance.ctx?.inject?.("checkers");
    if (!nameInput || !checkers?.checkAdmin) return;
    let adminName = "";
    let skipUntil = 0;
    const remember = () => {
      const user = readArtalkUser();
      if (user.is_admin && user.name) adminName = String(user.name);
    };
    remember();
    const original = checkers.checkAdmin.bind(checkers);
    checkers.checkAdmin = (opts) => {
      const name = nameInput.value.trim();
      const autoPrompt = !!opts?.onSuccess && !opts.onCancel;
      if (skipUntil > Date.now() && adminName && name !== adminName && autoPrompt) return Promise.resolve();
      return original(opts);
    };
    const onInput = () => {
      const name = nameInput.value.trim();
      if (!adminName || name === adminName) return;
      skipUntil = Date.now() + 8000;
    };
    nameInput.addEventListener("focus", remember);
    nameInput.addEventListener("input", onInput);
    detach = () => {
      checkers.checkAdmin = original;
      nameInput.removeEventListener("focus", remember);
      nameInput.removeEventListener("input", onInput);
    };
  };
  const empty = detach;
  attach();
  const obs = new MutationObserver(attach);
  obs.observe(host, { childList: true, subtree: true });
  const timer = window.setInterval(() => {
    attach();
    if (detach !== empty) {
      window.clearInterval(timer);
      obs.disconnect();
    }
  }, 50);
  return () => {
    disposed = true;
    window.clearInterval(timer);
    obs.disconnect();
    detach();
  };
}

async function mountArtalk() {
  if (!enabled || !host.value || artalk) return;
  await ensureArtalkAuthBridge();
  if (!host.value || artalk) return;
  const [{ default: Artalk }] = await Promise.all([
    import("artalk"),
    import("artalk/Artalk.css"),
  ]);
  const locale = await artalkLocale();
  artalk = Artalk.init({
    el: host.value,
    pageKey: pageKey(),
    pageTitle: document.title,
    server: artalkConf!.server!,
    site: artalkConf!.site!,
    locale: locale as string,
    darkMode: false,
    flatMode: false,
    pagination: {
      pageSize: 20,
      readMore: true,
      autoLoad: false,
    },
    heightLimit: {
      content: 300,
      children: 100000,
      scrollable: false,
    },
    preferRemoteConf: false,
    versionCheck: false,
    uaBadge: true,
    imgUpload: true,
    imgUploader: uploadCommentImage,
    emoticons: withBase("/vendor/artalk/emoticons.json"),
    gravatar: {
      mirror: "https://weavatar.com/avatar/",
      params: "sha256=1&d=mp&s=240",
    },
  });
  paintArtalk(host.value);
  artalk.on?.("comment-inserted", () => {
    if (host.value) paintCommentLayout(host.value);
  });
  stopAvatarWatch?.();
  stopAvatarWatch = watchCommentAvatars(host.value);
  stopAdminNameWatch?.();
  stopAdminNameWatch = watchAdminNameLeave(host.value, artalk);
}

function setupLazyLoad() {
  if (!enabled || !root.value || typeof IntersectionObserver === "undefined") {
    void mountArtalk();
    return;
  }
  loadObserver?.disconnect();
  loadObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      void mountArtalk();
      loadObserver?.disconnect();
      loadObserver = undefined;
    },
    { rootMargin: "240px 0px" },
  );
  loadObserver.observe(root.value);
}

onMounted(() => {
  if (!enabled) return;
  stopSidebarSkin = watchSidebarSkin();
  setupLazyLoad();
});

watch(
  () => route.path,
  () => {
    if (!artalk) return;
    artalk.update({
      pageKey: pageKey(),
      pageTitle: document.title,
    });
    artalk.reload();
  },
);

watch(
  () => uiLocale.value,
  async () => {
    if (!artalk || !host.value) return;
    paintArtalk(host.value);
    artalk.update({ locale: await artalkLocale() });
  },
);

onBeforeUnmount(() => {
  stopSidebarSkin?.();
  stopSidebarSkin = undefined;
  stopAvatarWatch?.();
  stopAvatarWatch = undefined;
  stopAdminNameWatch?.();
  stopAdminNameWatch = undefined;
  loadObserver?.disconnect();
  loadObserver = undefined;
  artalk?.destroy();
  artalk = undefined;
});
</script>

<template>
  <section v-if="enabled" ref="root" class="comments-section" :aria-label="t('comments').ariaLabel">
    <div class="comments-panel">
      <header class="comments-head">
        <h2 class="comments-title">{{ t('comments').title }}</h2>
        <p class="comments-hint">{{ t('comments').hint }}</p>
      </header>
      <div ref="host" class="artalk-host" />
    </div>
  </section>
</template>

<style scoped>
.comments-section {
  margin-top: 48px;
  padding-top: 28px;
  border-top: 1px solid var(--border);
}

.comments-panel {
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
  box-shadow: none;
}

.comments-head {
  margin: 0 0 16px;
  padding: 0;
  background: none;
}

.comments-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text);
}

.comments-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-3);
}

.artalk-host {
  min-height: 80px;
}

.dark .comments-panel,
:global(html.focus-mode:not(.dark)) .comments-panel {
  border: 0;
  background: transparent;
  padding: 0;
  box-shadow: none;
}

:global(.atk-layer-wrap) {
  --at-color-font: var(--text);
  --at-color-deep: var(--text);
  --at-color-sub: var(--text-3);
  --at-color-meta: var(--text-3);
  --at-color-border: var(--border);
  --at-color-bg: var(--surface);
  --at-color-bg-transl: var(--surface);
  --at-color-bg-grey: var(--bg);
  --at-color-main: var(--accent);
}
</style>

<style>
/* Artalk 把 .artalk 加在挂载节点上，变量必须打在这个节点，且压过组件自带的浅色默认值 */
.comments-section .artalk {
  --at-color-font: var(--text);
  --at-color-deep: var(--text);
  --at-color-sub: var(--text-3);
  --at-color-grey: var(--text-3);
  --at-color-meta: var(--text-3);
  --at-color-border: var(--border);
  --at-color-light: var(--accent);
  --at-color-bg: var(--surface);
  --at-color-bg-transl: color-mix(in srgb, var(--surface) 92%, transparent);
  --at-color-bg-grey: var(--bg);
  --at-color-bg-grey-transl: var(--bg);
  --at-color-main: var(--accent);
  --at-color-gradient: linear-gradient(180deg, transparent, var(--surface));
  font-family: var(--vp-font-family-base);
  color: var(--text);
}

.comments-section .artalk .atk-main-editor {
  --penn-editor-line: var(--border);
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  column-gap: 12px;
  align-items: start;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.comments-section .artalk .atk-main-editor:focus-within {
  --penn-editor-line: color-mix(in srgb, var(--accent) 45%, var(--border));
}

.comments-section .artalk .atk-main-editor > .penn-editor-avatar {
  grid-column: 1;
  grid-row: 1 / span 3;
  width: 40px;
  height: 40px;
  border-radius: 14px;
}

.comments-section .artalk .atk-main-editor > :not(.penn-editor-avatar) {
  grid-column: 2;
}

.comments-section .artalk .atk-main-editor > .atk-header {
  gap: 0;
  margin: 0;
  padding: 10px 12px 0;
  border: 1px solid var(--penn-editor-line);
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  background: var(--surface);
}

.comments-section .artalk .atk-main-editor > .atk-header input {
  min-width: 0;
  margin: 0;
  border: 0;
  border-radius: 0;
  outline: none;
  background: var(--bg);
  color: var(--text);
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: none;
}

.comments-section .artalk .atk-main-editor > .atk-header input:first-of-type {
  border-radius: 8px 0 0 8px;
}

.comments-section .artalk .atk-main-editor > .atk-header input:last-of-type {
  border-radius: 0 8px 8px 0;
}

.comments-section .artalk .atk-main-editor > .atk-header input + input {
  box-shadow: inset 1px 0 0 var(--border);
}

.comments-section .artalk .atk-main-editor > .atk-header input::placeholder {
  color: var(--text-3);
}

.comments-section .artalk .atk-main-editor > .atk-header input:focus {
  position: relative;
  z-index: 1;
  background: var(--surface);
  box-shadow: inset 0 0 0 1.5px var(--accent);
}

@media (max-width: 768px) {
  .comments-section .artalk .atk-main-editor > .atk-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .comments-section .artalk .atk-main-editor > .atk-header input,
  .comments-section .artalk .atk-main-editor > .atk-header input:first-of-type,
  .comments-section .artalk .atk-main-editor > .atk-header input:last-of-type {
    flex: 1 1 140px;
    border-radius: 8px;
    box-shadow: none;
  }
}

.comments-section .artalk .atk-main-editor > .atk-textarea-wrap {
  margin-top: 0;
  padding: 8px 14px 0;
  border: 0;
  border-right: 1px solid var(--penn-editor-line);
  border-left: 1px solid var(--penn-editor-line);
  border-radius: 0;
  background: var(--surface);
}

.comments-section .artalk .atk-main-editor > .atk-textarea-wrap > .atk-textarea {
  min-height: 88px;
  margin: 0;
  padding: 4px 0 8px;
  border: 0;
  border-radius: 0;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 15px;
  line-height: 1.7;
}

.comments-section .artalk .atk-main-editor > .atk-textarea-wrap > .atk-textarea::placeholder {
  color: var(--text-3);
}

.comments-section .artalk .atk-main-editor > .atk-bottom {
  padding: 0;
}

.comments-section .artalk .atk-main-editor > .atk-bottom .atk-plug-btn {
  border-radius: 8px;
  color: var(--text-3);
}

.comments-section .artalk .atk-main-editor > .atk-bottom .atk-plug-btn:hover {
  background: var(--surface);
  color: var(--text);
}

.comments-section .artalk .atk-main-editor > .atk-bottom .atk-send-btn {
  height: 34px;
  min-width: 5.5em;
  border-radius: 8px;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.comments-section .artalk .atk-main-editor > .atk-bottom .atk-send-btn:hover {
  filter: brightness(1.06);
}

.comments-section .artalk .atk-plug-panel-wrap {
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.comments-section .artalk .atk-editor-plug-emoticons > .atk-grp-wrap > .atk-grp {
  padding: 8px 8px 52px;
}

.comments-section .artalk .atk-editor-plug-emoticons > .atk-grp-wrap > .atk-grp > .atk-item {
  border-radius: 8px;
}

.comments-section .artalk .atk-editor-plug-emoticons > .atk-grp-wrap > .atk-grp > .atk-item:hover {
  background: var(--accent-soft);
}

.comments-section .artalk .atk-editor-plug-emoticons > .atk-grp-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  height: auto;
  padding: 8px 12px;
  border: 0;
  background: color-mix(in srgb, var(--bg) 65%, var(--surface));
}

.comments-section .artalk .atk-editor-plug-emoticons > .atk-grp-switcher > span {
  float: none;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--text-2);
  font-size: 12px;
  line-height: 26px;
}

.comments-section .artalk .atk-editor-plug-emoticons > .atk-grp-switcher > span:hover {
  background: var(--surface);
  color: var(--text);
}

.comments-section .artalk .atk-editor-plug-emoticons > .atk-grp-switcher > span.active,
.comments-section .artalk .atk-editor-plug-emoticons > .atk-grp-switcher > span.active:hover {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 650;
}

.comments-section .artalk .atk-main-editor > .atk-bottom {
  align-items: center;
  gap: 8px;
  margin-top: 0;
  padding: 2px 10px 10px;
  border: 1px solid var(--penn-editor-line);
  border-top: 0;
  border-radius: 0 0 12px 12px;
  background: var(--surface);
}

.comments-section .artalk .atk-main-editor > .atk-bottom .atk-plug-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
}

.comments-section .artalk .atk-main-editor > .atk-bottom .atk-state-btn {
  height: 28px;
  padding: 0 2px 0 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--text-2);
  font-size: 12px;
}

.comments-section .artalk .atk-main-editor > .atk-bottom .atk-state-btn .atk-text {
  color: var(--accent);
  font-weight: 650;
}

.comments-section .artalk .atk-main-editor > .atk-bottom .atk-state-btn .atk-cancel {
  width: 22px;
  height: 22px;
  margin-left: 2px;
  padding: 0;
  border-radius: 50%;
  background: transparent;
}

.comments-section .artalk .atk-main-editor > .atk-bottom .atk-state-btn:hover .atk-cancel {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
}

.comments-section .artalk .atk-main-editor > .atk-bottom .atk-send-btn {
  height: 32px;
}

.comments-section .artalk > .atk-list > .atk-list-header {
  align-items: center;
  padding: 2px 2px 10px;
}

.comments-section .artalk > .atk-list > .atk-list-header .atk-comment-count {
  font-size: 13px;
  font-weight: 650;
  color: var(--text-2);
}

.comments-section .artalk > .atk-list > .atk-list-header .atk-comment-count .atk-comment-count-num {
  margin-right: 2px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.comments-section .artalk > .atk-list > .atk-list-header .atk-right-action > span {
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 13px;
  color: var(--text-2);
}

.comments-section .artalk > .atk-list > .atk-list-header .atk-right-action > span.atk-on,
.comments-section .artalk > .atk-list > .atk-list-header .atk-right-action > span.atk-on * {
  color: var(--text-2);
}

.comments-section .artalk > .atk-list > .atk-list-header .atk-right-action > span:hover,
.comments-section .artalk > .atk-list > .atk-list-header .atk-right-action > span:hover * {
  background: var(--bg);
  color: var(--text);
}

.comments-section .artalk .atk-comment-wrap {
  padding: 4px 0;
}

.comments-section .artalk > .atk-list > .atk-list-body > .atk-list-comments-wrap > .atk-comment-wrap + .atk-comment-wrap {
  margin-top: 4px;
  border-top: 1px solid var(--border);
}

.comments-section .artalk .atk-comment {
  padding: 14px 2px 8px;
}

.comments-section .artalk .atk-comment > .atk-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: transparent;
  box-shadow: none;
}

.comments-section .artalk .atk-comment > .atk-main {
  margin-left: 52px;
}

.comments-section .artalk .atk-comment-children > .atk-comment-wrap > .atk-comment > .atk-avatar img {
  width: 28px;
  height: 28px;
  border-radius: 10px;
}

.comments-section .artalk .atk-comment-children > .atk-comment-wrap > .atk-comment > .atk-main {
  margin-left: 38px;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-header {
  gap: 6px 8px;
  min-height: 22px;
  margin-bottom: 4px;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-item.atk-nick,
.comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-item.atk-nick a {
  color: var(--text);
  font-size: 14px;
  font-weight: 650;
}

.comments-section .artalk .atk-footer .atk-actions > .atk-date {
  margin-right: 6px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 28px;
}

.comments-section .artalk .atk-footer .atk-actions > .atk-ua-wrap {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-right: 8px;
}

.comments-section .artalk .atk-footer .atk-ua,
.comments-section .artalk .atk-footer .atk-region-badge {
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text-3);
  font-size: 12px;
  line-height: 28px;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-ua-wrap {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-ua,
.comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-region-badge {
  border-radius: 999px;
  background: var(--bg);
  color: var(--text-3);
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-reply-at {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 450;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-reply-at .atk-arrow {
  display: none;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-reply-at::before {
  content: var(--penn-reply-label, "回复");
}

.comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-reply-at .atk-nick {
  color: var(--text-2);
  font-size: 12px;
  font-weight: 650;
}

.comments-section .artalk .atk-comment-children {
  margin: 2px 0 0;
  padding: 0;
  border: 0;
}

.comments-section .artalk .atk-comment-children::before {
  content: none;
}

.comments-section .artalk .atk-comment-children > .atk-comment-wrap {
  margin: 0;
  border: 0;
  padding: 0;
  background: transparent;
}

.comments-section .artalk .atk-comment-children > .atk-comment-wrap > .atk-comment {
  margin: 0;
  padding: 8px 0 2px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.comments-section .artalk .atk-comment-children .atk-ua-wrap,
.comments-section .artalk .atk-comment-children .atk-comment > .atk-main > .atk-header .atk-reply-at {
  display: none;
}

.comments-section .artalk .atk-comment-children > .atk-comment-wrap > .atk-comment > .atk-main > .atk-header .atk-item.atk-nick,
.comments-section .artalk .atk-comment-children > .atk-comment-wrap > .atk-comment > .atk-main > .atk-header .atk-item.atk-nick a {
  font-size: 14px;
  font-weight: 650;
}

.comments-section .artalk .atk-comment-children > .atk-comment-wrap > .atk-comment > .atk-main > .atk-body,
.comments-section .artalk .atk-comment-children > .atk-comment-wrap > .atk-comment > .atk-main > .atk-body > .atk-content {
  font-size: 14px;
  line-height: 1.65;
}

.comments-section .artalk .atk-comment-children > .atk-comment-wrap > .atk-comment > .atk-main > .atk-footer {
  display: flex;
  margin-top: 2px;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-badge {
  border-radius: 999px;
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
  font-size: 11px;
  font-weight: 650;
  line-height: 18px;
  padding: 0 7px;
}

.dark .comments-section .artalk .atk-comment > .atk-main > .atk-header .atk-badge {
  background: color-mix(in srgb, var(--link) 22%, var(--surface)) !important;
  color: var(--link) !important;
}

.comments-section .artalk .atk-footer {
  margin-top: 2px;
}

.comments-section .artalk .atk-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}

.comments-section .artalk .atk-common-action-btn {
  border-radius: 999px;
  padding: 0 8px;
  font-size: 12px;
  line-height: 24px;
  color: var(--text-3);
}

.comments-section .artalk .atk-common-action-btn:hover {
  background: var(--bg);
  color: var(--accent);
}

.comments-section .artalk .atk-common-action-btn[atk-only-admin-show] {
  display: none;
}

.comments-section .artalk .atk-comment-wrap:hover > .atk-comment > .atk-main > .atk-footer .atk-common-action-btn[atk-only-admin-show],
.comments-section .artalk .atk-comment-wrap:focus-within > .atk-comment > .atk-main > .atk-footer .atk-common-action-btn[atk-only-admin-show] {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: 22px;
  margin-left: 2px;
  padding: 0 7px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-2);
  line-height: 20px;
}

.comments-section .artalk .atk-comment-wrap:hover > .atk-comment > .atk-main > .atk-footer .atk-common-action-btn:not([atk-only-admin-show]) + .atk-common-action-btn[atk-only-admin-show] {
  margin-left: 10px;
}

.comments-section .artalk .atk-comment-wrap:hover > .atk-comment > .atk-main > .atk-footer .atk-common-action-btn:not([atk-only-admin-show]) + .atk-common-action-btn[atk-only-admin-show]::before {
  content: "";
  width: 1px;
  height: 12px;
  margin-right: 8px;
  background: var(--border);
}

.comments-section .artalk .atk-comment-wrap:hover > .atk-comment > .atk-main > .atk-footer .atk-common-action-btn[atk-only-admin-show]:hover {
  background: var(--accent-soft);
  color: var(--accent);
}

.comments-section .artalk .atk-comment:has(> .atk-main > .atk-comment-children:hover) > .atk-main > .atk-footer .atk-common-action-btn[atk-only-admin-show] {
  display: none;
}

@media (max-width: 768px), (hover: none) {
  .comments-section .artalk .atk-comment > .atk-main > .atk-footer .atk-actions {
    column-gap: 8px;
    row-gap: 6px;
  }

  .comments-section .artalk .atk-comment > .atk-main > .atk-footer .atk-actions > span {
    margin: 0 !important;
  }

  .comments-section .artalk .atk-common-action-btn[atk-only-admin-show] {
    display: none;
  }
}

.comments-section .artalk .atk-actions > .penn-more {
  margin-left: auto;
  padding: 0 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-3);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 24px;
  cursor: pointer;
}

.comments-section .artalk .atk-actions > .penn-more:hover {
  background: var(--bg);
  color: var(--text);
}

.comments-section .artalk .atk-actions > .penn-more-menu {
  position: fixed;
  z-index: 30;
  display: flex;
  flex-direction: column;
  min-width: 132px;
  margin: 0;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--text) 12%, transparent);
}

.comments-section .artalk .atk-actions > .penn-more-menu[hidden] {
  display: none;
}

.comments-section .artalk .atk-actions {
  position: relative;
}

.comments-section .artalk .penn-more-menu .atk-common-action-btn.atk-hide {
  display: none !important;
}

.comments-section .artalk .penn-more-menu .atk-common-action-btn[atk-only-admin-show] {
  display: flex !important;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  width: 100%;
  height: 32px;
  margin: 0 !important;
  padding: 0 10px !important;
  border: 0 !important;
  border-radius: 8px;
  background: transparent !important;
  color: var(--text);
  font-size: 13px;
  line-height: 32px;
}

.comments-section .artalk .penn-more-menu .atk-common-action-btn[atk-only-admin-show]::before {
  content: none !important;
}

.comments-section .artalk .penn-more-menu .atk-common-action-btn[atk-only-admin-show]:hover {
  background: var(--bg) !important;
  color: var(--accent);
}

.comments-section .artalk .atk-content {
  font-size: 15px;
  line-height: 1.75;
  color: var(--text);
}

.comments-section .artalk .atk-content p {
  margin: 0.4em 0;
}

.comments-section .artalk .atk-content img {
  display: block;
  width: auto !important;
  max-width: min(100%, 420px);
  max-height: 280px;
  height: auto;
  margin: 10px 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  object-fit: contain;
}

.comments-section .artalk blockquote {
  margin: 10px 0;
  padding: 8px 12px;
  border: 0;
  border-left: 3px solid color-mix(in srgb, var(--accent) 55%, var(--border));
  border-radius: 0 8px 8px 0;
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
  color: var(--text-2);
}

.comments-section .artalk .atk-comment > .atk-main > .atk-body > .atk-reply-to {
  margin: 2px 0 8px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-body > .atk-reply-to > .atk-meta {
  margin: 0;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 450;
  line-height: 1.4;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-body > .atk-reply-to > .atk-meta .atk-nick {
  color: var(--accent);
  font-weight: 650;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-body > .atk-reply-to > .atk-content {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin: 6px 0 8px;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--text) 10%, var(--bg));
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-body > .atk-reply-to > .atk-content img[atk-emoticon] {
  display: inline-block;
  width: auto !important;
  max-width: none;
  max-height: 28px;
  margin: 0 1px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.comments-section .artalk .atk-comment > .atk-main > .atk-body > .atk-reply-to > .atk-content p {
  margin: 0;
}

.comments-section .artalk .atk-comment:has(> .atk-main > .atk-body > .atk-reply-to) > .atk-main > .atk-header .atk-reply-at {
  display: none !important;
}


.comments-section .artalk .atk-comment-wrap.penn-reply-collapsed {
  display: none;
}

.comments-section .artalk .penn-replies-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 2px 0 8px 38px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-2);
  font-size: 14px;
  line-height: 22px;
  cursor: pointer;
}

.comments-section .artalk .penn-replies-more:hover {
  color: var(--accent);
}

.comments-section .artalk .penn-replies-more::after,
.comments-section .artalk .atk-list-read-more .atk-text::after {
  content: "";
  width: 6px;
  height: 6px;
  margin-left: 2px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: translateY(-2px) rotate(45deg);
}

.comments-section .artalk .penn-replies-more.is-open::after {
  transform: translateY(1px) rotate(225deg);
}

.comments-section .artalk .atk-list-read-more {
  margin: 16px 0 4px;
  padding: 0;
  border: 0;
  cursor: pointer;
}

.comments-section .artalk .atk-list-read-more .atk-list-read-more-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 14px;
}

.comments-section .artalk .atk-list-read-more:hover .atk-list-read-more-inner {
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
  color: var(--accent);
}

.comments-section .artalk .atk-list-read-more .atk-text {
  display: inline-flex;
  align-items: center;
}

.comments-section .artalk .atk-pagination > .atk-btn,
.comments-section .artalk .atk-pagination > .atk-input {
  border-radius: 8px;
  border-color: var(--border);
  color: var(--text-2);
}

.atk-layer-wrap {
  --at-color-font: var(--text);
  --at-color-deep: var(--text);
  --at-color-sub: var(--text-3);
  --at-color-meta: var(--text-3);
  --at-color-border: var(--border);
  --at-color-bg: var(--surface);
  --at-color-bg-transl: color-mix(in srgb, var(--bg) 55%, transparent);
  --at-color-bg-grey: var(--bg);
  --at-color-main: var(--accent);
  font-family: var(--vp-font-family-base);
}

.atk-layer-wrap .atk-layer-mask {
  background: color-mix(in srgb, var(--text) 28%, transparent);
}

.atk-layer-dialog-wrap > .atk-layer-dialog {
  width: min(400px, calc(100vw - 32px));
  padding: 18px 18px 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--text) 6%, transparent),
    0 18px 48px color-mix(in srgb, var(--text) 16%, transparent);
}

.atk-layer-dialog-wrap > .atk-layer-dialog > .atk-layer-dialog-content {
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
}

.atk-layer-dialog-wrap > .atk-layer-dialog > .atk-layer-dialog-content input {
  margin-top: 12px;
  border-radius: 8px;
  border-color: var(--border);
  background: var(--bg);
  color: var(--text);
  text-align: left;
  padding: 0 12px;
}

.atk-layer-dialog-wrap > .atk-layer-dialog > .atk-layer-dialog-content input:focus {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.atk-layer-dialog-wrap > .atk-layer-dialog > .atk-layer-dialog-actions {
  gap: 8px;
  margin-top: 14px;
}

.atk-layer-dialog-wrap > .atk-layer-dialog > .atk-layer-dialog-actions button {
  border-radius: 8px;
  line-height: 34px;
  font-weight: 650;
}

.atk-layer-dialog-wrap > .atk-layer-dialog > .atk-layer-dialog-actions button[data-action="confirm"] {
  border-color: transparent;
  background: var(--accent);
  color: #fff;
}

.atk-sidebar-layer.atk-sidebar-layer {
  width: min(440px, 100%);
  transform: translateX(100%);
  border-left: 1px solid var(--border);
  background: var(--bg);
  box-shadow: -16px 0 40px color-mix(in srgb, var(--text) 14%, transparent);
}

.atk-sidebar-layer.atk-sidebar-layer .atk-sidebar-header .atk-sidebar-close {
  width: 32px;
  height: 32px;
  margin: 14px 12px 0 0;
  border-radius: 8px;
  font-size: 16px;
}

.atk-sidebar-layer.atk-sidebar-layer .atk-sidebar-header .atk-sidebar-close:hover {
  background: var(--surface);
}

.atk-sidebar-layer.atk-sidebar-layer .atk-sidebar-header .atk-sidebar-close :after {
  background-color: var(--text-3);
}

.atk-sidebar-layer.atk-sidebar-layer .atk-sidebar-header .atk-sidebar-close:hover :after {
  background-color: var(--text);
}

@media (max-width: 640px) {
  .comments-section .artalk .atk-main-editor > .atk-header {
    flex-wrap: wrap;
  }

  .comments-section .artalk .atk-main-editor > .atk-header input {
    flex: 1 1 calc(50% - 8px);
  }

  .comments-section .artalk .atk-main-editor > .atk-header input[name="link"] {
    flex-basis: 100%;
  }
}
</style>
