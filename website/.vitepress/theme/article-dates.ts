/** 正文日期：frontmatter.updated ?? date（不用 git lastUpdated，避免批量同步后误判） */

export function parseArticleDate(raw: unknown): Date | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw === "number") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const text = String(raw).trim();
  if (!text) return null;
  const d = new Date(text.includes("T") ? text : `${text}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getArticleContentDate(page: {
  frontmatter?: Record<string, unknown>;
}): Date | null {
  const fm = page.frontmatter ?? {};
  return parseArticleDate(fm.updated ?? fm.date);
}

/** 展示用：正文日期优先，无 frontmatter 时回退 git lastUpdated */
export function getArticleUpdateTime(page: {
  lastUpdated?: number;
  frontmatter?: Record<string, unknown>;
}): Date | null {
  return getArticleContentDate(page) ?? parseArticleDate(page.lastUpdated);
}

export function daysSince(date: Date, now = new Date()): number {
  const ms = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function formatZhDate(date: Date): string {
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
