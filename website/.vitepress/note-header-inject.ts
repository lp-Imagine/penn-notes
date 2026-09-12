/**
 * Decap 手写稿常只有 frontmatter.title/cover，正文无 # 标题。
 * 构建时把文头补进 Markdown，与 ai-article 稿一致，避免线上缺标题。
 */
import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NOTE_DIR_RE =
  /[\\/]website[\\/](web|ui|engineering|backend|tech|computer|agent|misc)[\\/]/i;

const websiteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function splitFrontmatter(raw: string): { fm: string; body: string } | null {
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return null;
  return {
    fm: raw.slice(4, end),
    body: raw.slice(end + 4).replace(/^\r?\n/, ""),
  };
}

function fmGet(fm: string, key: string): string {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!m) return "";
  return m[1].trim().replace(/^["']|["']$/g, "");
}

function fmTags(fm: string): string[] {
  const block = fm.match(/^tags:\s*\n((?:[ \t]*-[ \t]*.+\n?)*)/m);
  if (block) {
    return block[1]
      .split("\n")
      .map((l) => l.replace(/^[ \t]*-[ \t]*/, "").trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  const inline = fm.match(/^tags:\s*\[([^\]]*)\]/m);
  if (inline) {
    return inline[1]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return [];
}

function hasH1(body: string): boolean {
  return /^#[^#\s].*/m.test(body) || /^#\s+\S/m.test(body);
}

function hasArticleMeta(body: string): boolean {
  return /class=["']article-meta["']/.test(body);
}

function hasArticleCover(body: string): boolean {
  return /class=["']article-cover["']/.test(body);
}

function normalizeCover(src: string): string {
  const s = src.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const url = s.startsWith("/") ? s : `/uploads/${s.replace(/^\.?\//, "")}`;
  // 仅注入 public 下真实存在的本地图，避免 Vite 解析死链炸构建
  if (/^\/(uploads|sync|img)\//.test(url)) {
    const local = path.join(websiteRoot, "public", url.replace(/^\//, ""));
    if (!fs.existsSync(local)) return "";
  }
  return url;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMetaHtml(date: string, tags: string[]): string {
  const parts: string[] = [];
  if (date) {
    parts.push(`<time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time>`);
  }
  for (const tag of tags) {
    parts.push(`<span class="article-tag">${escapeHtml(tag)}</span>`);
  }
  if (!parts.length) return "";
  return `<p class="article-meta">${parts.join("")}</p>\n`;
}

export function pennNoteHeaderInject(): Plugin {
  return {
    name: "penn-note-header-inject",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0];
      if (!file.endsWith(".md")) return null;
      if (!NOTE_DIR_RE.test(file)) return null;
      if (path.basename(file) === "index.md") return null;

      const parts = splitFrontmatter(code);
      if (!parts) return null;

      const title = fmGet(parts.fm, "title");
      if (!title) return null;

      const date = (fmGet(parts.fm, "updated") || fmGet(parts.fm, "date")).slice(
        0,
        10,
      );
      const tags = fmTags(parts.fm);
      const cover = normalizeCover(fmGet(parts.fm, "cover"));
      let body = parts.body;
      let changed = false;

      if (!hasH1(body)) {
        const meta =
          !hasArticleMeta(body) && (date || tags.length)
            ? buildMetaHtml(date, tags)
            : "";
        const coverHtml =
          cover && !hasArticleCover(body)
            ? `<img class="article-cover" src="${escapeHtml(cover)}" alt="「${escapeHtml(title)}」封面" />\n\n`
            : "";
        body = `# ${title}\n\n${meta}${coverHtml}${body}`;
        changed = true;
      } else {
        // 已有 h1：只补缺的 meta / cover（贴在首个 h1 后）
        const h1Match = body.match(/^#\s+[^\n]+\n?/m);
        if (h1Match && h1Match.index != null) {
          const insertAt = h1Match.index + h1Match[0].length;
          let inject = "";
          if (!hasArticleMeta(body) && (date || tags.length)) {
            inject += buildMetaHtml(date, tags);
          }
          if (cover && !/class=["']article-cover["']/.test(body)) {
            inject += `<img class="article-cover" src="${escapeHtml(cover)}" alt="「${escapeHtml(title)}」封面" />\n\n`;
          }
          if (inject) {
            body = body.slice(0, insertAt) + "\n" + inject + body.slice(insertAt);
            changed = true;
          }
        }
      }

      if (!changed) return null;
      return `---\n${parts.fm}\n---\n\n${body}`;
    },
  };
}
