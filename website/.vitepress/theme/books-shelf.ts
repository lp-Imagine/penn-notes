/** 书单：状态筛选 + 3D 入场（仅对滚进视口的书播放） */

import { getUiText } from "../i18n/messages";
import { getUiLocalePreference } from "./ui-locale";

let observer: IntersectionObserver | undefined;

function teardownAnimation() {
  observer?.disconnect();
  observer = undefined;
}

function setupBooksFilter(page: HTMLElement) {
  const filter = page.querySelector<HTMLElement>(".books-filter");
  if (!filter || filter.dataset.bound === "1") return;
  filter.dataset.bound = "1";

  const countEl = page.querySelector<HTMLElement>("[data-books-count]");
  const cards = [...page.querySelectorAll<HTMLElement>(".book-card")];
  const totals = {
    "": Number(filter.dataset.total || cards.length),
    done: Number(filter.dataset.done || 0),
    reading: Number(filter.dataset.reading || 0),
    plan: Number(filter.dataset.plan || 0),
  };

  const apply = (status: string) => {
    let shown = 0;
    for (const card of cards) {
      const match = !status || card.dataset.status === status;
      card.hidden = !match;
      if (match) shown += 1;
    }
    filter.querySelectorAll<HTMLButtonElement>(".books-filter-chip").forEach((btn) => {
      const active = (btn.dataset.status || "") === status;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (countEl) {
      const books = getUiText(getUiLocalePreference()).books;
      if (!status) {
        countEl.textContent = books.countAll(
          totals[""],
          totals.done,
          totals.reading,
          totals.plan,
        );
        countEl.removeAttribute("data-i18n");
        countEl.removeAttribute("data-i18n-args");
      } else {
        const label =
          status === "done"
            ? books.done
            : status === "reading"
              ? books.reading
              : books.plan;
        countEl.textContent = books.countFiltered(shown, label, totals[""]);
        countEl.removeAttribute("data-i18n");
        countEl.removeAttribute("data-i18n-args");
      }
    }
  };

  filter.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      ".books-filter-chip",
    );
    if (!btn || !filter.contains(btn)) return;
    e.preventDefault();
    apply(btn.dataset.status || "");
  });

  apply("");
}

function setupBooksAnimation(page: HTMLElement) {
  if (page.dataset.bookShelfBound === "1" && observer) return;

  teardownAnimation();
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

export function setupBooksShelf() {
  const page = document.querySelector<HTMLElement>(".books-page");
  if (!page) {
    teardownAnimation();
    return;
  }
  setupBooksFilter(page);
  setupBooksAnimation(page);
}
