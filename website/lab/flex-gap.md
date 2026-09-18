---
title: Flex Gap 实验
description: gap 与负 margin 布局对比
outline: false
sidebar: false
aside: false
prev: false
next: false
---

<script setup>
import { onMounted, onBeforeUnmount } from "vue";

let input;
let onInput;

onMounted(() => {
  input = document.getElementById("lab-flex-gap");
  const val = document.getElementById("lab-flex-gap-val");
  const gapRow = document.getElementById("lab-flex-with-gap");
  const marginRow = document.getElementById("lab-flex-with-margin");
  if (!input || !gapRow || !marginRow) return;

  onInput = () => {
    const n = Number(input.value) || 0;
    if (val) val.textContent = `${n}px`;
    gapRow.style.gap = `${n}px`;
    marginRow.style.margin = `-${n / 2}px`;
    for (const cell of marginRow.querySelectorAll(".lab-flex-cell")) {
      cell.style.margin = `${n / 2}px`;
    }
  };
  input.addEventListener("input", onInput);
  onInput();
});

onBeforeUnmount(() => {
  input?.removeEventListener("input", onInput);
});
</script>

<div class="section-page lab-page lab-demo-page">
  <header class="section-hero">
    <p class="section-kicker">Lab</p>
    <h1 class="section-title">Flex Gap 实验</h1>
    <p class="section-lead">对比 <code>gap</code> 与旧式负 margin 间距，拖动滑块看间距变化。</p>
    <p class="section-count"><a href="/lab/">← 返回实验页</a></p>
  </header>

  <div class="lab-flex-demo" id="lab-flex-demo">
    <label class="lab-flex-control">
      间距
      <input type="range" min="0" max="40" value="16" id="lab-flex-gap" />
      <span id="lab-flex-gap-val">16px</span>
    </label>

    <h2 class="lab-flex-heading">用 gap</h2>
    <div class="lab-flex-row lab-flex-row--gap" id="lab-flex-with-gap">
      <div class="lab-flex-cell">A</div>
      <div class="lab-flex-cell">B</div>
      <div class="lab-flex-cell">C</div>
      <div class="lab-flex-cell">D</div>
    </div>

    <h2 class="lab-flex-heading">旧式 margin（近似）</h2>
    <div class="lab-flex-row lab-flex-row--margin" id="lab-flex-with-margin">
      <div class="lab-flex-cell">A</div>
      <div class="lab-flex-cell">B</div>
      <div class="lab-flex-cell">C</div>
      <div class="lab-flex-cell">D</div>
    </div>
  </div>
</div>
