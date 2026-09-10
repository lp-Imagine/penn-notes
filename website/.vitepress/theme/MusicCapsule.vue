<script setup lang="ts">
/**
 * 音乐胶囊：APlayer + Meting；播放态贴近 Heo（封面 / 歌名 / 进度歌词）
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, Transition, watch } from "vue";
import { useData } from "vitepress";
import musicDefaults from "../../data/music.json";
import { getUiText, useI18n } from "./i18n";
const props = withDefaults(
  defineProps<{
    /** 有明月浩空 ID 时，歌单拉取失败（尤其限流）可向上交给兜底 */
    allowFallback?: boolean;
  }>(),
  { allowFallback: false },
);

const emit = defineEmits<{
  fallback: [];
}>();

type MusicThemeCfg = {
  enabled?: boolean;
  server?: string;
  type?: string;
  id?: string;
  volume?: number;
  order?: "list" | "random";
  loop?: "all" | "one" | "none";
  metingApi?: string;
};

type MetingTrack = {
  name?: string;
  title?: string;
  artist?: string;
  author?: string;
  url?: string;
  pic?: string;
  cover?: string;
  lrc?: string;
};

type PlayerAudio = {
  name: string;
  artist: string;
  url: string;
  cover: string;
  key: string;
  lrc?: string;
};

type LrcLine = { time: number; text: string };

type APlayerInstance = {
  play: () => void;
  pause: () => void;
  skipBack?: () => void;
  skipForward?: () => void;
  destroy: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  notice?: (text: string, time?: number, opacity?: number) => void;
  paused?: boolean;
  audio?: HTMLAudioElement;
  list?: {
    audios?: PlayerAudio[];
    index?: number;
    switch?: (index: number) => void;
    show?: () => void;
    hide?: () => void;
    remove?: (index: number) => void;
  };
};

/** 仅保留与主接口不同源、且浏览器可直连的备用；勿把 injahow 再列一次（与 /api/meting 同配额） */
const FALLBACK_APIS: string[] = [];

/** 把同后端的不同 URL 归成同一身份，避免限流时连打三次 */
function apiIdentity(api: string) {
  const raw = String(api || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/api/meting") || /api\.injahow\.cn/i.test(raw)) return "injahow";
  if (/api\.i-meto\.com/i.test(raw)) return "i-meto";
  try {
    const u = new URL(raw, "http://local.invalid");
    return `${u.host}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return raw;
  }
}

const DEFAULT_COVER = "/img/logo.svg";
const DEAD_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** 歌单元数据本地缓存：音源 URL 多为 Meting 代理链，可较长；刷新页面不再次打额度 */
const PLAYLIST_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const { theme } = useData();
const { t } = useI18n();
const cfg = computed(() => {
  const fromTheme = (theme.value.music || {}) as MusicThemeCfg;
  return {
    enabled: true,
    server: "netease",
    type: "playlist",
    id: "",
    volume: 0.7,
    order: "random" as const,
    loop: "all" as const,
    metingApi: "",
    ...musicDefaults,
    ...fromTheme,
  };
});

const enabled = computed(() => {
  const c = cfg.value;
  if (typeof window !== "undefined" && !window.matchMedia("(min-width: 768px)").matches) {
    return false;
  }
  return Boolean(c.enabled && c.id && c.server && c.metingApi);
});

const root = ref<HTMLElement | null>(null);
const host = ref<HTMLElement | null>(null);
const player = shallowRef<APlayerInstance | null>(null);
const ready = ref(false);
const failed = ref(false);
const loading = ref(false);
const loadingHint = ref(getUiText().music.loading);
const playing = ref(false);
const stretched = ref(false);
/** 播放中手动收起贴边 */
const pinnedDock = ref(false);
const errorHint = ref(getUiText().music.unavailable);
const trackName = ref("");
const trackArtist = ref("");
const trackCover = ref(DEFAULT_COVER);
const lyricText = ref("");
const lyricProgress = ref(0);
const hasLyrics = ref(false);

let lrcLines: LrcLine[] = [];
let lyricTimer: number | undefined;

function sanitizeCover(raw: string): string {
  const cover = String(raw || "").trim();
  if (!cover) return DEFAULT_COVER;
  // QQ/Meting 偶发返回 type=pic&id=（空 id），跟随跳转后 404 裂图
  try {
    const u = new URL(cover, "https://example.invalid");
    if (u.searchParams.get("type") === "pic") {
      const id = (u.searchParams.get("id") || "").trim();
      if (!id) return DEFAULT_COVER;
    }
  } catch {
    /* ignore */
  }
  return cover;
}

function trackKey(url: string): string {
  try {
    const u = new URL(url, "https://example.invalid");
    const id = (u.searchParams.get("id") || "").trim();
    if (id) return id;
  } catch {
    /* ignore */
  }
  return url;
}

function normalizeTracks(raw: MetingTrack[]): PlayerAudio[] {
  return raw
    .map((t) => {
      const name = String(t.name || t.title || "").trim();
      const artist = String(t.artist || t.author || getUiText().music.unknownArtist).trim();
      const url = String(t.url || "").trim();
      if (!name || !url) return null;
      return {
        name,
        artist,
        url,
        cover: sanitizeCover(String(t.cover || t.pic || "")),
        key: trackKey(url),
        lrc: t.lrc || undefined,
      };
    })
    .filter((t): t is PlayerAudio => Boolean(t));
}

function deadCacheKey() {
  const c = cfg.value;
  return `penn-music-dead:v1:${c.server}:${c.type}:${c.id}`;
}

function readDeadKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(deadCacheKey());
    if (!raw) return new Set();
    const data = JSON.parse(raw) as { keys?: string[]; updatedAt?: number };
    if (!data?.updatedAt || Date.now() - data.updatedAt > DEAD_CACHE_TTL_MS) return new Set();
    return new Set(Array.isArray(data.keys) ? data.keys : []);
  } catch {
    return new Set();
  }
}

function writeDeadKeys(keys: Set<string>) {
  try {
    localStorage.setItem(
      deadCacheKey(),
      JSON.stringify({ keys: [...keys], updatedAt: Date.now() }),
    );
  } catch {
    /* ignore quota */
  }
}

function rememberDeadKey(key: string) {
  if (!key) return;
  const dead = readDeadKeys();
  if (dead.has(key)) return;
  dead.add(key);
  writeDeadKeys(dead);
}

function applyDeadFilter(tracks: PlayerAudio[]): PlayerAudio[] {
  const dead = readDeadKeys();
  if (!dead.size) return tracks;
  const alive = tracks.filter((t) => !dead.has(t.key));
  return alive.length ? alive : tracks;
}

function playlistCacheKey() {
  const c = cfg.value;
  return `penn-music-playlist:v1:${c.server}:${c.type}:${c.id}`;
}

function readPlaylistCache(opts?: { allowStale?: boolean }): PlayerAudio[] | null {
  try {
    const raw = localStorage.getItem(playlistCacheKey());
    if (!raw) return null;
    const data = JSON.parse(raw) as { tracks?: PlayerAudio[]; updatedAt?: number };
    if (!data?.updatedAt || !Array.isArray(data.tracks) || !data.tracks.length) return null;
    const age = Date.now() - data.updatedAt;
    if (age > PLAYLIST_CACHE_TTL_MS && !opts?.allowStale) return null;
    const tracks = data.tracks
      .map((t) => {
        const name = String(t?.name || "").trim();
        const url = String(t?.url || "").trim();
        if (!name || !url) return null;
        return {
          name,
          artist: String(t?.artist || getUiText().music.unknownArtist).trim(),
          url,
          cover: sanitizeCover(String(t?.cover || "")),
          key: String(t?.key || trackKey(url)),
          lrc: t?.lrc || undefined,
        };
      })
      .filter((t): t is PlayerAudio => Boolean(t));
    if (!tracks.length) return null;
    return applyDeadFilter(tracks);
  } catch {
    return null;
  }
}

function writePlaylistCache(tracks: PlayerAudio[]) {
  if (!tracks.length) return;
  try {
    localStorage.setItem(
      playlistCacheKey(),
      JSON.stringify({
        updatedAt: Date.now(),
        tracks: tracks.map((t) => ({
          name: t.name,
          artist: t.artist,
          url: t.url,
          cover: t.cover,
          key: t.key,
          lrc: t.lrc,
        })),
      }),
    );
  } catch {
    /* ignore quota */
  }
}

function buildMetingUrl(apiBase: string) {
  const c = cfg.value;
  const base = String(apiBase || "").replace(/\?$/, "");
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}server=${encodeURIComponent(c.server)}&type=${encodeURIComponent(c.type)}&id=${encodeURIComponent(c.id)}`;
}

function apiCandidates() {
  const primary = String(cfg.value.metingApi || "").trim();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const api of [primary, ...FALLBACK_APIS]) {
    const a = String(api || "").trim();
    if (!a) continue;
    const id = apiIdentity(a);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(a);
  }
  return out;
}

function isRateLimitMessage(msg: string) {
  return /上限|频繁|rate.?limit|too many|明天再试/i.test(msg);
}

async function fetchPlaylist(opts?: { force?: boolean }): Promise<PlayerAudio[]> {
  if (!opts?.force) {
    const cached = readPlaylistCache();
    if (cached?.length) {
      loadingHint.value = getUiText().music.loading;
      return cached;
    }
  }

  let lastError = "empty";
  for (const api of apiCandidates()) {
    try {
      loadingHint.value = getUiText().music.loading;      const res = await fetch(buildMetingUrl(api), {
        credentials: "omit",
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const data = (await res.json()) as MetingTrack[] | { message?: string };
      if (!Array.isArray(data)) {
        const msg = String((data as { message?: string })?.message || "").trim();
        lastError = msg || "invalid playlist";
        continue;
      }
      const normalized = normalizeTracks(data);
      if (!normalized.length) {
        lastError = "empty playlist";
        continue;
      }
      writePlaylistCache(normalized);
      const audio = applyDeadFilter(normalized);
      if (!audio.length) {
        lastError = "empty playlist";
        continue;
      }
      return audio;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "network";
    }
  }

  // 网络失败或限流时，允许用过期缓存顶一下
  const stale = readPlaylistCache({ allowStale: true });
  if (stale?.length) return stale;

  throw new Error(lastError);
}

function parseLrc(raw?: string): LrcLine[] {
  if (!raw || !raw.trim()) return [];
  // 部分 Meting 返回的是纯文本歌词 URL；忽略非 LRC
  if (/^https?:\/\//i.test(raw.trim())) return [];
  const out: LrcLine[] = [];
  const lineRe = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  for (const row of raw.split(/\r?\n/)) {
    const text = row.replace(lineRe, "").trim();
    if (!text) continue;
    lineRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(row))) {
      const min = Number(m[1]);
      const sec = Number(m[2]);
      const frac = m[3] ? Number(m[3].padEnd(3, "0").slice(0, 3)) : 0;
      out.push({ time: min * 60 + sec + frac / 1000, text });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

function currentTrack(): PlayerAudio | null {
  const list = player.value?.list;
  return list?.audios?.[list.index ?? 0] || null;
}

async function loadTrackLrc(cur: PlayerAudio | null) {
  if (!cur?.lrc) {
    lrcLines = [];
    hasLyrics.value = false;
    return;
  }
  const raw = cur.lrc.trim();
  if (!/^https?:\/\//i.test(raw)) {
    lrcLines = parseLrc(raw);
    hasLyrics.value = lrcLines.length > 0;
    return;
  }
  try {
    const res = await fetch(raw, {
      credentials: "omit",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      lrcLines = [];
      hasLyrics.value = false;
      return;
    }
    lrcLines = parseLrc(await res.text());
    hasLyrics.value = lrcLines.length > 0;
  } catch {
    lrcLines = [];
    hasLyrics.value = false;
  }
}

function onCoverError() {
  if (trackCover.value !== DEFAULT_COVER) trackCover.value = DEFAULT_COVER;
}

async function syncTrackMeta() {
  const cur = currentTrack();
  trackName.value = cur?.name || getUiText().music.capsule;  trackArtist.value = cur?.artist || "";
  trackCover.value = cur?.cover || DEFAULT_COVER;
  await loadTrackLrc(cur);
  if (!lrcLines.length) {
    lyricText.value = trackArtist.value
      ? `${trackName.value} · ${trackArtist.value}`
      : trackName.value;
    lyricProgress.value = 0;
  } else {
    updateLyric();
  }
}

function updateLyric() {
  const audio = player.value?.audio;
  if (!audio || !lrcLines.length) {
    if (!lrcLines.length) {
      lyricText.value = trackArtist.value
        ? `${trackName.value} · ${trackArtist.value}`
        : trackName.value;
      lyricProgress.value = playing.value ? 0.35 : 0;
    }
    return;
  }
  const t = audio.currentTime || 0;
  let idx = 0;
  for (let i = 0; i < lrcLines.length; i += 1) {
    if (lrcLines[i].time <= t) idx = i;
    else break;
  }
  const cur = lrcLines[idx];
  const next = lrcLines[idx + 1];
  lyricText.value = cur?.text || trackName.value;
  if (!cur) {
    lyricProgress.value = 0;
    return;
  }
  const start = cur.time;
  const end = next?.time ?? start + 4;
  const span = Math.max(0.35, end - start);
  lyricProgress.value = Math.min(1, Math.max(0, (t - start) / span));
}

function startLyricClock() {
  stopLyricClock();
  const tick = () => {
    updateLyric();
    lyricTimer = window.setTimeout(tick, 80);
  };
  tick();
}

function stopLyricClock() {
  if (lyricTimer) {
    window.clearTimeout(lyricTimer);
    lyricTimer = undefined;
  }
}

function bindPlayerEvents(ap: APlayerInstance) {
  // QQ/Meting 大量曲目无免费音源；失败时用中文提示，并移出列表避免反复跳过
  if (typeof ap.notice === "function") {
    const rawNotice = ap.notice.bind(ap);
    ap.notice = (text: string, time?: number, opacity?: number) => {
      const msg = String(text || "");
      if (/audio error/i.test(msg)) {
        return rawNotice(getUiText().music.skipNotice, time ?? 2500, opacity);
      }
      return rawNotice(text, time, opacity);
    };
  }

  ap.on("play", () => {
    playing.value = true;
    void syncTrackMeta().then(() => startLyricClock());
  });
  ap.on("pause", () => {
    playing.value = false;
    pinnedDock.value = false;
    stopLyricClock();
    updateLyric();
  });
  ap.on("listswitch", () => {
    void syncTrackMeta();
  });
  ap.on("error", () => {
    const list = ap.list;
    const audios = list?.audios || [];
    if (!list || audios.length <= 1 || typeof list.remove !== "function") return;
    const idx = list.index ?? 0;
    const cur = audios[idx];
    const name = cur?.name || getUiText().music.capsule;
    if (cur?.key) rememberDeadKey(cur.key);
    try {
      // remove 会触发 listswitch，从而取消 APlayer 默认的 2 秒后再 skip
      list.remove(idx);
      ap.notice?.(getUiText().music.removeNotice(name), 2800);      if (!ap.paused) ap.play();
    } catch {
      /* ignore */
    }
  });
  ap.audio?.addEventListener("timeupdate", updateLyric);
}

async function waitForHost(tries = 8) {
  for (let i = 0; i < tries; i += 1) {
    if (host.value) return true;
    await nextTick();
    await new Promise((r) => setTimeout(r, 16));
  }
  return Boolean(host.value);
}

async function mountPlayer(opts?: { force?: boolean }) {
  if (!enabled.value || loading.value) return;
  loading.value = true;
  loadingHint.value = getUiText().music.loading;
  failed.value = false;
  ready.value = false;
  errorHint.value = getUiText().music.unavailable;
  try {
    if (!(await waitForHost())) throw new Error("player host missing");

    const audio = await fetchPlaylist({ force: Boolean(opts?.force) });
    if (!host.value) throw new Error("player host missing");

    try {
      player.value?.destroy();
    } catch {
      /* ignore */
    }
    player.value = null;
    host.value.innerHTML = "";

    const [{ default: APlayer }] = await Promise.all([
      import("aplayer"),
      import("aplayer/dist/APlayer.min.css"),
    ]);

    const ap = new APlayer({
      container: host.value,
      mini: false,
      autoplay: false,
      theme: "#c4a06a",
      loop: cfg.value.loop || "all",
      order: cfg.value.order || "random",
      preload: "none",
      volume: cfg.value.volume ?? 0.7,
      mutex: true,
      lrcType: 3,
      listFolded: true,
      // 必须带单位；传数字会变成非法 max-height: 320，列表被外层裁切且无法滚动
      listMaxHeight: "280px",
      audio,
    }) as APlayerInstance;
    player.value = ap;
    bindPlayerEvents(ap);
    await syncTrackMeta();
    updateLyric();
    ready.value = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // 限流或拉歌单失败：有兜底时交给明月浩空，不展示错误胶囊
    if (props.allowFallback && (isRateLimitMessage(msg) || msg !== "player host missing")) {
      emit("fallback");
      failed.value = false;
      ready.value = false;
      return;
    }
    failed.value = true;
    ready.value = false;
    errorHint.value = isRateLimitMessage(msg)
      ? getUiText().music.rateLimited
      : msg.includes("timeout") || msg.includes("Timeout")
        ? getUiText().music.timeout
        : getUiText().music.unavailable;  } finally {
    loading.value = false;
  }
}

function togglePlay() {
  const ap = player.value;
  if (!ap) return;
  if (playing.value) ap.pause();
  else ap.play();
}

function playPrev() {
  const ap = player.value;
  if (!ap) return;
  if (typeof ap.skipBack === "function") ap.skipBack();
  else {
    const list = ap.list;
    const audios = list?.audios || [];
    if (!audios.length || typeof list?.switch !== "function") return;
    const idx = list.index ?? 0;
    list.switch((idx - 1 + audios.length) % audios.length);
  }
  if (!playing.value) ap.play();
}

function playNext() {
  const ap = player.value;
  if (!ap) return;
  if (typeof ap.skipForward === "function") ap.skipForward();
  else {
    const list = ap.list;
    const audios = list?.audios || [];
    if (!audios.length || typeof list?.switch !== "function") return;
    const idx = list.index ?? 0;
    list.switch((idx + 1) % audios.length);
  }
  if (!playing.value) ap.play();
}

const lyricWipeStyle = computed(() => ({
  width: `${Math.round(Math.min(1, Math.max(0, lyricProgress.value)) * 1000) / 10}%`,
}));

const coverBgStyle = computed(() => ({
  backgroundImage: trackCover.value ? `url("${trackCover.value}")` : "none",
}));

const isDocked = computed(
  () => ready.value && !stretched.value && (!playing.value || pinnedDock.value),
);

const showLyricMeta = computed(
  () => playing.value && hasLyrics.value && !isDocked.value,
);

const metaSubText = computed(() => {
  if (showLyricMeta.value) {
    return trackArtist.value
      ? `${trackName.value} · ${trackArtist.value}`
      : trackName.value;
  }
  return trackArtist.value || t("music").tapCover;
});
function toggleDock() {
  if (!ready.value || !playing.value) return;
  if (stretched.value) {
    stretched.value = false;
    player.value?.list?.hide?.();
  }
  pinnedDock.value = !pinnedDock.value;
}

function toggleStretch() {
  if (!ready.value) return;
  stretched.value = !stretched.value;
  if (stretched.value) {
    pinnedDock.value = false;
    player.value?.list?.show?.();
  } else {
    player.value?.list?.hide?.();
  }
}

function onDocClick(e: MouseEvent) {
  if (!stretched.value || !root.value) return;
  const t = e.target as Node | null;
  if (t && root.value.contains(t)) return;
  stretched.value = false;
  player.value?.list?.hide?.();
}

onMounted(() => {
  if (!enabled.value) return;
  void mountPlayer();
  document.addEventListener("click", onDocClick, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick, true);
  stopLyricClock();
  try {
    player.value?.destroy();
  } catch {
    /* ignore */
  }
  player.value = null;
});

watch(enabled, (on) => {
  if (on) void mountPlayer();
});
</script>

<template>
  <div
    v-if="enabled"
    ref="root"
    class="penn-music"
    :class="{
      'is-ready': ready,
      'is-playing': playing,
      'is-docked': isDocked,
      'is-stretch': stretched,
      'is-failed': failed,
      'is-loading': loading,
    }"
    :aria-label="t('music').aria"
  >
    <button
      v-if="loading || (!ready && !failed)"
      type="button"
      class="penn-music-capsule penn-music-capsule--idle"
      :title="loadingHint"
      disabled
    >
      {{ loadingHint }}
    </button>
    <button
      v-else-if="failed"
      type="button"
      class="penn-music-capsule penn-music-capsule--idle penn-music-capsule--error"
      :title="errorHint"
      @click="mountPlayer({ force: true })"
    >
      {{ errorHint }}
    </button>
    <div v-else class="penn-music-shell">
      <span
        class="penn-music-aura"
        aria-hidden="true"
        :class="{ 'is-on': playing }"
        :style="coverBgStyle"
      />
      <div
        class="penn-music-capsule"
        :class="{ 'is-on': playing }"
      >
        <span class="penn-music-cap-bg" aria-hidden="true" :style="coverBgStyle" />

        <button
          type="button"
          class="penn-music-cover-btn"
          :aria-pressed="playing ? 'true' : 'false'"
          :title="playing ? t('music').pause : t('music').play"
          @click.stop="togglePlay"
        >
          <img
            class="penn-music-cover"
            :src="trackCover"
            alt=""
            @error="onCoverError"
          />
          <span class="penn-music-cover-ring" aria-hidden="true" />
          <span class="penn-music-cover-icon" aria-hidden="true">
            <svg v-if="!playing" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M8 5.14v13.72L19 12 8 5.14z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
              <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
            </svg>
          </span>
        </button>

        <div class="penn-music-meta">
          <!-- 播放展开且有歌词：主行歌词扫光 -->
          <template v-if="showLyricMeta">
            <div class="penn-music-lrc is-karaoke">
              <Transition name="penn-lrc" mode="out-in">
                <div :key="lyricText || 'lrc'" class="penn-music-lrc-pair">
                  <span class="penn-music-lrc-base">{{ lyricText }}</span>
                  <span class="penn-music-lrc-wipe" :style="lyricWipeStyle" aria-hidden="true">
                    <span class="penn-music-lrc-wipe-text">{{ lyricText }}</span>
                  </span>
                </div>
              </Transition>
            </div>
            <div class="penn-music-sub">{{ metaSubText }}</div>
          </template>
          <!-- 未播 / 贴边 / 无歌词：歌名 -->
          <template v-else>
            <div class="penn-music-title">{{ trackName }}</div>
            <div class="penn-music-sub">{{ metaSubText }}</div>
          </template>
        </div>

        <div class="penn-music-actions">
          <button
            type="button"
            class="penn-music-icon-btn"
            :title="t('music').prev"
            :aria-label="t('music').prev"
            @click.stop="playPrev"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              <path d="M6 5.5h1.75v13H6v-13zm2.9 6.5L17.5 18.2V5.8L8.9 12z" />
            </svg>
          </button>
          <button
            type="button"
            class="penn-music-icon-btn"
            :title="t('music').next"
            :aria-label="t('music').next"
            @click.stop="playNext"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              <path d="M16.25 5.5H18v13h-1.75v-13zM15.1 12 6.5 5.8v12.4L15.1 12z" />
            </svg>
          </button>
          <button
            v-if="playing"
            type="button"
            class="penn-music-icon-btn penn-music-dock-btn"
            :title="pinnedDock ? t('music').expand : t('music').dock"
            :aria-label="pinnedDock ? t('music').expand : t('music').dock"
            @click.stop="toggleDock"
          >
            <svg
              v-if="!pinnedDock"
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M15 6l-6 6 6 6" />
              <path d="M5 5v14" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
              <path d="M5 5v14" />
            </svg>
          </button>
          <button
            type="button"
            class="penn-music-icon-btn penn-music-list-btn"
            :class="{ 'is-open': stretched }"
            :aria-expanded="stretched ? 'true' : 'false'"
            :title="stretched ? t('music').collapseList : t('music').expandList"
            :aria-label="stretched ? t('music').collapseList : t('music').expandList"
            @click.stop="toggleStretch"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
              <path
                d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2zm14.5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div ref="host" class="penn-music-host" />
  </div>
</template>
