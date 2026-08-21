<script setup lang="ts">
/**
 * 相关文章推荐：从 themeConfig.sidebar 定位当前文章所在栏目（section），
 * 优先取同分组内位置最近的 2-3 篇；同组不足时用同栏目其他分组的文章补齐。
 * （文章 tags 多为空，按同栏目邻近推荐是最稳的兜底。）
 */
import { computed } from "vue";
import { useData, useRoute, withBase } from "vitepress";

const { theme } = useData();
const route = useRoute();

type SidebarItem = { text?: string; link?: string };
type SidebarGroup = { text?: string; items?: SidebarItem[] };

const BASE = "/penn-notes";

const related = computed<SidebarItem[]>(() => {
  const raw = route.path;
  // 中文文件名在 route.path 里是百分号编码的，sidebar 的 link 是明文，先解码再匹配
  const current = decodeURI(
    raw.startsWith(BASE) ? raw.slice(BASE.length) : raw,
  ).replace(/\/$/, "");
  const sidebar = theme.value.sidebar as
    | Record<string, SidebarGroup[]>
    | undefined;
  if (!sidebar) return [];

  // 定位当前文章所在的栏目与分组
  let sectionKey: string | null = null;
  let groupIdx = -1;
  for (const [k, groups] of Object.entries(sidebar)) {
    for (let gi = 0; gi < groups.length; gi++) {
      const items = groups[gi].items ?? [];
      const ii = items.findIndex((it) => it.link === current);
      if (ii >= 0) {
        sectionKey = k;
        groupIdx = gi;
        break;
      }
    }
    if (sectionKey) break;
  }
  if (!sectionKey) return [];

  const groups = sidebar[sectionKey];
  const all = groups.flatMap((g, gi) =>
    (g.items ?? []).map((it) => ({ it, gi })),
  );
  const currentPos = all.findIndex((x) => x.it.link === current);
  if (currentPos === -1) return [];

  return all
    .filter((x) => x.it.link !== current)
    .sort((a, b) => {
      // 同分组优先；其次按在栏目内的位置邻近度
      const sameA = a.gi === groupIdx ? 0 : 1;
      const sameB = b.gi === groupIdx ? 0 : 1;
      if (sameA !== sameB) return sameA - sameB;
      return (
        Math.abs(all.indexOf(a) - currentPos) -
        Math.abs(all.indexOf(b) - currentPos)
      );
    })
    .slice(0, 3)
    .map((x) => x.it);
});

function href(link?: string) {
  return link ? withBase(link) : "#";
}
</script>

<template>
  <div v-if="related.length" class="related-posts">
    <h2 class="related-title">相关文章</h2>
    <ul class="related-list">
      <li v-for="item in related" :key="item.link">
        <a :href="href(item.link)">{{ item.text }}</a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.related-posts {
  margin-top: 40px;
  padding-top: 28px;
  border-top: 1px solid var(--border);
}
.related-title {
  font-size: 15px;
  font-weight: 650;
  color: var(--text);
  margin: 0 0 14px;
  letter-spacing: 0.02em;
}
.related-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.related-list a {
  display: block;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface-2) 40%, transparent);
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.6;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.related-list a:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}
</style>
