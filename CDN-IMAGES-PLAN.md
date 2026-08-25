# 计划：AI 动态配图迁移至 CDN / 对象存储

> 状态：草案（尚未实施）  
> 日期：2026-08-25  
> 背景：宝塔 Self-hosted Runner 部署时浅克隆仓库含约 **100MB+** 新闻配图，Checkout 常需 10～20 分钟；海外 SCP 全量上传也曾因体积超时。将配图移出 git / 站点静态仓是治本方向。

---

## 1. 目标

| 目标 | 说明 |
|------|------|
| 缩小仓库与构建产物 | `website/public/news/**` 图片不再进 git，dist 也不再打包大图 |
| 加快 CI / 宝塔部署 | Checkout、rsync/本地同步主要只剩 HTML/CSS/JS |
| 保持读图稳定 | 继续「先抓 og:image → 落可控存储」，避免源站防盗链 |
| 双端一致 | 主站（宝塔）与 GitHub Pages 备份共用同一套图片 URL |

非目标（本期不做）：

- 笔记封面 / `website/public/sync/` 迁移（可二期）
- 替换现有 RSS / 百度推送逻辑（仅适配图片 URL）

---

## 2. 现状

### 2.1 流水线（见 `docs/NEWS.md`）

1. 抓取 / 摘要 → 写入 `news/YYYY-MM/ai-news-YYYY-MM-DD.md`
2. `scripts/resolve-news-images.mjs`：抓 `og:image`，**下载到** `website/public/news/YYYY-MM/<hash>.(jpg|png|…)`
3. Markdown 中写站内路径：`![配图](/news/2026-08/xxx.jpg)`
4. `sync:news` / `build:home` 生成列表 JSON，卡片 `image` 字段同为 `/news/...`
5. 配图随仓库提交；构建时进入 `website/.vitepress/dist/news/`

### 2.2 痛点

- 仓库与 dist 体积随日报累积变大
- 宝塔 Runner 每次 `git clone` 都要拉全量配图
- GitHub Pages / 宝塔部署带宽与时间被图片主导

---

## 3. 推荐方案：腾讯云 COS + CDN

与现有「腾讯云轻量 + 宝塔」同云，延迟与费用可控。

### 3.1 架构

```
日报生成 (GitHub Actions)
    │
    ▼
resolve-news-images
    │ 下载 og:image 到临时文件
    │ 上传 COS（私有写、公共读或 CDN 回源）
    ▼
Markdown / JSON 写入绝对 URL
    https://img.penn-notes.draftly.cn/news/2026-08/<hash>.jpg
    │
    ▼
站点构建（无大图静态文件）
    ├── 宝塔：HTML/CSS/JS
    └── GitHub Pages：同上
         └── <img src="https://img.…"> 浏览器直连 CDN
```

### 3.2 资源规划（建议）

| 项 | 建议值 |
|----|--------|
| 存储桶 | 如 `penn-notes-img`（与站点同地域，如广州/上海） |
| 公网访问 | 绑定 CDN 域名，如 `img.penn-notes.draftly.cn` |
| 路径约定 | `news/YYYY-MM/<hash>.<ext>`（与现本地路径语义一致，仅换域名） |
| ACL | 对象公共读；禁止列出桶 |
| HTTPS | CDN 强制 HTTPS |
| 缓存 | 图片长缓存（如 `Cache-Control: public, max-age=31536000, immutable`），hash 文件名可安心强缓存 |

### 3.3 密钥与 Secret

仓库 Settings → Secrets（仅 Actions 使用，勿提交代码）：

| Secret | 用途 |
|--------|------|
| `COS_SECRET_ID` | 腾讯云 API 密钥 |
| `COS_SECRET_KEY` | 腾讯云 API 密钥 |
| `COS_BUCKET` | 桶名，如 `penn-notes-img-xxxxxx` |
| `COS_REGION` | 如 `ap-guangzhou` |
| `COS_CDN_BASE` | 对外前缀，如 `https://img.penn-notes.draftly.cn`（无尾斜杠） |

本地调试可用 `.env`（加入 `.gitignore`），不进仓库。

子账号建议最小权限：仅该桶的 `PutObject` / `HeadObject`（可选 `DeleteObject` 供清理脚本）。

---

## 4. 代码改造范围

### 4.1 核心：`scripts/resolve-news-images.mjs`

- 下载流程保持不变（校验、去 logo、hash 命名）
- **落盘**：改为「临时目录 → 上传 COS → 删除临时文件」（失败则该条不插图，行为与现网一致）
- **Markdown 写入**：由 `/news/...` 改为 `${COS_CDN_BASE}/news/...`
- 已存在且已是 CDN URL 的条目：跳过（幂等）
- 已存在本地 `/news/...` 且对应对象已在 COS：可只改写链接、不重复上传（`HeadObject`）

### 4.2 生成 / 同步侧

- `sync-news` / `build-home`：无需改路径拼接逻辑，只要 md/JSON 里已是绝对 `https://` URL
- 卡片组件 `NewsArchive.vue` 的 `href()`：已对 `https://` 直出，**可保持**
- 失败隐藏破图逻辑：继续生效

### 4.3 Git / 忽略规则

- `.gitignore` 增加（或强化）：`website/public/news/**` 下图片扩展名，**保留** `feed.xml` 等非图文件规则不变
- 历史已跟踪的图片：迁移完成后从 git 移除（见阶段 B），显著缩小仓库

### 4.4 CI

- `daily-news.yml`：生成步骤注入 COS Secrets；无密钥时降级策略需明确（见风险）
- `ci.yml`：构建不必上传图；体积应明显下降
- README / `docs/NEWS.md`：补充「配图在 CDN」说明

### 4.5 可选工具脚本

- `scripts/migrate-news-images-to-cos.mjs`：扫描历史 `/news/...`，批量上传并改写 md
- `scripts/cos-health.mjs`：抽查若干 CDN URL 是否 200

---

## 5. 实施阶段

### 阶段 A — 基础设施（约 0.5～1 天）

1. 创建 COS 桶 + CDN 域名 + HTTPS  
2. 配置子账号与仓库 Secrets  
3. 本机用一小文件验证 Put / 公网 GET  

**验收：** 浏览器能打开测试对象 URL。

### 阶段 B — 新日报走 CDN（约 1～2 天）

1. 改造 `resolve-news-images.mjs` + 单元/脚本自测  
2. `daily-news` 工作流注入环境变量  
3. 手动 `workflow_dispatch` 跑一天（或 `--force` 重跑昨日）  

**验收：**

- 新 md 中配图为 `https://img.…/news/…`  
- `website/public/news/` 不再新增对应文件（或仅临时后删除）  
- 主站 / Pages 卡片与日报正文出图正常  

### 阶段 C — 历史迁移（约 1 天，可异步）

1. 跑迁移脚本：上传已有本地图 → 改写 `news/**/*.md` 中的 `/news/`  
2. `git rm -r --cached` 历史配图文件并提交  
3. 观察仓库体积与下一次宝塔 Checkout 耗时  

**验收：** 旧日报与归档卡片图仍可访问；clone 体积显著下降。

### 阶段 D — 收尾

1. 更新 `docs/NEWS.md`、`README.MD`  
2. （可选）CDN 监控 / 流量告警  
3. （二期）评估 `sync/` 封面是否同样上 COS  

---

## 6. 降级与风险

| 风险 | 应对 |
|------|------|
| CI 未配置 COS Secrets | 明确策略二选一：**(推荐)** 失败则该条无图并打日志；或临时回退本地 `public/news`（仅应急，需文档标明） |
| 上传失败 / 源站图失效 | 与现逻辑一致：不插图，不留破图 |
| CDN 回源或域名未生效 | 阶段 A 必须先验收；迁移前不要删 git 内图片 |
| 费用 | 静态图流量通常很低；可设 CDN 流量告警 |
| 双域名 cookie / 混合内容 | 全站 HTTPS；图片纯静态无 cookie |
| 防盗链过严误伤 Pages | CDN 防盗链白名单含 `penn-notes.draftly.cn` 与 `*.github.io`，或先关闭防盗链 |

---

## 7. 成功指标

- 新日报不再向 git 提交 `website/public/news/*.(jpg|png|webp|…)`  
- 宝塔 `Checkout (CN mirror)` 耗时较迁移前明显下降（目标：常态 < 2～3 分钟量级，视仓库其余内容而定）  
- 主站与 GitHub Pages 配图加载正常  
- 仓库历史清理后 clone 体积下降一个数量级（视删除的配图总量）  

---

## 8. 决策记录（待确认）

实施前请确认：

1. **存储：** 腾讯云 COS + CDN（默认推荐）是否 OK？是否已有现成桶可复用？  
2. **域名：** 是否使用 `img.penn-notes.draftly.cn`（需 DNS）？或先用 COS 默认域名验收？  
3. **降级：** Secrets 缺失时「无图跳过」还是「回退本地文件」？  
4. **历史：** 是否一期就做阶段 C（删 git 大图），还是先只上新图？  

确认后按阶段 A → B → C 开工即可。

---

## 9. 相关文件（实施时会动到）

- `scripts/resolve-news-images.mjs`（主改）  
- `scripts/generate-daily-news.mjs`（环境透传，若需要）  
- `.github/workflows/daily-news.yml`  
- `.gitignore`  
- `docs/NEWS.md` / `README.MD`  
- （新建）`scripts/migrate-news-images-to-cos.mjs`  
- （新建）可选 `scripts/cos-upload.mjs` 公共上传封装  

本文档路径：项目根目录 `CDN-IMAGES-PLAN.md`。
