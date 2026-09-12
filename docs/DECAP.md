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
- 正文不必再手写 `# 标题`：站点会从 frontmatter 的 `title` / `date` / `tags` / `cover` 自动补文头（与线上笔记一致）
- **封面 / 配图**：封面字段可直接**上传本地图**（进 `website/public/uploads/`）。嵌套 `path` 栏目须写 **`media_folder: /website/public/uploads`**（仓库根绝对路径）与 **`public_folder: uploads`（不要前导 `/`）**。若写成 `/uploads`，Decap 会把字段值当已上线 URL，草稿图尚未发布时封面裂图。构建期 `normalize-decap-media` 会把 `uploads/...` 收成 `/uploads/...`，再由 ingest（需 `COS_*`）收口到 CDN。
- **删文章与 COS**：Decap 删稿不会立刻删 COS。下次构建的 `gc-cos-decap-images` 会扫描剩余笔记引用，只回收本站前缀下的孤儿对象：`penn-notes/decap/`（新）以及历史 `sync/decap/<12位hash>.ext`（严格命名）。**不会**动 `news/`、`sync/<sourceId>/` 或同桶其它项目路径。多文共用同一张图时会保留。可用 `COS_GC_DECAP=0` 关闭；本地可 `npm run cos:gc-decap -- --dry-run` 预览。
- Commit 前缀为 `content:`，便于与 `blog-sync:` 区分
- 不要手填 `source: ai-article`，否则会进 ingest 契约校验
- **正文编辑器**用 `richtext`（Decap ≥ 3.12），替代易在列表/换行时崩溃的旧 `markdown`（Slate）。复杂格式可点工具栏切到 Markdown 源码模式

## 编辑预览

右侧预览通过 [`preview.js`](../website/public/admin/preview.js) + [`preview.css`](../website/public/admin/preview.css) 自定义，按博客笔记还原：封面一体文头、日期/标签、摘要、正文排版（含章节 h2 样式）。正文里若仍带文头副本（旧稿 / ai-article），预览会用 CSS 藏掉，避免双标题双封面。

## 排查

- **登录总失败 / 出现 `fetch failed`**：多半是助手进程访问 `github.com` 换 token 时网络抖动（国内机房常见）。现已在 [`decap-auth.mjs`](../assistant-server/lib/decap-auth.mjs) 内自动重试；仍频繁失败时检查宝塔机到 GitHub 的出网，或给助手进程配置稳定代理后重启。改完 OAuth 环境变量后需**重启 assistant-server**（静态 `/admin/` 热更新不够）。
- **弹窗一闪而过**：允许站点弹窗；关闭广告拦截对 `/api/decap-auth` 的拦截后再试。

## 相关文件

- [`website/public/admin/index.html`](../website/public/admin/index.html)
- [`website/public/admin/admin.css`](../website/public/admin/admin.css)（仅美化，不改功能）
- [`website/public/admin/admin-confirm.js`](../website/public/admin/admin-confirm.js)（`confirm` / `alert` 统一为站内弹窗）
- [`website/public/admin/preview.js`](../website/public/admin/preview.js) / [`preview.css`](../website/public/admin/preview.css)（编辑页右侧预览）
- [`website/public/admin/config.yml`](../website/public/admin/config.yml)
- [`assistant-server/lib/decap-auth.mjs`](../assistant-server/lib/decap-auth.mjs)
- 笔记目录约定：[`docs/SYNC.md`](./SYNC.md)
