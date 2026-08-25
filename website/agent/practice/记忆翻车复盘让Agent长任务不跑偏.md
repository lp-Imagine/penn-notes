---
title: 记忆翻车复盘：让Agent长任务不跑偏
date: 2026-08-12
summary: 围绕「Agent 的记忆与状态管理：长任务不跑偏的工程手段」的一篇干货型稿，读完能带走可执行要点。
tags:
  - AI Agent
  - 记忆
  - 长任务
series: Agent 实践系列
seriesOrder: 1
section: agent
group: practice
source: ai-article
sourceId: cmspws3nm0005zzez3yduit0a
cover: /sync/cmspws3nm0005zzez3yduit0a/cover.jpg
draft: false
---
# 记忆翻车复盘：让Agent长任务不跑偏

<p class="article-meta"><time datetime="2026-08-12">2026-08-12</time></p>

<img class="article-cover" src="/sync/cmspws3nm0005zzez3yduit0a/cover.jpg" alt="「记忆翻车复盘：让Agent长任务不跑偏」封面" />

## 一个自动规划旅行 Agent 是怎么把行程搞砸的

用户输入：`“计划5天东京旅行，人均预算8000元，想去浅草寺、秋叶原、迪士尼，帮我订门票和酒店。”` Agent 开始分解任务：先搜景点信息，再逐个预订，最后确认总花费。一切看似正常，直到我们翻看执行日志。

```css
[10:02] tool_call: search_attraction("浅草寺")
[10:02] result: { name: "浅草寺", ticket: 0, hours: "6:00-17:00" }
[10:03] tool_call: book_ticket("浅草寺", date="2025-05-20", quantity=1)
[10:03] result: booking_id=TK001, status=confirmed

[10:15] tool_call: search_attraction("浅草寺")  ← 重复查询
[10:15] result: { name: "浅草寺", ticket: 0, hours: "6:00-17:00" }
[10:16] tool_call: book_ticket("浅草寺", date="2025-05-20", quantity=1)
[10:16] result: booking_id=TK002, status=confirmed

[10:28] tool_call: search_attraction("浅草寺")  ← 又一次重复
[10:28] result: { name: "浅草寺", ticket: 0, hours: "6:00-17:00" }
[10:29] tool_call: book_ticket("浅草寺", date="2025-05-20", quantity=1)
[10:29] result: booking_id=TK003, status=confirmed
```

同一个免费寺庙，Agent 下了三张门票订单。问题出在“短期记忆”丢失：由于前三轮对话后窗口被新信息挤出，Agent 忘记了已完成预订，再次触发同一流程。

更糟的还在后面。预订酒店时，Agent 曾算出可用预算约 2000 元/晚，但它在调用 `search_hotel` 后，状态中的预算字段被后续工具返回覆盖，于是它欣然预订了一间 4500 元/晚的酒店——完全没有对照初始预算约束。最终结算时，人均费用飙到 12000 元。

```css
[10:35] state: { budget_per_night: 2000 }
[10:36] tool_return: { hotel_name: "Tokyo Luxury Inn", price: 4500, ... }
[10:36] state: { budget_per_night: null }  ← 预算被意外擦除
[10:37] tool_call: book_hotel("Tokyo Luxury Inn", ... )
[10:37] result: booking_id=HTL019, total=4500*4 night=18000
```

这一串错误源于两个典型的“失忆”：一是对话历史滚动导致已完成操作被遗忘，触发重复执行；二是工具执行返回数据无保护地写入状态，覆盖关键约束，使 Agent 后续推理直接跑偏。长任务中，这类问题一旦累积，整个计划便不可逆转地崩坏。

---

## 跑偏的根因：三类记忆缺位与状态游离

长任务翻车根因不在推理，在记忆工程缺席。问题可归为工作记忆（上下文）、短期记忆（近期交互）、长期记忆（用户画像）缺失，以及任务状态无持久化钩子。下表列出典型场景的代码层根因。

| 场景 | 期望行为 | 实际行为 | 缺失的记忆/状态 | 代码层根因 |
| --- | --- | --- | --- | --- |
| 对话中途用户纠正偏好 | 立即调整后续规划 | 坚持原计划，无视纠正 | 工作记忆未实时更新 | 未将纠正写回上下文窗口或覆盖 system prompt |
| 多轮对话引用前几步结果 | 记住已查过的航班、酒店 | 重复查询，遗忘已确认信息 | 短期记忆丢失 | 无 summary 缓存或向量检索；历史截断后无法回溯 |
| 跨会话再次提出类似需求 | 利用历史偏好加速规划 | 从零开始，像新用户 | 长期记忆未持久化 | 无用户画像存储，会话启动未加载历史偏好 |
| 长时间任务因网络中断失败 | 从最近的检查点恢复 | 从头重试或丢失全部进度 | 任务状态缺少持久化钩子 | 无 checkpoint 机制；状态仅存内存，未序列化到磁盘或 DB |
| 多步工具调用，步骤间需上下文 | 每步更新状态，下一步参考 | 步骤间失忆，输出矛盾 | 状态机未在每步后更新工作记忆 | 工具结果未写回上下文，仅返回用户，后续步骤丢失线索 |

对应工程落脚点：

1. <strong>工作记忆</strong>：用户纠正出现时，立即拼接到下一轮 system prompt 或写入上下文窗口顶层。
2. <strong>短期记忆</strong>：每轮对话结束触发摘要生成，存入向量库；历史超过窗口时用检索补全。
3. <strong>长期记忆</strong>：会话启动从用户画像库加载偏好，注入首条 system 消息。
4. <strong>任务检查点</strong>：TaskRunner 循环的关键步骤后调用 `await saveCheckpoint(taskId, state)`，异常恢复从最近快照重试。

---

## 记忆的工程化落地：从 ChatBuffer 到向量库的选择

三种记忆的工程落脚点不同，这里直接给接口约定和存储方案，不扯概念。

### 工作记忆：滑动窗口 + 结构化 TaskState

用固定大小的消息窗口（如最近 20 轮）保证上下文不爆炸，同时维护一个 TaskState 对象跟踪当前任务进度。接口定义：

```python
interface TaskState {
  currentStep: string;       // 当前步骤标识
  stepIndex: number;         // 步骤序号
  pendingActions: string[];  // 待执行动作
  lastOutput: any;           // 上一步输出
  artifacts: Record<string, any>; // 中间产物
}

class WorkingMemory {
  private buffer: Message[] = [];
  private maxSize = 20;
  taskState: TaskState;

  push(msg: Message) { ... }        // 超出则 shift
  getContext(): (Message | TaskState)[] {
    return [...this.buffer, { role: 'system', content: JSON.stringify(this.taskState) }];
  }
}
```

TaskState 每次步进更新，注入给 LLM，保证长任务不迷失当前进度。

### 短期记忆：摘要 + 关键词检索

历史对话压缩成摘要，按关键词索引。Redis 适合热数据快速存取，SQLite 适合持久化与全文检索。取舍代码：

```javascript
// Redis 存储最近 N 条摘要（Hash）
await redis.hset('agent:short_term', summaryId, JSON.stringify({
  summary: '用户偏好经济型酒店，已确认东京3晚',
  keywords: ['酒店','偏好','东京'],
  timestamp: Date.now()
}));
// SQLite 做全文检索（FTS5）
db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS short_term_fts USING fts5(summary, keywords)`);
db.run(`INSERT INTO short_term_fts VALUES (?, ?)`, [summary, keywords.join(' ')]);
// 检索时用 match 或 like
```

选择依据：如果 Agent 频繁重启且需要毫秒级读取用 Redis；如果需要模糊搜索历史摘要用 SQLite FTS。两者可并存，Redis 作缓存，SQLite 作持久层。

### 长期记忆：向量库

跨会话的实体、知识、用户画像存入向量库，按语义相似度检索。写入与查询伪代码：

```typescript
// 写入
async function storeLongTerm(content: string, metadata: any) {
  const embedding = await embedder.embed(content);
  await vectorDb.insert({
    id: uuid(),
    vector: embedding,
    metadata: { ...metadata, content }
  });
}

// 查询
async function recall(query: string, topK = 5) {
  const qVec = await embedder.embed(query);
  return vectorDb.search(qVec, topK);
}
```

<strong>何时该用：</strong>需要跨会话记忆（用户偏好、历史决策）、知识库很大且要求语义匹配。
<strong>何时不必用：</strong>单次任务上下文、数据量几百条以内且精确关键词匹配够用。此时用倒排索引或 SQLite 即可，不必引入向量库的运维成本。

三者的组合：工作记忆解决“当下做什么”，短期记忆解决“刚才聊过什么”，长期记忆解决“以前知道什么”。按需裁剪，不要一上来就上向量库。

---

## 状态防跑偏：检查点、事件溯源与恢复演示范例

以旅行规划任务为例，我们将 Agent 的每一步决策都建模为不可变事件。所有事件顺序追加到日志中，当前状态由事件投影计算。崩溃后只需从最后一个快照之后的事件重放，即可恢复到中断前的精确状态。

```javascript
// 1. 定义事件类型
type TaskEvent = 
  | { type: 'plan_created'; planId: string; itinerary: string[] }
  | { type: 'user_feedback'; planId: string; constraint: string }
  | { type: 'hotel_selected'; hotelId: string; checkIn: Date }
  | { type: 'flight_booked'; bookingRef: string; flight: string }
  | { type: 'task_completed'; summary: string }
  | { type: 'error_occurred'; message: string; retryable: boolean };

// 2. 状态投影
interface TaskState {
  planId: string | null;
  itinerary: string[];
  constraints: string[];
  hotelId: string | null;
  bookingRef: string | null;
  completed: boolean;
  lastError: string | null;
  version: number; // 事件计数
}

const initialState: TaskState = {
  planId: null, itinerary: [], constraints: [],
  hotelId: null, bookingRef: null, completed: false,
  lastError: null, version: 0
};

function apply(state: TaskState, event: TaskEvent): TaskState {
  switch (event.type) {
    case 'plan_created':
      return { ...state, planId: event.planId, itinerary: event.itinerary, version: state.version + 1 };
    case 'user_feedback':
      return { ...state, constraints: [...state.constraints, event.constraint], version: state.version + 1 };
    case 'hotel_selected':
      return { ...state, hotelId: event.hotelId, version: state.version + 1 };
    case 'flight_booked':
      return { ...state, bookingRef: event.bookingRef, version: state.version + 1 };
    case 'task_completed':
      return { ...state, completed: true, version: state.version + 1 };
    case 'error_occurred':
      return { ...state, lastError: event.message, version: state.version + 1 };
    default:
      return state;
  }
}

```

<strong>持久化事件流</strong>：每个事件写入文件或数据库时，携带递增的版本号。`EventStore` 接口只需提供 `append(event)` 和 `read(fromVersion)` 方法。生产环境可选用 SQLite/SQL + 事务保证原子追加。

```typescript
// 3. 从崩溃恢复的典型流程
async function recoverTask(taskId: string, eventStore: EventStore): Promise<TaskState> {
  const snapshot = await loadSnapshot(taskId); // 定期保存的快照
  let state = snapshot ? snapshot.state : initialState;
  const nextVersion = snapshot ? snapshot.version + 1 : 1;
  
  const newEvents = await eventStore.read(taskId, nextVersion);
  for (const event of newEvents) {
    state = apply(state, event);
  }
  return state;
}

// 启动时：
const state = await recoverTask(taskId, eventStore);
if (!state.completed && !state.lastError) {
  // 从中断处继续，例如上次还没选酒店，则继续调用 LLM 选酒店
  continueFrom(state);
}

```

<strong>崩溃恢复时序</strong>：假设 Agent 已完成计划创建、收到用户反馈，正在选择酒店时进程崩溃。重启后：

1. 读取快照（若每 N 个事件保存一次，当前未触发保存）
2. 从事件存储中拉取版本号大于快照的所有事件，重放得到状态：`plan_created` → `user_feedback` → `hotel_selected`（可能已落盘或未落盘）。若 `hotel_selected` 不存在，状态中 `hotelId` 为 null，恢复逻辑将重新选择酒店。
3. 检查 `lastError`，如果为可重试错误，则根据重试策略处理。
4. 最终从 `hotelId` 判空继续后续步骤。

该骨架保证即使多次崩溃，只要事件日志完整，状态永远可精确重建。读者可将 `TaskEvent` 替换为自己的领域事件，并将 `apply` 迁移到纯函数中，无需锁或复杂的并发控制。

---

## 当上下文窗口爆炸：记忆压缩与选择性遗忘的代码路径

长对话或大文档分析时，Agent 的上下文会迅速膨胀，超过模型的 token 限制。工程上两种手段最常见：<strong>滑动截断</strong>和<strong>记忆压缩</strong>。下面给出可落地的代码路径与取舍。

### 1. 基于 Token 计数的滑动截断

核心逻辑：保留最近 N 条消息，确保总 token 数不超阈值。用 `tiktoken` 精确计数，或按字符数 / 4 估算（中文约 1.5 字符 / token）。

```typescript
import { encoding_for_model } from "tiktoken";

interface Message { role: string; content: string; }

function trimMessages(messages: Message[], maxTokens: number): Message[] {
  const enc = encoding_for_model("gpt-4");
  let total = 0;
  const kept: Message[] = [];
  // 从最新消息倒序累加
  for (let i = messages.length - 1; i >= 0; i--) {
    const tokens = enc.encode(messages[i].content).length;
    if (total + tokens > maxTokens) break;
    total += tokens;
    kept.unshift(messages[i]);
  }
  enc.free();
  return kept;
}
```

调用前用 `trimMessages(history, 6000)` 裁剪。优势是零额外延迟，缺点：超出窗口的早期关键指令会被丢弃。适合任务步骤原子化、无需回溯全程的场景。

### 2. 基于 LLM 摘要的记忆压缩

在接近窗口上限前，用模型自己生成历史摘要，替换掉原始消息。模板要强制保留事实与决策。

```typescript
const summaryPrompt = `你是一个对话压缩助手。请将以下对话历史压缩成一段简洁的摘要，保留所有关键事实、用户偏好、已完成的步骤和待办事项。摘要用中文，长度控制在 200 字以内。

对话历史：
{history}

摘要：`;

async function compressHistory(messages: Message[], model: string): Promise<Message[]> {
  const text = messages.map(m => `${m.role}: ${m.content}`).join("\n");
  const response = await llm.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "你是一个专业的摘要助手。" },
      { role: "user", content: summaryPrompt.replace("{history}", text) }
    ],
    temperature: 0.1, // 低随机性保证稳定
  });
  const summary = response.choices[0].message.content;
  // 返回一条系统消息包含摘要，后面跟上最近 2-3 轮交互避免断层
  return [
    { role: "system", content: `对话历史摘要：${summary}` },
    ...messages.slice(-4) // 保留最近两轮交互
  ];
}
```

调用时机：每次新增消息后检查总 token 数，若超过阈值（如窗口的 70%），触发压缩。

### 延迟与信息损失对比

| 指标 | 滑动截断 | 记忆压缩 |
| --- | --- | --- |
| 额外延迟（P50） | ~5ms（纯本地计算） | ~1200ms（模型生成摘要） |
| 额外延迟（P90） | ~10ms | ~2000ms |
| 信息损失 | 丢失早期上下文，可能忘记原始目标 | 极少，但摘要可能遗漏细节或产生幻觉 |
| 适用场景 | 流水线任务，每步独立性强 | 多步推理，需保持全局一致性 |

滑动截断几乎无感，但长任务中 Agent 容易“忘本”；压缩虽然引入延迟，却能保留任务主线。实际工程中，可以混合使用：先滑动保留近期窗口，再定期对更早的历史做压缩，存入外部记忆。

---

## 组装起来：一个记忆完备 Agent 的骨架与防跑偏清单

将前文的记忆读写、状态快照、选择性遗忘集成到统一的 Agent 循环中，核心是一个 `MemoryManager` 接口，封装记忆的存取、压缩与恢复。每次步骤执行前后，通过 `checkpoint` 固化进度，确保中断可续。

```typescript
interface MemoryManager {
  // 添加一条记忆（文本或结构化摘要）
  add(memory: MemoryChunk): Promise<void>;
  // 按关联度检索记忆列表
  query(context: string, topK?: number): Promise<MemoryChunk[]>;
  // 压缩旧记忆，返回压缩后的摘要
  compress(opts: { maxTokens: number }): Promise<string>;
  // 保存全量的任务状态快照（含当前步骤索引、关键变量）
  saveCheckpoint(taskId: string, snapshot: TaskSnapshot): Promise<void>;
  // 加载最近一次快照
  loadCheckpoint(taskId: string): Promise<TaskSnapshot | null>;
  // 按任务 ID 删除所有相关记忆（任务完成或重置时）
  clearTask(taskId: string): Promise<void>;
}

class LongRunningAgent {
  private memMgr: MemoryManager;
  private maxHistoryRounds: number = 20;
  private lastStepIndex: number = 0;
  constructor(memMgr: MemoryManager) { this.memMgr = memMgr; }

  async executeTask(taskId: string, steps: Step[]): Promise<void> {
    // 尝试从检查点恢复
    const snapshot = await this.memMgr.loadCheckpoint(taskId);
    if (snapshot) {
      this.lastStepIndex = snapshot.stepIndex;
      // 可注入早前的上下文摘要
      console.log(`恢复任务 ${taskId} 从步骤 ${this.lastStepIndex + 1}`);
    }

    for (let i = this.lastStepIndex; i < steps.length; i++) {
      const step = steps[i];
      // 执行前：检索相关记忆
      const relevant = await this.memMgr.query(step.prompt, 5);
      const augmentedPrompt = relevant.map(m => m.content).join('\n') + '\n---\n' + step.prompt;
      const result = await this.executeLLM(augmentedPrompt);

      // 将本步骤的输入输出写入记忆
      await this.memMgr.add({ type: 'step', content: `步骤${i}: ${result}` });

      // 定期压缩与截断
      if (i % 5 === 0) {
        const compressed = await this.memMgr.compress({ maxTokens: 2000 });
        // 用压缩摘要替换全部记忆过于激进，实践中仅标记旧记录为低权重
      }

      // 每个步骤后创建检查点
      await this.memMgr.saveCheckpoint(taskId, {
        taskId,
        stepIndex: i + 1,
        lastOutput: result,
        timestamp: Date.now()
      });

      // 防止上下文溢出：限制记忆总轮次（简易实现）
      if (i > this.maxHistoryRounds) {
        // 移除最早的非关键记忆（伪代码）
        // await this.memMgr.pruneOldest();
      }
    }

    await this.memMgr.clearTask(taskId);
  }
  private async executeLLM(prompt: string): Promise<string> { /* 调用大模型 */ return ''; }
}
```

骨架中，每个步骤都强制做三件事：检索记忆扩写 prompt、保存步骤记忆、落检查点。即使外部中断，重新启动也能加载最近快照，从断点继续。

接下来是 <strong>长任务不跑偏检查清单</strong>，每一项都可核对：

1. <strong>是否在每个 yield / 步骤产出前持久化了 taskState？</strong> 检查代码里是否在生成结果后立即调用 `saveCheckpoint`。
2. <strong>是否设置了最大记忆轮次或上下文窗口上限？</strong> 避免无限累积导致 Token 超限。
3. <strong>检索记忆时是否引入了步骤相关性过滤？</strong> 防止无关历史干扰当前判断。
4. <strong>记忆压缩是否保留关键实体与约束条件？</strong> 用单元测试验证摘要里仍包含目标、截止时间等。
5. <strong>检查点中是否包含恢复所需的全部变量？</strong> 最少应有步骤索引、已完成的中间产物、待处理队列。
6. <strong>是否针对记忆读写添加了重试与超时保护？</strong> 数据库抖动不应直接导致 Agent 崩溃。
7. <strong>是否区分了“短期会话记忆”与“长期经验记忆”？</strong> 前者随任务结束清除，后者跨任务复用。
8. <strong>是否有措施防止同一错误在循环中反复写入记忆？</strong> 可在加入前做去重或标记。
9. <strong>检查点保存是否为原子操作？</strong> 避免写一半失败导致状态不一致。
10. <strong>长任务结束时是否主动清理临时记忆资源？</strong> 防止内存泄漏或数据库膨胀。

以上清单可作为 Code Review 或自测时的硬性门槛，逐项确认后，Agent 长任务跑偏的概率会大幅下降。
