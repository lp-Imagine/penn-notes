<script setup>
import { computed } from "vue";
import health from "../feed-health.generated.json";
import { useI18n } from "./i18n";

const { t } = useI18n();

const hasData = computed(() =>
  Boolean(health && typeof health === "object" && (health.ok != null || health.at)),
);
const ok = computed(() => Number(health?.ok || 0));
const failed = computed(() => Number(health?.failed || 0));
const total = computed(() => ok.value + failed.value);
const at = computed(() => String(health?.at || ""));
const targetDate = computed(() => String(health?.targetDate || ""));
const rate = computed(() => {
  if (!total.value) return null;
  return Math.round((ok.value / total.value) * 100);
});

const failures = computed(() => {
  const list = Array.isArray(health?.failures) ? health.failures : [];
  return list.map((f) => ({
    ...f,
    parsed: parseError(f.error),
  }));
});
const successes = computed(() => {
  const list = Array.isArray(health?.successes) ? health.successes : [];
  return [...list].sort((a, b) => Number(b.items || 0) - Number(a.items || 0));
});
const activeSuccesses = computed(() =>
  successes.value.filter((s) => Number(s.items || 0) > 0),
);
const quietSuccesses = computed(() =>
  successes.value.filter((s) => Number(s.items || 0) <= 0),
);
const topSuccesses = computed(() => activeSuccesses.value.slice(0, 5));
const restSuccesses = computed(() => activeSuccesses.value.slice(5));
const maxItems = computed(() =>
  Math.max(0, ...activeSuccesses.value.map((s) => Number(s.items || 0))),
);

function formatAt(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function hostOf(url) {
  try {
    return new URL(String(url || "")).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parseError(raw) {
  const text = String(raw || "error").trim();
  const codeMatch = text.match(/(?:status\s*code\s*|http\s*)(\d{3})/i);
  const code = codeMatch ? codeMatch[1] : "";
  const n = t("news");
  const byCode = {
    400: n.sourcesErr400,
    401: n.sourcesErr401,
    403: n.sourcesErr403,
    404: n.sourcesErr404,
    408: n.sourcesErrTimeout,
    410: n.sourcesErr410,
    429: n.sourcesErr429,
    500: n.sourcesErr5xx,
    502: n.sourcesErr5xx,
    503: n.sourcesErr5xx,
    504: n.sourcesErrTimeout,
  };
  let hint = code ? byCode[code] : "";
  if (!hint) {
    if (/timeout|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(text)) hint = n.sourcesErrTimeout;
    else if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|network/i.test(text))
      hint = n.sourcesErrNetwork;
    else hint = n.sourcesErrGeneric;
  }
  return { code, hint, raw: text };
}

function itemShare(count) {
  const n = Number(count || 0);
  if (!maxItems.value || n <= 0) return 0;
  return Math.max(8, Math.round((n / maxItems.value) * 100));
}
</script>

<template>
  <div class="news-sources">
    <p v-if="!hasData" class="news-sources-empty">{{ t("news").sourcesNone }}</p>
    <template v-else>
      <section class="news-sources-block news-sources-intro">
        <p class="news-sources-kicker">{{ t("news").sourcesWhyKicker }}</p>
        <p class="news-sources-why">{{ t("news").sourcesWhy }}</p>
      </section>

      <section class="news-sources-block">
        <div class="news-sources-block-head">
          <h2 class="news-sources-heading">{{ t("news").sourcesSnapshot }}</h2>
          <p v-if="at" class="news-sources-block-meta">
            {{ t("news").sourcesUpdated(formatAt(at)) }}
          </p>
        </div>
        <div class="news-sources-stats" role="list">
          <div class="news-sources-stat" role="listitem">
            <span class="news-sources-stat-label">{{ t("news").sourcesOk }}</span>
            <span class="news-sources-stat-value news-sources-stat-value--ok">{{
              ok
            }}</span>
          </div>
          <div class="news-sources-stat" role="listitem">
            <span class="news-sources-stat-label">{{
              t("news").sourcesFailed
            }}</span>
            <span
              class="news-sources-stat-value"
              :class="
                failed
                  ? 'news-sources-stat-value--fail'
                  : 'news-sources-stat-value--ok'
              "
              >{{ failed }}</span
            >
          </div>
          <div class="news-sources-stat" role="listitem">
            <span class="news-sources-stat-label">{{
              t("news").sourcesRate
            }}</span>
            <span class="news-sources-stat-value">{{
              rate == null ? "—" : `${rate}%`
            }}</span>
          </div>
          <div v-if="targetDate" class="news-sources-stat" role="listitem">
            <span class="news-sources-stat-label">{{
              t("news").sourcesTarget
            }}</span>
            <span class="news-sources-stat-value news-sources-stat-value--date">{{
              targetDate
            }}</span>
          </div>
        </div>
      </section>

      <section
        v-if="failures.length"
        class="news-sources-block news-sources-block--fail"
      >
        <div class="news-sources-block-head">
          <h2 class="news-sources-heading">{{ t("news").sourcesFailTitle }}</h2>
          <p class="news-sources-block-meta">
            {{ t("news").sourcesFailHint }}
          </p>
        </div>
        <ul class="news-sources-failures">
          <li v-for="f in failures" :key="f.id || f.name">
            <article class="news-sources-fail-card">
              <div class="news-sources-fail-mark" aria-hidden="true">!</div>
              <div class="news-sources-fail-body">
                <div class="news-sources-fail-top">
                  <strong class="news-sources-fail-name">{{
                    f.name || f.id
                  }}</strong>
                  <span v-if="f.parsed.code" class="news-sources-fail-code">{{
                    f.parsed.code
                  }}</span>
                </div>
                <p class="news-sources-fail-hint">{{ f.parsed.hint }}</p>
                <p
                  v-if="f.parsed.raw && f.parsed.raw !== f.parsed.hint"
                  class="news-sources-fail-raw"
                >
                  {{ f.parsed.raw }}
                </p>
              </div>
            </article>
          </li>
        </ul>
      </section>
      <section v-else class="news-sources-block news-sources-block--ok">
        <p class="news-sources-all-ok">{{ t("news").sourcesAllOk }}</p>
      </section>

      <section v-if="successes.length" class="news-sources-block">
        <div class="news-sources-block-head">
          <h2 class="news-sources-heading">{{ t("news").sourcesOkTitle }}</h2>
          <p class="news-sources-block-meta">
            {{ t("news").sourcesOkCount(successes.length) }}
          </p>
        </div>

        <div v-if="topSuccesses.length" class="news-sources-ok-panel">
          <p class="news-sources-ok-label">{{ t("news").sourcesTop }}</p>
          <ol class="news-sources-top">
            <li v-for="(s, i) in topSuccesses" :key="s.id || s.name">
              <a
                class="news-sources-top-row"
                :href="s.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span class="news-sources-top-rank" aria-hidden="true">{{
                  String(i + 1).padStart(2, "0")
                }}</span>
                <span class="news-sources-top-main">
                  <span class="news-sources-top-name">{{ s.name || s.id }}</span>
                  <span class="news-sources-top-host">{{ hostOf(s.url) }}</span>
                  <span class="news-sources-top-track" aria-hidden="true">
                    <span
                      class="news-sources-top-fill"
                      :style="{ width: `${itemShare(s.items)}%` }"
                    ></span>
                  </span>
                </span>
                <span class="news-sources-top-count">
                  <strong>{{ Number(s.items || 0) }}</strong>
                  <span>{{ t("news").sourcesItemsUnit }}</span>
                </span>
              </a>
            </li>
          </ol>
        </div>

        <div v-if="restSuccesses.length" class="news-sources-ok-panel">
          <p class="news-sources-ok-label">{{ t("news").sourcesRest }}</p>
          <ul class="news-sources-rest">
            <li v-for="s in restSuccesses" :key="s.id || s.name">
              <a
                class="news-sources-rest-row"
                :href="s.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span class="news-sources-rest-name">{{ s.name || s.id }}</span>
                <span class="news-sources-rest-host">{{ hostOf(s.url) }}</span>
                <span class="news-sources-rest-count">{{
                  t("news").sourcesItems(Number(s.items || 0))
                }}</span>
              </a>
            </li>
          </ul>
        </div>

        <div v-if="quietSuccesses.length" class="news-sources-ok-panel">
          <p class="news-sources-ok-label">
            {{ t("news").sourcesQuiet }}
            <span>· {{ t("news").sourcesQuietCount(quietSuccesses.length) }}</span>
          </p>
          <ul class="news-sources-quiet">
            <li v-for="s in quietSuccesses" :key="s.id || s.name">
              <a
                class="news-sources-quiet-chip"
                :href="s.url"
                target="_blank"
                rel="noopener noreferrer"
                :title="hostOf(s.url)"
                >{{ s.name || s.id }}</a
              >
            </li>
          </ul>
        </div>
      </section>
    </template>
  </div>
</template>
