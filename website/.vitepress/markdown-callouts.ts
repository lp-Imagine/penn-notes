/**
 * 正文卡片：
 * - 把 VuePress 遗留的 `::: note` 转成 VitePress GitHub Alert（[!NOTE]）
 * - `> 注：` / `> 注意：` 引用加上 is-annotation
 * - 顶层「注：」「注意：」段落包成 note 卡片（同步稿常把 mp-warning 写成普通段落）
 */
import type MarkdownIt from "markdown-it";

const NOTE_LEAD = /^(注[：:]|注意[：:])/;

function rewriteNoteContainers(src: string): string {
  const chunks = src.split(/(```[\s\S]*?```)/);
  return chunks
    .map((chunk, i) => {
      if (i % 2 === 1) return chunk;
      return chunk.replace(
        /^::: ?note(?:[ \t]+([^\n]*))?\n([\s\S]*?)^:::\s*$/gm,
        (_m, title: string | undefined, body: string) => {
          const heading = title?.trim()
            ? `> [!NOTE] ${title.trim()}`
            : "> [!NOTE]";
          const lines = String(body).replace(/\s+$/, "").split("\n");
          return [heading, ...lines.map((line) => `> ${line}`)].join("\n");
        },
      );
    })
    .join("");
}

export function pennCalloutsPlugin(md: MarkdownIt) {
  const parse = md.parse.bind(md);
  md.parse = (src, env) => parse(rewriteNoteContainers(src), env);

  md.core.ruler.after("github-alerts", "penn-annotations", (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "blockquote_open") continue;
      const open = tokens[i];
      let end = i + 1;
      while (
        end < tokens.length &&
        !(
          tokens[end].type === "blockquote_close" &&
          tokens[end].level === open.level
        )
      ) {
        end += 1;
      }
      const firstInline = tokens
        .slice(i, end + 1)
        .find((t) => t.type === "inline");
      const text = firstInline?.content?.trim() ?? "";
      if (NOTE_LEAD.test(text)) {
        open.attrJoin("class", "is-annotation");
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      const open = tokens[i];
      if (open.type !== "paragraph_open" || open.level !== 0) continue;
      const inline = tokens[i + 1];
      if (!inline || inline.type !== "inline") continue;
      if (!NOTE_LEAD.test(inline.content.trim())) continue;

      let closeIdx = i + 2;
      while (
        closeIdx < tokens.length &&
        tokens[closeIdx].type !== "paragraph_close"
      ) {
        closeIdx += 1;
      }
      if (closeIdx >= tokens.length) continue;

      const wrapOpen = new state.Token("html_block", "", 0);
      wrapOpen.content = '<div class="custom-block note is-annotation">\n';
      const wrapClose = new state.Token("html_block", "", 0);
      wrapClose.content = "</div>\n";
      tokens.splice(closeIdx + 1, 0, wrapClose);
      tokens.splice(i, 0, wrapOpen);
      i = closeIdx + 2;
    }
  });
}
