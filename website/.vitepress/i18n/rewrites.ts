/**
 * 多语言正文复用策略
 *
 * VitePress `rewrites` 是「源文件路径 → URL」一对一映射，无法把同一份
 * `web/foo.md` 同时挂到 `/web/foo`、`/en/web/foo`、`/zh-TW/web/foo`。
 * 因此栏目正文通过 locale 目录下的符号链接复用简体源文件；
 * `en/index.md` / `zh-TW/index.md` 为独立落地页，不链接首页。
 *
 * 若仅需落地页 + UI，可不调用 ensureLocaleContentAliases。
 */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

/** 与仓库栏目目录对齐；生成物（books/collect/news）在存在时才会挂链 */
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

/** 在 en/、zh-TW/ 下为各栏目创建指向简体源目录的相对符号链接 */
export function ensureLocaleContentAliases(srcDir: string): void {
  for (const locale of LOCALE_CONTENT_PREFIXES) {
    const localeDir = join(srcDir, locale);
    mkdirSync(localeDir, { recursive: true });

    for (const section of CONTENT_SECTIONS) {
      const source = join(srcDir, section);
      if (!existsSync(source)) continue;

      const dest = join(localeDir, section);
      const target = `../${section}`;

      try {
        const st = lstatSync(dest);
        if (st.isSymbolicLink()) {
          if (readlinkSync(dest) === target) continue;
          unlinkSync(dest);
        } else {
          // 已有真实文件/目录（例如独立 about），跳过以免覆盖
          continue;
        }
      } catch {
        // dest 不存在
      }

      try {
        symlinkSync(target, dest);
      } catch (err) {
        console.warn(
          `[i18n] symlink ${locale}/${section} → ${target} failed:`,
          err,
        );
      }
    }
  }
}
