"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export type RingFieldMode = "auto" | "glow" | "ink";
export type RingFieldFlow = "outward" | "inward";

export interface RingFieldHandle {
  pulse: () => void;
}

export interface RingFieldProps {
  colors?: [string, string];
  backgroundColor?: string;
  mode?: RingFieldMode;
  rings?: number;
  particles?: number;
  thickness?: number;
  folds?: number;
  fold?: number;
  dust?: number;
  innerRadius?: number;
  outerRadius?: number;
  flow?: RingFieldFlow;
  flowSpeed?: number;
  morph?: number;
  lobes?: number;
  turbulence?: number;
  morphSpeed?: number;
  twist?: number;
  rotation?: number;
  aspect?: number;
  tilt?: number;
  centerX?: number;
  centerY?: number;
  scale?: number;
  particleSize?: number;
  sizeVariance?: number;
  sparkle?: number;
  prism?: number;
  twinkle?: number;
  fade?: number;
  glow?: number;
  intensity?: number;
  grain?: number;
  interactive?: boolean;
  push?: number;
  pulse?: number;
  paused?: boolean;
  quality?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

interface Settings {
  colors: [string, string];
  backgroundColor: string;
  mode: RingFieldMode;
  rings: number;
  particles: number;
  thickness: number;
  folds: number;
  fold: number;
  dust: number;
  innerRadius: number;
  outerRadius: number;
  flow: RingFieldFlow;
  flowSpeed: number;
  morph: number;
  lobes: number;
  turbulence: number;
  morphSpeed: number;
  twist: number;
  rotation: number;
  aspect: number;
  tilt: number;
  centerX: number;
  centerY: number;
  scale: number;
  particleSize: number;
  sizeVariance: number;
  sparkle: number;
  prism: number;
  twinkle: number;
  fade: number;
  glow: number;
  intensity: number;
  grain: number;
  interactive: boolean;
  push: number;
  pulse: number;
  paused: boolean;
  quality: number;
  reduced: boolean;
}

interface Controller {
  sync: () => void;
  destroy: () => void;
  pulse: () => void;
}

interface Kick {
  x: number;
  y: number;
  vx: number;
  vy: number;
  reach: number;
  age: number;
  kind: number;
  speed: number;
  life: number;
}

type Rgb = [number, number, number];

const MAX_RINGS = 24;
const DISTANCE = 3.6;
const TAU = Math.PI * 2;
const REFERENCE_COUNT = 26000;
const REFERENCE_UNIT = 360;
const MAX_KICKS = 32;
const PULSES = 4;
const KICK_TIME = 0.32;
const WAKE_LIFE = 2.6;
const PULSE_LIFE = 3.6;

const subscribeToMotion = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

const readMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

let colorContext: CanvasRenderingContext2D | null = null;
const colorCache = new Map<string, Rgb>();

const parseColor = (doc: Document, value: string, fallback: Rgb): Rgb => {
  const cached = colorCache.get(value);
  if (cached) return cached;
  if (!colorContext) colorContext = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!colorContext) return fallback;
  colorContext.fillStyle = "#010203";
  colorContext.fillStyle = value;
  let parsed: Rgb = fallback;
  if (String(colorContext.fillStyle) !== "#010203" || value.trim().toLowerCase() === "#010203") {
    colorContext.clearRect(0, 0, 1, 1);
    colorContext.fillRect(0, 0, 1, 1);
    const pixel = colorContext.getImageData(0, 0, 1, 1).data;
    parsed = [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255];
  }
  if (colorCache.size > 48) colorCache.clear();
  colorCache.set(value, parsed);
  return parsed;
};

const toLinear = (value: number) => (value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));

const toOklab = ([r, g, b]: Rgb): Rgb => {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const fromOklab = ([lightness, a, b]: Rgb): Rgb => {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

const toInk = ([lightness, a, b]: Rgb): Rgb => {
  const target = clamp(lightness * 0.8, 0.3, 0.55);
  let low = 0;
  let high = 1.15;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    const rgb = fromOklab([target, a * mid, b * mid]);
    if (Math.min(rgb[0], rgb[1], rgb[2]) >= -0.001 && Math.max(rgb[0], rgb[1], rgb[2]) <= 1.001) low = mid;
    else high = mid;
  }
  return [target, a * low, b * low];
};

const ringVertex = `
in vec4 aSeed;
in vec4 aTrait;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uUnit;
uniform float uDistance;
uniform float uIncline;
uniform float uAspect;
uniform int uRings;
uniform float uFlow;
uniform float uInner;
uniform float uOuter;
uniform float uThickness;
uniform float uFolds;
uniform float uFold;
uniform float uDust;
uniform float uMorph;
uniform float uLobes;
uniform float uTurbulence;
uniform float uShape;
uniform float uTwist;
uniform float uRotation;
uniform float uFadeIn;
uniform float uFadeOut;
uniform float uPixelRatio;
uniform float uMaxPoint;
uniform float uSize;
uniform float uSizeVariance;
uniform float uSparkle;
uniform float uPrism;
uniform float uTwinkle;
uniform float uTime;
uniform float uGain;
uniform float uInk;
uniform vec3 uLabA;
uniform vec3 uLabB;
uniform vec3 uInkA;
uniform vec3 uInkB;
uniform vec4 uKickA[${MAX_KICKS}];
uniform vec4 uKickB[${MAX_KICKS}];
uniform float uKickTime;
out vec3 vColor;
out float vGain;
out float vSigma;
out float vSpan;

vec3 lattice(vec3 cell) {
  uvec3 v = uvec3(ivec3(cell)) * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return vec3(v >> 8u) * (2.0 / 16777215.0) - 1.0;
}

float corner(vec3 cell, vec3 f, vec3 o) {
  return dot(lattice(cell + o), f - o);
}

float noise(vec3 p) {
  vec3 cell = floor(p);
  vec3 f = p - cell;
  vec3 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float x00 = mix(corner(cell, f, vec3(0.0, 0.0, 0.0)), corner(cell, f, vec3(1.0, 0.0, 0.0)), w.x);
  float x10 = mix(corner(cell, f, vec3(0.0, 1.0, 0.0)), corner(cell, f, vec3(1.0, 1.0, 0.0)), w.x);
  float x01 = mix(corner(cell, f, vec3(0.0, 0.0, 1.0)), corner(cell, f, vec3(1.0, 0.0, 1.0)), w.x);
  float x11 = mix(corner(cell, f, vec3(0.0, 1.0, 1.0)), corner(cell, f, vec3(1.0, 1.0, 1.0)), w.x);
  return 1.8 * mix(mix(x00, x10, w.y), mix(x01, x11, w.y), w.z);
}

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return max(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0);
}

void main() {
  int slotIndex = gl_VertexID % uRings;
  float rings = float(uRings);
  float slot = float(slotIndex);
  float travel = slot + uFlow;
  float generation = floor(travel / rings);
  float u = clamp((travel - generation * rings) / rings, 0.0, 1.0);
  float id = slot - generation * rings;
  float base = mix(uInner, uOuter, u);
  float spacing = (uOuter - uInner) / rings;
  float dust = step(aSeed.z, uDust);

  float lobes = uLobes;
  float local = aSeed.x - uTwist * id / max(lobes, 1.0);
  float wander = 1.7 * noise(vec3(id * 0.27, uShape * 0.55, 4.3));
  float swell = 0.8 + 0.3 * noise(vec3(id * 0.21, uShape * 0.42, 9.1));
  float lobe = cos(lobes * local + wander) * swell * (lobes > 0.5 ? 1.0 : 0.4);
  vec2 around = vec2(cos(local), sin(local));
  float broad = noise(vec3(around * (0.6 + 0.24 * lobes), id * 0.17 + uShape));
  float fine = noise(vec3(around * (2.4 + 0.7 * lobes), id * 0.33 + uShape * 1.9 + 17.0));
  float shape = 0.62 * lobe + 0.38 * broad + uTurbulence * 0.42 * fine;
  float centre = base * (1.0 + uMorph * (0.55 + 0.9 * u) * shape);

  float wave = 0.5 + 0.5 * sin(uFolds * local + 6.2831853 * fract(id * 0.618034) + uShape * 0.8 + 1.6 * noise(vec3(around * 0.85, id * 0.29 + uShape * 0.35 + 51.0)));
  float open = smoothstep(0.66, 0.97, wave);
  float phi = 1.5707963 * (1.0 - uFold * open);
  float width = uThickness * spacing * (0.8 + 0.4 * u);
  float across = aSeed.y * width;
  float radial = mix(across * max(cos(phi), 0.07), aTrait.z * spacing * 0.7, dust);
  float lift = mix(across * sin(phi), aTrait.w * width * 0.8, dust);
  float radius = max(centre + radial, 0.0);
  float theta = aSeed.x + uRotation;
  vec3 plane = vec3(radius * cos(theta) * uAspect, radius * sin(theta), lift);

  float ci = cos(uIncline);
  float si = sin(uIncline);
  vec3 q = vec3(plane.x, plane.y * ci + plane.z * si, -plane.y * si + plane.z * ci);
  float depth = uDistance - q.z;
  float clip = smoothstep(0.4, 1.4, depth);
  depth = max(depth, 0.4);
  float near = uDistance / depth;
  vec2 screen = uCenter + uUnit * near * q.xy;

  float scatter = 0.6 + 0.8 * fract(aSeed.w * 7.31);
  float delay = 0.75 + 0.5 * fract(aSeed.w * 3.17);
  float swirl = (fract(aSeed.w * 11.7) - 0.5) * 0.9;
  float cs = cos(swirl);
  float sn = sin(swirl);
  vec2 offset = vec2(0.0);
  for (int i = 0; i < ${MAX_KICKS}; i++) {
    vec4 a = uKickA[i];
    if (a.w < 0.0) continue;
    vec4 b = uKickB[i];
    vec2 d = screen - a.xy;
    float dist = length(d);
    vec2 away = dist > 1e-3 ? d / dist : vec2(0.0);
    float strength = length(b.xy);
    float tau = a.w;
    float fall = exp(-dist * dist / (a.z * a.z));
    vec2 push = b.xy + away * strength * 0.45;
    if (b.z > 0.5) {
      tau = a.w - dist / b.w;
      fall = exp(-dist / a.z);
      push = away * strength;
    }
    if (tau <= 0.0 || fall < 0.003) continue;
    float t = tau / (uKickTime * delay);
    float response = t * exp(1.0 - t);
    offset += vec2(cs * push.x - sn * push.y, sn * push.x + cs * push.y) * fall * response;
  }
  offset *= scatter * (1.0 + 0.8 * dust);
  offset /= 1.0 + length(offset) / (uUnit * 0.18);
  screen += offset;
  float stirred = clamp(length(offset) / (uUnit * 0.05), 0.0, 1.0);

  float fadeOut = 1.0 - smoothstep(1.0 - uFadeOut, 1.0, u);
  float fade = smoothstep(0.0, uFadeIn, u) * fadeOut * fadeOut;
  float rim = smoothstep(0.72, 0.97, aSeed.y) * (1.0 - dust);
  float prism = step(1.0 - uPrism, aTrait.x);
  float glint = step(1.0 - uPrism - uSparkle * 0.3, aTrait.x) * (1.0 - prism);
  float beat = 0.5 + 0.5 * sin(uTime * (0.45 + 1.3 * fract(aSeed.w * 5.3)) + aSeed.w * 6.2831853);
  float twinkle = 1.0 - uTwinkle * (0.45 + 0.35 * glint + 0.3 * dust) * beat;
  float character = noise(vec3(id * 0.61, 2.7, uShape * 0.15));
  float clump = 1.0 + 0.3 * noise(vec3(around * 1.4, id * 0.43 + uShape * 0.6 + 31.0));

  float tone = clamp(0.2 + 0.55 * rim + (1.0 - u) * 0.35 - 0.3 * dust + (aTrait.y - 0.5) * 0.3, 0.0, 1.0);
  vec3 lab = mix(uLabA, uLabB, tone);
  float hue = aSeed.w * 6.2831853;
  vec3 speck = vec3(0.74, 0.13 * cos(hue), 0.13 * sin(hue));
  lab = mix(lab, speck, prism);
  vec3 bright = labToLinear(mix(lab, vec3(0.97, lab.yz * 0.18), glint * 0.8 + rim * 0.08));
  vec3 inked = labToLinear(mix(mix(uInkA, uInkB, tone), vec3(0.52, speck.yz), prism)) * (1.0 - 0.4 * glint);
  vColor = mix(bright, inked, uInk);

  float sizeMix = mix(1.0, 0.5 + 1.25 * aTrait.y * aTrait.y, uSizeVariance) * (1.0 - 0.25 * dust);
  float px = uSize * uPixelRatio * sizeMix * mix(1.0, near, 0.6) * (1.0 + 0.3 * glint + 0.2 * prism);
  float wanted = px / 2.3548;
  float sigma = clamp(wanted, 0.55, max((uMaxPoint - 1.5) / 5.0, 0.55));
  float shrink = min(1.0, (wanted * wanted) / (sigma * sigma));
  float body = mix(0.85 + 0.45 * rim, 0.38, dust);
  float gain = uGain * fade * twinkle * shrink * body * (1.0 + 1.6 * glint + 0.8 * prism) * mix(1.0, near, 0.5) * clip;
  gain *= (1.0 + 0.2 * character) * clump * (1.0 + 0.5 * stirred);

  vGain = gain;
  vSigma = sigma;
  vSpan = 5.0 * sigma + 1.5;
  gl_PointSize = vSpan;
  gl_Position = gain > 1e-5 ? vec4(screen / uResolution * 2.0 - 1.0, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const ringFragment = `
precision highp float;
in vec3 vColor;
in float vGain;
in float vSigma;
in float vSpan;
out vec4 fragColor;

void main() {
  vec2 d = (gl_PointCoord - 0.5) * vSpan;
  float r2 = dot(d, d) / (vSigma * vSigma);
  float e = max(exp(-0.5 * r2) - 0.0439369, 0.0) * (vGain / 0.9560631);
  fragColor = vec4(vColor * e, e);
}
`;

const passVertex = `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const downFragment = `
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = (a + b + c + d) * 0.125 + texture(uSource, vUv) * 0.5;
}
`;

const upFragment = `
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
uniform float uKeep;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 4.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, -1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, 1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = texture(uBase, vUv) + sum * (uKeep / 16.0);
}
`;

const compositeFragment = `
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uGlow;
uniform float uExposure;
uniform float uMode;
uniform float uGrain;
uniform float uSeed;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 lines = texture(uLines, vUv);
  vec4 bloom = texture(uBloom, vUv);
  float speck = hash(gl_FragCoord.xy + uSeed * 311.0) - 0.5;
  vec3 color;
  float lit;
  if (uMode < 0.5) {
    vec3 light = (lines.rgb + bloom.rgb * uGlow) * uExposure;
    vec3 exposed = 1.0 - exp(-light);
    float peak = max(exposed.r, max(exposed.g, exposed.b));
    exposed = mix(exposed, vec3(peak), smoothstep(0.75, 1.0, peak) * 0.35);
    color = uBackground + (1.0 - uBackground) * exposed;
    lit = peak;
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.25;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.25) / max(energy, 1e-4);
    float density = 1.05 * (1.0 - exp(-energy * uExposure));
    vec3 absorb = -log(clamp(hue, 0.03, 1.0));
    color = uBackground * exp(-absorb * density);
    lit = min(density, 1.0);
  }
  float dither = hash(gl_FragCoord.xy * 1.37 + uSeed * 97.0) + hash(gl_FragCoord.xy * 0.71 + uSeed * 41.0 + 13.0) - 1.0;
  vec3 encoded = encode(color) + speck * uGrain * (2.0 / 255.0 + 0.07 * lit) + dither / 255.0;
  fragColor = vec4(encoded, 1.0);
}
`;

const seeded = (start: number) => {
  let state = start;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
};

const buildParticles = (count: number) => {
  const random = seeded(29);
  const gauss = () => {
    const u = Math.max(random(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * random());
  };
  const stride = 8;
  const data = new Float32Array(count * stride);
  for (let i = 0; i < count; i++) {
    const rim = random() < 0.3;
    const across = rim ? 1 - 0.16 * random() * random() : 1 - 2 * Math.pow(random(), 0.85);
    data.set(
      [random() * TAU, across, random(), random(), random(), random(), clamp(gauss(), -3, 3), clamp(gauss(), -3, 3)],
      i * stride,
    );
  }
  const geometry = new THREE.BufferGeometry();
  const buffer = new THREE.InterleavedBuffer(data, stride);
  geometry.setAttribute("aSeed", new THREE.InterleavedBufferAttribute(buffer, 4, 0));
  geometry.setAttribute("aTrait", new THREE.InterleavedBufferAttribute(buffer, 4, 4));
  geometry.setAttribute("position", new THREE.InterleavedBufferAttribute(buffer, 3, 0));
  return geometry;
};

const createField = (root: HTMLDivElement, settingsRef: { current: Settings }): Controller | null => {
  const doc = root.ownerDocument;
  const view = doc.defaultView ?? window;
  const canvas = doc.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
  root.prepend(canvas);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: "high-performance" });
  } catch {
    canvas.remove();
    return null;
  }
  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose();
    canvas.remove();
    return null;
  }
  renderer.autoClear = false;
  const texelType =
    renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float")
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType;

  const gl = renderer.getContext();
  const pointRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
  const maxPoint = pointRange && pointRange.length > 1 ? Math.max(8, pointRange[1]) : 64;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const plane = new THREE.PlaneGeometry(2, 2);
  const kickA = Array.from({ length: MAX_KICKS }, () => new THREE.Vector4(0, 0, 1, -1));
  const kickB = Array.from({ length: MAX_KICKS }, () => new THREE.Vector4());
  const kicks: Kick[] = [];

  const ringMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCenter: { value: new THREE.Vector2() },
      uUnit: { value: 1 },
      uDistance: { value: DISTANCE },
      uIncline: { value: 0 },
      uAspect: { value: 1 },
      uRings: { value: 7 },
      uFlow: { value: 0 },
      uInner: { value: 0.14 },
      uOuter: { value: 1.05 },
      uThickness: { value: 0.34 },
      uFolds: { value: 3 },
      uFold: { value: 0.9 },
      uDust: { value: 0.14 },
      uMorph: { value: 0.11 },
      uLobes: { value: 3 },
      uTurbulence: { value: 0.35 },
      uShape: { value: 0 },
      uTwist: { value: 0.35 },
      uRotation: { value: 0 },
      uFadeIn: { value: 0.2 },
      uFadeOut: { value: 0.3 },
      uPixelRatio: { value: 1 },
      uMaxPoint: { value: 64 },
      uSize: { value: 1.5 },
      uSizeVariance: { value: 0.5 },
      uSparkle: { value: 0.05 },
      uPrism: { value: 0.04 },
      uTwinkle: { value: 0.3 },
      uTime: { value: 0 },
      uGain: { value: 1 },
      uInk: { value: 0 },
      uLabA: { value: new THREE.Vector3() },
      uLabB: { value: new THREE.Vector3() },
      uInkA: { value: new THREE.Vector3() },
      uInkB: { value: new THREE.Vector3() },
      uKickA: { value: kickA },
      uKickB: { value: kickB },
      uKickTime: { value: KICK_TIME },
    },
    vertexShader: ringVertex,
    fragmentShader: ringFragment,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  });

  const pass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
    new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms,
      vertexShader: passVertex,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });

  const downMaterial = pass(downFragment, { uSource: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const upMaterial = pass(upFragment, {
    uSource: { value: null },
    uBase: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uKeep: { value: 0.62 },
  });
  const compositeMaterial = pass(compositeFragment, {
    uLines: { value: null },
    uBloom: { value: null },
    uBackground: { value: new THREE.Vector3() },
    uGlow: { value: 0.45 },
    uExposure: { value: 1 },
    uMode: { value: 0 },
    uGrain: { value: 0.3 },
    uSeed: { value: 0 },
  });

  const points = new THREE.Points(new THREE.BufferGeometry(), ringMaterial);
  points.frustumCulled = false;
  const ringScene = new THREE.Scene();
  ringScene.add(points);
  const quad = new THREE.Mesh(plane, compositeMaterial);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  let particleCount = 0;

  const target = (w: number, h: number) =>
    new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
      type: texelType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });

  let lineTarget: THREE.WebGLRenderTarget | null = null;
  let downTargets: THREE.WebGLRenderTarget[] = [];
  let upTargets: THREE.WebGLRenderTarget[] = [];

  let destroyed = false;
  let lost = false;
  let raf = 0;
  let last = 0;
  let visible = true;
  let width = 1;
  let height = 1;
  let bufferWidth = 1;
  let bufferHeight = 1;
  let pixelRatio = 1;
  let seed = 0;
  let clock = 0;
  let flow = 0.37;
  let shape = 6.2;
  let turn = 0;
  let previous: { x: number; y: number; t: number } | null = null;

  const release = () => {
    lineTarget?.dispose();
    downTargets.forEach((item) => item.dispose());
    upTargets.forEach((item) => item.dispose());
    lineTarget = null;
    downTargets = [];
    upTargets = [];
  };

  const draw = (material: THREE.ShaderMaterial, output: THREE.WebGLRenderTarget | null) => {
    quad.material = material;
    renderer.setRenderTarget(output);
    renderer.render(quadScene, camera);
  };

  const ensureParticles = () => {
    const count = Math.round(clamp(settingsRef.current.particles, 2000, 200000));
    if (count === particleCount) return;
    particleCount = count;
    points.geometry.dispose();
    points.geometry = buildParticles(count);
  };

  const lens = () => {
    const settings = settingsRef.current;
    const w = bufferWidth;
    const h = bufferHeight;
    return {
      unit: 0.5 * Math.min(Math.max(w, h), 1.6 * Math.min(w, h)) * clamp(settings.scale, 0.2, 4),
      cx: (0.5 + 0.5 * clamp(settings.centerX, -1.5, 1.5)) * w,
      cy: (0.5 - 0.5 * clamp(settings.centerY, -1.5, 1.5)) * h,
      incline: (clamp(settings.tilt, 0, 80) * Math.PI) / 180,
      aspect: clamp(settings.aspect, 0.25, 4),
    };
  };

  const radii = () => {
    const settings = settingsRef.current;
    const inner = clamp(settings.innerRadius, 0, 3);
    const outer = Math.max(clamp(settings.outerRadius, 0.05, 4), inner + 0.05);
    return { inner, outer };
  };

  const toBuffer = (clientX: number, clientY: number) => {
    const rect = root.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const cssX = (clientX - rect.left) * (width / rect.width);
    const cssY = (clientY - rect.top) * (height / rect.height);
    return { x: cssX * (bufferWidth / width), y: (height - cssY) * (bufferHeight / height) };
  };

  const apply = () => {
    const settings = settingsRef.current;
    const uniforms = ringMaterial.uniforms;
    const optics = lens();
    const { inner, outer } = radii();
    const background = parseColor(doc, settings.backgroundColor, [0.04, 0.04, 0.04]);
    const luminance = 0.2126 * background[0] + 0.7152 * background[1] + 0.0722 * background[2];
    const ink = settings.mode === "ink" || (settings.mode === "auto" && luminance > 0.5);
    const labA = toOklab(parseColor(doc, settings.colors[0], [0.17, 0.78, 1]));
    const labB = toOklab(parseColor(doc, settings.colors[1], [0.61, 0.96, 0.89]));
    const rings = Math.round(clamp(settings.rings, 2, MAX_RINGS));
    const fade = clamp(settings.fade, 0, 1);

    uniforms.uResolution.value.set(bufferWidth, bufferHeight);
    uniforms.uCenter.value.set(optics.cx, optics.cy);
    uniforms.uUnit.value = optics.unit;
    uniforms.uIncline.value = optics.incline;
    uniforms.uAspect.value = optics.aspect;
    uniforms.uRings.value = rings;
    uniforms.uFlow.value = flow;
    uniforms.uInner.value = inner;
    uniforms.uOuter.value = outer;
    uniforms.uThickness.value = clamp(settings.thickness, 0, 2);
    uniforms.uFolds.value = Math.round(clamp(settings.folds, 0, 12));
    uniforms.uFold.value = clamp(settings.fold, 0, 1);
    uniforms.uDust.value = clamp(settings.dust, 0, 1);
    uniforms.uMorph.value = clamp(settings.morph, 0, 0.6);
    uniforms.uLobes.value = Math.round(clamp(settings.lobes, 0, 12));
    uniforms.uTurbulence.value = clamp(settings.turbulence, 0, 2);
    uniforms.uShape.value = shape;
    uniforms.uTwist.value = clamp(settings.twist, -Math.PI, Math.PI);
    uniforms.uRotation.value = turn;
    uniforms.uFadeIn.value = Math.max(0.04, fade);
    uniforms.uFadeOut.value = Math.max(0.04, fade);
    uniforms.uPixelRatio.value = pixelRatio;
    uniforms.uMaxPoint.value = maxPoint;
    uniforms.uSize.value = clamp(settings.particleSize, 0.3, 8);
    uniforms.uSizeVariance.value = clamp(settings.sizeVariance, 0, 1);
    uniforms.uSparkle.value = clamp(settings.sparkle, 0, 1);
    uniforms.uPrism.value = clamp(settings.prism, 0, 0.5);
    uniforms.uTwinkle.value = settings.reduced ? 0 : clamp(settings.twinkle, 0, 1);
    uniforms.uTime.value = clock;
    uniforms.uInk.value = ink ? 1 : 0;
    uniforms.uLabA.value.set(labA[0], labA[1], labA[2]);
    uniforms.uLabB.value.set(labB[0], labB[1], labB[2]);
    if (ink) {
      const inkA = toInk(labA);
      const inkB = toInk(labB);
      uniforms.uInkA.value.set(inkA[0], inkA[1], inkA[2]);
      uniforms.uInkB.value.set(inkB[0], inkB[1], inkB[2]);
    }

    const unitCss = optics.unit / pixelRatio;
    const area = Math.pow(unitCss / REFERENCE_UNIT, 2);
    const share = clamp(area, 0.25, 1) * clamp(settings.quality, 0.25, 1);
    points.geometry.setDrawRange(0, Math.round(particleCount * share));
    uniforms.uGain.value =
      0.6 * Math.sqrt(REFERENCE_COUNT / particleCount) * clamp(area / share, 0.5, 4);
    for (let i = 0; i < MAX_KICKS; i++) {
      const kick = kicks[i];
      if (!kick) {
        kickA[i].w = -1;
        continue;
      }
      kickA[i].set(kick.x, kick.y, kick.reach, kick.age);
      kickB[i].set(kick.vx, kick.vy, kick.kind, kick.speed);
    }

    const composite = compositeMaterial.uniforms;
    composite.uBackground.value.set(toLinear(background[0]), toLinear(background[1]), toLinear(background[2]));
    composite.uGlow.value = clamp(settings.glow, 0, 3) * (ink ? 0.5 : 1);
    composite.uExposure.value = (ink ? 2.2 : 1) * clamp(settings.intensity, 0, 4);
    composite.uMode.value = ink ? 1 : 0;
    composite.uGrain.value = clamp(settings.grain, 0, 1);
    composite.uSeed.value = seed;
  };

  const render = () => {
    if (!lineTarget || !downTargets.length || lost) return;
    ensureParticles();
    apply();
    renderer.setRenderTarget(lineTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(ringScene, camera);
    let source = lineTarget;
    for (const item of downTargets) {
      downMaterial.uniforms.uSource.value = source.texture;
      downMaterial.uniforms.uTexel.value.set(1 / source.width, 1 / source.height);
      draw(downMaterial, item);
      source = item;
    }
    let accumulated = downTargets[downTargets.length - 1];
    for (let k = downTargets.length - 2; k >= 0; k--) {
      upMaterial.uniforms.uSource.value = accumulated.texture;
      upMaterial.uniforms.uBase.value = downTargets[k].texture;
      upMaterial.uniforms.uTexel.value.set(1 / accumulated.width, 1 / accumulated.height);
      draw(upMaterial, upTargets[k]);
      accumulated = upTargets[k];
    }
    compositeMaterial.uniforms.uLines.value = lineTarget.texture;
    compositeMaterial.uniforms.uBloom.value = accumulated.texture;
    draw(compositeMaterial, null);
  };

  const step = (dt: number) => {
    const settings = settingsRef.current;
    if (settings.paused || settings.reduced) return;
    clock += dt;
    const direction = settings.flow === "inward" ? -1 : 1;
    flow += dt * direction * clamp(settings.flowSpeed, 0, 2);
    shape += dt * clamp(settings.morphSpeed, 0, 2);
    turn = (turn + dt * clamp(settings.rotation, -3, 3)) % TAU;
    for (let i = kicks.length - 1; i >= 0; i--) {
      kicks[i].age += dt;
      if (kicks[i].age > kicks[i].life) kicks.splice(i, 1);
    }
    seed = (seed + 0.618034) % 1;
  };

  const tick = (now: number) => {
    raf = 0;
    if (destroyed || lost) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    step(dt);
    render();
    const settings = settingsRef.current;
    if (visible && !doc.hidden && !settings.paused && !settings.reduced) raf = view.requestAnimationFrame(tick);
  };

  function wake() {
    if (destroyed || lost || raf || !visible) return;
    last = view.performance.now();
    raf = view.requestAnimationFrame(tick);
  }

  const resize = () => {
    const rect = root.getBoundingClientRect();
    width = Math.max(1, root.clientWidth || rect.width);
    height = Math.max(1, root.clientHeight || rect.height);
    pixelRatio = Math.min(view.devicePixelRatio || 1, 2) * clamp(settingsRef.current.quality, 0.25, 1);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    const w = Math.max(1, Math.floor(width * pixelRatio));
    const h = Math.max(1, Math.floor(height * pixelRatio));
    bufferWidth = w;
    bufferHeight = h;
    release();
    lineTarget = target(w, h);
    const levels = clamp(Math.floor(Math.log2(Math.min(w, h) / 8)), 3, 7);
    for (let k = 1; k <= levels; k++) {
      downTargets.push(target(Math.max(1, w >> k), Math.max(1, h >> k)));
      upTargets.push(target(Math.max(1, w >> k), Math.max(1, h >> k)));
    }
    render();
    wake();
  };

  const addKick = (kick: Kick) => {
    const own = kicks.filter((item) => item.kind === kick.kind);
    const limit = kick.kind === 1 ? PULSES : MAX_KICKS - PULSES;
    if (own.length >= limit) kicks.splice(kicks.indexOf(own[0]), 1);
    kicks.push(kick);
    wake();
  };

  const pulseAt = (x: number, y: number, strength: number) => {
    const settings = settingsRef.current;
    if (settings.reduced || settings.paused || strength <= 0) return;
    const unit = lens().unit;
    addKick({
      x,
      y,
      vx: unit * 0.11 * strength,
      vy: 0,
      reach: unit * 0.9,
      age: 0,
      kind: 1,
      speed: unit * 1.25,
      life: PULSE_LIFE,
    });
  };

  const onMove = (event: PointerEvent) => {
    const settings = settingsRef.current;
    if (!settings.interactive || settings.reduced || settings.paused) {
      previous = null;
      return;
    }
    const point = toBuffer(event.clientX, event.clientY);
    if (!point) return;
    const now = view.performance.now() / 1000;
    const from = previous;
    if (!from) {
      previous = { x: point.x, y: point.y, t: now };
      return;
    }
    const dx = point.x - from.x;
    const dy = point.y - from.y;
    const unit = lens().unit;
    if (Math.hypot(dx, dy) < unit * 0.012 && now - from.t < 0.05) return;
    previous = { x: point.x, y: point.y, t: now };
    const strength = clamp(settings.push, 0, 3);
    if (strength <= 0) return;
    const cap = unit * 0.1 * strength;
    let vx = dx * 1.5 * strength;
    let vy = dy * 1.5 * strength;
    const size = Math.hypot(vx, vy);
    if (size < 0.5) return;
    if (size > cap) {
      vx *= cap / size;
      vy *= cap / size;
    }
    addKick({ x: point.x, y: point.y, vx, vy, reach: unit * 0.2, age: 0, kind: 0, speed: 0, life: WAKE_LIFE });
  };

  const onLeave = () => {
    previous = null;
  };

  const onDown = (event: PointerEvent) => {
    const settings = settingsRef.current;
    if (event.button !== 0 || !settings.interactive) return;
    const point = toBuffer(event.clientX, event.clientY);
    if (point) pulseAt(point.x, point.y, clamp(settings.pulse, 0, 3));
  };

  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("pointercancel", onLeave);
  root.addEventListener("pointerdown", onDown);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  const intersection = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) wake();
    },
    { rootMargin: "80px" },
  );
  intersection.observe(root);
  const onVisibility = () => {
    if (!doc.hidden) wake();
  };
  doc.addEventListener("visibilitychange", onVisibility);
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    if (raf) view.cancelAnimationFrame(raf);
    raf = 0;
  };
  const onRestored = () => {
    lost = false;
    render();
    wake();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  resize();

  return {
    sync: () => {
      const ratio = Math.min(view.devicePixelRatio || 1, 2) * clamp(settingsRef.current.quality, 0.25, 1);
      if (!settingsRef.current.interactive) previous = null;
      if (Math.abs(ratio - pixelRatio) > 1e-3) resize();
      else render();
      wake();
    },
    destroy: () => {
      destroyed = true;
      if (raf) view.cancelAnimationFrame(raf);
      raf = 0;
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointercancel", onLeave);
      root.removeEventListener("pointerdown", onDown);
      doc.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      resizeObserver.disconnect();
      intersection.disconnect();
      release();
      points.geometry.dispose();
      plane.dispose();
      [ringMaterial, downMaterial, upMaterial, compositeMaterial].forEach((item) => item.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
    pulse: () => {
      const optics = lens();
      pulseAt(optics.cx, optics.cy, clamp(settingsRef.current.pulse, 0, 3) || 1);
    },
  };
};

const RingField = forwardRef<RingFieldHandle, RingFieldProps>(function RingField(
  {
    colors = ["#2f6fe0", "#b8f3ff"],
    backgroundColor = "#0a0a0a",
    mode = "auto",
    rings = 6,
    particles = 46000,
    thickness = 0.34,
    folds = 3,
    fold = 0.9,
    dust = 0.14,
    innerRadius = 0.42,
    outerRadius = 1.3,
    flow = "outward",
    flowSpeed = 0.05,
    morph = 0.13,
    lobes = 3,
    turbulence = 0.45,
    morphSpeed = 0.1,
    twist = 0.4,
    rotation = 0.01,
    aspect = 1,
    tilt = 0,
    centerX = 0,
    centerY = 0,
    scale = 1,
    particleSize = 1.3,
    sizeVariance = 0.5,
    sparkle = 0.05,
    prism = 0.04,
    twinkle = 0.3,
    fade = 0.22,
    glow = 0.4,
    intensity = 1,
    grain = 0.3,
    interactive = true,
    push = 1,
    pulse = 1,
    paused = false,
    quality = 1,
    className,
    style,
    children,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<Controller | null>(null);
  const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false);
  const settingsRef = useRef<Settings>({
    colors,
    backgroundColor,
    mode,
    rings,
    particles,
    thickness,
    folds,
    fold,
    dust,
    innerRadius,
    outerRadius,
    flow,
    flowSpeed,
    morph,
    lobes,
    turbulence,
    morphSpeed,
    twist,
    rotation,
    aspect,
    tilt,
    centerX,
    centerY,
    scale,
    particleSize,
    sizeVariance,
    sparkle,
    prism,
    twinkle,
    fade,
    glow,
    intensity,
    grain,
    interactive,
    push,
    pulse,
    paused,
    quality,
    reduced,
  });

  useEffect(() => {
    settingsRef.current = {
      colors,
      backgroundColor,
      mode,
      rings,
      particles,
      thickness,
      folds,
      fold,
      dust,
      innerRadius,
      outerRadius,
      flow,
      flowSpeed,
      morph,
      lobes,
      turbulence,
      morphSpeed,
      twist,
      rotation,
      aspect,
      tilt,
      centerX,
      centerY,
      scale,
      particleSize,
      sizeVariance,
      sparkle,
      prism,
      twinkle,
      fade,
      glow,
      intensity,
      grain,
      interactive,
      push,
      pulse,
      paused,
      quality,
      reduced,
    };
    controllerRef.current?.sync();
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const controller = createField(root, settingsRef);
    controllerRef.current = controller;
    return () => {
      controller?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      pulse: () => controllerRef.current?.pulse(),
    }),
    [],
  );

  return (
    <div
      ref={rootRef}
      className={cn("relative isolate h-full min-h-[240px] w-full overflow-hidden", className)}
      style={{ backgroundColor, ...style }}
    >
      {children && <div className="relative z-10 h-full w-full">{children}</div>}
    </div>
  );
});

RingField.displayName = "RingField";

export { RingField };
export default RingField;
