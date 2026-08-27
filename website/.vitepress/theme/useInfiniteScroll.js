import { onMounted, onUnmounted, ref, watch } from "vue";

const prefetchedUrls = new Set();

/** 用 Image 对象预解码，滚动展示时走浏览器缓存 */
export function prefetchImages(urls) {
  if (typeof window === "undefined" || !urls?.length) return;
  for (const raw of urls) {
    const url = String(raw || "").trim();
    if (!url || prefetchedUrls.has(url)) continue;
    prefetchedUrls.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

/**
 * 列表页滚动加载：远端预取 + 近端追加 DOM。
 * @param {{
 *   hasMore: import('vue').ComputedRef<boolean>|import('vue').Ref<boolean>,
 *   loadMore: () => void,
 *   visible?: import('vue').Ref<number>,
 *   getPrefetchUrls?: () => string[],
 *   rootMargin?: string,
 *   prefetchRootMargin?: string,
 * }} opts
 */
export function useInfiniteScroll({
  hasMore,
  loadMore,
  visible,
  getPrefetchUrls,
  rootMargin = "560px 0px",
  prefetchRootMargin = "1200px 0px",
}) {
  const sentinel = ref(null);
  const isLoading = ref(false);
  let loadObserver = null;
  let prefetchObserver = null;
  let loadTicking = false;

  function teardown() {
    loadObserver?.disconnect();
    prefetchObserver?.disconnect();
    loadObserver = null;
    prefetchObserver = null;
  }

  function prefetchUpcoming() {
    if (!getPrefetchUrls || !hasMore.value) return;
    prefetchImages(getPrefetchUrls());
  }

  function setup() {
    teardown();
    if (typeof window === "undefined") return;
    const el = sentinel.value;
    if (!el || !hasMore.value) return;

    prefetchObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) prefetchUpcoming();
      },
      { rootMargin: prefetchRootMargin, threshold: 0 },
    );
    prefetchObserver.observe(el);

    loadObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || !hasMore.value || loadTicking) {
          return;
        }
        loadTicking = true;
        isLoading.value = true;
        loadMore();
        requestAnimationFrame(() => {
          loadTicking = false;
          isLoading.value = false;
          prefetchUpcoming();
        });
      },
      { rootMargin, threshold: 0 },
    );
    loadObserver.observe(el);
  }

  if (visible && getPrefetchUrls) {
    watch(visible, () => prefetchUpcoming(), { flush: "post" });
  }

  onMounted(() => {
    setup();
    prefetchUpcoming();
  });
  onUnmounted(teardown);
  watch(hasMore, setup);
  watch(sentinel, setup);

  return { sentinel, isLoading, prefetchUpcoming };
}

/** 列表项分批入场 delay（每批内最多 stagger 8 条） */
export function revealDelay(index, batchSize = 8, step = 0.04) {
  return `${Math.min(index, batchSize - 1) * step}s`;
}
