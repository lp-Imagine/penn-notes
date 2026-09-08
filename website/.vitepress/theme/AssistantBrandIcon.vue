<script setup lang="ts">
defineProps<{
  /** 保证同页多实例渐变 id 不冲突 */
  uid: string;
  size?: number | string;
}>();
</script>

<template>
  <!-- Penn 导读：柔光圆盘 + 双星芒（AI）+ 轻书页弧（导读） -->
  <svg
    class="penn-assistant-brand-icon"
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
        x1="10"
        y1="4"
        x2="54"
        y2="60"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#9db4ff" />
        <stop offset="0.45" stop-color="#5b7cfa" />
        <stop offset="1" stop-color="#2f4ac7" />
      </linearGradient>
      <linearGradient
        :id="`${uid}-sheen`"
        x1="18"
        y1="10"
        x2="40"
        y2="36"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#fff" stop-opacity="0.55" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
      <radialGradient :id="`${uid}-glow`" cx="32" cy="28" r="22" gradientUnits="userSpaceOnUse">
        <stop stop-color="#fff" stop-opacity="0.28" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </radialGradient>
    </defs>

    <circle class="pa-ico-plate" cx="32" cy="32" r="30" :fill="`url(#${uid}-bg)`" />
    <circle class="pa-ico-glow" cx="32" cy="32" r="30" :fill="`url(#${uid}-glow)`" />
    <circle
      class="pa-ico-ring"
      cx="32"
      cy="32"
      r="26.5"
      fill="none"
      stroke="#fff"
      stroke-opacity="0.28"
      stroke-width="1.35"
      stroke-dasharray="7 11"
      stroke-linecap="round"
    />

    <path
      class="pa-ico-spark-main"
      fill="#fff"
      d="M32 15c.85 9.1 7.9 16.15 17 17-9.1.85-16.15 7.9-17 17-.85-9.1-7.9-16.15-17-17 9.1-.85 16.15-7.9 17-17Z"
    />
    <path
      class="pa-ico-spark-sub"
      fill="#fff"
      fill-opacity="0.92"
      d="M47 15.5c.42 4.05 2.95 6.58 7 7-4.05.42-6.58 2.95-7 7-.42-4.05-2.95-6.58-7-7 4.05-.42 6.58-2.95 7-7Z"
    />
    <path
      class="pa-ico-spark-micro"
      fill="#fff"
      fill-opacity="0.78"
      d="M18.5 20c.28 2.4 1.7 3.82 4.1 4.1-2.4.28-3.82 1.7-4.1 4.1-.28-2.4-1.7-3.82-4.1-4.1 2.4-.28 3.82-1.7 4.1-4.1Z"
    />

    <g class="pa-ico-book">
      <path
        d="M21.5 46.5c3.4-2.6 7.2-3.9 10.5-3.9s7.1 1.3 10.5 3.9"
        stroke="#fff"
        stroke-opacity="0.78"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path
        d="M32 42.6v5.6"
        stroke="#fff"
        stroke-opacity="0.55"
        stroke-width="1.7"
        stroke-linecap="round"
      />
    </g>

    <ellipse
      class="pa-ico-sheen"
      cx="23"
      cy="19"
      rx="7"
      ry="3.4"
      :fill="`url(#${uid}-sheen)`"
    />
  </svg>
</template>
