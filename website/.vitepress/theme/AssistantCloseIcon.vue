<script setup lang="ts">
defineProps<{
  uid: string;
  size?: number | string;
}>();
</script>

<template>
  <!-- 关闭态：同家族柔光圆盘 + 精致收起叉 -->
  <svg
    class="penn-assistant-close-icon"
    viewBox="0 0 64 64"
    :width="size ?? 40"
    :height="size ?? 40"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient
        :id="`${uid}-bg`"
        x1="12"
        y1="6"
        x2="52"
        y2="58"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#c5d0ff" />
        <stop offset="0.42" stop-color="#7b93f0" />
        <stop offset="1" stop-color="#3d54b8" />
      </linearGradient>
      <radialGradient :id="`${uid}-glow`" cx="32" cy="28" r="22" gradientUnits="userSpaceOnUse">
        <stop stop-color="#fff" stop-opacity="0.34" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </radialGradient>
    </defs>

    <circle class="pa-close-plate" cx="32" cy="32" r="30" :fill="`url(#${uid}-bg)`" />
    <circle class="pa-close-glow" cx="32" cy="32" r="30" :fill="`url(#${uid}-glow)`" />
    <circle
      class="pa-close-ring"
      cx="32"
      cy="32"
      r="26.5"
      fill="none"
      stroke="#fff"
      stroke-opacity="0.3"
      stroke-width="1.35"
      stroke-dasharray="5 9"
      stroke-linecap="round"
    />

    <!-- 收起叉：圆角粗笔 + 轻阴影感 -->
    <g class="pa-close-x">
      <path
        d="M22.5 22.5 41.5 41.5"
        stroke="rgba(15,23,42,0.18)"
        stroke-width="5.2"
        stroke-linecap="round"
      />
      <path
        d="M41.5 22.5 22.5 41.5"
        stroke="rgba(15,23,42,0.18)"
        stroke-width="5.2"
        stroke-linecap="round"
      />
      <path
        d="M22.5 22.5 41.5 41.5"
        stroke="#fff"
        stroke-width="3.6"
        stroke-linecap="round"
      />
      <path
        d="M41.5 22.5 22.5 41.5"
        stroke="#fff"
        stroke-width="3.6"
        stroke-linecap="round"
      />
    </g>

    <!-- 点缀微星，保持家族识别 -->
    <path
      class="pa-close-spark"
      fill="#fff"
      fill-opacity="0.7"
      d="M48 16c.28 2.2 1.55 3.47 3.75 3.75-2.2.28-3.47 1.55-3.75 3.75-.28-2.2-1.55-3.47-3.75-3.75 2.2-.28 3.47-1.55 3.75-3.75Z"
    />
  </svg>
</template>
