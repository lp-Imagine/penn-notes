<script setup>
import { ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const person = ref("夜归的人|改稿的人|路过的人");
const place = ref("灯下|页边|实验页里");
const act = ref("把一句重写了一遍|拨动了一根弦|盯着一块还在长的斑图");
const steps = ref([]);

function options(raw, fallback) {
  const list = String(raw)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length ? list : [fallback];
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function derive() {
  const people = options(person.value, "人");
  const places = options(place.value, "处");
  const acts = options(act.value, "动");
  const trace = ["句"];
  let line = ["人", "在", "处", "动"];
  trace.push(line.join(""));
  const swaps = [
    ["人", pick(people)],
    ["处", pick(places)],
    ["动", pick(acts)],
  ];
  for (const [symbol, word] of swaps) {
    line = line.map((part) => (part === symbol ? word : part));
    trace.push(line.join(""));
  }
  steps.value = trace;
}

derive();
</script>

<template>
  <LabDemoChrome :title="t('lab').rewriteTitle" :lead="t('lab').rewriteLead">
    <p class="lab-rewrite-rule">{{ t("lab").rewriteRule }}</p>
    <label class="lab-rewrite-field">
      <span>人</span>
      <input v-model="person" type="text" spellcheck="false" />
    </label>
    <label class="lab-rewrite-field">
      <span>处</span>
      <input v-model="place" type="text" spellcheck="false" />
    </label>
    <label class="lab-rewrite-field">
      <span>动</span>
      <input v-model="act" type="text" spellcheck="false" />
    </label>
    <button type="button" class="lab-diff-preset is-active" @click="derive">
      {{ t("lab").rewriteAgain }}
    </button>
    <ol class="lab-rewrite-steps">
      <li
        v-for="(step, index) in steps"
        :key="index"
        :class="{ 'is-last': index === steps.length - 1 }"
      >
        <span class="lab-rewrite-idx">{{ index + 1 }}</span>
        <span>{{ step }}</span>
      </li>
    </ol>
    <p class="lab-field-hint">{{ t("lab").rewriteHint }}</p>
  </LabDemoChrome>
</template>
