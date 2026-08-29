<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    text: string;
    /** ms per character while typing */
    speed?: number;
    /** ms per character while deleting */
    deleteSpeed?: number;
    /** delay before first typing starts */
    startDelay?: number;
    /** pause after a full line is typed */
    holdDelay?: number;
    /** pause after wipe, before typing again */
    restartDelay?: number;
  }>(),
  {
    speed: 200,
    deleteSpeed: 70,
    startDelay: 420,
    holdDelay: 4800,
    restartDelay: 600,
  },
);

const displayed = ref("");
const showCursor = ref(true);
const timers: ReturnType<typeof setTimeout>[] = [];
let cancelled = false;

function later(ms: number, fn: () => void) {
  const id = setTimeout(() => {
    if (cancelled) return;
    fn();
  }, ms);
  timers.push(id);
}

onMounted(() => {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) {
    displayed.value = props.text;
    showCursor.value = false;
    return;
  }

  const chars = Array.from(props.text);
  let i = 0;

  const typeNext = () => {
    if (i < chars.length) {
      i += 1;
      displayed.value = chars.slice(0, i).join("");
      later(props.speed, typeNext);
      return;
    }
    later(props.holdDelay, deleteNext);
  };

  const deleteNext = () => {
    if (i > 0) {
      i -= 1;
      displayed.value = chars.slice(0, i).join("");
      later(props.deleteSpeed, deleteNext);
      return;
    }
    later(props.restartDelay, typeNext);
  };

  later(props.startDelay, typeNext);
});

onBeforeUnmount(() => {
  cancelled = true;
  while (timers.length) {
    const id = timers.pop();
    if (id !== undefined) clearTimeout(id);
  }
});
</script>

<template>
  <p class="home-tagline home-tagline--typewriter" :aria-label="text">
    <span class="home-tagline-text">{{ displayed }}</span>
    <span
      v-if="showCursor"
      class="home-tagline-cursor"
      aria-hidden="true"
    />
  </p>
</template>
