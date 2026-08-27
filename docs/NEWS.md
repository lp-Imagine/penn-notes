# AI 动态

Penn Notes 的「AI 动态」栏目：每天早上自动抓取公开 RSS + 联网检索，经大模型摘要后生成静态日报，再部署到 GitHub Pages。

## 读者侧

打开 [AI 动态](../website/news/) 或首页「最新动态」。页面是静态 HTML，**不需要**站点实时联网。

## 生成流水线

1. `scripts/fetch-rss.mjs` — 拉 [`scripts/news/sources.json`](../scripts/news/sources.json) 中的 RSS / GitHub Trending / Hacker News（Algolia API），按北京时间过滤目标日；排序后先做**每源配额**再全局截断，防止单源淹没
2. `scripts/search-news.mjs` — Google News 对 AI 关键词**联网检索**，逐条回源核验（抓不到 / 非文章页丢弃），补充国外一手新闻
3. `scripts/summarize-news.mjs` — DeepSeek（或其它 OpenAI 兼容 API）去重 / 分类 / 中文摘要
4. 写入 `news/YYYY-MM/ai-news-YYYY-MM-DD.md`
5. `scripts/resolve-news-images.mjs` — 从原文抓 `og:image`，上传腾讯云 COS，正文写 `https://img.penn-notes.draftly.cn/news/…`
6. 提交 **`news/` 源稿**（配图在 COS，不再进 git）
7. 构建部署时 `sync:news` + `build:home` 等重生生成物，再发布到 GitHub Pages / 宝塔

> 注意：Actions 用 `GITHUB_TOKEN` 推送 **不会** 再触发另一个 workflow。因此 `daily-news.yml` 在生成后会**自行 build 并部署到 gh-pages**，不依赖 CI。

## 定时策略（推荐）

| 优先级 | 触发方式 | 时间（北京时间） | 说明 |
|--------|----------|------------------|------|
| **主** | 外部 cron → `workflow_dispatch` | **07:00** | 最准时，见下节 cron-job.org |
| 备 1 | GitHub `schedule` | 07:00 | `cron: 0 23 * * *`（UTC），可能漏跑 |
| 备 2 | GitHub `schedule` | 08:30 | `cron: 30 0 * * *`（UTC），07:00 漏跑时补救 |

日报默认汇总 **昨天**（上海时区）。若 digest 已存在，`generate-daily-news.mjs` 会 skip，因此多层触发不会重复 commit。

> GitHub 内置 `schedule` **可能延迟或整天漏跑**（与仓库 push 无关）。务必配置外部 cron 作为主触发。

## 外部定时触发（主方案 · cron-job.org）

1. 创建 GitHub Personal Access Token（Fine-grained 需 **Actions: Read and write** + **Contents: Read**；Classic 勾选 `repo`）
2. 登录 [cron-job.org](https://cron-job.org) → **Create cronjob**
3. 填写：

| 字段 | 值 |
|------|-----|
| Title | penn-notes daily AI news |
| URL | `https://api.github.com/repos/lp-Imagine/penn-notes/actions/workflows/daily-news.yml/dispatches` |
| Schedule | 每天 **07:00**，时区 **Asia/Shanghai** |
| Request method | **POST** |
| Headers | `Accept: application/vnd.github+json` |
| Headers | `Authorization: Bearer <你的PAT>` |
| Headers | `X-GitHub-Api-Version: 2022-11-28` |
| Body (JSON) | `{"ref":"master"}` |

4. 保存后可用 **Run now** 测一次；GitHub Actions 里应出现 `workflow_dispatch` 运行记录

也可在本地 / 服务器 crontab 调用仓库脚本：

```bash
export GITHUB_TOKEN=ghp_xxx
bash scripts/trigger-daily-news.sh
# 补跑指定日期
bash scripts/trigger-daily-news.sh --date=2026-08-26
```

### 方式 B：`repository_dispatch`（可选）

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
| 前端 | Web / Frontend（本站特色） | 框架、构建、样式、DX |

提示词要求：**有价值的业界/产品/模型新闻都要收**，不再因为「不够前端」而丢掉。

每条为中文标题 + 编辑向段落，结尾「对读者：」。需配置 `LLM_API_KEY`。

改源：`scripts/news/sources.json`。候选控制：`maxCandidates`（全局上限，默认 64）、`maxItemsPerSource`（每源配额，默认 6）；`search` 块配置 Google News 检索的关键词、每查询条数与总量；`"type": "hn-algolia"` 的源走 Hacker News API（hnrss.org 不稳定）。另抓 GitHub Trending。

## 排查

- **今天没更新 / schedule 没跑**：GitHub 内置 cron 可能漏跑，与 blog-sync 等 push 无关。到 Actions → Daily AI News 看是否有今日 run；没有则 `bash scripts/trigger-daily-news.sh` 补跑，并配置 [cron-job.org](#外部定时触发主方案--cron-joborg)
- **页面没更新**：多半是日报已 commit，但旧版 workflow 用 `GITHUB_TOKEN` 推送不会触发 CI。现在 daily-news 会自行部署；也可手动跑 CI → Run workflow
- **RSS 失败**：日志里会列出失败源，详情见 `news/.state/feed-health.json`
- **质量差 / 英文标题**：多半没配 `LLM_API_KEY`，或用了 `--allow-heuristic`
- **LLM 限流**：workflow 失败不会空 commit，可用 Actions → Daily AI News → Run workflow 重跑
- **已有日期跳过**：默认不覆盖；加 `--force`
- **配图缺失**：部分站点无 og 图或拦截抓取，属正常；可事后 `npm run news:images`
- **国外源偏少**：候选池已按源配额 + 联网检索补充；仍偏少可调大 `search.maxItems` 或加查询词
- **检索失败**：`search-news` 需要能访问 Google 的网络（GitHub Actions 正常；本地大陆网络会跳过，仅影响国外补充，不影响 RSS 日报）
