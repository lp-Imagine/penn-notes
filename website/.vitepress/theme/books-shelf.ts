/** 书单 3D 入场：仅对「滚进视口」的书播放，首屏已可见的不播。 */

let observer: IntersectionObserver | undefined;

function teardown() {
  observer?.disconnect();
  observer = undefined;
}

export function setupBooksShelf() {
  const page = document.querySelector<HTMLElement>(".books-page");
  if (!page) {
    teardown();
    return;
  }
  // 避免 MutationObserver 看到 is-inview 后又重置动画
  if (page.dataset.bookShelfBound === "1" && observer) return;

  teardown();
  page.dataset.bookShelfBound = "1";

  const cards = [...page.querySelectorAll<HTMLElement>(".book-card")];
  if (!cards.length) return;

  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    cards.forEach((card) => {
      card.classList.add("is-inview", "is-resting");
      card.classList.remove("is-waiting");
    });
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target as HTMLElement;
        if (card.classList.contains("is-inview")) continue;

        if (!entry.isIntersecting) {
          if (entry.boundingClientRect.top > 0) {
            card.classList.add("is-waiting");
          }
          continue;
        }

        const fromBelow = card.classList.contains("is-waiting");
        card.classList.remove("is-waiting");
        card.classList.add("is-inview");
        if (!fromBelow) card.classList.add("is-resting");
        observer?.unobserve(card);
      }
    },
    { threshold: 0.18, rootMargin: "0px 0px -18% 0px" },
  );

  cards.forEach((card, i) => {
    card.style.setProperty("--book-stagger", String(i % 4));
    observer?.observe(card);
  });
}
