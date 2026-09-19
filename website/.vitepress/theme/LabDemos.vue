<script setup>
import { computed, ref } from "vue";
import { withBase } from "vitepress";
import { useI18n } from "./i18n";

const { t } = useI18n();

const groups = computed(() => {
  const L = t("lab");
  return [
    {
      id: "fx",
      title: L.groupFx,
      items: [
        {
          id: "spotlight",
          title: L.spotTitle,
          desc: L.catalogSpotDesc,
          kind: "page",
          href: "/lab/spotlight",
        },
        {
          id: "tilt",
          title: L.tiltTitle,
          desc: L.catalogTiltDesc,
          kind: "page",
          href: "/lab/tilt",
        },
        {
          id: "scramble",
          title: L.scrambleTitle,
          desc: L.catalogScrambleDesc,
          kind: "page",
          href: "/lab/scramble",
        },
        {
          id: "particles",
          title: L.particleTitle,
          desc: L.catalogParticleDesc,
          kind: "page",
          href: "/lab/particles",
        },
        {
          id: "magnetic",
          title: L.magTitle,
          desc: L.catalogMagDesc,
          kind: "page",
          href: "/lab/magnetic",
        },
      ],
    },
    {
      id: "feat",
      title: L.groupFeat,
      items: [
        {
          id: "command",
          title: L.cmdTitle,
          desc: L.catalogCmdDesc,
          kind: "page",
          href: "/lab/command",
        },
        {
          id: "theme",
          title: L.stageTitle,
          desc: L.catalogThemeDesc,
          kind: "live",
          href: "#lab-stage-title",
        },
      ],
    },
    {
      id: "css",
      title: L.groupCss,
      items: [
        {
          id: "flex-gap",
          title: L.flexTitle,
          desc: L.catalogFlexDesc,
          kind: "page",
          href: "/lab/flex-gap",
        },
        {
          id: "clamp",
          title: L.clampTitle,
          desc: L.catalogClampDesc,
          kind: "page",
          href: "/lab/clamp",
        },
        {
          id: "grid",
          title: L.gridTitle,
          desc: L.catalogGridDesc,
          kind: "page",
          href: "/lab/grid-fit",
        },
        {
          id: "scroll-snap",
          title: L.snapTitle,
          desc: L.catalogSnapDesc,
          kind: "page",
          href: "/lab/scroll-snap",
        },
        {
          id: "easing",
          title: L.easeTitle,
          desc: L.catalogEaseDesc,
          kind: "page",
          href: "/lab/easing",
        },
        {
          id: "color-mix",
          title: L.mixTitle,
          desc: L.catalogMixDesc,
          kind: "page",
          href: "/lab/color-mix",
        },
      ],
    },
  ];
});

const totalCount = computed(() =>
  groups.value.reduce((n, g) => n + g.items.length, 0)
);

const theme = ref("ink");
const count = ref(0);

const themes = [
  { id: "ink", label: "Ink" },
  { id: "sand", label: "Sand" },
  { id: "mint", label: "Mint" },
];

const themeVars = computed(() => {
  if (theme.value === "sand") {
    return {
      "--lab-demo-bg": "#f3ebe0",
      "--lab-demo-fg": "#3b2f24",
      "--lab-demo-accent": "#c47a3a",
      "--lab-demo-muted": "rgba(59, 47, 36, 0.62)",
    };
  }
  if (theme.value === "mint") {
    return {
      "--lab-demo-bg": "#e7f4ef",
      "--lab-demo-fg": "#1f3b32",
      "--lab-demo-accent": "#2a9d7a",
      "--lab-demo-muted": "rgba(31, 59, 50, 0.58)",
    };
  }
  return {
    "--lab-demo-bg": "#1c2430",
    "--lab-demo-fg": "#e8eef6",
    "--lab-demo-accent": "#7eb6ff",
    "--lab-demo-muted": "rgba(232, 238, 246, 0.62)",
  };
});

function href(path) {
  if (!path) return "";
  if (path.startsWith("#")) return path;
  const p = String(path).replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}

function bump() {
  count.value += 1;
}

function setTheme(id) {
  theme.value = id;
}

function kindLabel(kind) {
  return kind === "live" ? t("lab").kindLive : t("lab").kindPage;
}

function pad(n) {
  return String(n).padStart(2, "0");
}
</script>

<template>
  <div class="lab-demos">
    <section class="lab-stage" :style="themeVars" aria-labelledby="lab-stage-title">
      <div class="lab-stage-copy">
        <p class="lab-stage-kicker">{{ t("lab").stageKicker }}</p>
        <h2 id="lab-stage-title" class="lab-stage-title">{{ t("lab").stageTitle }}</h2>
        <p class="lab-stage-desc">{{ t("lab").stageDesc }}</p>
        <div class="lab-stage-swatches" role="list" :aria-label="t('lab').themeAria">
          <button
            v-for="th in themes"
            :key="th.id"
            type="button"
            class="lab-swatch"
            :class="{ 'is-active': theme === th.id }"
            role="listitem"
            @click="setTheme(th.id)"
          >
            {{ th.label }}
          </button>
        </div>
      </div>
      <div class="lab-stage-panel">
        <p class="lab-stage-panel-meta">
          {{ t("lab").currentTheme }} · <strong>{{ theme }}</strong>
        </p>
        <p class="lab-stage-panel-body">
          {{ t("lab").stageSample }}
        </p>
        <div class="lab-stage-actions">
          <button type="button" class="lab-stage-btn" @click="bump">
            {{ t("lab").spring }} · {{ count }}
          </button>
        </div>
      </div>
    </section>

    <div class="lab-catalog-head">
      <h2 class="lab-catalog-title">{{ t("lab").catalogTitle }}</h2>
      <p class="lab-catalog-meta">{{ t("lab").catalogCount(totalCount) }}</p>
    </div>

    <section
      v-for="group in groups"
      :key="group.id"
      class="lab-catalog-group"
    >
      <h3 class="lab-catalog-group-title">{{ group.title }}</h3>
      <ol class="lab-catalog">
        <li
          v-for="(d, i) in group.items"
          :key="d.id"
          class="lab-catalog-item"
        >
          <a class="lab-catalog-card" :href="href(d.href)">
            <span class="lab-catalog-idx" aria-hidden="true">{{
              pad(i + 1)
            }}</span>
            <span class="lab-catalog-body">
              <span class="lab-catalog-top">
                <span class="lab-catalog-name">{{ d.title }}</span>
                <span
                  class="lab-catalog-kind"
                  :class="
                    d.kind === 'live'
                      ? 'lab-catalog-kind--live'
                      : 'lab-catalog-kind--page'
                  "
                  >{{ kindLabel(d.kind) }}</span
                >
              </span>
              <span class="lab-catalog-desc">{{ d.desc }}</span>
            </span>
            <span class="lab-catalog-go" aria-hidden="true">→</span>
          </a>
        </li>
      </ol>
    </section>
  </div>
</template>
