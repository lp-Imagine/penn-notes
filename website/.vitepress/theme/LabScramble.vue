<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const CHARS = "!<>-_\\/[]{}—=+*^?#________";

const lines = [
  { id: "a", target: "" },
  { id: "b", target: "" },
  { id: "c", target: "" },
];

const display = ref(["", "", ""]);
let frames = [];
let reduced = false;

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function scrambleLine(index, target) {
  const prev = frames[index];
  if (prev) cancelAnimationFrame(prev);

  if (reduced) {
    display.value[index] = target;
    display.value = [...display.value];
    return;
  }

  let frame = 0;
  const queue = target.split("").map((ch) => ({
    from: randomChar(),
    to: ch,
    start: Math.floor(Math.random() * 18),
    end: 18 + Math.floor(Math.random() * 22),
  }));

  const tick = () => {
    let done = true;
    const out = queue
      .map((item) => {
        if (frame >= item.end) return item.to;
        done = false;
        if (frame >= item.start) {
          if (item.to === " ") return " ";
          return randomChar();
        }
        return "";
      })
      .join("");
    display.value[index] = out;
    display.value = [...display.value];
    frame += 1;
    if (!done) frames[index] = requestAnimationFrame(tick);
  };

  frames[index] = requestAnimationFrame(tick);
}

function runAll() {
  const targets = [
    t("lab").scrambleLine1,
    t("lab").scrambleLine2,
    t("lab").scrambleLine3,
  ];
  targets.forEach((text, i) => scrambleLine(i, text));
}

onMounted(() => {
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  runAll();
});

onBeforeUnmount(() => {
  frames.forEach((id) => id && cancelAnimationFrame(id));
});
</script>

<template>
  <LabDemoChrome :title="t('lab').scrambleTitle" :lead="t('lab').scrambleLead">
    <div class="lab-ease-toolbar">
      <button type="button" class="lab-demo-btn" @click="runAll">
        {{ t("lab").scrambleReplay }}
      </button>
    </div>
    <div class="lab-scramble-board" aria-live="polite">
      <p
        v-for="(line, i) in display"
        :key="lines[i].id"
        class="lab-scramble-line"
        :class="`lab-scramble-line--${i}`"
      >
        {{ line || "…" }}
      </p>
    </div>
  </LabDemoChrome>
</template>
