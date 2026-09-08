<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";
// @ts-expect-error 构建时由 scripts/sync-friends-feed.mjs 生成
import rawMoments from "../friends-moments.generated.json";
// @ts-expect-error 静态友链清单
import rawFriends from "../../data/friends.json";

type MomentItem = {
  title: string;
  link: string;
  date: string;
  friendName: string;
  friendLink: string;
  friendAvatar?: string;
};

type MomentsPayload = {
  generatedAt?: string;
  total?: number;
  items?: MomentItem[];
  stale?: boolean;
  soft?: boolean;
  feedCount?: number;
  okCount?: number;
  errorCount?: number;
};

type Friend = {
  name: string;
  desc: string;
  avatar: string;
  link: string;
  feed?: string;
};

const payload = rawMoments as MomentsPayload;
const friends = rawFriends as Friend[];

const items = computed(() =>
  Array.isArray(payload.items) ? payload.items : [],
);

const feedFriendCount = computed(
  () => friends.filter((f) => Boolean(f.feed?.trim())).length,
);

const aboutPath = withBase("/about/");
const countLabel = computed(() => {
  const n = items.value.length;
  if (!n) return "暂无动态";
  return `最近 ${n} 条 · ${feedFriendCount.value} 个订阅源`;
});

const updatedLabel = computed(() => {
  if (!payload.generatedAt) return "";
  const d = new Date(payload.generatedAt);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const stale = payload.stale ? "（缓存）" : "";
  return `更新于 ${y}-${m}-${day} ${hh}:${mm}${stale}`;
});

function formatDate(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function onAvatarError(event: Event, name: string) {
  const img = event.target as HTMLImageElement | null;
  if (!img || img.dataset.fallback === "1") return;
  img.dataset.fallback = "1";
  const seed = encodeURIComponent(name || "Friend");
  img.src = `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&radius=8`;
}
</script>

<template>
  <div class="section-page talks-page friends-moments-page">
    <header class="section-hero">
      <p class="section-kicker">Friends</p>
      <h1 class="section-title">友链动态</h1>
      <p class="section-lead">
        订阅友链站点的 RSS/Atom，汇总最近更新；与 AI 动态同一条每日流水线自动刷新。无
        feed 的友链不会出现在这里。
      </p>
      <p class="section-count">{{ countLabel }}</p>
      <p v-if="updatedLabel" class="friends-moments-updated">{{ updatedLabel }}</p>
      <div class="talks-hero-actions">
        <a class="talks-hero-btn talks-hero-btn--primary" :href="aboutPath"
          >查看全部友链</a
        >
      </div>
    </header>

    <div v-if="!items.length" class="friends-moments-empty" role="status">
      <p>暂时还没有拉取到友链文章。</p>
      <p class="friends-moments-empty-hint">
        构建时会自动同步；也可本地运行
        <code>npm run sync:friends</code>。
      </p>
    </div>

    <ol v-else class="friends-moments-list">
      <li
        v-for="(item, i) in items"
        :key="`${item.link}-${i}`"
        class="friends-moments-item"
      >
        <a
          class="friends-moments-avatar-link"
          :href="item.friendLink"
          target="_blank"
          rel="noopener noreferrer"
          :title="item.friendName"
        >
          <img
            class="friends-moments-avatar"
            :src="item.friendAvatar || ''"
            alt=""
            loading="lazy"
            @error="onAvatarError($event, item.friendName)"
          />
        </a>
        <div class="friends-moments-body">
          <a
            class="friends-moments-title"
            :href="item.link"
            target="_blank"
            rel="noopener noreferrer"
            >{{ item.title }}</a
          >
          <p class="friends-moments-meta">
            <a
              class="friends-moments-site"
              :href="item.friendLink"
              target="_blank"
              rel="noopener noreferrer"
              >{{ item.friendName }}</a
            >
            <time
              v-if="formatDate(item.date)"
              class="friends-moments-date"
              :datetime="item.date"
              >{{ formatDate(item.date) }}</time
            >
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>
