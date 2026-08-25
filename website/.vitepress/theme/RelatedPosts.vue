<script setup lang="ts">
/**
 * 相关文章：优先同 tags 匹配，不足时回退侧栏邻近推荐。
 */
import { computed } from "vue";
import { useData, useRoute, withBase } from "vitepress";
// @ts-expect-error generated JSON
import notes from "../notes-items.generated.json";

const { theme, site } = useData();
const route = useRoute();

type SidebarItem = { text?: string; link?: string };
type SidebarGroup = { text?: string; items?: SidebarItem[] };
type NoteItem = {
  title: string;
  link: string;
  tags?: string[];
  date?: string;
};

function currentPath() {
  const raw = route.path;
  const base = (site.value.base || "/").replace(/\/$/, "");
  const stripped =
    base && base !== "/" && raw.startsWith(base)
      ? raw.slice(base.length)
      : raw;
  return decodeURI(stripped).replace(/\/$/, "");
}

function sidebarRelated(current: string): SidebarItem[] {
  const sidebar = theme.value.sidebar as
    | Record<string, SidebarGroup[]>
    | undefined;
  if (!sidebar) return [];

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
}

function tagRelated(current: string): SidebarItem[] {
  const me = (notes as NoteItem[]).find((n) => n.link === current);
  if (!me?.tags?.length) return [];
  const tagSet = new Set(me.tags);
  return (notes as NoteItem[])
    .filter((n) => n.link !== current && n.tags?.some((t) => tagSet.has(t)))
    .sort((a, b) => {
      const score = (n: NoteItem) =>
        n.tags?.filter((t) => tagSet.has(t)).length ?? 0;
      const ds = score(b) - score(a);
      if (ds !== 0) return ds;
      return (b.date || "") > (a.date || "") ? 1 : -1;
    })
    .slice(0, 3)
    .map((n) => ({ text: n.title, link: n.link }));
}

const related = computed<SidebarItem[]>(() => {
  const current = currentPath();
  const byTag = tagRelated(current);
  if (byTag.length >= 2) return byTag;
  const fallback = sidebarRelated(current);
  const seen = new Set(byTag.map((x) => x.link));
  for (const item of fallback) {
    if (byTag.length >= 3) break;
    if (!item.link || seen.has(item.link)) continue;
    byTag.push(item);
    seen.add(item.link);
  }
  return byTag;
});

function href(link?: string) {
  return link ? withBase(link) : "#";
}
</script>

<template>
  <div v-if="related.length" class="related-posts">
    <div class="related-head">
      <h2 class="related-title">相关阅读</h2>
    </div>
    <ul class="related-list">
      <li v-for="item in related" :key="item.link">
        <a class="related-link" :href="href(item.link)">{{ item.text }}</a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.related-posts {
  margin-top: 36px;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-top: none;
}

.related-head {
  display: flex;
  align-items: baseline;
  margin-bottom: 4px;
  padding-bottom: 10px;
  background: var(--divider-fade) no-repeat bottom / 100% 1px;
}

.related-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--text);
  border: none;
}

.related-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.related-list li {
  margin: 0;
  padding: 0;
  border-bottom: none;
}

.related-list li + li {
  border-top: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
}

.related-link {
  display: block;
  padding: 13px 6px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.01em;
  text-decoration: none;
  transition: color 0.15s ease, background 0.15s ease;
}

.related-link:hover {
  color: var(--link);
  background: color-mix(in srgb, var(--accent) 5%, transparent);
}
</style>
