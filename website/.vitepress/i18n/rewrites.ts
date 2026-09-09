/**
 * 多语言正文复用策略
 *
 * VitePress `rewrites` 是「源文件路径 → URL」一对一映射，无法把同一份
 * `web/foo.md` 同时挂到 `/web/foo`、`/en/web/foo`、`/zh-TW/web/foo`。
 * 因此在 locale 目录下**镜像复制**简体源文件（不用符号链接）：
 * symlink 会被解析到同一 realpath，pageData.relativePath 丢失 `en/` / `zh-TW/`
 * 前缀，导致除落地页外 UI 仍走简体 themeConfig——体感「只有首页能切语言」。
 *
 * `en/index.md` / `zh-TW/index.md` 为独立落地页，不复制首页。
 *
 * 若仅需落地页 + UI，可不调用 ensureLocaleContentAliases。
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

/** 与仓库栏目目录对齐；生成物（books/collect/news）在存在时才会镜像 */
export const CONTENT_SECTIONS = [
  "web",
  "ui",
  "engineering",
  "backend",
  "tech",
  "agent",
  "computer",
  "misc",
  "news",
  "about",
  "archive",
  "tags",
  "topics",
  "recent",
  "friends",
  "collect",
  "books",
  "talks",
  "suibi",
] as const;

export type ContentSection = (typeof CONTENT_SECTIONS)[number];

export const LOCALE_CONTENT_PREFIXES = ["en", "zh-TW"] as const;

const SECTION_ALT = CONTENT_SECTIONS.join("|");

/**
 * 文档向：若将来 VitePress 支持一对多 alias，可改成真正的 rewrite。
 * 当前返回空对象；正文复用依赖 ensureLocaleContentAliases。
 *
 * 用户最初设想（URL→源，方向与 VP 相反，仅作说明）：
 *   'en/:section(web|...)/:rest*' → ':section/:rest*'
 */
export function buildContentRewrites(): Record<string, string> {
  void SECTION_ALT;
  return {};
}

/** 删除目标路径（符号链接 / 文件 / 目录），便于从旧 symlink 迁移到镜像副本 */
function removePath(dest: string): void {
  if (!existsSync(dest)) return;
  const st = lstatSync(dest);
  if (st.isSymbolicLink() || st.isFile()) {
    unlinkSync(dest);
    return;
  }
  rmSync(dest, { recursive: true, force: true });
}

/** 将 source（文件或目录）镜像到 dest */
function mirrorContent(source: string, dest: string): void {
  removePath(dest);
  cpSync(source, dest, { recursive: true });
}

/**
 * 在 en/、zh-TW/ 下为各栏目镜像简体源（目录或单文件 `section.md`）。
 * 必须用副本而非 symlink，否则 pageData.relativePath 不含 locale 前缀。
 */
export function ensureLocaleContentAliases(srcDir: string): void {
  for (const locale of LOCALE_CONTENT_PREFIXES) {
    const localeDir = join(srcDir, locale);
    mkdirSync(localeDir, { recursive: true });

    for (const section of CONTENT_SECTIONS) {
      const sourceDir = join(srcDir, section);
      const sourceFile = join(srcDir, `${section}.md`);

      let source: string;
      let dest: string;

      if (existsSync(sourceDir)) {
        source = sourceDir;
        dest = join(localeDir, section);
      } else if (existsSync(sourceFile)) {
        // 单文件栏目：about.md → en/about.md（路由 /en/about）
        source = sourceFile;
        dest = join(localeDir, `${section}.md`);
        // 若历史上误挂成 en/about 目录/链接，先清掉
        removePath(join(localeDir, section));
      } else {
        continue;
      }

      try {
        mirrorContent(source, dest);
      } catch (err) {
        console.warn(
          `[i18n] mirror ${locale}/${section} ← ${source} failed:`,
          err,
        );
      }
    }
  }
}
