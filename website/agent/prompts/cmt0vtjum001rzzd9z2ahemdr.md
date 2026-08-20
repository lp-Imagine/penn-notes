---
title: Prompt Cache 与上下文管理选型指南
date: 2026-08-20
summary: 围绕「Prompt Cache 和 Context Window 管理的工程实践」的一篇干货型稿，读完能带走可执行要点。
tags: []
section: agent
group: prompts
source: ai-article
sourceId: cmt0vtjum001rzzd9z2ahemdr
cover: /sync/cmt0vtjum001rzzd9z2ahemdr/cover.jpg
draft: false
---
# Prompt Cache 与上下文管理选型指南

<p class="article-meta"><time datetime="2026-08-20">2026-08-20</time></p>

<img class="article-cover" src="/sync/cmt0vtjum001rzzd9z2ahemdr/cover.jpg" alt="「Prompt Cache 与上下文管理选型指南」封面" />

## 缓存与上下文管理的死结

趁早把结论摆在前面：<strong>prompt cache 要求前缀稳定，context window 管理要求前缀可变，这两个约束在同一请求上互斥。</strong>缓存按 token 前缀做分段复用，前缀中任一 token 序列漂移，从漂移点往后的缓存块全部失效，之前所有对话史重新计费。而窗口不够用时，后端通常做三件事：截断最旧轮次、滑动窗口、插入历史摘要——这三件事全部会改变下一个请求的头部 token 序列。于是你每轮对话都在修复缓存，缓存又反过来阻止你动上下文结构。

服务端只认请求里连续的 token 前缀。OpenAI 的 `prefix caching`、Anthropic 的 `prompt caching`，对前缀的要求一致：新请求的头部 token 序列必须与缓存时完全一致。你按时间截断了旧消息，下次的请求头就从新位置开始，和缓存时刻的头部对不上，命中失败重新计费。这个冲突不解决，后面所有缓存策略都落不了地。三个方案的本质差异，也就在于怎么处理这个前缀结构。

| 维度 | 显式缓存 + 固定前缀 | 隐式缓存 + 滑动窗口 | 语义摘要 + 缓存键设计 |
| --- | --- | --- | --- |
| 成本 | 命中则大幅下降，未命中全额计费 | 不可控，依赖厂商缓存策略 | 摘要生成增加额外 token 消耗 |
| 命中率 | 高，前缀由你完全控制 | 中，截断操作持续破坏命中 | 可控，但关键信息有损 |
| 延迟 | 命中后 TTFT 显著下降 | 只有命中才降延迟 | 每次请求多一次摘要生成调用 |
| 实现复杂度 | 中，需要管理状态与失效 | 低，无侵入，只读指标 | 高，需要摘要维护与重算链路 |

选型看四个维度，按业务优先级排序。成本：查服务商定价页的 cached token 折扣，乘以预期命中率后再比较，不要只看单价。命中率：用返回字段验证，OpenAI 看 `prompt_tokens_details.cached_tokens`，Anthropic 看 `cache_read_input_tokens`，这是你唯一的标尺。延迟：命中与未命中的 TTFT 差值，按你的接口超时预算决定是否值得。实现复杂度：显式方案要控制前缀和状态，语义摘要要维护摘要链路，隐式方案只需要观察指标。

示例：先写一个命中率检查函数，跑一周真实流量，再决定要不要动缓存结构。

```typescript
interface Usage {
  prompt_tokens: number;
  prompt_tokens_details?: {
    cached_tokens?: number; // OpenAI：命中的前缀 token 数
  };
  cache_read_input_tokens?: number; // Anthropic：cache 读取
  cache_creation_input_tokens?: number; // Anthropic：cache 写入
}

function hitRate(u: Usage): number {
  const cached =
    u.prompt_tokens_details?.cached_tokens ??
    u.cache_read_input_tokens ??
    0;
  const total = u.prompt_tokens || cached;
  return total > 0 ? cached / total : 0;
}

// 用法：按请求维度记录 avg(hitRate)
// 低于 0.5 说明前缀正在被上下文管理破坏
// 优先检查 system prompt 之后插入了什么可变内容
```

<strong>前缀是缓存唯一的不变量。</strong>所有可变内容都必须发生在固定前缀之后；所有需要变更的历史信息，都要在这个前缀内部找到确定的插入位置，而不是随意附加。四维选型表解决的是往哪个方向做，但无论选哪条路，第一步都是用上面的字段把当前命中率测出来。

---

## 方案A：显式缓存控制 + 固定前缀

选择显式缓存控制的决策依据很简单：你要求缓存命中可观测、可调试，而不是依赖提供商的内部启发式规则。Anthropic 的 `cache_control` 是目前文档最完整的实现，最小可运行代码如下。

示例：

```python

import anthropic

client = anthropic.Anthropic()

SYSTEM_PROMPT = "你是一个后端运维助手，只回答故障排查相关问题。"
FIXED_PREFIX = """指令：严格按以下顺序输出排查步骤：
1. 确认服务状态（systemctl status）
2. 检查最近500行日志中的ERROR关键词
3. 给出修复命令并说明影响
"""

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": SYSTEM_PROMPT + FIXED_PREFIX,
            "cache_control": {"type": "ephemeral"}
        }
    ],
    messages=[{"role": "user", "content": user_input}]
)
```

缓存命中并不意味着请求完全不变，而是前缀字节完全一致。上述代码中，`cache_control` 标记了整个 `system` 数组为可缓存块。设计固定前缀时遵循三条规则：系统提示放最前；工具定义、输出格式约束、少样本示例依次拼接；用户变量永远追加在末尾。前缀在整个服务生命周期内保持字节级不变。

失效边界出现在前缀漂移（prefix drift）时。最常见的场景是：有人把用户昵称、时间戳或会话状态也拼进了前缀，前缀从固定变成半固定。每次请求前缀都不同，`cache_control` 标记的块随之变化，缓存永远创建但永不命中。另一个隐蔽场景是换行符差异：`"指令：\n1."` 与 `"指令：1."` 在模型眼里语义相同，但字节不同，缓存同样全部落空。

应对策略分三层。第一，约束 prompt 模板：所有用户变量只允许出现在 `messages` 数组的最后一个 user 消息里，禁止拼入 system 前缀。第二，如果业务确实需要前插变量（比如用户多轮对话的摘要），把摘要拆成独立的 cache 块，放在 `messages` 中并用 `cache_control` 单独标记，不要改动 system 前缀本身。第三，用响应体的 usage 字段验证实际命中情况。

示例：

```python

cache_read = response.usage.cache_read_input_tokens
cache_creation = response.usage.cache_creation_input_tokens

if cache_read > 0:
    print(f"缓存命中，读取 {cache_read} input tokens")
else:
    print(f"缓存未命中，新建 {cache_creation} input tokens")
```

如果连续多次请求都返回 `cache_read_input_tokens == 0`，说明前缀发生了漂移，去查拼进前缀的所有变量来源。显式缓存的价值就在这一步得到验证：命中与否是硬事实，不需要猜测。

---

## 方案B：隐式缓存 + 滑动窗口

OpenAI 的自动缓存（Automatic Prompt Caching）会对请求前缀做哈希匹配，前缀字节完全一致时返回缓存折扣。这意味着只要 messages 数组的前面若干条保持稳定，后面的用户输入以追加方式进入，就能持续命中。滑动窗口正是把“不变前缀”和“变长输入”拆开的工程手段。

核心思路是：固定窗口大小，截断最旧消息，但永远保留 `system` 消息和最新用户输入。下面是一个可运行的截断函数，它保证 `system` 始终在首位，其余消息按时间倒序保留。

示例：

```python
def trim_messages(messages, max_messages=20):
    """裁剪消息列表，保留system和最近的历史，user消息始终在末尾。"""
    system = [m for m in messages if m["role"] == "system"]
    others = [m for m in messages if m["role"] != "system"]

    # 超出窗口时，从最旧的消息开始丢弃
    if len(system) + len(others) > max_messages:
        keep = max_messages - len(system)  # 给非system消息的配额
        others = others[-keep:]            # 保留最新的keep条

    # 返回时system在前，其余消息保持原顺序，用户输入在尾部
    return system + others
```

调用时，把每轮新用户消息 append 到历史列表，再执行裁剪：

```python
history = [
    {"role": "system", "content": "你是AI助手"},
    {"role": "user", "content": "第一轮问题"},
    {"role": "assistant", "content": "第一轮回答"},
    {"role": "user", "content": "第二轮问题"},
]
history.append({"role": "assistant", "content": "第二轮回答"})
history.append({"role": "user", "content": "第三轮问题"})
trimmed = trim_messages(history, max_messages=4)
# 结果：system + 最近4条非system消息（即第2轮回答 + 第三轮问题）
```

这种策略下，前缀命中率主要取决于 `system` 消息和历史消息是否逐字节一致。只要窗口内最早的消息未被截断，从 `system` 到最新用户输入之间的字节序列都是稳定的，OpenAI 就能命中同一前缀的缓存。

但滑动窗口也带来可计量的误差来源。

1. <strong>信息丢失</strong>：截断最旧消息会移除早期约束或用户偏好。例如第一轮里明确“用中文回答”，多轮后该约束被截断，模型可能切换语言。
2. <strong>缓存无效</strong>：任何字节变化都会打破前缀。如果同一轮里历史消息的 `content` 被修改，或换行符不一致，缓存立即失效，成本回到全价。
3. <strong>窗口长度是权衡</strong>：窗口越大，保留的上下文越多，但缓存键维度越高，单次请求 token 也越多；窗口越小，缓存命中更容易失败。经验值通常取 8–20 条消息，需按业务验证。

因此，滑动窗口适合对话轮次多、但早期上下文权重低的场景。若早期信息是硬约束（如安全规则、身份设定），应改用显式缓存方案（另有章节讨论）或把关键指令固定在 `system` 中不被裁剪。

---

## 方案C：语义摘要 + 缓存键设计

固定前缀在话题漂移后缓存键失效，滑动窗口在每轮对话末尾移动又让前缀整体重算。语义摘要的某负责人把“历史压缩”交给 LLM，用摘要文本本身作为前缀，缓存键只哈希摘要内容。摘要不变化时，即使原始对话已经推进十几轮，前缀和 KV 仍然可以复用。

这个方案的关键控制旋钮是摘要粒度，具体体现在两个参数：

- <strong>摘要窗口</strong>取多少轮对话。窗口越大，摘要携带的信息越完整，但前缀突变概率也越高；窗口 4~6 轮时摘要约 100~200 token，命中率最高。
- <strong>重新摘要频率</strong>每 N 轮触发一次新的 LLM 摘要调用。每轮都重新摘要会击穿缓存；每 8~12 轮重算一次则缓存键平均寿命更长。

示例：摘要前缀生成器。

```python
def build_summary_prefix(history, llm_client, window=6):
    # 1. 截取窗口尾段，窗口越大摘要越详细
    tail = history[-window:]
    text = serialize_messages(tail)
    # 2. LLM 将非结构化对话压缩为系统摘要
    summary = llm_client.summarize(text, max_tokens=200)
    # 3. 前缀由摘要文本模板化，注入每轮请求
    prefix = f"<summary>{summary}</summary>\n"
    # 4. 缓存键只绑定摘要内容，不绑定原始轮次
    cache_key = sha256(summary.encode()).hexdigest()
    # 5. 摘要一成不变即命中，等于跳过历史前缀重算
    return prefix, cache_key
```

调用侧与缓存读写：

```python
def handle(user_msg, session, llm_client, max_window=8):
    prefix, key = build_summary_prefix(
        session.messages, llm_client, window=max_window
    )
    if cached := cache_get(key):        # 命中：KV 可直接延续
        return cached.infer(prefix + user_msg)
    resp = llm_client.complete(prefix + user_msg)
    cache_put(key, prefix, resp)        # 缓存键来自摘要哈希
    return resp
```

命中率与信息完整性的权衡落到一个可观测量上：摘要哈希的稳定性。连续两轮摘要文本的 token 级 Jaccard 相似度高于 0.7 时，命中收益明显；低于 0.3 时说明窗口过大或对话漂移过频，应把窗口下调 2 轮。反过来，若命中率高于 0.8 但下游任务错误率上升，说明摘要丢失了关键信息，应把窗口上调 2 轮。两个方向都建议按生产流量采样来调，不要先验拍板。

该方案适合高变更动态场景，但有两个代价要提前算清：摘要生成的额外 LLM 调用延迟约 200~500 ms，且摘要前缀会占去每次请求的输入 token 预算。若对话均值超过 30 轮且话题高度集中，直接退回方案A固定前缀更划算——省掉摘要延迟，缓存命中率也不会差太多。

---

## 选型决策表：成本、命中与边界

三种方案在各自章节里各有道理，落到账单和命中率上就分化了。决策只看三个变量：API 是否暴露显式缓存控制权、请求方差的分布、上下文长度占窗口的比例。把它们放同一张表里，选型就不再是感觉问题。

| 方案 | 命中率 | API 费用 | 缓存费用 | 延迟 | 复杂度 | 适用场景 |
| --- | --- | --- | --- | --- | --- | --- |
| 方案A 显式缓存 | 高，可观测 | 最低，缓存读取约为基础价 10%–50% | 缓存写入约 25% 溢价，需自管存储 | 低 | 中 | API 暴露缓存控制字段，请求前缀稳定 |
| 方案B 隐式缓存 | 中，由提供方决定 | 中，自动折扣约 50% | 无自管成本 | 中 | 低 | 请求共享前缀但无显式控制 |
| 方案C 语义摘要 | 低–中，键易漂移 | 最高，摘要生成额外消耗 token | 需存摘要向量与原文映射 | 高 | 高 | 上下文超窗，前缀不可复现 |

表中每一项都由三个边界条件决定选择，按顺序过滤：

- <strong>API 是否支持显式缓存</strong>：翻接口文档查两个字段——请求侧是否接受 `cache_control`，响应侧是否返回 `usage.cached_tokens`。前者给你主动控制权，后者只能事后观测。注意边界：Anthropic 要求标记的 prompt 至少 1024 tokens 才写入缓存，低于此值的显式缓存配置全部无效。
- <strong>请求方差大小</strong>：同一会话中，用户输入与系统提示的 token 数相对差。差值占比低于 10% 走方案A；10%–50% 走方案B；超过 50% 时前缀基本漂移，方案A、B 的边际收益趋近于零。
- <strong>上下文长度要求</strong>：输入 token 数逼近窗口上限 60% 时，先启用方案C 做兜底压缩，否则请求可能因超出窗口被拒。

示例：用三个边界条件做选型过滤。

```python
# 选型决策：按三个边界条件逐层过滤
def pick_cache_strategy(api, req_stats, window):
    if api.exposes_cache_key and req_stats.variance < 0.1:
        return "explicit_cache"        # 前缀稳定且可主动控制
    if api.has_automatic_cache and req_stats.variance <= 0.5:
        return "automatic_cache"       # 共享前缀足够长，交给提供方
    if req_stats.input_tokens > window.limit * 0.6:
        return "semantic_summary"      # 超窗兜底，先压缩再进缓存
    return "explicit + automatic"      # 低频场景，两层共存
```

生产环境通常三层组合：方案A 命中固定前缀的账单，方案B 吸收中段波动，方案C 处理超窗尾部。组合的降级顺序需要可复现，直接写成配置：

```json
{
  "cache_layers": [
    {
      "type": "explicit",
      "condition": "prefix_stable && api.cache_control",
      "key": "system_fingerprint",
      "min_tokens": 1024,
      "ttl_seconds": 3600
    },
    {
      "type": "automatic",
      "condition": "shared_prefix_len >= 1024"
    },
    {
      "type": "summary",
      "condition": "input_tokens > 0.6 * window_limit"
    }
  ]
}
```

落地时把三条边界当作验收清单：读文档确认缓存字段、统计一周请求方差、计算最长会话的输入占比。三个数值确定后，表中的行就固定了，组合策略的降级顺序也随之确定。
