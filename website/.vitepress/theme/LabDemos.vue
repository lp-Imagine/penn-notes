<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import { useI18n } from "./i18n";
import { mountField } from "./lab-field";

const { t } = useI18n();
const hero = ref(null);
let field = null;

const groups = computed(() => {
  const L = t("lab");
  return [
    {
      id: "fx",
      title: L.groupFx,
      items: [
        {
          id: "field",
          title: L.fieldTitle,
          desc: L.catalogFieldDesc,
          href: "/lab/field",
        },
        {
          id: "diffusion",
          title: L.diffTitle,
          desc: L.catalogDiffDesc,
          href: "/lab/diffusion",
        },
        {
          id: "kinetic",
          title: L.kineticTitle,
          desc: L.catalogKineticDesc,
          href: "/lab/kinetic",
        },
      ],
    },
    {
      id: "feat",
      title: L.groupFeat,
      items: [
        {
          id: "morph",
          title: L.morphTitle,
          desc: L.catalogMorphDesc,
          href: "/lab/morph",
        },
      ],
    },
    {
      id: "sound",
      title: L.groupSound,
      items: [
        {
          id: "pluck",
          title: L.pluckTitle,
          desc: L.catalogPluckDesc,
          href: "/lab/pluck",
        },
      ],
    },
    {
      id: "lens",
      title: L.groupLens,
      items: [
        {
          id: "motion",
          title: L.motionTitle,
          desc: L.catalogMotionDesc,
          href: "/lab/motion",
        },
      ],
    },
    {
      id: "lang",
      title: L.groupLang,
      items: [
        {
          id: "rewrite",
          title: L.rewriteTitle,
          desc: L.catalogRewriteDesc,
          href: "/lab/rewrite",
        },
      ],
    },
    {
      id: "signal",
      title: L.groupSignal,
      items: [
        {
          id: "fourier",
          title: L.fourierTitle,
          desc: L.catalogFourierDesc,
          href: "/lab/fourier",
        },
      ],
    },
  ];
});

const totalCount = computed(() =>
  groups.value.reduce((n, g) => n + g.items.length, 0)
);

function href(path) {
  if (!path) return "";
  const p = String(path).replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

onMounted(() => {
  if (!hero.value) return;
  field = mountField(hero.value, { warp: 1.5, speed: 0.85 });
});

onBeforeUnmount(() => {
  field?.destroy();
  field = null;
});
</script>

<template>
  <div class="lab-demos">
    <a class="lab-hero" :href="href('/lab/field')">
      <canvas ref="hero" class="lab-hero-canvas" aria-hidden="true" />
      <span class="lab-hero-copy">
        <span class="lab-stage-kicker">{{ t("lab").heroKicker }}</span>
        <span class="lab-hero-title">{{ t("lab").fieldTitle }}</span>
        <span class="lab-hero-desc">{{ t("lab").heroDesc }}</span>
      </span>
    </a>

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
            <span class="lab-catalog-idx" aria-hidden="true">{{ pad(i + 1) }}</span>
            <span class="lab-catalog-body">
              <span class="lab-catalog-top">
                <span class="lab-catalog-name">{{ d.title }}</span>
                <span class="lab-catalog-kind lab-catalog-kind--page">{{
                  t("lab").kindPage
                }}</span>
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
