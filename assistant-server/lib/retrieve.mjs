/**
 * Lightweight keyword retrieval over chunked assistant index.
 */

function tokenize(s) {
  const raw = String(s || "").toLowerCase();
  const parts = raw.match(/[\u4e00-\u9fff]{2,}|[a-z0-9]{2,}/g) || [];
  return [...new Set(parts.filter((t) => t.trim().length > 0))];
}

const CHUNK_WEIGHT = {
  title: 3.2,
  summary: 1.8,
  body: 1,
};

/** Dedupe key: notes by link; news by link+title (digest shares link). */
export function docKey(item) {
  const link = String(item.link || "").replace(/\/$/, "");
  if (item.kind === "news") {
    return `${link}::${item.title || ""}`;
  }
  return link || String(item.parentId || item.id || "");
}

function scoreChunk(item, tokens) {
  if (!tokens.length) return 0;
  const title = String(item.title || "").toLowerCase();
  const summary = String(item.summary || "").toLowerCase();
  const text = String(item.text || "").toLowerCase();
  const tags = (item.tags || []).join(" ").toLowerCase();
  const section = String(item.sectionLabel || item.section || "").toLowerCase();
  const kind = item.chunkKind || "body";
  let score = 0;
  for (const t of tokens) {
    if (title.includes(t)) score += 8;
    if (tags.includes(t)) score += 5;
    if (section.includes(t)) score += 2;
    if (summary.includes(t)) score += 3;
    if (text.includes(t)) score += kind === "title" ? 4 : 1;
  }
  score *= CHUNK_WEIGHT[kind] || 1;
  if (item.kind === "note") score += 0.5;
  return score;
}

/**
 * @param {{ items?: any[] }} index
 * @param {string} query
 * @param {{ limit?: number, pathBoost?: string }} [opts]
 */
export function retrieve(index, query, opts = {}) {
  const items = Array.isArray(index?.items) ? index.items : [];
  const tokens = tokenize(query);
  const limit = opts.limit ?? 6;
  const pathBoost = opts.pathBoost
    ? String(opts.pathBoost).replace(/\/$/, "")
    : "";

  const ranked = items
    .map((item) => {
      let s = scoreChunk(item, tokens);
      if (pathBoost && String(item.link || "").replace(/\/$/, "") === pathBoost) {
        s += 12;
      }
      return { item, score: s };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // Keep best chunk per document, then top N docs
  const seen = new Set();
  const hits = [];
  for (const { item, score } of ranked) {
    const key = docKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    hits.push({
      title: item.title,
      link: item.link,
      sectionLabel: item.sectionLabel || item.section || "",
      date: item.date || "",
      summary: String(item.text || item.summary || "").slice(0, 280),
      chunkKind: item.chunkKind || "",
      tags: Array.isArray(item.tags) ? item.tags : [],
      kind: item.kind || "",
      parentId: item.parentId || "",
      score,
    });
    if (hits.length >= limit) break;
  }

  return hits;
}

export function findByPath(index, pagePath) {
  const all = findAllByPath(index, pagePath);
  return all[0] || null;
}

/** All index rows that share this page path. */
export function findAllByPath(index, pagePath) {
  const target = String(pagePath || "").replace(/\/$/, "");
  if (!target) return [];
  const items = Array.isArray(index?.items) ? index.items : [];
  return items.filter(
    (it) => String(it.link || "").replace(/\/$/, "") === target,
  );
}

/**
 * Build page-facing summary from path-matched rows (note chunks or news digest).
 */
export function buildPageSummaryFromItems(pageItems) {
  if (!pageItems?.length) return "";
  const titles = [...new Set(pageItems.map((it) => it.title).filter(Boolean))];
  // News digest: many titles, same link
  if (titles.length > 1) {
    const byTitle = new Map();
    for (const it of pageItems) {
      if (!it.title || byTitle.has(it.title)) continue;
      byTitle.set(it.title, it);
    }
    return [...byTitle.values()]
      .slice(0, 12)
      .map(
        (it, i) =>
          `${i + 1}. ${it.title}（${it.sectionLabel || it.section || ""}）${(it.summary || it.text || "").slice(0, 100)}`,
      )
      .join("\n");
  }
  const summaryChunk = pageItems.find((c) => c.chunkKind === "summary");
  if (summaryChunk?.text) return String(summaryChunk.text).slice(0, 800);
  const bodies = pageItems
    .filter((c) => c.chunkKind === "body")
    .map((c) => c.text)
    .filter(Boolean);
  if (bodies.length) return bodies.join(" ").slice(0, 1200);
  return String(pageItems[0]?.text || pageItems[0]?.summary || "").slice(0, 800);
}

/**
 * Unique note docs for a reading path (prefer title chunks).
 */
export function listNoteDocs(index) {
  const items = Array.isArray(index?.items) ? index.items : [];
  const byParent = new Map();
  for (const it of items) {
    if (it.kind !== "note") continue;
    const key = it.parentId || docKey(it);
    const prev = byParent.get(key);
    if (!prev || it.chunkKind === "title") {
      byParent.set(key, it);
    }
  }
  return [...byParent.values()];
}

/** Site-wide catalog for overview questions (not just top-N retrieve). */
export function buildSiteCatalog(index) {
  const docs = listNoteDocs(index);
  const bySection = new Map();
  for (const doc of docs) {
    const label = doc.sectionLabel || doc.section || "其它";
    if (!bySection.has(label)) bySection.set(label, []);
    bySection.get(label).push(doc);
  }
  const sections = [...bySection.entries()]
    .map(([label, list]) => {
      list.sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || "")),
      );
      return {
        label,
        count: list.length,
        samples: list.slice(0, 4).map((d) => d.title),
      };
    })
    .sort((a, b) => b.count - a.count);

  const newsItems = (Array.isArray(index?.items) ? index.items : []).filter(
    (it) => it.kind === "news" && it.chunkKind === "summary",
  );
  const newsTitles = [...new Set(newsItems.map((n) => n.title).filter(Boolean))];

  return {
    noteCount: docs.length,
    newsCount: newsTitles.length,
    sections,
    recentNews: newsTitles.slice(0, 5),
  };
}

export function formatSiteCatalogText(catalog) {
  if (!catalog) return "";
  const lines = [
    `技术笔记约 ${catalog.noteCount} 篇，按栏目：`,
  ];
  for (const sec of catalog.sections || []) {
    const samples = (sec.samples || []).map((t) => `《${t}》`).join("、");
    lines.push(
      `- ${sec.label}：${sec.count} 篇${samples ? `（例如 ${samples}）` : ""}`,
    );
  }
  if (catalog.newsCount) {
    lines.push(`AI 动态摘要约 ${catalog.newsCount} 条（按日更新）。`);
    if (catalog.recentNews?.length) {
      lines.push(
        `近期动态例如：${catalog.recentNews.map((t) => `《${t}》`).join("、")}`,
      );
    }
  }
  return lines.join("\n");
}

/**
 * Pick notes sharing tags/section with query tokens; oldest first for learning path.
 * @returns {{ docs: any[], matchedTags: string[] }}
 */
export function buildReadingPath(index, query, opts = {}) {
  const limit = opts.limit ?? 8;
  const docs = listNoteDocs(index);
  const tokens = tokenize(query);
  const stop = new Set([
    "阅读",
    "路径",
    "学习",
    "路线",
    "入门",
    "顺序",
    "推荐",
    "给我",
    "一条",
    "相关",
    "根据",
    "标签",
    "从哪",
    "怎么",
    "哪些",
    "什么",
    "文章",
    "想学",
  ]);
  const qTokens = tokens.filter((t) => t.length >= 2 && !stop.has(t));

  const tagScore = new Map(); // tag -> hits
  for (const doc of docs) {
    for (const tag of doc.tags || []) {
      const low = String(tag).toLowerCase();
      for (const t of qTokens) {
        if (low.includes(t) || t.includes(low)) {
          tagScore.set(tag, (tagScore.get(tag) || 0) + 1);
        }
      }
    }
    const sec = String(doc.sectionLabel || doc.section || "").toLowerCase();
    for (const t of qTokens) {
      if (sec.includes(t)) {
        const label = doc.sectionLabel || doc.section;
        tagScore.set(label, (tagScore.get(label) || 0) + 0.5);
      }
    }
  }

  let matchedTags = [...tagScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
    .slice(0, 4);

  // Fallback: use retrieve top docs' tags
  if (!matchedTags.length) {
    const hits = retrieve(index, query, { limit: 5 });
    const bag = new Map();
    for (const h of hits) {
      for (const tag of h.tags || []) {
        bag.set(tag, (bag.get(tag) || 0) + 1);
      }
      if (h.sectionLabel) {
        bag.set(h.sectionLabel, (bag.get(h.sectionLabel) || 0) + 0.3);
      }
    }
    matchedTags = [...bag.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .slice(0, 3);
  }

  const matched = docs
    .map((doc) => {
      let s = 0;
      const tags = (doc.tags || []).map((t) => String(t).toLowerCase());
      const sec = String(doc.sectionLabel || doc.section || "").toLowerCase();
      for (const mt of matchedTags) {
        const m = String(mt).toLowerCase();
        if (tags.some((t) => t === m || t.includes(m) || m.includes(t))) s += 3;
        if (sec.includes(m) || m.includes(sec)) s += 1.5;
      }
      for (const t of qTokens) {
        if (String(doc.title || "").toLowerCase().includes(t)) s += 2;
      }
      return { doc, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => {
      if (b.s !== a.s) return b.s - a.s;
      return String(a.doc.date || "").localeCompare(String(b.doc.date || ""));
    });

  // Re-sort selected set by date ascending (intro path)
  let picked = matched.slice(0, limit).map((x) => x.doc);
  picked.sort((a, b) =>
    String(a.date || "9999").localeCompare(String(b.date || "9999")),
  );
  if (picked.length < 3 && matchedTags.length) {
    // broaden: same section as top match
    const sec = picked[0]?.section;
    if (sec) {
      const extra = docs
        .filter((d) => d.section === sec && !picked.some((p) => p.link === d.link))
        .sort((a, b) =>
          String(a.date || "").localeCompare(String(b.date || "")),
        );
      picked = [...picked, ...extra].slice(0, limit);
    }
  }

  return { docs: picked.slice(0, limit), matchedTags };
}

export { tokenize };
