const STORAGE_KEY = "penn-topics-progress-v1";

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { done: {} };
    const parsed = JSON.parse(raw);
    return {
      done: parsed?.done && typeof parsed.done === "object" ? parsed.done : {},
    };
  } catch {
    return { done: {} };
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / private mode */
  }
}

function normLink(link) {
  return String(link || "")
    .replace(/\/+$/, "")
    .replace(/^\/+/, "/");
}

export function isTopicDone(link) {
  if (typeof localStorage === "undefined") return false;
  const key = normLink(link);
  return Boolean(readStore().done[key]);
}

export function setTopicDone(link, done = true) {
  if (typeof localStorage === "undefined") return;
  const key = normLink(link);
  const store = readStore();
  if (done) store.done[key] = Date.now();
  else delete store.done[key];
  writeStore(store);
}

export function markTopicRead(link) {
  setTopicDone(link, true);
}

export function topicProgress(links) {
  const list = (links || []).map(normLink).filter(Boolean);
  if (!list.length) return { done: 0, total: 0, percent: 0 };
  const store = readStore();
  const done = list.filter((l) => store.done[l]).length;
  return {
    done,
    total: list.length,
    percent: Math.round((done / list.length) * 100),
  };
}
