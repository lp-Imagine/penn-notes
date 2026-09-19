<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const card = ref(null);
const rx = ref(0);
const ry = ref(0);
const gx = ref(50);
const gy = ref(50);
const hovering = ref(false);

const cardStyle = computed(() => ({
  transform: `rotateX(${rx.value}deg) rotateY(${ry.value}deg)`,
  "--lab-tilt-gx": `${gx.value}%`,
  "--lab-tilt-gy": `${gy.value}%`,
}));

function onMove(e) {
  const el = card.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width;
  const py = (e.clientY - r.top) / r.height;
  ry.value = (px - 0.5) * 18;
  rx.value = (0.5 - py) * 14;
  gx.value = px * 100;
  gy.value = py * 100;
  hovering.value = true;
}

function onLeave() {
  rx.value = 0;
  ry.value = 0;
  gx.value = 50;
  gy.value = 50;
  hovering.value = false;
}

onMounted(() => {
  card.value?.addEventListener("pointermove", onMove);
  card.value?.addEventListener("pointerleave", onLeave);
});

onBeforeUnmount(() => {
  card.value?.removeEventListener("pointermove", onMove);
  card.value?.removeEventListener("pointerleave", onLeave);
});
</script>

<template>
  <LabDemoChrome :title="t('lab').tiltTitle" :lead="t('lab').tiltLead">
    <p class="lab-demo-code">
      <code>perspective · rotateX/Y · glare gradient</code>
    </p>
    <div class="lab-tilt-stage">
      <article
        ref="card"
        class="lab-tilt-card"
        :class="{ 'is-hover': hovering }"
        :style="cardStyle"
      >
        <p class="lab-tilt-kicker">Effect</p>
        <h2 class="lab-tilt-heading">{{ t("lab").tiltCardTitle }}</h2>
        <p class="lab-tilt-desc">{{ t("lab").tiltCardDesc }}</p>
        <div class="lab-tilt-glare" aria-hidden="true"></div>
      </article>
    </div>
  </LabDemoChrome>
</template>
