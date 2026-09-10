<script setup lang="ts">
import { computed, ref } from "vue";
import { withBase } from "vitepress";
// @ts-expect-error 静态友链清单
import rawFriends from "../../data/friends.json";
import { useI18n } from "./i18n";

type Friend = {
  name: string;
  desc: string;
  avatar: string;
  link: string;
  feed?: string;
};

const { t } = useI18n();

function onAvatarError(event: Event, name: string) {
  const img = event.target as HTMLImageElement | null;
  if (!img || img.dataset.fallback === "1") return;
  img.dataset.fallback = "1";
  const seed = encodeURIComponent(name || "Friend");
  img.src = `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&radius=8`;
}

const friends = rawFriends as Friend[];
const momentsPath = withBase("/friends/");

const siteInfo = computed(() =>
  [
    "- name: Penn Notes",
    `  desc: ${t("home").tagline}`,
    "  avatar: https://penn-notes.draftly.cn/pn-favicon-32.png",
    "  link: https://penn-notes.draftly.cn/",
    "  feed: https://penn-notes.draftly.cn/notes/feed.xml",
  ].join("\n"),
);

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

async function copySiteInfo() {
  try {
    await navigator.clipboard.writeText(siteInfo.value);
    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    window.prompt(t("aboutFriends").copySite, siteInfo.value);
  }
}
</script>

<template>
  <section class="about-block about-block--friends" id="friends">
    <div class="about-block-head">
      <h2 class="about-block-title">{{ t("aboutFriends").title }}</h2>
      <p class="about-block-desc">{{ t("aboutFriends").lead }}</p>
    </div>
    <p class="about-friends-lead">
      {{ t("aboutFriends").swapLead }}
      <a :href="momentsPath">{{ t("friends").title }}</a>
    </p>

    <div class="about-friends-grid">
      <a
        v-for="item in friends"
        :key="item.link"
        class="about-friend"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          class="about-friend-avatar"
          :src="item.avatar"
          alt=""
          loading="lazy"
          @error="onAvatarError($event, item.name)"
        />
        <span class="about-friend-body">
          <span class="about-friend-name">{{ item.name }}</span>
          <span class="about-friend-desc">{{ item.desc }}</span>
        </span>
      </a>
    </div>

    <div class="about-friends-apply">
      <p class="about-friends-apply-title">{{ t("aboutFriends").swapTitle }}</p>
      <p class="about-friends-apply-text">{{ t("aboutFriends").swapLead }}</p>
      <div class="about-friends-code-wrap">
        <pre class="about-friends-code"><code>{{ siteInfo }}</code></pre>
        <button
          type="button"
          class="about-friends-copy"
          :class="{ 'is-copied': copied }"
          @click="copySiteInfo"
        >
          {{ copied ? t("common").copied : t("aboutFriends").copySite }}
        </button>
      </div>
    </div>
  </section>
</template>
