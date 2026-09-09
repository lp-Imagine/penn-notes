/** 页脚「安全运行 X 年 X 天」（imagineblog running-time 简化版） */

const RUNTIME_ID = "penn-site-runtime";

type FormatFn = (years: number, days: number) => string;

function formatRuntime(
  since: Date,
  format: FormatFn,
  now = new Date(),
): string {
  let seconds = Math.max(
    0,
    Math.floor((now.getTime() - since.getTime()) / 1000),
  );
  const years = Math.floor(seconds / (365 * 24 * 3600));
  seconds %= 365 * 24 * 3600;
  const days = Math.floor(seconds / (24 * 3600));
  return format(years, days);
}

export function setupSiteRuntime(
  sinceIso: string,
  format: FormatFn = (y, d) => `${y} 年 ${d} 天`,
) {
  if (typeof document === "undefined" || !sinceIso) return () => {};

  const since = new Date(`${sinceIso}T00:00:00+08:00`);
  if (Number.isNaN(since.getTime())) return () => {};

  const render = () => {
    const el = document.getElementById(RUNTIME_ID);
    if (!el) return;
    el.textContent = formatRuntime(since, format);
  };

  render();
  const timer = window.setInterval(render, 60 * 60 * 1000);
  return () => window.clearInterval(timer);
}
