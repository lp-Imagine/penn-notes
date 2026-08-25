# Penn Notes

Penn 的前端笔记站（VitePress）。线上：https://penn-notes.draftly.cn/

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

Push `master`/`main`，或发送 `repository_dispatch`（`blog-sync`）触发 GitHub Actions，发布到 `gh-pages`。

线上域名：https://penn-notes.draftly.cn/

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
