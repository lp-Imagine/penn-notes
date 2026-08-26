# Penn Notes

Penn 的前端笔记站（VitePress）。

| | |
|--|--|
| **主站** | https://penn-notes.draftly.cn/（腾讯云宝塔） |
| **备份** | https://lp-Imagine.github.io/penn-notes/（GitHub Pages） |
| **配图 CDN** | https://img.penn-notes.draftly.cn/（腾讯云 COS 源站域名） |

## 本地开发

需要 Node.js **20+**。

```bash
npm install
npm run dev
```

打开终端提示的本地地址。

> 首页、侧栏、RSS、`website/news/` 等是构建生成物，**不进 git**。`npm run dev` / `npm run build` 会自动重生；勿直接裸跑 `vitepress`。

### 常用命令

```bash
npm run dev           # 开发（含首页 / 侧栏 / 资讯同步）
npm run build         # prebuild + VitePress 构建
npm run ingest        # 校验 ai-article 同步契约；有 COS_* 时上传封面
npm run sync:news     # news/ → website/news/
npm run news:daily    # 生成昨日 AI 动态（需 LLM_API_KEY）
npm run news:images   # 为日报补配图并上传 COS
npm run build:home    # 仅重建首页与侧栏
npm run cos:health    # 抽查 CDN URL 是否可访问
```

## 文章配图（COS）

新闻配图、笔记封面、旧插图已迁到 `https://img.penn-notes.draftly.cn`，仓库不再跟踪这些二进制（logo / favicon 仍留仓）。

| 类型 | COS 对象键前缀 |
|------|----------------|
| AI 动态 | `news/…` |
| 笔记封面 | `sync/…` |
| 旧笔记插图 | `img/legacy/…` |

设计与迁移说明：[CDN-IMAGES-PLAN.md](CDN-IMAGES-PLAN.md)。历史全量迁移已完成；若需重跑：Actions → **COS migrate images**。

本地上传需仓库根目录 `.env`（已 gitignore）写入下方 `COS_*`。

## AI 动态

每天早上自动抓取 RSS + 大模型摘要，按日归档。详见 [docs/NEWS.md](docs/NEWS.md)。

栏目：**业界 · 产品 · 模型 · 开源 · 开发者工具 · 前端**

## ai-article 同步

约定见 [docs/SYNC.md](docs/SYNC.md)。正文写入 `website/<section>/…`；封面上传 COS 后使用绝对 CDN URL。

## 部署

Push `master` / `main`，或 `repository_dispatch`（`blog-sync`）触发 **CI**：

1. `PENN_BASE=/` → 宝塔 Self-hosted Runner 本机构建 + rsync（主站）
2. `PENN_BASE=/penn-notes/` → 推 `gh-pages`（备份）

canonical / sitemap / RSS / 百度推送始终指向主站。日报抓取与 LLM 在 GitHub-hosted runner 上跑。

### 仓库 Secrets

| Secret | 用途 |
|--------|------|
| `DEPLOY_PATH` | 宝塔站点根，如 `/www/wwwroot/penn-notes` |
| `COS_SECRET_ID` / `COS_SECRET_KEY` | COS 上传 |
| `COS_BUCKET` / `COS_REGION` | 如 `penn-notes-img-1300329311` / `ap-guangzhou` |
| `COS_CDN_BASE` | `https://img.penn-notes.draftly.cn`（无尾斜杠） |
| `LLM_API_KEY` | AI 动态摘要（可选 `LLM_BASE_URL` / `LLM_MODEL`） |
| `BAIDU_PUSH_TOKEN` | 百度 API 推送（可选） |
| `UMAMI_URL` / `UMAMI_WEBSITE_ID` | Umami 统计（可选） |

### 宝塔 Self-hosted Runner

主站在服务器本机构建部署（避免海外 SCP 超时）。标签必须为 **`baota`**。

```bash
# 配置 runner（目录建议 /opt/actions-runner）
./config.sh --url https://github.com/lp-Imagine/penn-notes \
  --token <页面TOKEN> --labels baota --name baota

sudo ./svc.sh install && sudo ./svc.sh start
```

站点：纯静态 + HTTPS；伪静态 `try_files $uri $uri/ $uri.html /index.html;`。rsync 会排除面板锁定的 `.user.ini`。

DNS：`penn-notes.draftly.cn` A → 轻量云；Pages 不要绑自定义域名。Pages Source：`gh-pages` / `/ (root)`。

> Self-hosted runner 权限大：仓库宜私有，或只信任可推送协作者。

### 百度推送（可选）

```bash
export BAIDU_PUSH_TOKEN=你的token
npm run baidu:push                 # 推首页 / 栏目 / 最近内容
npm run baidu:push -- --dry-run
```

配置 Secret 后，CI 部署成功会 `--mode=site`，日报部署成功会 `--mode=daily`。未配置或额度用尽时跳过，不阻断部署。

### Umami（可选）

构建时注入统计脚本。未配置 `UMAMI_*` 则不注入，不影响部署。
