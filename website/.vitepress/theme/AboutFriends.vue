<script setup lang="ts">
import { computed, ref } from "vue";
import { withBase } from "vitepress";
// @ts-expect-error 静态友链清单
import rawFriends from "../../data/friends.json";

type Friend = {
  name: string;
  desc: string;
  avatar: string;
  link: string;
  feed?: string;
};

function onAvatarError(event: Event, name: string) {
  const img = event.target as HTMLImageElement | null;
  if (!img || img.dataset.fallback === "1") return;
  img.dataset.fallback = "1";
  const seed = encodeURIComponent(name || "Friend");
  img.src = `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&radius=8`;
}

const friends = rawFriends as Friend[];
const momentsPath = withBase("/friends/");
const feedCount = computed(
  () => friends.filter((f) => Boolean(f.feed?.trim())).length,
);

const siteInfo = [
  "- name: Penn Notes",
  "  desc: 认真生活，随便折腾",
  "  avatar: https://penn-notes.draftly.cn/pn-favicon-32.png",
  "  link: https://penn-notes.draftly.cn/",
  "  feed: https://penn-notes.draftly.cn/notes/feed.xml",
].join("\n");

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

async function copySiteInfo() {
  try {
    await navigator.clipboard.writeText(siteInfo);
    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    window.prompt("复制站点信息：", siteInfo);
  }
}
</script>

<template>
  <section class="about-block about-block--friends" id="friends">
    <div class="about-block-head">
      <h2 class="about-block-title">友情链接</h2>
      <p class="about-block-desc">一些常逛的博客与站点</p>
    </div>
    <p class="about-friends-lead">
      欢迎互换友链。已配置 RSS 的站点会进入
      <a :href="momentsPath">友链动态</a>
      （当前 {{ feedCount }} 个订阅源）。
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
      <p class="about-friends-apply-title">互换友链</p>
      <p class="about-friends-apply-text">
        先添加本站，再通过
        <a
          href="https://github.com/lp-Imagine"
          target="_blank"
          rel="noopener noreferrer"
          >GitHub</a
        >
        告知；有 RSS/Atom 的话一并留下，方便同步进友链动态。
      </p>
      <div class="about-friends-code-wrap">
        <pre class="about-friends-code"><code>{{ siteInfo }}</code></pre>
        <button
          type="button"
          class="about-friends-copy"
          :class="{ 'is-copied': copied }"
          @click="copySiteInfo"
        >
          {{ copied ? "已复制" : "复制" }}
        </button>
      </div>
    </div>
  </section>
</template>
