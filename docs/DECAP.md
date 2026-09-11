# Decap CMS：在线写笔记

浏览器打开 **[https://penn-notes.draftly.cn/admin/](https://penn-notes.draftly.cn/admin/)**，用有仓库写权限的 GitHub 账号登录，即可新建/编辑 Markdown 笔记。保存后 commit 到 `master`，现有 CI 会构建并部署。

与 **Draftly / ai-article** 的区别：

| | Decap（本页） | Draftly |
|---|---|---|
| 用途 | 人手写笔记 | AI 稿推送同步 |
| frontmatter | 无 `source: ai-article` | 必填 `source` + `sourceId` |
| 发布 | GitHub commit → CI | Contents API + `blog-sync` dispatch |

## 一次性配置

### 1. GitHub OAuth App

1. GitHub → Settings → Developer settings → **OAuth Apps** → New  
2. Application name：`Penn Notes Decap`（随意）  
3. Homepage URL：`https://penn-notes.draftly.cn`  
4. Authorization callback URL：  
   `https://penn-notes.draftly.cn/api/decap-auth/callback`  
5. 创建后复制 **Client ID**，生成 **Client Secret**

本地联调可再加一条 Callback（同一 OAuth App 只能填一个 Callback 时，可另建一个 App，或临时改回调）：  
`http://localhost:5173/api/decap-auth/callback`

### 2. 宝塔助手进程环境变量

在跑 `assistant-server` 的环境（或仓库根 `.env`）写入：

```bash
GITHUB_OAUTH_CLIENT_ID=...
GITHUB_OAUTH_CLIENT_SECRET=...
DECAP_PUBLIC_ORIGIN=https://penn-notes.draftly.cn
```

重启助手进程。启动日志应出现 `decap-oauth: on`。

### 3. Nginx 反代

主站已能托管 `/admin/`（静态，来自 `website/public/admin/`）。OAuth 需反代到助手端口（与 `/api/assistant` 同机）：

```nginx
location /api/decap-auth {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

本地 `npm run dev` 已在 Vite 里把 `/api/decap-auth` 指到助手；需同时 `npm run assistant:dev`。本地登录时若仍用生产 `base_url`，弹窗会走线上 OAuth（线上助手配好即可）；纯本地 OAuth 则把 [`website/public/admin/config.yml`](../website/public/admin/config.yml) 的 `base_url` 临时改成 `http://localhost:5173`，并设 `DECAP_PUBLIC_ORIGIN=http://localhost:5173`。

## 写稿约定

- 按栏目选 Collection（Web / UI / …），再选 **分组**（决定目录 `website/<section>/<group>/<slug>.md`）
- `draft: true` 的稿不会进侧栏/首页（构建脚本会跳过）
- **封面 / 配图**：封面字段可直接**上传本地图**（进 `website/public/uploads/`，值为 `/uploads/...`），或用「Insert from URL」贴外链 / 已有 COS 地址。正文配图用编辑器插图同样走媒体库。**发布构建**（`ingest`，需 `COS_*`）会自动上传到 COS 并改写成 `https://img.penn-notes.draftly.cn/sync/decap/...`；本地无 COS 密钥时保留原地址
- Commit 前缀为 `content:`，便于与 `blog-sync:` 区分
- 不要手填 `source: ai-article`，否则会进 ingest 契约校验

## 编辑预览

右侧预览通过 [`preview.js`](../website/public/admin/preview.js) + [`preview.css`](../website/public/admin/preview.css) 自定义，按博客笔记还原：封面一体文头、日期/标签、摘要、正文排版（含章节 h2 样式）。正文里若仍带文头副本（旧稿 / ai-article），预览会用 CSS 藏掉，避免双标题双封面。

## 相关文件

- [`website/public/admin/index.html`](../website/public/admin/index.html)
- [`website/public/admin/admin.css`](../website/public/admin/admin.css)（仅美化，不改功能）
- [`website/public/admin/preview.js`](../website/public/admin/preview.js) / [`preview.css`](../website/public/admin/preview.css)（编辑页右侧预览）
- [`website/public/admin/config.yml`](../website/public/admin/config.yml)
- [`assistant-server/lib/decap-auth.mjs`](../assistant-server/lib/decap-auth.mjs)
- 笔记目录约定：[`docs/SYNC.md`](./SYNC.md)
