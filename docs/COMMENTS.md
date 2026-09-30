# 评论：Artalk

评论数据在宝塔本机的 Artalk（SQLite）。评论图片经助手进程压缩后写入现有 COS 桶。页面随站点构建部署。

更新日期：2026-09-29。

**代码已接上。** 服务器还要单独装 Artalk 进程、Nginx 反代，并开通腾讯云文本内容安全。示例配置：[`deploy/artalk.example.yml`](../deploy/artalk.example.yml)。

## 现状

文章页已从 giscus 换成 Artalk，组件在 `website/.vitepress/theme/Comments.vue`。填昵称和邮箱即可发，不登录。配色跟站点 CSS 变量，覆盖浅色、深色和专注模式。

Artalk 服务未启动时，评论区会加载失败。按下面「服务器」一节装好后即可用。

## 能力

| 能力 | 做法 |
|------|------|
| 表情 | 本站 `/vendor/artalk/emoticons.json`（emoji + 颜文字），不走 jsDelivr |
| 图片 | 浏览器把原图 POST 到 `/api/comment-images`，助手进程压缩后写入 `penn-notes/comments/` |
| 回复 | 楼中楼（Artalk 默认） |
| 身份 | 不登录。`auth.enabled: false` |
| 审核 | `pending_default: false`。腾讯云文本内容安全命中则拦截。后台可手动删除。评论图片不在这层文字检测里 |
| IP | 公开页显示属地，精确到省。完整 IP 只在后台。数据文件 `ip2region.xdb` |
| 系统 | `uaBadge: true`，显示操作系统和浏览器 |

## 图片

对象键：

```
penn-notes/comments/<16位hash>.<ext>
```

CDN：`https://img.penn-notes.draftly.cn`。文章回收脚本不扫这个前缀。删评论不会自动删 COS 对象。

**大图：** 长边超过 1920 像素，或体积超过 800KB，才缩小并重新编码。JPEG / PNG / WebP 超限时转为 WebP（质量 82）。在阈值内的图保持原文件。GIF 保持原样。评论上传单张上限 8MB，同一 IP 每分钟 8 次、每天 40 次。

笔记图、新闻配图走 `scripts/prepare-image.mjs` 的同一套规则。对象键跟着文件名走的同步封面和历史迁移只缩小、不改扩展名，避免已经写进正文的地址对不上。

## 架构

```
文章页 Artalk 组件（脚本随站点打包，不从 jsDelivr 拉）
  评论读写 → https://penn-notes.draftly.cn/artalk/api/v2/…
           → Nginx → Artalk 127.0.0.1:23366 → SQLite
  评论图片 → /api/comment-images
           → Nginx → assistant 127.0.0.1:8787 → COS penn-notes/comments/
```

两条反代互不影响。23366 和 8787 都只监听本机。

主站和 GitHub Pages 备份站都请求主站上的 Artalk。Pages 源站要写进 `trusted_domains`（示例配置里已有 `https://lp-Imagine.github.io`）。

## 服务器

不用新机器，也不用新桶。

### 1. 进程

单独跑 Artalk，工作目录例如 `/opt/artalk`，不要放进会随 rsync 覆盖的 wwwroot。把 [`deploy/artalk.example.yml`](../deploy/artalk.example.yml) 复制为 `artalk.yml`，填上 `app_key` 和文本内容安全密钥。`login_timeout` 必须是正数（示例为 3 天）；缺了这项时 token 有效期是 0，登录接口会成功，紧接着的 `sites` 仍返回「需要管理员权限」。

`ip2region.xdb` 放到 `/opt/artalk/data/`，不进 git。第一次启动创建管理员账号：

```bash
./artalk admin
./artalk server -c artalk.yml
```

用 systemd 或 PM2 常驻。`host` 保持 `127.0.0.1`。

### 2. Nginx

在 `penn-notes.draftly.cn` 的 server 中增加两段。`/artalk/` 末尾斜杠会剥掉前缀，Artalk 自己仍看到 `/api/v2/…`。

```nginx
location ^~ /artalk/ {
    proxy_pass http://127.0.0.1:23366/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Authorization $http_authorization;
}

location = /api/comment-images {
    client_max_body_size 8m;
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

`http.proxy_header: X-Real-IP` 必须配上，否则属地和审核会把访客看成本机。改完 Nginx 后重启助手进程，让评论图接口生效。

`/artalk/` 里的 `Authorization` 如果到不了 Artalk，密码校验成功后管理接口仍会返回「需要管理员权限」，验证框会马上再弹出来。站点会把这个 Bearer 抄进 `/artalk/api/` 的 `token` 查询参数（Artalk 同样认），控制中心的 iframe 由 `artalk-auth-sw.js` 补上。

### 3. 腾讯云

- **COS**：沿用现有桶和服务器 `.env` 里的 `COS_SECRET_*`。评论图前缀在第一次上传时出现。
- **文本内容安全**：单独开通，密钥写入 `artalk.yml` 的 `moderator.tencent`，不要提交到 git。

### 4. 静态资源

`Artalk.js` / `Artalk.css` 由构建打进站点。表情包在 `website/public/vendor/artalk/emoticons.json`。头像用 weavatar，不用 gravatar.com。

### 5. 备份

给 `artalk.db` 加一条宝塔定时备份。评论图片在 COS 里，跟着桶走。

## 相关文件

- 评论组件：`website/.vitepress/theme/Comments.vue`
- 主题配置：`website/.vitepress/config.ts` 的 `artalk`
- 评论图接口：`assistant-server/lib/comment-image.mjs`
- 大图处理：`scripts/prepare-image.mjs`
- COS 上传：`scripts/cos-upload.mjs`
- 文章图回收（不碰评论前缀）：`scripts/gc-cos-decap-images.mjs`
- 服务器示例：`deploy/artalk.example.yml`
