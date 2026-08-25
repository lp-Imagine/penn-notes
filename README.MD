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

1. `PENN_BASE=/` → **宝塔机 Self-hosted Runner 本机构建 + rsync**（主站）
2. `PENN_BASE=/penn-notes/` → 推 `gh-pages`（备份，路径带仓库前缀；仍在 GitHub-hosted runner）

canonical / sitemap / RSS / 百度推送始终指向主站 `https://penn-notes.draftly.cn`。AI 动态抓取与 LLM 仍在 GitHub Actions 上跑，不在轻量云执行。

### 宝塔 Self-hosted Runner（主站必需）

海外 SCP 到国内轻量云经常超时，主站改为在服务器本机跑 `deploy-baota`。

1. 仓库 **Settings → Actions → Runners → New self-hosted runner**，选 Linux x64，按页面命令下载。
2. SSH 登录宝塔机，建议目录：`/opt/actions-runner`（勿放在站点 web 根下）。
3. 配置时加上标签 **`baota`**（workflow 使用 `runs-on: [self-hosted, baota]`）：

```bash
./config.sh --url https://github.com/lp-Imagine/penn-notes --token <页面上的TOKEN> --labels baota --name baota
```

4. 安装依赖并以后台服务运行：

```bash
# Node 24（与 CI 一致；也可用 nvm）
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs rsync

cd /opt/actions-runner
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

5. Runner 进程用户需对站点目录可写（例如 `/www/wwwroot/penn-notes`）。若用 `www` 用户跑站点、用 `root` 跑 runner，一般可直接写；否则给 runner 用户 ACL/`chown` 写权限。

6. 仓库 Secrets 至少保留：

| Secret | 说明 |
|--------|------|
| `DEPLOY_PATH` | 宝塔站点根目录，如 `/www/wwwroot/penn-notes` |

`DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` / `DEPLOY_PORT` 仅在 `DEPLOY_MODE=remote`（旧海外 SCP）时需要，本机部署可忽略。

宝塔侧：纯静态 + HTTPS；伪静态用 `try_files $uri $uri/ $uri.html /index.html;`。站点目录里的 `.user.ini` 由面板锁定，rsync 会排除它，不必 `chown` 该文件。

DNS：`penn-notes.draftly.cn` A 记录指向轻量云。GitHub Pages 不要再绑自定义域名。

Pages 备份：仓库 Settings → Pages → Source 选 **Deploy from a branch**，Branch 为 `gh-pages` / `/ (root)`。国内访问 `github.io` 常不稳定，以主站为准。

> 注意：Self-hosted runner 能执行任意 workflow 步骤，请保证仓库为私有，或只信任可推送代码的协作者。

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
