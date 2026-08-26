---
title: App Router 缓存翻车：从数据不刷新说起
date: 2026-08-26
summary: 围绕「Next.js App Router 踩坑记：缓存和数据流那些事」的一篇干货型稿，读完能带走可执行要点。
tags:
  - NextJs
section: web
group: javascript
source: ai-article
sourceId: cmt9waifo0012zzkoqo2mpuyt
cover: /sync/cmt9waifo0012zzkoqo2mpuyt/cover.jpg
draft: false
---
# App Router 缓存翻车：从数据不刷新说起

<p class="article-meta"><time datetime="2026-08-26">2026-08-26</time><span class="article-tag">NextJs</span></p>

<img class="article-cover" src="/sync/cmt9waifo0012zzkoqo2mpuyt/cover.jpg" alt="「App Router 缓存翻车：从数据不刷新说起」封面" />

## 一次翻车：页面数据就是不刷新

把服务端组件路由部署到 Vercel 后，「今日订单数」停在了三天前的数字上。清浏览器缓存、强制刷新、等待重新部署，页面纹丝不动。Build 明明成功了，Vercel 也显示重新预渲染了，但线上输出的还是旧时间戳。

项目用的是 Next.js 14 的 App Router，页面代码示例：

```tsx
// app/dashboard/page.tsx
export const dynamic = 'force-dynamic';

export default async function Page() {
  const res = await fetch('https://api.example.com/orders/summary');
  const data = await res.json();

  return <Dashboard data={data} />;
}
```

注意 `fetch` 没传第二个参数。`dynamic` 确实设成了 `'force-dynamic'`，路由也走了动态渲染，但 `fetch` 拿到的响应仍被 Next.js 的数据缓存整体复用，于是呈现出「页面能渲染、数据总不更新」的组合症状。

完整复现只需要三步：

1. <strong>写一个路由</strong>在服务端组件里用默认 `fetch` 请求接口，把返回字段渲染到页面上。
2. <strong>部署并记录</strong>在 Vercel 上完成首次 Deploy，访问线上页面并记下返回值。
3. <strong>改数据再部署</strong>修改接口返回值后重新部署同一路由，访问并刷新页面，观察展示的仍是第一次部署时拿到的旧值。

这个问题的危险在于「看起来一切正常」。页面渲染毫无异常，Network 面板里也能看到请求返回 200，本地开发时表现完美——直到你发现数字和现实对不上，才惊觉更新链路早就断了。凡是服务端组件里不带选项的 `fetch` 都是潜在受害者，尤其是拉取价格、库存、配置这类高频变动数据的页面。这些页面的特征是「数据需要动态，页面不需要静态」，它们受害者排在第一位。

这次事故的元凶不在代码逻辑，而是藏在框架默认行为与使用者预期之间。

---

## 缓存不止一层：先搞清谁在缓存

遇到「数据不刷新」，不要急着在组件里清状态。App Router里至少有三层缓存先后作用：`fetch`缓存、Router Cache、Full Route Cache。它们位置不同，失效方式也完全不同。

| 缓存层 | 触发条件 | 生命周期 | 失效方式 |
| --- | --- | --- | --- |
| `fetch`缓存 | 服务端组件里使用全局`fetch`且未配置`cache`或`next.revalidate` | 默认按`force-cache`持久保存，直到被显式更新 | 设置`cache: 'no-store'`、`next: { revalidate }`，或调用`revalidateTag()`/`revalidatePath()` |
| Router Cache | 客户端导航到任意路由时，`RSC payload`被存进浏览器内存 | 会话内短期有效（约30秒），随导航滑动淘汰 | `router.refresh()`、`router.push()`、`revalidatePath()`后自动过期 |
| Full Route Cache | 路由为静态渲染（无动态API且无动态`fetch`） | 构建时生成，部署后长期存在 | 重新部署、ISR`revalidate`，或运行时变为动态渲染后跳过 |

回到翻车现场：页面展示的数据来自服务端组件的`fetch`调用，没有配置任何选项，默认走`force-cache`。第一次请求把响应缓存住，后续每次渲染都直接读缓存，所以后端改了数据，页面仍然显示旧值。Router Cache和Full Route Cache虽然也参与，但这两个只在「路由渲染结果」层面起作用：数据源变了，只要fetch缓存不失效，下面两层拿到的依然是同一个响应片段，刷新Router Cache也无济于事。

1. 确认数据是否由服务端组件中的`fetch`发起；是，才进入下一步。
2. 查看该`fetch`是否手动设置了`cache`或`next.revalidate`；没有，就是默认的`force-cache`。
3. 用`curl -I`或Next DevTools检查响应头，出现`x-nextjs-cache: HIT`且`Date`陈旧，即可锁定fetch缓存。

先判定fetch缓存，是因为它离数据源最近：请求根本不会发出，后续任何路由级缓存都没机会知道数据已变化。这一步排查能直接缩小范围，避免在Router Cache上做无效的`router.refresh()`。确定根因后，下一步才是改动`fetch`配置来验证效果。

---

## 正解二：客户端组件的数据从哪来

先看一个典型反例：给订单页面加一个统计卡片，组件标了 `'use client'`，然后在里面直接查数据库。

错误的写法：

```tsx
'use client'
import { db } from '@/lib/db'

export default function OrderStats() {
  // 客户端组件不能 async，也不能访问服务端数据库
  const orders = await db.order.findMany()
  return <div>订单数：{orders.length}</div>
}
```

这段代码有两处硬伤：一是 `'use client'` 下的组件会被打包进浏览器，`@/lib/db` 里的数据库连接字符串直接暴露在客户端 bundle 里；二是客户端组件本身不支持 `async` 函数组件，运行到 `await` 就报错。把服务端能力直接写进客户端组件，是 App Router 数据流最常见的翻车姿势。

修正方式很直接：服务端组件负责取数，通过 props 把结果传给客户端组件。

正确的数据流：

```tsx
// app/orders/page.tsx —— 服务端组件，可 async
import { db } from '@/lib/db'
import OrderStats from './OrderStats'

export default async function Page() {
  const count = await db.order.count()
  return <OrderStats count={count} />
}
```

```tsx
'use client'
// app/orders/OrderStats.tsx —— 客户端组件，只接收 props
export default function OrderStats({ count }: { count: number }) {
  return <div>订单数：{count}</div>
}
```

客户端组件拿到的是序列化后的普通数据，数据库连接、服务端密钥这些永远留在服务端。这个边界想清楚，数据流就不会乱。

如果客户端组件确实需要自己拉数据（比如依赖浏览器事件才触发请求），注意它走的是浏览器原生 `fetch`，App Router 给服务端 `fetch` 扩展的 `revalidate`、`next: { tags }` 等配置在这里全部不生效。此时必须显式关掉 HTTP 缓存：

```tsx
'use client'
useEffect(() => {
  fetch('/api/orders', { cache: 'no-store' })
    .then(r => r.json())
    .then(setOrders)
}, [])
```

不写 `cache: 'no-store'`，浏览器可能直接复用上一次的 HTTP 响应，再次出现「数据不刷新」。区分组件边界，用三条判断标准：

- <strong>需要交互状态</strong>（`useState`/`useEffect`/点击事件）→ 做客户端组件，数据从 props 或自己 fetch 公开接口获取。
- <strong>需要访问数据库或服务端密钥</strong> → 数据必须在服务端组件里取好，通过 props 下发，客户端组件绝不直接导入服务端模块。
- <strong>客户端组件自己 fetch</strong> → 默认关缓存，用 `cache: 'no-store'`，并确认请求打到的是公开 API 或 Route Handler。

组件边界的本质是数据边界：服务端组件拥有取数权限，客户端组件拥有交互能力。把数据库读写放进客户端组件，等于把服务端的钥匙交给浏览器——这不是缓存问题，是架构问题。先按上面的标准划好边界，再去谈 fetch 策略，数据流才不会二次翻车。

---

## 一套避坑清单：配置前先想三步

前文翻车现场和两组正解，最终都指向同一个事实：App Router 的缓存不是「开/关」二选一，而是按数据特征做匹配。写代码之前，先过一套清单，能省掉大部分排查时间。

先看决策清单，三条判断对应前文的三个关键问题。

1. <strong>先判断数据性质</strong>内容是否跟用户、时间、权限绑定——查数据库的订单列表、实时库存、登录用户信息，一律算动态数据；产品介绍、公告文案、版本号这类全局静态内容，才适合开缓存。动态数据硬套静态缓存，就是翻车现场的直接原因。
2. <strong>再确认组件边界</strong>数据要渲染在服务端组件还是客户端组件。服务端组件直接 `fetch` 并按需设置缓存；客户端组件里拿不到服务端缓存配置，数据要么从 RSC 载荷传入，要么单独请求接口。组件边界没定，缓存策略无从谈起。
3. <strong>最后定失效时机</strong>数据变化后，多久必须对用户可见。秒级以内，用 `no-store` 或动态渲染；分钟级以上，用 `revalidate`；需要手动刷新时，兜底方案是 `router.refresh()`。失效时机决定了你选哪一层缓存、配什么参数。

对应地，写代码前走三步自查：

1. <strong>画数据流路径</strong>从数据源到页面渲染，经过哪几层——数据库、Server 端 `fetch`、路由段、浏览器。任何一层都可能缓存中间结果。
2. <strong>标出缓存决策点</strong>在路径上标出你打算让哪一层缓存、哪一层跳过。标不出来，说明还没想清楚。
3. <strong>验证失效动作</strong>假设数据此刻更新，从源头到页面，你的配置能否让新值在预期时间内出现在用户屏幕上。验证方式：改一条数据，等一个失效周期，再刷新页面看结果。

三步走完再动手写 `fetch` 参数，基本上不会出现「为什么数据不刷新」的排查循环。缓存的坑不在配置项多，而在配置之前缺一份判断顺序。

## 总结

::: info 总结
App Router 的数据不刷新，根因不是某一个配置项写错，而是没把缓存策略和数据性质对齐。带着两个判断标准去写代码：动态数据默认不缓存，静态数据才显式缓存；组件边界决定数据从哪取，失效时机决定缓存怎么配。写代码前按「数据性质→组件边界→失效时机」走完三步自查，就能把缓存问题挡在开发阶段，而不是留到上线后排查。
:::
