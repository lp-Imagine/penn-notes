# 站内 AI 助手

Penn Notes 左下角助手浮窗（聊天气泡 + 星标图标，可拖拽贴左右边）：根据**本站文章索引**回答问题（总结当前页、找相关文、阅读路径），不是通用 ChatGPT。

## 能力要点

### 一期

- **多轮对话**：请求带最近约 3 轮上文；换页**保留**会话（副标题会提示已切换）；可手动「清空」。
- **按页快捷问题 / 答后追问**：空态芯片随栏目变化；回答结束后给追问入口。
- **参考来源**：默认收起「参考 N 篇」，点开为紧凑链接。
- **停止 / 复制**：生成中可「停止」；答完可「复制」。
- **选中解释**：在正文选中一段后，助手顶栏出现选中条，可一键解释。
- **会话保留**：同标签页刷新后用 `sessionStorage` 恢复对话。
- **对比两篇**：问「对比 / 区别」或点「对比当前这篇…」，取当前页 + 一篇相关文对照。
- **快捷键**：`⌘⇧L`（Mac）或 `Ctrl+Shift+L` 开关导读（避开 `⌘K` 搜索、`⌘/` 键盘问题、`⌘⇧A` Chrome 搜标签）。
- **回答反馈**：每条回答下可点「有用 / 不准」（不准可填一句原因），打点 `assistant_feedback`。
- **本页加深**：章节列表与「跳到某某」本地跳转；选中代码可解释；笔记页快捷「解释本页主要代码」；对比优先同标签/同栏目。
- **主动引导**：首次打开给三问入门；新闻页固定「今日要点」。
- **分享会话**：顶栏「分享」复制问答 Markdown 摘要（`assistant_share`）。
- **字号**：顶栏 A− / A+，本机记住；配色跟随站点 CSS 变量（深浅色自动一致）。
- **答后动作**：参考篇可「打开」；若回答点名了本页章节，显示「滚到 …」跳转正文。
- **续聊**：对话写入 `localStorage`，关闭浏览器后仍可恢复；**7 天过期**或点「清空」（有确认）即删除。
- **语音输入**：支持 Web Speech 的浏览器显示麦克风按钮（多为移动端 Chrome）。
- **快捷键**：`⌘⇧L`（Mac）或 `Ctrl+Shift+L` 开关导读；`Esc` 关闭；清空需确认。站内搜索仍用 `⌘K` / `Ctrl+K`。
- **导出卡片**：答完可点「卡片」，生成 PNG（优先进剪贴板，否则下载）。
- **不准后改写**：反馈不准后追问变为「说得更短 / 只要步骤 / 换个角度」。
- **桌面缩放**：弹窗右下角可拖拽改大小（≥768px）。
- **参考预览**：悬停参考标题看摘要浮层。
- **本页进度**：滚动时提示「在看：某节」，可一键总结这节。

### 二期

- **切块 RAG**：笔记按标题 / 摘要 / 正文（约 500 字重叠切块）建索引；检索按 chunk 加权，再按文章去重；LLM 吃命中 chunk 原文。
- **标签阅读路径**：问「阅读路径 / 想学 / 按标签…」时，按标签匹配笔记并按日期升序给出建议顺序。
- **Umami 打点**（若已配置 `UMAMI_*`）：`assistant_open` / `assistant_ask` / `assistant_followup` / `assistant_path` / `assistant_feedback` / `assistant_share` / `assistant_jump`（问题文本截断至 80 字）。

## 架构

```
浏览器浮窗 → POST /api/assistant/chat（message + history + page）
           → assistant-server（本机 127.0.0.1:8787）
           → 检索 website/.../assistant/index.json（chunk 索引）
           → LLM（OpenAI 兼容，密钥只在服务器）
```

- **主站** `penn-notes.draftly.cn`：默认开启助手，请求同域 `/api/assistant/*`
- **GitHub Pages 备份**：默认**关闭**（避免跨域刷主站额度）。若要开：构建时设  
  `ASSISTANT_ENABLED=true` + `ASSISTANT_API_BASE=https://penn-notes.draftly.cn`，并在服务器 CORS 放行 `https://lp-Imagine.github.io`

## 本地开发

**推荐（改代码自动重启，并自动释放 8787）：**

```bash
# 一次性：把 key 写进仓库根目录 .env（已 gitignore）
cp .env.example .env
# 编辑 .env，填入 LLM_API_KEY=...

# 终端 1：站点（指到本机 API）
ASSISTANT_API_BASE=http://127.0.0.1:8787 npm run dev

# 终端 2：助手（watch；以后改 server 不用手动 kill）
npm run assistant:dev
```

也可用生产启动方式（无 watch）：`npm run assistant:server`。

健康检查：`curl http://127.0.0.1:8787/api/assistant/health`

未配置 `LLM_API_KEY` 时仍可返回启发式答案，方便联调 UI。

索引：`npm run build:assistant-index`（`dev` / `prebuild` 已自动跑）。产物 `website/public/assistant/index.json` 含 `version: 2` 与 chunk 条目。

## 宝塔部署

### 1. 代码与进程

在服务器仓库目录（或单独 clone）启动：

```bash
cd /path/to/penn-notes
export LLM_API_KEY=...
export ASSISTANT_HOST=127.0.0.1
export ASSISTANT_PORT=8787
# 站点 rsync 后索引一般在：
# export ASSISTANT_INDEX_PATH=/www/wwwroot/penn-notes/assistant/index.json
npm run assistant:server
```

建议用 **PM2 / 宝塔 Node 项目 / systemd** 守护，开机自启；密钥放环境变量，勿写进 git。

### 2. Nginx 反代（站点配置）

在 `penn-notes.draftly.cn` 的 server 里增加：

```nginx
location /api/assistant/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 90s;
    # 流式回答必须关缓冲，否则会整段攒完才返回
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding on;
}
```

部署站点后确认存在：`/www/wwwroot/penn-notes/assistant/index.json`（构建产物，随 `rsync` 上去）。

### 3. 可选 CORS（仅当 Pages 也要调用主站 API）

```bash
export ASSISTANT_CORS_ORIGINS=https://lp-Imagine.github.io
```

### 4. 限流（按 IP）

- **每分钟**：默认最多 **20** 次（`ASSISTANT_RATE_MAX`）
- **每天**（Asia/Shanghai 自然日）：默认最多 **80** 次（`ASSISTANT_RATE_DAILY`）

超限返回 429。计数在进程内存中；服务重启会清零。防刷够用，不是硬账单封顶。

## 构建相关

| 命令 | 作用 |
|------|------|
| `npm run build:assistant-index` | 扫描文章 + 最近 AI 动态 → chunk 索引 `website/public/assistant/index.json` |
| `prebuild` / `dev` | 已自动包含上述步骤 |

索引含标题/摘要/正文块与路径，**无密钥**；已加入 `.gitignore`，由 CI/本地生成。

## 前端开关

| 变量 | 说明 |
|------|------|
| `ASSISTANT_ENABLED=true/false` | 强制开/关 |
| `ASSISTANT_API_BASE` | API 根，空=同域相对路径 |
| `UMAMI_URL` / `UMAMI_WEBSITE_ID` | 配置后助手会打自定义事件 |

写入 `themeConfig.assistant`，见 `website/.vitepress/config.ts`。
