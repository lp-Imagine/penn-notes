<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const root = ref(null);
const x = ref(50);
const y = ref(50);
const active = ref(false);

const style = computed(() => ({
  "--lab-spot-x": `${x.value}%`,
  "--lab-spot-y": `${y.value}%`,
  "--lab-spot-opacity": active.value ? "1" : "0.55",
}));

function onMove(e) {
  const el = root.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  x.value = ((e.clientX - r.left) / r.width) * 100;
  y.value = ((e.clientY - r.top) / r.height) * 100;
  active.value = true;
}

function onLeave() {
  active.value = false;
}

onMounted(() => {
  root.value?.addEventListener("pointermove", onMove);
  root.value?.addEventListener("pointerleave", onLeave);
});

onBeforeUnmount(() => {
  root.value?.removeEventListener("pointermove", onMove);
  root.value?.removeEventListener("pointerleave", onLeave);
});
</script>

<template>
  <LabDemoChrome :title="t('lab').spotTitle" :lead="t('lab').spotLead">
    <p class="lab-demo-code">
      <code>mask / radial-gradient · pointer tracking</code>
    </p>
    <div ref="root" class="lab-spot" :style="style">
      <div class="lab-spot-content" aria-hidden="true">
        <p class="lab-spot-title">{{ t("lab").spotHidden }}</p>
        <p class="lab-spot-body">{{ t("lab").spotBody }}</p>
      </div>
      <div class="lab-spot-veil"></div>
      <p class="lab-spot-hint">{{ t("lab").spotHint }}</p>
    </div>
  </LabDemoChrome>
</template>
