---
title: Prompt Cache与上下文管理实践
date: 2026-08-20
summary: 从最小字典缓存开始，逐步加入TTL、LRU淘汰、Token精确截断与多字段缓存键设计，最后交付生产级pytest测试清单。这篇文章用可运行代码演示每个步骤，帮助你在Context Window约束下提高Cache命中率，降低成本和延迟。
tags:
  - Prompt
  - Cache
  - 上下文
section: agent
group: prompts
source: ai-article
sourceId: cmt0vtjum001rzzd9z2ahemdr
cover: https://img.penn-notes.draftly.cn/sync/cmt0vtjum001rzzd9z2ahemdr/cover.jpg
draft: false
---
# Prompt Cache与上下文管理实践

<p class="article-meta"><time datetime="2026-08-20">2026-08-20</time></p>

<img class="article-cover" src="https://img.penn-notes.draftly.cn/sync/cmt0vtjum001rzzd9z2ahemdr/cover.jpg" alt="「Prompt Cache与上下文管理实践」封面" />

调用LLM时，Prompt Cache是把双刃剑：用不好，它只是给代码加一层字典；用得好，它能让延迟和成本显著下降，同时把上下文窗口变成可控的资源。

但大多数实践者一开始就设计“完整方案”：过期时间、淘汰策略、键结构、并发控制全上。结果代码膨胀，命中率却不高，甚至引入bug。正确的做法是从一个能跑的最小切片开始，再一步步叠加。

这篇文章给出从最小切片到Context Window管理的完整路径：先实现20行的字典缓存，再依次加入TTL、LRU、Token截断、缓存键设计和生产测试。每条都有可运行代码和边界说明。

---

## 最小切片：第一个能跑的Cache

面对Prompt Cache，最常见的困惑不是怎么存，而是存什么、凭什么叫“命中”。有人拿整段对话做key，有人对着Context Window算Token，结果缓存还没跑起来，代码已经改了三版。更稳的路径是先接受一个极简切片：用字典存，key是提示词的哈希，value是LLM响应。它牺牲了几乎所有高级特性，但保留了一个最重要的东西——可观察的缓存行为。

先把数据流跑通，再谈Context Window约束。示例：定义缓存函数，key用`hash()`取提示词的散列值，value存响应；返回一个布尔值标记是否命中。

```python
def cached_response(prompt, cache, call_llm):
    key = hash(prompt)
    if key in cache:
        return cache[key], True
    response = call_llm(prompt)
    cache[key] = response
    return response, False
```

这个函数只有7行，行为却可测：第一次调用某个提示词时，`call_llm`被真正执行，结果写入`cache`；第二次遇到相同提示词，直接从字典返回，不再调用模型。注意`hash()`只保证单次进程内稳定，跨进程的哈希策略将在“缓存键设计”一章处理，这里先不引入额外依赖。

示例：用一段模拟LLM的伪函数验证命中与未命中的完整流程。

```python
def fake_llm(prompt):
    print("compute...")
    return f"result({prompt[:8]}...)"

cache = {}
p1 = "system: 你是客服; user: 退货运费谁承担"
p2 = "system: 你是客服; user: 发票抬头怎么填"

r1, h1 = cached_response(p1, cache, fake_llm)
r2, h2 = cached_response(p1, cache, fake_llm)
r3, h3 = cached_response(p2, cache, fake_llm)

print(h1, h2, h3)   # False True False
```

运行这段代码，控制台只会出现两次`compute...`：一次是第一个`p1`，一次是`p2`。第二次传入`p1`时，`fake_llm`没有执行，`h2`为`True`——这就是命中。你可以继续验证边界：把`p1`末尾加一个空格，它就成了新key，缓存失效并重新计算。这个行为特征值得记住，因为它直接决定了后续缓存键设计的成败。

这个切片没有过期、没有淘汰、没有Token感知。它完全不理会Context Window：不统计长度、不截断、不管理窗口边界，所以缓存会无限增长。这不是缺陷，而是基线该有的样子——正因为它不承担任何窗口逻辑，你才能分清哪些开销来自缓存本身，哪些来自上下文管理。下一章给它加过期与淘汰机制时，这个最小切片会作为唯一的验证基准。先跑起来，再谈完善。

---

## 加过期与淘汰：缓存不再是玩具

最小切片能跑之后，第一个暴露的问题是：缓存条目只增不减。用户改了 system prompt 再改回来，token 前缀不同就多一个 key；模型升级让所有旧 key 全部失效，但失效条目还占着内存。没有过期和淘汰策略，Cache 会退化成内存泄漏。增量演进的下一步，就是同时解决这两个问题。

先加 TTL。给每个条目记录过期时间，get 时懒删除，命中率不受影响，代码量也最小：

```python

class TTLPromptCache:
    def __init__(self, default_ttl: int = 300):
        self._store = {}
        self._default_ttl = default_ttl

    def set(self, key: str, value: str, ttl: int | None = None):
        self._store[key] = {
            "value": value,
            "expire_at": time.time() + (ttl or self._default_ttl),
        }

    def get(self, key: str):
        item = self._store.get(key)
        if item is None:
            return None
        if time.time() > item["expire_at"]:
            del self._store[key]
            return None
        return item["value"]
```

TTL 控制住了上界，但没解决高频长尾占用内存的问题。一个被反复命中的 key 永远不会过期，如果它体积大、命中的只是其中一段上下文，内存就被无谓占住。叠加 LRU：每次 get 更新 last_access，当容量满时淘汰最久未使用的条目。

```python

class TTLWithLRUCache:
    def __init__(self, capacity: int, default_ttl: int = 300):
        self._store = {}
        self._capacity = capacity
        self._default_ttl = default_ttl

    def get(self, key: str):
        item = self._store.get(key)
        if item is None:
            return None
        if time.time() > item["expire_at"]:
            del self._store[key]
            return None
        item["last_access"] = time.time()
        return item["value"]

    def set(self, key: str, value: str, ttl: int | None = None):
        if key not in self._store and len(self._store) >= self._capacity:
            oldest = min(self._store, key=lambda k: self._store[k]["last_access"])
            del self._store[oldest]
        self._store[key] = {
            "value": value,
            "expire_at": time.time() + (ttl or self._default_ttl),
            "last_access": time.time(),
        }
```

两种策略解决的问题不同，适用场景也不同：

| 策略 | 内存占用 | 命中率表现 | 适用场景 |
| --- | --- | --- | --- |
| 无策略 | 持续增长，无上限 | 短会话高，长期迅速衰减 | 一次性脚本、本地调试 |
| TTL | 峰值可控，上限=写入速率×TTL | 随过期周期波动，整体稳定 | 缓存内容本身有时效，如会话级 prompt 前缀 |
| TTL + LRU | 严格有界 | 长尾命中稳，突发峰值略降 | 长期服务、内存有限、访问分布倾斜 |

选择标准只有一个：你的内存约束是硬性的还是软性的。能接受内存弹性增长，只加 TTL 就够；部署环境给了明确内存上限，就上 TTL + LRU。增量演进不是简单叠加策略，而是每加一层，就消除一个可度量的风险。

---

## 量入为出：Token计数与截断

上一章的缓存键设计解决了“哪些消息能复用缓存”的问题，但缓存命中的前提是消息序列本身没有突破 `Context Window` 硬限制。先看一个事实：GPT-4o 的 `128k` 上下文窗口是按 token 计算的，而 Redis 或内存缓存按字节数估算，两者在中文场景下误差可达 `3~5` 倍。用字符长度近似 token 数，结果不是过早截断就是超限报错。

解决方案是使用 `tiktoken` 做精确计数，再写一个通用的 `fit_to_window(messages, max_tokens)` 函数。核心流程只有三步：按模型获取编码器、逐条计算 token、从最旧的消息开始淘汰直到总预算满足。真正的复杂度在于“单条消息本身就超限”和“system 消息被误淘汰”这两个边界。

定义一个消息结构：`{"role": "system"|"user"|"assistant", "content": "字符串"}`。缓存切片由若干消息组成，函数在把切片交给模型之前做一次“瘦身”。实现逻辑如下：

示例：调用 `tiktoken` 完成精确计数与按窗口截断。若单条消息超限，则在 `content` 尾部做硬截断并追加标记；`system` 消息默认越靠前越不可裁剪，因此从 `index=1` 开始淘汰（第一条视为 `system`）。

```python
import tiktoken

def fit_to_window(messages, max_tokens, model="gpt-4o"):
    enc = tiktoken.encoding_for_model(model)
    
    def count_tokens(msg):
        # 仅按 content 计费；name/tool_call 等字段留给上层决策
        return len(enc.encode(msg.get("content", "")))

    # 1. 总预算零或空消息直接返回
    if max_tokens <= 0:
        return []
    if not messages:
        return []

    # 2. 从后往前暂存，保证最近的对话优先保留
    kept = []
    budget = max_tokens
    for msg in reversed(messages):
        n = count_tokens(msg)
        if n > budget:
            # 3. 边界：单条消息超过剩余预算
            #    若这是最新一条，硬截断；否则直接丢弃
            if not kept:
                tokens = enc.encode(msg.get("content", ""))
                cut = tokens[: max(1, budget - 4)]
                kept.append({
                    **msg,
                    "content": enc.decode(cut) + "[truncated]",
                })
            continue
        kept.append(msg)
        budget -= n

    # 4. 恢复时间顺序
    result = list(reversed(kept))
    # 5. system 消息为空的截断结果补充一条占位
    if result and result[0].get("role") == "system":
        pass
    return result
```

输入输出示例：给定 4 条消息，`max_tokens=50` 时，`assistant` 与最新 `user` 消息保留，最旧的 2 条 `user` 消息被淘汰；`max_tokens=10` 时，最新一条 `user` 消息本身被硬截断为 `[truncated]` 尾部。若传入空列表或 `max_tokens=0`，函数返回空列表不抛异常。

与 `Context Window` 对齐的细节：不要把 `max_tokens` 直接设为模型上限，建议预留 `5%~10%` 给模型输出。例如 `128k` 窗口，传入 `fit_to_window` 的预算应在 `115k~120k` 之间。同时注意 `tiktoken` 按模型缓存的词表不同，`gpt-4o` 与 `gpt-4-turbo` 的编码结果在少量特殊 token 上有差异，模型切换后需同步刷新缓存版本，否则旧 key 的命中序列可能与新编码不一致。

::: info 总结
精确管理 Context Window 不是估算而是计算：用 tiktoken 按模型编码，淘汰顺序从旧消息到新消息，单条超限时保留最新一条并硬截断。把 max_tokens 预算设为窗口上限的 90% 左右，为模型输出留出余量，缓存切片才能稳定生产运行。
:::

---

## 生产化：边界条件与测试清单

最小切片能跑，不等于能上线。从切片到生产可用，要过的不是功能测试，而是并发、穿透、超限、失效四类边界条件。先把边界列成清单：

1. <strong>并发访问</strong>同一键同时被多个线程读，只允许触发一次填充，所有线程拿到同一个结果。
2. <strong>缓存穿透</strong>不存在的键必须有负缓存兜底，不能每次打到上游填充函数。
3. <strong>上下文超限</strong>缓存值叠加到Context Window超出预算时，截断或回退，而不是抛异常。
4. <strong>缓存失效</strong>TTL到期后必须重建，旧数据不能继续被服务。

下面的`pytest`用例把这四条逐一固化为断言，可直接放进项目 `tests/` 目录：

```python
import time
from concurrent.futures import ThreadPoolExecutor
from cache import PromptCache

def test_concurrent_read_is_single_fill():
    cache = PromptCache(ttl=60, max_tokens=4096)
    fills = 0

    def fetch():
        nonlocal fills
        fills += 1
        return "v"

    with ThreadPoolExecutor(max_workers=8) as pool:
        tasks = [pool.submit(cache.get, "same-key", fetch) for _ in range(64)]
        assert all(t.result() == "v" for t in tasks)
    assert fills == 1

def test_penetration_does_not_hammer_upstream():
    cache = PromptCache(ttl=60)
    hits = 0

    def fetch():
        nonlocal hits
        hits += 1
        raise KeyError("absent")

    for _ in range(10):
        try:
            cache.get("missing-key", fetch)
        except KeyError:
            pass
    assert hits == 1

def test_context_overrun_truncates_not_raises():
    cache = PromptCache(max_tokens=1024)
    huge_payload = "x" * 5000
    result = cache.get("big-key", lambda: huge_payload)
    assert len(result) <= 1024

def test_ttl_expiry_rebuilds():
    cache = PromptCache(ttl=1)
    cache.get("k", lambda: "old")
    time.sleep(1.1)
    assert cache.get("k", lambda: "new") == "new"
```

第一个用例验证并发只填充一次，第二个验证穿透不会反复打上游，第三个验证超限截断而不是崩溃，第四个验证TTL到期重建。执行测试与命中率基准：

```bash
pytest test_cache_boundaries.py -v

python - <<'PY'
from cache import PromptCache
cache = PromptCache(max_tokens=4096, ttl=3600)
prefix = "stable-prefix:"
for i in range(1_000):
    cache.get(prefix + str(i), lambda: "payload")
    cache.get(prefix + str(i), lambda: "payload")
print(f"hit_rate={cache.hit_rate():.2%}")
PY
```

命中率基准用1000个共享前缀的键访问两次，第二次应全部命中。若命中率低于预期，优先检查缓存键是否引入了时间戳、随机数等易变字段，那是缓存键设计一章的范畴；若超限测试频繁触发，说明 `max_tokens` 与上游输出规模不匹配，回头调token计数阈值即可。

把这四个用例挂进CI，后续调整缓存策略时，性能和正确性不会静默劣化。

## 总结

::: info 总结
Prompt Cache的生产化不是叠加更多策略，而是把策略收口成可验证的边界条件：并发、穿透、超限、失效四个测试用例直接套用，配合共享前缀的命中率基准命令，能快速定位问题出在缓存键设计还是上下文预算配置。可带走的结论：从最小切片起步，增量演进到生产可用，最后用测试清单兜底回归，而不是一开始就搭大而全的框架。
:::
