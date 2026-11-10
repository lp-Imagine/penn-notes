# AI 动态

Penn Notes 的「AI 动态」栏目：每天早上自动抓取公开 RSS + 联网检索，经大模型摘要后生成静态日报，再部署到 GitHub Pages。

## 读者侧

打开 [AI 动态](../website/news/) 或首页「最新动态」。页面是静态 HTML，**不需要**站点实时联网。

## 生成流水线

1. `scripts/fetch-rss.mjs` — 拉 [`scripts/news/sources.json`](../scripts/news/sources.json) 中的 RSS / GitHub Trending / Hacker News（Algolia API）/ 掘金（官方 API），按北京时间过滤目标日；排序后先做**每源配额**再全局截断，防止单源淹没
2. `scripts/search-news.mjs` — Google News 对 AI 关键词**联网检索**，逐条回源核验（抓不到 / 非文章页丢弃），补充国外一手新闻
3. `scripts/summarize-news.mjs` — DeepSeek（或其它 OpenAI 兼容 API）去重 / 分类 / 中文摘要；产出「今日导读」3 句 + 头条加长摘要 + 普通条目
4. 写入 `news/YYYY-MM/ai-news-YYYY-MM-DD.md`（文首导读，头条标题带「头条 ·」前缀）
5. `scripts/resolve-news-images.mjs` — 从原文抓 `og:image`，上传腾讯云 COS，正文写 `https://img.penn-notes.draftly.cn/news/…`
6. 提交 **`news/` 源稿**（配图在 COS，不再进 git）
7. 同一次流水线跑 `sync:friends`，构建时再写入友链动态页（生成物不进 git）
8. **每日都会**构建并部署 GitHub Pages / 宝塔（即使日报已存在被 skip，也会刷新友链动态）

> 注意：Actions 用 `GITHUB_TOKEN` 推送 **不会** 再触发另一个 workflow。因此 `daily-news.yml` 在生成后会**自行 build 并部署到 gh-pages**，不依赖 CI。
>
> [友链动态](../website/friends/) 与 AI 动态共用同一条 Daily 流水线与宝塔 07:00 触发；只汇总近半年更新。

## 定时策略

| 优先级 | 触发方式 | 时间（北京时间） | 说明 |
|--------|----------|------------------|------|
| **主** | **宝塔计划任务** → 触发 + 本机部署 | **07:00** | 见下节（推荐；主站由此更新） |
| 备 1 | GitHub `schedule` | 07:00 | `cron: 0 23 * * *`（UTC），可能漏跑；只跑 generate/Pages，不部署主站 |
| 备 2 | GitHub `schedule` | 08:30 | `cron: 30 0 * * *`（UTC），07:00 漏跑时补救；同上 |

日报默认汇总 **昨天**（上海时区）。若 digest 已存在，`generate-daily-news.mjs` 会 skip，因此多层触发不会重复 commit。

触发后的职责拆分：

- **GitHub Actions `generate`**：抓取 / 摘要 / 提交 `news/`，并部署 **GitHub Pages** 备份站（`gh-pages`）
- **宝塔同一条 07:00 cron**：等 `generate` 成功后**本机** `pull → build → rsync` 更新主站（`penn-notes.draftly.cn`）

主站**不再**依赖 self-hosted `deploy-baota` 接单（Idle 却 Waiting 时仍能更新）。

> GitHub 内置 `schedule` 可能漏跑；请配置宝塔计划任务作为主触发。

## 外部定时触发（主方案 · 宝塔计划任务）

与 Draftly「博客同步」可共用同一个 GitHub PAT（需 **repo** + **workflow** 权限）。

### 1. 在宝塔 SSH 一次性安装（或更新脚本）

```bash
mkdir -p /root/.config/penn-notes /root/scripts /var/log

# 写入 PAT（与 ai-article 设置里博客同步 Token 相同即可；需 repo + workflow）
echo 'ghp_你的PAT' > /root/.config/penn-notes/github_token
chmod 600 /root/.config/penn-notes/github_token

# 触发 + 等 generate + 本机部署（同一条脚本）
curl -fsSL -o /root/scripts/penn-notes-cron-daily-news.sh \
  https://raw.githubusercontent.com/lp-Imagine/penn-notes/master/scripts/baota-cron-daily-news.sh
curl -fsSL -o /root/scripts/penn-notes-local-pull-deploy.sh \
  https://raw.githubusercontent.com/lp-Imagine/penn-notes/master/scripts/baota-local-pull-deploy.sh
chmod +x /root/scripts/penn-notes-cron-daily-news.sh \
  /root/scripts/penn-notes-local-pull-deploy.sh

# 立刻补部署主站（不等明天 cron / 不依赖 runner）
/bin/bash /root/scripts/penn-notes-local-pull-deploy.sh
tail -n 20 /var/log/penn-notes-local-deploy.log

# 试跑完整链路（会触发 Actions，并在 generate 成功后本机部署）
/bin/bash /root/scripts/penn-notes-cron-daily-news.sh
tail -n 20 /var/log/penn-notes-daily-news-cron.log
```

可选环境变量：`DEPLOY_PATH`（默认 `/www/wwwroot/penn-notes`）、`PENN_NOTES_BUILD_DIR`（默认 `/opt/penn-notes-build`）、`SKIP_LOCAL_DEPLOY=true`（只触发不部署）。

### 2. 宝塔面板添加计划任务

| 项 | 值 |
|----|-----|
| 任务类型 | **Shell 脚本** |
| 任务名称 | penn-notes AI 动态日报 |
| 执行周期 | 每天 **07:00** |
| 脚本内容 | `/bin/bash /root/scripts/penn-notes-cron-daily-news.sh` |

只需这一条；**不必**再加 07:25 本机部署任务。保存后可在计划任务里点 **执行** 测一次。

### 3. 补跑 / 强制覆盖

SSH 到宝塔：

```bash
# 补跑指定日期（含本机部署）
NEWS_DATE=2026-08-26 /bin/bash /root/scripts/penn-notes-cron-daily-news.sh

# 覆盖已有 digest
NEWS_DATE=2026-08-26 FORCE=true /bin/bash /root/scripts/penn-notes-cron-daily-news.sh
```

日志：`/var/log/penn-notes-daily-news-cron.log`（触发与等待）、`/var/log/penn-notes-local-deploy.log`（本机构建部署）。

> CI（push / blog-sync）仍保留 `deploy-baota` 作快速路径；若 runner Idle 不接单，`cancel-stale-baota` 约 20 分钟后 Cancel。日报主站以本机 cron 为准。

### 备选：cron-job.org / 本地脚本

无宝塔时可用 [cron-job.org](https://cron-job.org) 每天 07:00 POST 同一 API，或本地：

```bash
export GITHUB_TOKEN=ghp_xxx
bash scripts/trigger-daily-news.sh
bash scripts/trigger-daily-news.sh --date=2026-08-26
```

### 可选：`repository_dispatch`

```bash
curl -sS -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <你的PAT>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/lp-Imagine/penn-notes/dispatches \
  -d '{"event_type":"daily-news"}'
```

## Secrets

仓库 Settings → Secrets and variables → Actions：

| Secret | 必填 | 说明 |
|--------|------|------|
| `LLM_API_KEY` | 是 | DeepSeek / OpenAI 等 API Key |
| `LLM_BASE_URL` | 否 | 默认 `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 否 | 默认 `deepseek-chat` |
| `BAIDU_PUSH_TOKEN` | 否 | 百度站长「API 提交」token；配置后日报/CI 部署会自动推送 URL |
| `COS_SECRET_ID` / `COS_SECRET_KEY` | 是* | 腾讯云 COS 上传密钥（配图） |
| `COS_BUCKET` / `COS_REGION` | 是* | 如 `penn-notes-img-1300329311` / `ap-guangzhou` |
| `COS_CDN_BASE` | 是* | `https://img.penn-notes.draftly.cn`（无尾斜杠） |

\* 无 COS Secrets 时日报仍可生成，但**不会插图**。

本地补配图需在仓库根目录 `.env` 写入同上变量（已 gitignore），再 `npm run news:images`。

## 本地命令

```bash
# 生成昨天的日报（需 LLM_API_KEY）
export LLM_API_KEY=sk-xxx
npm run news:daily

# 指定日期 / 覆盖已有
node scripts/generate-daily-news.mjs --date=2026-07-26 --force

# 仅补配图
npm run news:images

# 同步到 website 并预览
npm run sync:news && npm run build:home && npm run dev
```

## RSS 订阅

AI 动态提供 RSS，地址：

`https://penn-notes.draftly.cn/news/feed.xml`

本地 / CI 构建时由 `npm run sync:news` 生成 `website/public/news/feed.xml`（生成物不进 git，线上在 Pages 构建产物中）。可用 Feedly、Follow 等阅读器订阅。

## 质量监控

每次日报生成后写入 `news/.state/last-run.json`（条目数、栏目分布、RSS 成功/失败）。源健康见 `news/.state/feed-health.json`。

## 栏目

参考主流科技/AI 资讯的常见切法，并保留本站特色：

| 栏目 | 对应主流常见栏 | 收什么 |
|------|----------------|--------|
| 业界 | Industry / Business | 融资、并购、裁员、监管、市场 |
| 产品 | Products / Apps | 应用与产品发布、功能、定价 |
| 模型 | Models / Research | 新模型、API、评测与能力变化 |
| 开源 | Open Source | 仓库、协议、社区项目 |
| 开发者工具 | DevTools（本站加重） | 编码助手、IDE、Agent、MCP |
| 前端 | Web / Frontend（本站特色） | 框架、构建、样式、浏览器/Web 平台、前端周刊与技术博客（不必是 AI 站） |

提示词要求：**有价值的业界/产品/模型新闻都要收**，不再因为「不够前端」而丢掉。

精选上限（`summarize-news.mjs`）：**每栏最多 5 条、全文最多 20 条**。文首 **今日导读** 3 句总览；全文有且仅有 1 条 **头条**（标题前缀「头条 ·」，摘要 120–220 字，融资额/参数量等数字须保留）。普通条仍为 70–160 字中文摘要，结尾「对读者：」。需配置 `LLM_API_KEY`。

改源：`scripts/news/sources.json`。候选控制：`maxCandidates`（全局上限，默认 96）、`maxItemsPerSource`（每源配额，默认 6）；`search` 块配置 Google News 检索的关键词、每查询条数与总量（含 Agent / MCP / 推理模型 / 大模型融资等）；`"type": "hn-algolia"` 的源走 Hacker News API（hnrss.org 不稳定）；`"type": "juejin"` + `"category"`（如 `frontend` / `ai`）走掘金公开 API。另抓 GitHub Trending。机器之心、雷锋网等中文源优先官方 RSS，失败则回落 Google News `site:` 检索；另有 HN MCP / AI Agent 与 LangChain Blog 等开发者向源。

部分厂商博客无官方 RSS（如 Meta AI、Cursor、Ollama、xAI），使用 [Olshansk/rss-feeds](https://github.com/Olshansk/rss-feeds) 维护的镜像 feed。博客园用官方 `feed.cnblogs.com`。

## 排查

- **今天没更新 / schedule 没跑**：配置 [宝塔计划任务](#外部定时触发主方案--宝塔计划任务)；或 Actions → Daily AI News → Run workflow / `bash scripts/trigger-daily-news.sh` 补跑
- **页面没更新**：多半是日报已 commit，但旧版 workflow 用 `GITHUB_TOKEN` 推送不会触发 CI。现在 daily-news 会自行部署；也可手动跑 CI → Run workflow
- **RSS 失败**：日志里会列出失败源，详情见 `news/.state/feed-health.json`。偶发 429/500 属源站限流或故障；`feed-health-summary` 在 prebuild 末尾以 `--soft` 打印告警（不阻断部署）。本地硬校验可用 `npm run feed-health -- --warn-threshold 5`。读者也可看站内 [/news/sources/](https://penn-notes.draftly.cn/news/sources/)；本周合集见 [/news/week/](https://penn-notes.draftly.cn/news/week/)。分栏目 RSS：`/news/feed-frontend.xml` 等。
- **质量差 / 英文标题**：多半没配 `LLM_API_KEY`，或用了 `--allow-heuristic`
- **LLM 限流**：workflow 失败不会空 commit，可用 Actions → Daily AI News → Run workflow 重跑
- **已有日期跳过**：默认不覆盖；加 `--force`
- **配图缺失**：部分站点无 og 图或拦截抓取，属正常；可事后 `npm run news:images`
- **源偏少 / 覆盖不够**：改 `scripts/news/sources.json` 加 RSS；或调大 `search.maxItems` / 增补 `search.queries`
- **检索失败**：`search-news` 需要能访问 Google 的网络（GitHub Actions 正常；本地大陆网络会跳过，仅影响国外补充，不影响 RSS 日报）
