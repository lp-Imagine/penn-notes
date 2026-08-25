# Penn Notes

Penn 的前端笔记站（VitePress）。

- **主站**：https://penn-notes.draftly.cn/（腾讯云宝塔）
- **备份**：https://lp-Imagine.github.io/penn-notes/（GitHub Pages）

## 本地开发

需要 Node.js **20+**（`nvm use 20`）。

```bash
npm install
npm run dev
```

打开终端提示的本地地址。

> 首页、侧栏、RSS、`website/news/` 等是构建生成物，**不进 git**。`npm run dev` / `npm run build` 会自动从 `news/` 与笔记正文重生；裸 `vitepress` 命令前请先跑上述脚本。

## 常用命令

```bash
npm run dev           # 开发（含生成首页/侧栏/资讯同步）
npm run build         # ingest + 资讯同步 + 首页/侧栏 + 构建
npm run ingest        # 校验 website/sync 契约
npm run sync:news     # 同步 news/ → website/news/
npm run news:daily    # 生成昨日 AI 动态（需 LLM_API_KEY）
npm run build:home    # 仅重建首页与侧栏
```

## AI 动态

每天早上自动抓取 RSS + 大模型摘要，按日归档。说明见 [docs/NEWS.md](docs/NEWS.md)。

栏目：**业界 · 产品 · 模型 · 开源 · 开发者工具 · 前端**

需配置仓库 Secret：`LLM_API_KEY`（可选 `LLM_BASE_URL` / `LLM_MODEL`）。

## ai-article 同步

约定见 [docs/SYNC.md](docs/SYNC.md)。入库目录：`website/sync/<section>/`。

## 部署

Push `master`/`main`，或发送 `repository_dispatch`（`blog-sync`）触发 GitHub Actions。流水线会构建两份静态站：

1. `PENN_BASE=/` → rsync 到宝塔站点根目录（主站）
2. `PENN_BASE=/penn-notes/` → 推 `gh-pages`（备份，路径带仓库前缀）

canonical / sitemap / RSS / 百度推送始终指向主站 `https://penn-notes.draftly.cn`。AI 动态抓取与 LLM 仍在 GitHub Actions 上跑，不在轻量云执行。

仓库 Settings → Secrets 需配置：

| Secret | 说明 |
|--------|------|
| `DEPLOY_HOST` | 轻量云公网 IP |
| `DEPLOY_USER` | SSH 用户（一般为 `root`） |
| `DEPLOY_SSH_KEY` | 部署私钥全文（`penn_notes_deploy`） |
| `DEPLOY_PATH` | 宝塔站点根目录，如 `/www/wwwroot/penn-notes` |
| `DEPLOY_PORT` | 可选，非 22 时填写 |

宝塔侧：纯静态 + HTTPS；伪静态用 `try_files $uri $uri/ $uri.html /index.html;`。站点目录里的 `.user.ini` 由面板锁定，rsync 会排除它，不必 `chown` 该文件。

DNS：`penn-notes.draftly.cn` A 记录指向轻量云。GitHub Pages 不要再绑自定义域名。若 CI 里 rsync 超时，检查轻量云防火墙是否放行 22 端口。

### 百度推送（可选）

站点已在百度搜索资源平台验证后，可主动推送 URL（加快发现，不保证立刻收录）：

```bash
export BAIDU_PUSH_TOKEN=你的token   # 站长平台 → 资源提交 → API 提交
npm run baidu:push                 # 推首页/栏目/最近日报与笔记
npm run baidu:push -- --dry-run    # 只打印将要推送的 URL
```

自动推送：在仓库 Settings → Secrets 添加 `BAIDU_PUSH_TOKEN` 后，

- **CI 部署成功**会推首页/栏目/最近内容（`--mode=site`）
- **日报部署成功**会推首页/栏目 + 最新日报等（`--mode=daily`）

未配置 secret 或额度用尽时会跳过，不阻断部署。token 勿提交进 git。

### 访问统计 Umami（可选）

构建时若配置了 Umami，会在页面注入统计脚本（见 `website/.vitepress/config.ts`）：

仓库 Settings → Secrets：

| Secret | 说明 |
|--------|------|
| `UMAMI_URL` | 实例根地址，如 `https://umami.example.com` |
| `UMAMI_WEBSITE_ID` | 站点 Website ID |

CI / 日报构建会读取上述变量；未配置则不注入，不影响部署。
