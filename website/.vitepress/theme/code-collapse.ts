/** 文章代码块：超过阈值默认收起，可展开 / 收起 */

import { getUiText } from "./i18n";

const COLLAPSE_AFTER = 14;
const PREVIEW_LINES = 12;

function countCodeLines(block: HTMLElement): number {
  const code = block.querySelector("code");
  if (!code) return 0;
  const shikiLines = code.querySelectorAll(".line");
  if (shikiLines.length > 0) return shikiLines.length;
  const text = code.textContent || "";
  if (!text) return 0;
  // 末尾空行不计入
  return text.replace(/\n$/, "").split("\n").length;
}

function setCollapsed(block: HTMLElement, btn: HTMLButtonElement, collapsed: boolean) {
  block.classList.toggle("is-collapsed", collapsed);
  const lines = Number(block.dataset.pennCodeLines || "0");
  const code = getUiText().code;
  btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  btn.textContent = collapsed ? code.expandAll(lines) : code.collapse;
}

function enhanceBlock(block: HTMLElement) {
  if (block.dataset.pennCodeCollapse === "1") return;
  if (block.classList.contains("penn-code-skip-collapse")) return;

  const lines = countCodeLines(block);
  if (lines <= COLLAPSE_AFTER) return;

  block.dataset.pennCodeCollapse = "1";
  block.dataset.pennCodeLines = String(lines);
  block.classList.add("penn-code-collapsible");
  block.style.setProperty("--penn-code-preview-lines", String(PREVIEW_LINES));

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "penn-code-toggle";
  btn.setAttribute("aria-label", getUiText().code.toggleAria);
  setCollapsed(block, btn, true);

  btn.addEventListener("click", () => {
    const willCollapse = !block.classList.contains("is-collapsed");
    setCollapsed(block, btn, willCollapse);
    // 收起后若块顶已滚出导航下，滚回块顶，避免「收起后停在半空」
    if (willCollapse) {
      const top = block.getBoundingClientRect().top;
      const navH = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--vp-nav-height") || "64",
      );
      if (top < navH + 8) {
        block.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }
  });

  block.appendChild(btn);
}

export function setupCodeCollapse(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLElement>('.vp-doc div[class*="language-"]')
    .forEach(enhanceBlock);
}
