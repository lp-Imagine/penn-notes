<script setup lang="ts">
import { ref } from "vue";

function onAvatarError(event: Event, name: string) {
  const img = event.target as HTMLImageElement | null;
  if (!img || img.dataset.fallback === "1") return;
  img.dataset.fallback = "1";
  const seed = encodeURIComponent(name || "Friend");
  img.src = `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&radius=8`;
}

const friends = [
  {
    name: "麋鹿鲁哟",
    desc: "大道至简，知易行难",
    avatar:
      "https://cdn.jsdelivr.net/gh/xugaoyi/image_store/blog/20200122153807.jpg",
    link: "https://www.cnblogs.com/miluluyo/",
  },
  {
    name: "DIYgod",
    desc: "写代码是热爱，写到世界充满爱",
    avatar: "https://github.com/DIYgod.png",
    link: "https://diygod.cc/",
  },
  {
    name: "XAOXUU",
    desc: "#IOS #Volantis 主题作者",
    avatar: "https://cdn.jsdelivr.net/gh/xaoxuu/assets@master/avatar/avatar.png",
    link: "https://xaoxuu.com",
  },
  {
    name: "Heo",
    desc: "爱折腾的设计师",
    avatar: "https://blog.zhheo.com/img/avatar.png",
    link: "https://blog.zhheo.com/",
  },
  {
    name: "Anthony Fu",
    desc: "开源 · Vue · Vite · 工具链",
    avatar: "https://github.com/antfu.png",
    link: "https://antfu.me/",
  },
  {
    name: "云游君的小站",
    desc: "希望能成为一个有趣的人",
    avatar: "https://www.yunyoujun.cn/images/avatar.jpg",
    link: "https://www.yunyoujun.cn/",
  },
  {
    name: "山月",
    desc: "读万卷书，行万里路",
    avatar: "https://github.com/shfshanyue.png",
    link: "https://shanyue.tech/",
  },
  {
    name: "若川",
    desc: "学习源码整体架构系列",
    avatar: "https://github.com/lxchuan12.png",
    link: "https://ruochuan12.github.io/",
  },
  {
    name: "粥里有勺糖",
    desc: "你的指尖，拥有改变世界的力量",
    avatar: "https://cdn.upyun.sugarat.top/avatar/blog/zlyst-avatar.jpeg-wh100",
    link: "https://sugarat.top/",
  },
  {
    name: "二丫讲梵",
    desc: "学习 · 记录 · 分享",
    avatar: "https://wiki.eryajf.net/img/logo.png",
    link: "https://wiki.eryajf.net/",
  },
  {
    name: "YoungKbt World",
    desc: "故事由我书写，旅程由你见证",
    avatar: "https://cdn.jsdelivr.net/gh/Kele-Bingtang/static/user/avatar2.png",
    link: "https://notes.youngkbt.cn/",
  },
  {
    name: "程沛权",
    desc: "养了三只猫",
    avatar: "https://github.com/chengpeiquan.png",
    link: "https://chengpeiquan.com/",
  },
  {
    name: "Randy's Blog",
    desc: "生活、技术、写作",
    avatar: "https://github.com/lutaonan.png",
    link: "https://lutaonan.com/",
  },
  {
    name: "前端进阶之旅",
    desc: "前端技术分享与成长",
    avatar: "https://github.com/poetries.png",
    link: "https://blog.poetries.top/",
  },
  {
    name: "Cubik 的小站",
    desc: "RECOMMENDED BY DR.CREATIVE",
    avatar:
      "https://cdn.jsdelivr.net/gh/Cubik65536/cubik-favicons@main/CubikLogo.png",
    link: "https://www.cubik65536.top/",
  },
  {
    name: "虹墨空间站",
    desc: "分享技术与生活",
    avatar: "https://github.com/IMaegoo.png",
    link: "https://www.imaegoo.com/",
  },
  {
    name: "阮一峰的网络日志",
    desc: "科技爱好者周刊与技术随笔",
    avatar: "https://github.com/ruanyf.png",
    link: "https://www.ruanyifeng.com/blog/",
  },
  {
    name: "张鑫旭",
    desc: "鑫空间 · 鑫生活",
    avatar: "https://github.com/zhangxinxu.png",
    link: "https://www.zhangxinxu.com/",
  },
  {
    name: "CloudNative Operations",
    desc: "专注云原生运维",
    avatar: "https://kubesre.com/img/logo.png",
    link: "https://kubesre.com/",
  },
  {
    name: "不器小窝",
    desc: "但知行好事，莫要问前程",
    avatar: "https://avatars.githubusercontent.com/u/866409?v=4",
    link: "https://xingcxb.com/",
  },
] as const;

const siteInfo = [
  "- name: Penn Notes",
  "  desc: 认真生活，随便折腾",
  "  avatar: https://penn-notes.draftly.cn/pn-favicon-32.png",
  "  link: https://penn-notes.draftly.cn/",
].join("\n");

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | undefined;

async function copySiteInfo() {
  try {
    await navigator.clipboard.writeText(siteInfo);
    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    window.prompt("复制站点信息：", siteInfo);
  }
}
</script>

<template>
  <section class="about-block about-block--friends" id="friends">
    <div class="about-block-head">
      <h2 class="about-block-title">友情链接</h2>
      <p class="about-block-desc">一些常逛的博客与站点</p>
    </div>
    <p class="about-friends-lead">欢迎互换友链。</p>

    <div class="about-friends-grid">
      <a
        v-for="item in friends"
        :key="item.link"
        class="about-friend"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          class="about-friend-avatar"
          :src="item.avatar"
          alt=""
          loading="lazy"
          @error="onAvatarError($event, item.name)"
        />
        <span class="about-friend-body">
          <span class="about-friend-name">{{ item.name }}</span>
          <span class="about-friend-desc">{{ item.desc }}</span>
        </span>
      </a>
    </div>

    <div class="about-friends-apply">
      <p class="about-friends-apply-title">互换友链</p>
      <p class="about-friends-apply-text">
        先添加本站，再通过
        <a
          href="https://github.com/lp-Imagine"
          target="_blank"
          rel="noopener noreferrer"
        >GitHub</a>
        联系我，附上站点信息：
      </p>
      <div class="about-friends-code-wrap">
        <pre class="about-friends-code"><code>{{ siteInfo }}</code></pre>
        <button
          type="button"
          class="about-friends-copy"
          :class="{ 'is-copied': copied }"
          @click="copySiteInfo"
        >
          {{ copied ? "已复制" : "复制" }}
        </button>
      </div>
    </div>
  </section>
</template>
