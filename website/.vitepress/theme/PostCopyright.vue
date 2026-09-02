<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import { formatZhDate, getArticleUpdateTime, parseArticleDate } from "./article-dates";
import { getPageCanonicalUrl, getPageLinkPath } from "./page-url";

const { page, theme, frontmatter } = useData();

type CopyrightCfg = {
  author?: string;
  authorUrl?: string;
  license?: string;
  licenseUrl?: string;
  siteName?: string;
  siteUrl?: string;
};

const cfg = computed(
  () => (theme.value.postCopyright ?? {}) as CopyrightCfg,
);

const enabled = computed(() => frontmatter.value.copyright !== false);

const title = computed(
  () => String(frontmatter.value.title ?? page.value.title ?? ""),
);

const author = computed(
  () =>
    String(frontmatter.value.author ?? cfg.value.author ?? "Penn"),
);

const authorUrl = computed(
  () =>
    String(
      frontmatter.value.authorUrl ??
        cfg.value.authorUrl ??
        "https://github.com/lp-Imagine",
    ),
);

const license = computed(
  () => String(cfg.value.license ?? "CC BY 4.0"),
);

const licenseUrl = computed(
  () =>
    String(
      cfg.value.licenseUrl ??
        "https://creativecommons.org/licenses/by/4.0/deed.zh",
    ),
);

const publishedAt = computed(() =>
  parseArticleDate(frontmatter.value.date),
);

const updatedAt = computed(() => getArticleUpdateTime(page.value));

const sameDate = computed(() => {
  if (!publishedAt.value || !updatedAt.value) return false;
  return publishedAt.value.toDateString() === updatedAt.value.toDateString();
});

const siteUrl = computed(
  () => String(cfg.value.siteUrl ?? "https://penn-notes.draftly.cn"),
);

const permalink = computed(() =>
  getPageCanonicalUrl(page.value.relativePath, siteUrl.value),
);

const linkPath = computed(() => getPageLinkPath(permalink.value));
</script>

<template>
  <aside v-if="enabled" class="post-copyright" aria-label="版权声明">
    <header class="post-copyright-head">
      <a
        class="post-copyright-cc"
        :href="licenseUrl"
        target="_blank"
        rel="license noopener noreferrer"
        :title="license"
        aria-label="Creative Commons 许可"
      >
        <span class="post-copyright-cc-mark">CC</span>
        <span class="post-copyright-cc-by">BY</span>
      </a>
      <div class="post-copyright-intro">
        <p class="post-copyright-kicker">版权声明</p>
        <p class="post-copyright-title">{{ title }}</p>
      </div>
    </header>

    <ul class="post-copyright-meta">
      <li>
        <span class="meta-label">作者</span>
        <a
          class="meta-value meta-link"
          :href="authorUrl"
          target="_blank"
          rel="noopener noreferrer"
        >{{ author }}</a>
      </li>
      <li v-if="publishedAt && sameDate">
        <span class="meta-label">日期</span>
        <span class="meta-value">{{ formatZhDate(publishedAt) }}</span>
      </li>
      <template v-else>
        <li v-if="publishedAt">
          <span class="meta-label">发布</span>
          <span class="meta-value">{{ formatZhDate(publishedAt) }}</span>
        </li>
        <li v-if="updatedAt">
          <span class="meta-label">更新</span>
          <span class="meta-value">{{ formatZhDate(updatedAt) }}</span>
        </li>
      </template>
      <li>
        <span class="meta-label">许可</span>
        <a
          class="meta-value meta-link"
          :href="licenseUrl"
          target="_blank"
          rel="license noopener noreferrer"
        >{{ license }}</a>
      </li>
    </ul>

    <div class="post-copyright-url">
      <span class="meta-label">原文</span>
      <a
        class="post-copyright-url-link"
        :href="permalink"
        :title="permalink"
      >{{ linkPath }}</a>
    </div>
  </aside>
</template>

<style scoped>
.post-copyright {
  margin-top: 36px;
  padding: 14px 16px 13px;
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
  background: color-mix(in srgb, var(--surface-2) 38%, var(--surface));
}

.post-copyright-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 11px;
  background: var(--divider-fade) no-repeat bottom / 100% 1px;
}

.post-copyright-cc {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 52px;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.post-copyright-cc:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.post-copyright-cc-mark,
.post-copyright-cc-by {
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1;
}

.post-copyright-cc-mark {
  background: #171717;
  color: #fff;
}

.post-copyright-cc-by {
  background: color-mix(in srgb, var(--accent) 16%, var(--surface));
  color: var(--text);
}

.dark .post-copyright-cc-mark {
  background: #eee;
  color: #111;
}

.post-copyright-intro {
  min-width: 0;
  flex: 1;
}

.post-copyright-kicker {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}

.post-copyright-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 650;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: var(--text);
}

.post-copyright-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-copyright-meta li {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.meta-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  white-space: nowrap;
}

.meta-value {
  font-size: 13px;
  color: var(--text-2);
}

.meta-link {
  color: var(--link);
  text-decoration: none;
}

.meta-link:hover {
  text-decoration: underline;
}

.post-copyright-url {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  background: var(--divider-fade) no-repeat top / 100% 1px;
  min-width: 0;
}

.post-copyright-url-link {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--link);
  text-decoration: none;
  word-break: break-all;
}

.post-copyright-url-link:hover {
  text-decoration: underline;
}

.dark .post-copyright {
  border-color: color-mix(in srgb, var(--border-strong) 82%, var(--border));
  background: color-mix(in srgb, var(--surface-2) 52%, var(--surface));
}

@media (max-width: 640px) {
  .post-copyright-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .post-copyright-url {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
