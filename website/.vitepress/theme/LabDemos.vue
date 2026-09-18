<script setup>
import { computed, ref } from "vue";
import { withBase } from "vitepress";

const demos = [
  {
    title: "主题变量切换",
    desc: "用 CSS 变量即时换肤，不依赖整站暗色开关。",
    href: "",
    inline: "theme",
  },
  {
    title: "Flex Gap 实验",
    desc: "gap 与负 margin 的对比，单独一页可拖。",
    href: "/lab/flex-gap",
  },
];

const theme = ref("ink");
const count = ref(0);

const themeVars = computed(() => {
  if (theme.value === "sand") {
    return {
      "--lab-demo-bg": "#f3ebe0",
      "--lab-demo-fg": "#3b2f24",
      "--lab-demo-accent": "#c47a3a",
    };
  }
  if (theme.value === "mint") {
    return {
      "--lab-demo-bg": "#e7f4ef",
      "--lab-demo-fg": "#1f3b32",
      "--lab-demo-accent": "#2a9d7a",
    };
  }
  return {
    "--lab-demo-bg": "#1c2430",
    "--lab-demo-fg": "#e8eef6",
    "--lab-demo-accent": "#7eb6ff",
  };
});

function href(path) {
  if (!path) return "";
  const p = String(path).replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}

function bump() {
  count.value += 1;
}

function cycleTheme() {
  theme.value =
    theme.value === "ink" ? "sand" : theme.value === "sand" ? "mint" : "ink";
}
</script>

<template>
  <div class="lab-demos">
    <ul class="lab-demo-list">
      <li v-for="d in demos" :key="d.title" class="lab-demo-item">
        <article class="lab-demo-card">
          <h2 class="lab-demo-title">
            <a v-if="d.href" :href="href(d.href)">{{ d.title }}</a>
            <span v-else>{{ d.title }}</span>
          </h2>
          <p class="lab-demo-desc">{{ d.desc }}</p>
          <div
            v-if="d.inline === 'theme'"
            class="lab-inline-demo"
            :style="themeVars"
          >
            <p class="lab-inline-label">当前主题：{{ theme }}</p>
            <button type="button" class="lab-inline-btn" @click="cycleTheme">
              切换主题
            </button>
            <button type="button" class="lab-inline-btn lab-inline-btn--spring" @click="bump">
              弹一下 · {{ count }}
            </button>
          </div>
          <p v-else-if="d.href" class="lab-demo-more">
            <a :href="href(d.href)">打开实验 →</a>
          </p>
        </article>
      </li>
    </ul>
  </div>
</template>
