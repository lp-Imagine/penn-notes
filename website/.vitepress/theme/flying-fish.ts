/** 页脚游鱼 Canvas 特效（由 imagineblog / xiabo2/CDN fish.js 改写，去除 jQuery 依赖） */

const CONTAINER_ID = "jsi-flying-fish-container";
const CONTAINER_CLASS = "penn-fish-container";

interface FishPalette {
  waterTop: string;
  waterBottom: string;
  body: string;
  waveStroke: string;
}

let cachedFishPalette: FishPalette | undefined;
let paintObserver: MutationObserver | undefined;

function readCssVar(style: CSSStyleDeclaration, name: string, fallback: string) {
  return style.getPropertyValue(name).trim() || fallback;
}

function readFishPalette(): FishPalette {
  if (cachedFishPalette) return cachedFishPalette;
  const style = getComputedStyle(document.documentElement);
  cachedFishPalette = {
    waterTop: readCssVar(style, "--fish-water-top", "color-mix(in srgb, #3b5bdb 10%, transparent)"),
    waterBottom: readCssVar(style, "--fish-water-bottom", "color-mix(in srgb, #3b5bdb 22%, #ebebef)"),
    body: readCssVar(style, "--fish-body", "color-mix(in srgb, #3451b2 42%, transparent)"),
    waveStroke: readCssVar(style, "--fish-wave-stroke", "color-mix(in srgb, #3b5bdb 28%, transparent)"),
  };
  return cachedFishPalette;
}

function invalidateFishPalette() {
  cachedFishPalette = undefined;
}

function watchFishPaint() {
  if (paintObserver || typeof MutationObserver === "undefined") return;
  paintObserver = new MutationObserver(invalidateFishPalette);
  paintObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

class SurfacePoint {
  static readonly SPRING_CONSTANT = 0.03;
  static readonly SPRING_FRICTION = 0.9;
  static readonly WAVE_SPREAD = 0.3;
  static readonly ACCELARATION_RATE = 0.01;

  height = 0;
  fy = 0;
  force = { previous: 0, next: 0 };
  initHeight = 0;
  previous?: SurfacePoint;
  next?: SurfacePoint;

  constructor(
    private renderer: FishRenderer,
    readonly x: number,
  ) {
    this.initHeight = renderer.height * renderer.INIT_HEIGHT_RATE;
    this.height = this.initHeight;
  }

  setPreviousPoint(previous: SurfacePoint) {
    this.previous = previous;
  }

  setNextPoint(next: SurfacePoint) {
    this.next = next;
  }

  interfere(y: number, velocity: number) {
    this.fy =
      this.renderer.height *
      SurfacePoint.ACCELARATION_RATE *
      (this.renderer.height - this.height - y >= 0 ? -1 : 1) *
      Math.abs(velocity);
  }

  updateSelf() {
    this.fy += SurfacePoint.SPRING_CONSTANT * (this.initHeight - this.height);
    this.fy *= SurfacePoint.SPRING_FRICTION;
    this.height += this.fy;
  }

  updateNeighbors() {
    if (this.previous) {
      this.force.previous =
        SurfacePoint.WAVE_SPREAD * (this.height - this.previous.height);
    }
    if (this.next) {
      this.force.next = SurfacePoint.WAVE_SPREAD * (this.height - this.next.height);
    }
  }

  render(context: CanvasRenderingContext2D) {
    if (this.previous) {
      this.previous.height += this.force.previous;
      this.previous.fy += this.force.previous;
    }
    if (this.next) {
      this.next.height += this.force.next;
      this.next.fy += this.force.next;
    }
    context.lineTo(this.x, this.renderer.height - this.height);
  }
}

class Fish {
  static readonly GRAVITY = 0.4;

  direction = false;
  x = 0;
  y = 0;
  previousY = 0;
  vx = 0;
  vy = 0;
  ay = 0;
  isOut = false;
  theta = 0;
  phi = 0;

  constructor(private renderer: FishRenderer) {
    this.init();
  }

  private getRandomValue(min: number, max: number) {
    return min + (max - min) * Math.random();
  }

  init() {
    this.direction = Math.random() < 0.5;
    this.x = this.direction
      ? this.renderer.width + this.renderer.THRESHOLD
      : -this.renderer.THRESHOLD;
    this.vx = this.getRandomValue(4, 10) * (this.direction ? -1 : 1);
    this.y = this.getRandomValue(
      (this.renderer.height * 6) / 10,
      (this.renderer.height * 9) / 10,
    );
    this.vy = this.getRandomValue(-5, -2);
    this.ay = this.getRandomValue(-0.2, -0.05);
    this.previousY = this.y;
    this.isOut = false;
    this.theta = 0;
    this.phi = 0;
  }

  private controlStatus() {
    this.previousY = this.y;
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.ay;

    if (this.y < this.renderer.height * this.renderer.INIT_HEIGHT_RATE) {
      this.vy += Fish.GRAVITY;
      this.isOut = true;
    } else {
      if (this.isOut) {
        this.ay = this.getRandomValue(-0.2, -0.05);
      }
      this.isOut = false;
    }

    if (!this.isOut) {
      this.theta += Math.PI / 20;
      this.theta %= Math.PI * 2;
      this.phi += Math.PI / 30;
      this.phi %= Math.PI * 2;
    }

    this.renderer.generateEpicenter(
      this.x + (this.direction ? -1 : 1) * this.renderer.THRESHOLD,
      this.y,
      this.y - this.previousY,
    );

    if (
      (this.vx > 0 && this.x > this.renderer.width + this.renderer.THRESHOLD) ||
      (this.vx < 0 && this.x < -this.renderer.THRESHOLD)
    ) {
      this.init();
    }
  }

  render(context: CanvasRenderingContext2D, palette: FishPalette) {
    context.save();
    context.translate(this.x, this.y);
    context.rotate(Math.PI + Math.atan2(this.vy, this.vx));
    context.scale(1, this.direction ? 1 : -1);
    context.fillStyle = palette.body;

    context.beginPath();
    context.moveTo(-30, 0);
    context.bezierCurveTo(-20, 15, 15, 10, 40, 0);
    context.bezierCurveTo(15, -10, -20, -15, -30, 0);
    context.fill();

    context.save();
    context.translate(40, 0);
    context.scale(0.9 + 0.2 * Math.sin(this.theta), 1);
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(5, 10, 20, 8);
    context.quadraticCurveTo(12, 5, 10, 0);
    context.quadraticCurveTo(12, -5, 20, -8);
    context.quadraticCurveTo(5, -10, 0, 0);
    context.fill();
    context.restore();

    context.save();
    context.translate(-3, 0);
    context.rotate(Math.PI / 3 + (Math.PI / 10) * Math.sin(this.phi));
    context.beginPath();
    context.moveTo(-5, 0);
    context.bezierCurveTo(-10, -10, -10, -30, 0, -40);
    context.bezierCurveTo(12, -25, 8, -10, 0, 0);
    context.closePath();
    context.fill();
    context.restore();

    context.restore();
    this.controlStatus();
  }
}

class FishRenderer {
  readonly POINT_INTERVAL = 5;
  readonly FISH_COUNT = 3;
  readonly MAX_INTERVAL_COUNT = 50;
  readonly INIT_HEIGHT_RATE = 0.5;
  readonly THRESHOLD = 50;

  width = 0;
  height = 0;
  fishCount = 0;
  pointInterval = 0;
  intervalCount = 0;
  dpr = 1;

  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private points: SurfacePoint[] = [];
  private fishes: Fish[] = [];
  private axis: { x: number; y: number } | null = null;
  private rafId = 0;
  private running = false;
  private visible = true;
  private resizeObserver: ResizeObserver | undefined;
  private intersectionObserver: IntersectionObserver | undefined;

  private readonly onVisibilityChange = () => {
    this.visible = document.visibilityState === "visible";
    if (this.visible && this.running && !this.rafId) this.render();
  };
  private readonly onPointerEnter = (e: PointerEvent) => this.startEpicenter(e);
  private readonly onPointerMove = (e: PointerEvent) => this.moveEpicenter(e);
  private readonly onResize = () => this.setup();
  private readonly renderFrame = () => this.render();

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    container.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.context = ctx;
  }

  init() {
    this.setup();
    this.bindEvent();
    this.running = true;
    this.render();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.container.removeEventListener("pointerenter", this.onPointerEnter);
    this.container.removeEventListener("pointermove", this.onPointerMove);
  }

  private setup() {
    this.points = [];
    this.fishes = [];
    this.intervalCount = this.MAX_INTERVAL_COUNT;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.fishCount =
      (this.FISH_COUNT * this.width) / 500 * (this.height / 500);
    this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.fishes.push(new Fish(this));
    this.createSurfacePoints();
  }

  private createSurfacePoints() {
    const count = Math.max(2, Math.round(this.width / this.POINT_INTERVAL));
    this.pointInterval = this.width / (count - 1);
    this.points.push(new SurfacePoint(this, 0));

    for (let i = 1; i < count; i++) {
      const point = new SurfacePoint(this, i * this.pointInterval);
      const previous = this.points[i - 1];
      point.setPreviousPoint(previous);
      previous.setNextPoint(point);
      this.points.push(point);
    }
  }

  private bindEvent() {
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.container.addEventListener("pointerenter", this.onPointerEnter);
    this.container.addEventListener("pointermove", this.onPointerMove);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener("resize", this.onResize);
    }

    if (typeof IntersectionObserver !== "undefined") {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          this.visible = entries.some((entry) => entry.isIntersecting);
          if (this.visible && this.running && !this.rafId) this.render();
        },
        { root: null, threshold: 0 },
      );
      this.intersectionObserver.observe(this.container);
    }
  }

  private getAxis(event: PointerEvent) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private startEpicenter(event: PointerEvent) {
    this.axis = this.getAxis(event);
  }

  private moveEpicenter(event: PointerEvent) {
    if (event.pointerType === "mouse" && event.buttons === 0) return;
    const axis = this.getAxis(event);
    if (!this.axis) {
      this.axis = axis;
    }
    this.generateEpicenter(axis.x, axis.y, axis.y - this.axis.y);
    this.axis = axis;
  }

  generateEpicenter(x: number, y: number, velocity: number) {
    if (y < this.height / 2 - this.THRESHOLD || y > this.height / 2 + this.THRESHOLD) {
      return;
    }
    const index = Math.round(x / this.pointInterval);
    if (index < 0 || index >= this.points.length) return;
    this.points[index].interfere(y, velocity);
  }

  private controlStatus() {
    for (const point of this.points) point.updateSelf();
    for (const point of this.points) point.updateNeighbors();
    if (this.fishes.length < this.fishCount) {
      if (--this.intervalCount === 0) {
        this.intervalCount = this.MAX_INTERVAL_COUNT;
        this.fishes.push(new Fish(this));
      }
    }
  }

  private drawWater(palette: FishPalette) {
    const waveY = this.height * this.INIT_HEIGHT_RATE;
    const gradient = this.context.createLinearGradient(0, waveY - 12, 0, this.height);
    gradient.addColorStop(0, palette.waterTop);
    gradient.addColorStop(1, palette.waterBottom);
    const surfaceYs = this.points.map((point) => this.height - point.height);

    this.context.save();
    this.context.beginPath();
    this.context.moveTo(0, this.height);

    for (const point of this.points) {
      point.render(this.context);
    }

    this.context.lineTo(this.width, this.height);
    this.context.closePath();
    this.context.fillStyle = gradient;
    this.context.fill();

    this.context.beginPath();
    for (let i = 0; i < this.points.length; i++) {
      const x = this.points[i].x;
      const y = surfaceYs[i];
      if (i === 0) this.context.moveTo(x, y);
      else this.context.lineTo(x, y);
    }
    this.context.strokeStyle = palette.waveStroke;
    this.context.lineWidth = 1.25;
    this.context.stroke();
    this.context.restore();
  }

  private render() {
    if (!this.running) return;
    this.rafId = 0;
    if (!this.visible || document.visibilityState === "hidden") return;

    this.rafId = requestAnimationFrame(this.renderFrame);
    this.controlStatus();
    this.context.clearRect(0, 0, this.width, this.height);

    const palette = readFishPalette();
    this.drawWater(palette);

    for (const fish of this.fishes) {
      fish.render(this.context, palette);
    }
  }
}

let activeRenderer: FishRenderer | undefined;
let setupObserver: ResizeObserver | undefined;

function ensureFishContainer(footer: HTMLElement): HTMLElement {
  let container = footer.querySelector<HTMLElement>(`#${CONTAINER_ID}`);
  if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.className = CONTAINER_CLASS;
    container.setAttribute("aria-hidden", "true");
    footer.prepend(container);
  }
  return container;
}

function startRenderer(footer: HTMLElement, container: HTMLElement) {
  footer.classList.add("has-flying-fish");
  watchFishPaint();
  activeRenderer = new FishRenderer(container);
  activeRenderer.init();
}

/** 在页脚挂载游鱼特效（全站一次初始化） */
export function setupFlyingFish() {
  if (typeof window === "undefined") return;
  if (activeRenderer) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const footer = document.querySelector<HTMLElement>(".VPFooter");
  if (!footer) return;

  const container = ensureFishContainer(footer);
  if (container.clientHeight >= 40 && container.clientWidth >= 40) {
    startRenderer(footer, container);
    return;
  }

  if (typeof ResizeObserver === "undefined") return;
  setupObserver?.disconnect();
  setupObserver = new ResizeObserver(() => {
    if (activeRenderer) {
      setupObserver?.disconnect();
      setupObserver = undefined;
      return;
    }
    if (container.clientHeight < 40 || container.clientWidth < 40) return;
    setupObserver?.disconnect();
    setupObserver = undefined;
    startRenderer(footer, container);
  });
  setupObserver.observe(container);
}
