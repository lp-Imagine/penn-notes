<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";
// @ts-expect-error 构建时由 scripts/sync-friends-feed.mjs 生成
import rawMoments from "../friends-moments.generated.json";
// @ts-expect-error 静态友链清单
import rawFriends from "../../data/friends.json";
import { useI18n } from "./i18n";

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

const { t } = useI18n();
const payload = rawMoments as MomentsPayload;
const friends = rawFriends as Friend[];

const items = computed(() =>
  Array.isArray(payload.items) ? payload.items : [],
);

const feedFriendCount = computed(
  () => friends.filter((f) => Boolean(f.feed?.trim())).length,
);

const aboutPath = withBase("/about/");
const countLabel = computed(() =>
  t("friends").stats(items.value.length, feedFriendCount.value),
);

const updatedLabel = computed(() => {
  if (!payload.generatedAt) return "";
  const d = new Date(payload.generatedAt);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return t("friends").updatedAt(`${y}-${m}-${day} ${hh}:${mm}`);
});

function formatDate(iso: string) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms);
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
      <p class="section-kicker">{{ t("friends").kicker }}</p>
      <h1 class="section-title">{{ t("friends").title }}</h1>
      <p class="section-lead">{{ t("friends").lead }}</p>
      <p class="section-count">{{ countLabel }}</p>
      <p v-if="updatedLabel" class="friends-moments-updated">{{ updatedLabel }}</p>
      <div class="talks-hero-actions">
        <a class="talks-hero-btn talks-hero-btn--primary" :href="aboutPath"
          >{{ t("friends").viewAll }}</a
        >
      </div>
    </header>

    <div v-if="!items.length" class="friends-moments-empty" role="status">
      <p>{{ t("friends").empty }}</p>
      <p class="friends-moments-empty-hint">{{ t("friends").emptyHint }}</p>
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
