/** 页脚「安全运行 X 年 X 天」（imagineblog running-time 简化版） */

const RUNTIME_ID = "penn-site-runtime";

function formatRuntime(since: Date, now = new Date()): string {
  let seconds = Math.max(
    0,
    Math.floor((now.getTime() - since.getTime()) / 1000),
  );
  const years = Math.floor(seconds / (365 * 24 * 3600));
  seconds %= 365 * 24 * 3600;
  const days = Math.floor(seconds / (24 * 3600));
  return `${years} 年 ${days} 天`;
}

export function setupSiteRuntime(sinceIso: string) {
  if (typeof document === "undefined" || !sinceIso) return () => {};

  const since = new Date(`${sinceIso}T00:00:00+08:00`);
  if (Number.isNaN(since.getTime())) return () => {};

  const render = () => {
    const el = document.getElementById(RUNTIME_ID);
    if (!el) return;
    el.textContent = formatRuntime(since);
  };

  render();
  const timer = window.setInterval(render, 60 * 60 * 1000);
  return () => window.clearInterval(timer);
}
