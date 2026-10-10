/** 全屏四边形上的域扭曲色场。返回 null 表示当前环境没有 WebGL。 */

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_warp;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec2 m = u_mouse - 0.5;
  float t = u_time;
  vec2 q = vec2(
    fbm(p * 1.55 + t * 0.13),
    fbm(p * 1.55 + vec2(5.2, 1.3) - t * 0.11)
  );
  vec2 r = vec2(
    fbm(p + u_warp * q + m * 0.85 + t * 0.04),
    fbm(p + u_warp * q + vec2(8.3, 2.8) - m * 0.7)
  );
  float f = fbm(p * 1.15 + u_warp * r);
  vec3 ink = vec3(0.07, 0.08, 0.12);
  vec3 accent = vec3(0.23, 0.36, 0.86);
  vec3 warm = vec3(0.93, 0.74, 0.48);
  vec3 col = mix(ink, accent, smoothstep(0.18, 0.72, f));
  col = mix(col, warm, smoothstep(0.55, 0.92, length(q)) * 0.72);
  float ridge = smoothstep(0.02, 0.0, abs(f - 0.48));
  col += ridge * vec3(0.35, 0.42, 0.7) * 0.35;
  float vig = smoothstep(1.2, 0.2, length(p));
  col *= 0.62 + 0.38 * vig;
  gl_FragColor = vec4(col, 1.0);
}
`;

export type FieldHandle = {
  setWarp: (warp: number) => void;
  setSpeed: (speed: number) => void;
  destroy: () => void;
};

export function mountField(
  canvas: HTMLCanvasElement,
  options: { warp?: number; speed?: number } = {}
): FieldHandle | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      canvas.dataset.glError = gl.getShaderInfoLog(shader) || "shader";
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    canvas.dataset.glError = gl.getProgramInfoLog(program) || "link";
    return null;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  const loc = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, "u_res");
  const uMouse = gl.getUniformLocation(program, "u_mouse");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uWarp = gl.getUniformLocation(program, "u_warp");

  let warp = options.warp ?? 1.35;
  let speed = options.speed ?? 1;
  let mouseX = 0.5;
  let mouseY = 0.5;
  let raf = 0;
  let running = true;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const started = performance.now();

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.max(2, Math.round(rect.width * dpr));
    const h = Math.max(2, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const paint = (now: number) => {
    if (!running) return;
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mouseX, mouseY);
    const elapsed = reduced ? 0.4 : ((now - started) / 1000) * speed;
    gl.uniform1f(uTime, elapsed);
    gl.uniform1f(uWarp, warp);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const loop = (now: number) => {
    if (!running) return;
    paint(now);
    raf = window.requestAnimationFrame(loop);
  };

  const onPointer = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    mouseX = (event.clientX - rect.left) / rect.width;
    mouseY = 1 - (event.clientY - rect.top) / rect.height;
    if (reduced) paint(performance.now());
  };

  const onLeave = () => {
    mouseX = 0.5;
    mouseY = 0.5;
    if (reduced) paint(performance.now());
  };

  canvas.addEventListener("pointermove", onPointer);
  canvas.addEventListener("pointerleave", onLeave);
  const ro = new ResizeObserver(() => {
    paint(performance.now());
  });
  ro.observe(canvas);
  paint(performance.now());
  if (!reduced) raf = window.requestAnimationFrame(loop);

  return {
    setWarp(next) {
      warp = next;
      if (reduced) draw(performance.now());
    },
    setSpeed(next) {
      speed = next;
    },
    destroy() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    },
  };
}
