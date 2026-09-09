<script setup lang="ts">
/**
 * 明月浩空浮窗播放器：后台改歌单，站点只嵌脚本（与 imagineblog 同路）
 * 注册/管理：https://myhkw.cn/admin
 */
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useData } from "vitepress";
import musicDefaults from "../../data/music.json";

type MusicThemeCfg = {
  enabled?: boolean;
  provider?: string;
  myhkwPlayerId?: string;
  myhkwMobile?: boolean;
  myhkwAutoplay?: boolean;
  myhkwPosition?: "l" | "r";
};

const JQUERY_ID = "penn-myhkw-jquery";
const PLAYER_SCRIPT_ID = "myhk";

const { theme } = useData();
const cfg = computed(() => {
  const fromTheme = (theme.value.music || {}) as MusicThemeCfg;
  return {
    enabled: true,
    provider: "meting",
    myhkwPlayerId: "",
    myhkwMobile: true,
    myhkwAutoplay: false,
    myhkwPosition: "l" as const,
    ...musicDefaults,
    ...fromTheme,
  };
});

const playerId = computed(() => String(cfg.value.myhkwPlayerId || "").trim());
/** 由 MusicWidget 决定何时挂载；此处只要求有播放器 ID */
const active = computed(() => Boolean(cfg.value.enabled !== false && playerId.value));

function loadScript(src: string, attrs: Record<string, string>) {
  return new Promise<HTMLScriptElement>((resolve, reject) => {
    const id = attrs.id;
    if (id) {
      const existing = document.getElementById(id);
      if (existing instanceof HTMLScriptElement) {
        resolve(existing);
        return;
      }
    }
    const s = document.createElement("script");
    // 先写属性再挂 src，方便脚本启动时读到 key
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "src") continue;
      s.setAttribute(k, v);
    }
    s.onload = () => resolve(s);
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    s.src = src;
    document.body.appendChild(s);
  });
}

async function ensureJquery() {
  const w = window as Window & { jQuery?: unknown; $?: unknown };
  if (w.jQuery || w.$) return;
  await loadScript("https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js", {
    id: JQUERY_ID,
  });
}

onMounted(async () => {
  if (!active.value) return;
  const id = playerId.value;
  try {
    await ensureJquery();
    // 与官网/后台给出的短代码一致：只设 id / key / src
    await loadScript(`https://myhkw.cn/api/player/${encodeURIComponent(id)}`, {
      type: "text/javascript",
      id: PLAYER_SCRIPT_ID,
      key: id,
      ...(cfg.value.myhkwMobile === false ? { m: "0" } : {}),
      ...(cfg.value.myhkwAutoplay ? { au: "1" } : {}),
      ...(cfg.value.myhkwPosition === "r" ? { lr: "r" } : {}),
    });
  } catch (err) {
    console.warn("[penn-music] 明月浩空加载失败", err);
  }
});

onBeforeUnmount(() => {
  document.getElementById(PLAYER_SCRIPT_ID)?.remove();
});
</script>

<template>
  <!-- 明月浩空由脚本注入浮窗 DOM，此处无可视节点 -->
  <span v-if="active" class="penn-myhkw" hidden aria-hidden="true" />
</template>
