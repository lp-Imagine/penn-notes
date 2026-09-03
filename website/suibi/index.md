---
title: 近况
outline: false
sidebar: false
aside: false
---

<script setup>
import { onMounted } from "vue";
import { withBase, useRouter } from "vitepress";

const href = withBase("/recent/");
const router = useRouter();
onMounted(() => {
  router.go(href);
});
</script>

<p>页面已迁移至 <a :href="href">近况</a>。</p>
