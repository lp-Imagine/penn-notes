/**
 * 文章封面上升气泡
 * 半透明圆 + rim 描边 + 左上高光；呼应 penn-notes 品牌蓝与专注模式暖调。
 */

const CANVAS_CLASS = "article-hero-particles";

/** 按面积估算粒子数（约每 4800px² 一个） */
const AREA_PER_PARTICLE = 4800;
const MIN_COUNT = 14;
const MAX_COUNT = 56;

interface Particle {
  x: number;
  y: number;
  /** 生命周期 0→1；透明度由 sin 钟形 envelope 驱动 */
  life: number;
  lifeSpeed: number;
  radius: number;
  /** 微横向速度 */
  vx: number;
  /** 水平正弦摇摆振幅 / 相位 */
  driftAmp: number;
  driftPhase: number;
  rise: number;
  /** true ≈ 淡蓝品牌点缀；false 冷白（专注模式时整体偏暖） */
  blue: boolean;
  /** 同色相内的轻微色差 */
  tint: number;
  peakAlpha: number;
}

let active: HeroParticles | undefined;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

class HeroParticles {
  private hero: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private width = 0;
  private height = 0;
  private dpr = 1;
  private rafId = 0;
  private running = false;
  private visible = true;
  private usedWindowResize = false;
  private resizeObserver: ResizeObserver | undefined;
  private intersectionObserver: IntersectionObserver | undefined;
  private removalObserver: MutationObserver | undefined;
  private warm = false;

  private readonly onVisibilityChange = () => {
    this.visible = document.visibilityState === "visible";
    if (this.visible && this.running && !this.rafId) this.loop();
  };
  private readonly onResize = () => this.syncSize();
  private readonly frame = () => this.loop();
  private readonly onThemeClass = () => {
    this.warm = document.documentElement.classList.contains("focus-mode");
  };

  constructor(hero: HTMLElement) {
    this.hero = hero;
    this.canvas = document.createElement("canvas");
    this.canvas.className = CANVAS_CLASS;
    this.canvas.setAttribute("aria-hidden", "true");

    const copy = hero.querySelector(".article-hero-copy");
    if (copy) hero.insertBefore(this.canvas, copy);
    else hero.appendChild(this.canvas);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.onThemeClass();
  }

  start() {
    this.syncSize(true);
    this.bind();
    this.running = true;
    this.loop();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    document.documentElement.removeEventListener(
      "transitionrun",
      this.onThemeClass,
    );
    if (this.usedWindowResize) {
      window.removeEventListener("resize", this.onResize);
      this.usedWindowResize = false;
    }
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.removalObserver?.disconnect();
    this.resizeObserver = undefined;
    this.intersectionObserver = undefined;
    this.removalObserver = undefined;
    this.canvas.remove();
  }

  get isRunning() {
    return this.running;
  }

  private bind() {
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    document.documentElement.addEventListener(
      "transitionrun",
      this.onThemeClass,
    );

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.hero);
    } else {
      window.addEventListener("resize", this.onResize);
      this.usedWindowResize = true;
    }

    if (typeof IntersectionObserver !== "undefined") {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          this.visible = entries.some((entry) => entry.isIntersecting);
          if (this.visible && this.running && !this.rafId) this.loop();
        },
        { root: null, threshold: 0 },
      );
      this.intersectionObserver.observe(this.hero);
    }

    const parent = this.hero.parentElement;
    if (parent && typeof MutationObserver !== "undefined") {
      this.removalObserver = new MutationObserver(() => {
        if (!this.hero.isConnected || !this.canvas.isConnected) {
          teardownHeroParticles();
        }
      });
      this.removalObserver.observe(parent, { childList: true, subtree: true });
    }
  }

  private targetCount() {
    const area = this.width * this.height;
    return Math.min(
      MAX_COUNT,
      Math.max(MIN_COUNT, Math.round(area / AREA_PER_PARTICLE)),
    );
  }

  private resetParticle(p: Particle, scatter: boolean) {
    const w = this.width;
    const h = this.height;
    p.x = Math.random() * w;
    // 重生偏下；首屏全高散布，避免一窝涌出
    p.y = scatter
      ? h * (0.15 + Math.random() * 0.85)
      : h * (0.72 + Math.random() * 0.38);
    p.life = scatter ? Math.random() : 0;
    p.lifeSpeed = 0.0016 + Math.random() * 0.0022;

    // 多数 3–9px，少数大泡 10–18px；大泡更慢上升
    const large = Math.random() < 0.22;
    p.radius = large ? 10 + Math.random() * 8 : 3 + Math.random() * 6;
    p.rise = large
      ? 0.14 + Math.random() * 0.22
      : 0.32 + Math.random() * 0.48;
    p.vx = (Math.random() - 0.5) * 0.1;
    p.driftAmp = 0.35 + Math.random() * 0.75;
    p.driftPhase = Math.random() * Math.PI * 2;
    p.blue = Math.random() < 0.18;
    p.tint = Math.random();
    // 泡壁可见：峰值透明度高于微尘版
    p.peakAlpha = large
      ? 0.55 + Math.random() * 0.28
      : 0.62 + Math.random() * 0.3;
  }

  private syncSize(initial = false) {
    const nextW = this.hero.clientWidth;
    const nextH = this.hero.clientHeight;
    if (!initial && nextW === this.width && nextH === this.height) return;

    this.width = nextW;
    this.height = nextH;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const count = this.targetCount();
    if (initial || this.particles.length === 0) {
      this.particles = Array.from({ length: count }, () => {
        const p = blankParticle();
        this.resetParticle(p, true);
        return p;
      });
      return;
    }

    while (this.particles.length < count) {
      const p = blankParticle();
      this.resetParticle(p, true);
      this.particles.push(p);
    }
    if (this.particles.length > count) this.particles.length = count;
  }

  /** sin 钟形 envelope：淡入 → 峰值 → 淡出 */
  private lifeAlpha(life: number) {
    if (life <= 0 || life >= 1) return 0;
    const envelope = Math.sin(life * Math.PI);
    return envelope * envelope;
  }

  /** 主体 RGB（不含 alpha） */
  private rgb(p: Particle): [number, number, number] {
    if (this.warm) {
      return [255, 236 + Math.round(p.tint * 10), 208 + Math.round(p.tint * 14)];
    }
    if (p.blue) {
      return [168, 184, 255];
    }
    return [255, 255, 255];
  }

  private rgba(p: Particle, alpha: number): string {
    const [r, g, b] = this.rgb(p);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private drawParticle(p: Particle) {
    if (p.life >= 1 || p.y < -p.radius * 4) {
      this.resetParticle(p, false);
    }

    p.life += p.lifeSpeed;
    p.y -= p.rise;
    p.driftPhase += 0.014 + p.rise * 0.012;
    p.x += p.vx + Math.sin(p.driftPhase) * p.driftAmp * 0.22;

    // 上半区略压透明度，地板不低于 0.6
    const band = this.height * 0.45;
    const heightFade = p.y < band ? Math.max(0.6, p.y / band) : 1;

    const alpha = this.lifeAlpha(p.life) * p.peakAlpha * heightFade;
    if (alpha < 0.015) return;

    const { ctx } = this;
    const r = p.radius;
    const cx = p.x;
    const cy = p.y;

    // 1) 径向填充：中心更透，靠近 rim 略亮
    const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    fill.addColorStop(0, this.rgba(p, alpha * 0.08));
    fill.addColorStop(0.55, this.rgba(p, alpha * 0.18));
    fill.addColorStop(0.85, this.rgba(p, alpha * 0.42));
    fill.addColorStop(1, this.rgba(p, alpha * 0.28));

    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 2) 半透明 rim 描边
    const lineW = Math.max(0.8, Math.min(1.4, r * 0.12));
    ctx.beginPath();
    ctx.strokeStyle = this.rgba(p, alpha * 0.85);
    ctx.lineWidth = lineW;
    ctx.arc(cx, cy, r - lineW * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    // 3) 左上角肥皂泡高光：短弧 + 小高光点
    const hx = cx - r * 0.38;
    const hy = cy - r * 0.4;
    const highlightR = Math.max(0.9, r * 0.22);

    const gloss = ctx.createRadialGradient(hx, hy, 0, hx, hy, highlightR);
    gloss.addColorStop(0, this.rgba(p, Math.min(1, alpha * 1.15)));
    gloss.addColorStop(0.55, this.rgba(p, alpha * 0.55));
    gloss.addColorStop(1, this.rgba(p, 0));

    ctx.beginPath();
    ctx.fillStyle = gloss;
    ctx.arc(hx, hy, highlightR, 0, Math.PI * 2);
    ctx.fill();

    // 高光弧（泡壁折光感）
    const arcR = r * 0.72;
    ctx.beginPath();
    ctx.strokeStyle = this.rgba(p, Math.min(1, alpha * 0.95));
    ctx.lineWidth = Math.max(0.7, Math.min(1.2, r * 0.08));
    ctx.lineCap = "round";
    ctx.arc(cx, cy, arcR, (-Math.PI * 5) / 6, (-Math.PI * 2) / 5);
    ctx.stroke();
  }

  private loop() {
    if (!this.running) return;
    this.rafId = 0;

    if (!this.hero.isConnected || !this.canvas.isConnected) {
      teardownHeroParticles();
      return;
    }

    if (!this.visible || document.visibilityState === "hidden") return;

    this.warm = document.documentElement.classList.contains("focus-mode");

    this.rafId = requestAnimationFrame(this.frame);
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const p of this.particles) this.drawParticle(p);
  }
}

function blankParticle(): Particle {
  return {
    x: 0,
    y: 0,
    life: 0,
    lifeSpeed: 0,
    radius: 0,
    vx: 0,
    driftAmp: 0,
    driftPhase: 0,
    rise: 0,
    blue: false,
    tint: 0,
    peakAlpha: 0,
  };
}

/** 在文头封面挂载气泡；已挂载且运行中则跳过 */
export function ensureHeroParticles() {
  if (typeof window === "undefined") return;

  if (prefersReducedMotion()) {
    teardownHeroParticles();
    return;
  }

  const hero = document.querySelector<HTMLElement>(".vp-doc .article-hero");
  if (!hero) {
    teardownHeroParticles();
    return;
  }

  if (active?.isRunning && hero.querySelector(`.${CANVAS_CLASS}`)) return;

  teardownHeroParticles();
  active = new HeroParticles(hero);
  active.start();
}

/** 取消动画、断开观察并移除 canvas */
export function teardownHeroParticles() {
  if (!active) return;
  const instance = active;
  active = undefined;
  instance.destroy();
}
