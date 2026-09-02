/** 复制正文超过阈值时追加出处说明（imagineblog copy.copyright 移植） */

import { resolveLivePageUrl } from "./page-url";

type CopyCopyrightCfg = {
  limitChars?: number;
  author?: string;
  siteName?: string;
  siteUrl?: string;
};

const DEFAULT_LIMIT = 50;

function selectionFromDoc(): string | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return null;
  const text = sel.toString();
  if (!text.trim()) return null;

  const node = sel.anchorNode;
  const root =
    node instanceof Element
      ? node.closest(".vp-doc")
      : node?.parentElement?.closest(".vp-doc");
  if (!root) return null;
  return text;
}

export function setupCopyCopyright(cfg: CopyCopyrightCfg = {}) {
  if (typeof document === "undefined") return () => {};

  const limit = cfg.limitChars ?? DEFAULT_LIMIT;
  const author = cfg.author ?? "Penn";
  const siteName = cfg.siteName ?? "Penn Notes";
  const pageUrl = () =>
    cfg.siteUrl ? resolveLivePageUrl(cfg.siteUrl) : window.location.href;

  const onCopy = (event: ClipboardEvent) => {
    const copied = selectionFromDoc();
    if (!copied || copied.length <= limit) return;

    event.preventDefault();
    const footer = [
      "",
      "",
      `作者：${author}`,
      `链接：${pageUrl()}`,
      `来源：${siteName}`,
      "转载请注明出处，谢谢合作。",
    ].join("\n");
    event.clipboardData?.setData("text/plain", copied + footer);
  };

  document.addEventListener("copy", onCopy);
  return () => document.removeEventListener("copy", onCopy);
}
