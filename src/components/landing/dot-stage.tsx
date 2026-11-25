"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";

import { DotNumeral, paintNumeral } from "@/components/landing/dot-numeral";
import { stage, SCENE_COUNT } from "@/components/landing/stage-state";
import { branches, totals } from "@/lib/congregation";
import {
  HUES,
  branchScene,
  branchesScene,
  cellScene,
  doorScene,
  nameOf,
  oneScene,
  peopleOf,
  pollScene,
  roomFill,
  roomScene,
  youOf,
  type Rect,
  type Scene,
} from "@/lib/dot-scenes";

const ROOM = 5;
const LAST = 7;
/** The echo round the one person: one ripple every this many seconds. */
const RIPPLE_SECONDS = 2.8;
/** The door's Sunday: everyone not yet in arrives within this many seconds. */
const ARRIVALS_SECONDS = 11;

const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aFill;
  attribute float aAlpha;
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uBreath;
  uniform float uPixel;
  uniform float uBase;
  uniform float uDistance;
  uniform float uScale;
  varying vec3 vColor;
  varying float vFill;
  varying float vAlpha;
  varying float vPx;
  void main() {
    vec3 p = position;
    // Breathing: each dot drifts on its own slow phase, so the field is
    // alive without anything in it moving as a block.
    p.x += sin(uTime * 0.55 + aSeed * 41.0) * uBreath;
    p.y += cos(uTime * 0.47 + aSeed * 29.0) * uBreath;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vPx = uBase * aSize * (uDistance / -mv.z) * uPixel;
    gl_PointSize = vPx * uScale + 2.0;
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vFill = aFill;
    vAlpha = aAlpha;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uPixel;
  varying vec3 vColor;
  varying float vFill;
  varying float vAlpha;
  varying float vPx;
  void main() {
    // Distance from the centre in device pixels, so the edge is one pixel
    // of antialiasing at every size rather than a blur on the big ones.
    float d = length(gl_PointCoord - 0.5) * (vPx + 2.0);
    float r = vPx * 0.5;
    float outer = 1.0 - smoothstep(r - 1.0, r, d);
    // Hollow is a ring, as .dot-hollow is: someone who wasn't there.
    float ring = max(1.25 * uPixel, r * 0.36);
    float inner = mix(smoothstep(r - ring - 1.0, r - ring, d), 1.0, vFill);
    float a = outer * inner * vAlpha * mix(0.5, 1.0, vFill);
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

// The glow: the same point drawn again, larger, as a soft falloff. Lit dots
// only (a hollow ring is somebody who is not there, and gives off nothing).
const GLOW_FRAGMENT = /* glsl */ `
  uniform float uGlow;
  varying vec3 vColor;
  varying float vFill;
  varying float vAlpha;
  void main() {
    float d = clamp(length(gl_PointCoord - 0.5) * 2.0, 0.0, 1.0);
    float a = pow(1.0 - d, 2.4) * vAlpha * vFill * uGlow;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

/** A damped spring that starts and ends at rest and overshoots once, a
    little: a dot lands rather than stops. Pure in `u`, so scrolling back
    retraces it exactly. */
function spring(u: number) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const s = 1 - Math.exp(-6.2 * u) * Math.cos(8.2 * u);
  return s + (1 - s) * Math.pow(u, 6);
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Where the drawing sits for each scene: beside the copy on a wide
    screen, under it (hero) or above it (story) on a phone. */
function rectFor(scene: number, w: number, h: number): Rect {
  if (w >= 900) {
    return scene === 0
      ? { x: w * 0.5, y: h * 0.09, w: w * 0.44, h: h * 0.76 }
      : { x: w * 0.43, y: h * 0.1, w: w * 0.5, h: h * 0.8 };
  }
  return scene === 0
    ? { x: w * 0.06, y: h * 0.53, w: w * 0.88, h: h * 0.4 }
    : { x: w * 0.05, y: h * 0.07, w: w * 0.9, h: h * 0.44 };
}

/**
 * The congregation, drawn once, in WebGL: one point per member of the
 * sample church, moving between the scenes the story scrolls through.
 *
 * Positions blend on the CPU (eight hundred points is nothing), so each
 * person can leave on their own beat: a stagger by seed that makes the
 * morph read as people moving rather than a picture being swapped. The
 * shader only draws: round dots, hollow rings for the absent, and a slow
 * breath.
 */
export default function DotStage() {
  const host = useRef<HTMLDivElement>(null);
  const focus = useRef<HTMLDivElement>(null);
  const meet = useRef<HTMLDivElement>(null);
  const meetName = useRef<HTMLSpanElement>(null);
  const meetWhere = useRef<HTMLSpanElement>(null);
  const meetNote = useRef<HTMLSpanElement>(null);
  const live = useRef<HTMLDivElement>(null);
  const nave = useRef<SVGSVGElement>(null);
  const liveNumeral = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    } catch {
      // No WebGL: the copy stands on its own and the stage stays empty.
      return;
    }
    const pixel = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixel);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const people = peopleOf(branches);
    const n = people.length;
    // The story's one person: ringed in the door, alone, in their cell,
    // in their branch, and ringed again when the door fills.
    const you = youOf(people);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 8000);
    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.BufferGeometry();
    const position = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    const color = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    const fill = new THREE.BufferAttribute(new Float32Array(n), 1);
    const alpha = new THREE.BufferAttribute(new Float32Array(n), 1);
    const size = new THREE.BufferAttribute(new Float32Array(n), 1);
    const seed = new THREE.BufferAttribute(new Float32Array(people.map((p) => p.seed)), 1);
    for (const a of [position, color, fill, alpha, size]) a.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", position);
    geometry.setAttribute("aColor", color);
    geometry.setAttribute("aFill", fill);
    geometry.setAttribute("aAlpha", alpha);
    geometry.setAttribute("aSize", size);
    geometry.setAttribute("aSeed", seed);

    const uniforms = {
      uTime: { value: 0 },
      uBreath: { value: reduce ? 0 : 1.1 },
      uPixel: { value: pixel },
      uBase: { value: 5 },
      uDistance: { value: 1000 },
      uScale: { value: 1 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    // The glow shares the points' geometry and every uniform (the objects
    // are shared by reference, so a value written once reaches both), and
    // differs only in how big it is drawn and how it is blended.
    const glowUniforms = { ...uniforms, uScale: { value: 5.4 }, uGlow: { value: 0.11 } };
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      uniforms: glowUniforms,
      transparent: true,
      depthWrite: false,
    });
    const glow = new THREE.Points(geometry, glowMaterial);
    glow.frustumCulled = false;
    glow.renderOrder = 0;
    points.renderOrder = 1;
    // Glow first, so the dots are drawn over their own light.
    group.add(glow);
    group.add(points);

    // The six hues as the page currently draws them, read off the CSS so
    // the toggle in the header recolours the congregation too.
    let palette: [number, number, number][] = [];
    const readPalette = () => {
      // By night the dots are lit from behind and their light adds up; by
      // day it is a faint tint laid over white, which is all a halo can be
      // on paper.
      const night = document.documentElement.classList.contains("dark");
      glowMaterial.blending = night ? THREE.AdditiveBlending : THREE.NormalBlending;
      glowUniforms.uGlow.value = night ? 0.24 : 0.1;
      glowMaterial.needsUpdate = true;
      const style = getComputedStyle(document.documentElement);
      const c = new THREE.Color();
      palette = HUES.map((hue) => {
        c.set(style.getPropertyValue(`--${hue}`).trim() || "#888888");
        const out = { r: 0, g: 0, b: 0 };
        c.getRGB(out, THREE.SRGBColorSpace);
        return [out.r, out.g, out.b];
      });
    };
    readPalette();

    let width = 1;
    let height = 1;
    let scenes: Scene[] = [];
    let dists: Float32Array[] = [];
    const liveEl = live.current;
    const naveEl = nave.current;
    const liveNumeralEl = liveNumeral.current;
    const layout = () => {
      width = el.clientWidth || window.innerWidth;
      height = el.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = `${width}px`;
      renderer.domElement.style.height = `${height}px`;
      camera.aspect = width / height;
      // At this distance one unit at z = 0 is one CSS pixel.
      camera.position.z = height / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      uniforms.uDistance.value = camera.position.z;
      camera.updateProjectionMatrix();
      // A dot about half its spacing, as the product's own fields draw
      // them: dense enough to read as one thing, open enough to count.
      const hero = rectFor(0, width, height);
      const pitch = Math.sqrt((hero.w * hero.h * 0.36) / n);
      uniforms.uBase.value = Math.min(7.5, Math.max(4.2, pitch * 0.5));
      scenes = [
        doorScene(people, rectFor(0, width, height), you),
        oneScene(people, rectFor(1, width, height), you),
        cellScene(people, rectFor(2, width, height), you),
        branchScene(people, branches, rectFor(3, width, height), you),
        branchesScene(people, branches, rectFor(4, width, height)),
        roomScene(people, rectFor(5, width, height)),
        pollScene(people, rectFor(6, width, height)),
        doorScene(people, rectFor(7, width, height), you),
      ];
      // How far each person is from the one, in each scene, 0..1 (or -1
      // where they are not drawn). A scene change is called in from them.
      dists = scenes.map((scene) => {
        const out = new Float32Array(n);
        let widest = 0.0001;
        for (let i = 0; i < n; i++) {
          if (scene.alpha[i] > 0.15) {
            out[i] = Math.hypot(scene.x[i] - scene.x[you], scene.y[i] - scene.y[you]);
            widest = Math.max(widest, out[i]);
          } else out[i] = -1;
        }
        for (let i = 0; i < n; i++) if (out[i] >= 0) out[i] /= widest;
        return out;
      });
      // The live count sits under the door, on its centre line.
      if (liveEl) {
        liveEl.style.left = `${hero.x + hero.w / 2}px`;
        liveEl.style.top = `${hero.y + hero.h + 22}px`;
      }
      // The nave the door stands in: one hairline arch a step outside it,
      // and a ring round the crossing, as faint as a watermark. The same
      // grid as doorScene (20 units wide, 26 tall, the arch's centre on row
      // 10), so it sits round the door at any size. Wide screens only; on
      // a phone the door is small and the line would only be clutter.
      if (naveEl) {
        if (width >= 900) {
          const unit = Math.min((hero.w * 0.92) / 20, (hero.h * 0.94) / 26);
          const cx = hero.x + hero.w / 2;
          const top = hero.y + (hero.h - unit * 26) / 2;
          const r = 11.9 * unit;
          const cy = top + 10 * unit;
          const bottom = top + 27.4 * unit;
          const f = (v: number) => v.toFixed(1);
          naveEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
          naveEl.innerHTML =
            `<path d="M${f(cx - r)} ${f(bottom)} L${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 0 1 ${f(cx + r)} ${f(cy)} L${f(cx + r)} ${f(bottom)}" fill="none" stroke="currentColor" stroke-opacity="0.09" stroke-width="1" vector-effect="non-scaling-stroke"/>` +
            `<circle cx="${f(cx)}" cy="${f(top + 9.5 * unit)}" r="${f(unit * 3.2)}" fill="none" stroke="currentColor" stroke-opacity="0.06" stroke-width="1"/>`;
        } else naveEl.innerHTML = "";
      }
      dirty = true;
    };

    // The hero's cursor: dots part around it, each on a spring, the way
    // the picture's spotlight used to open a window through the glass.
    const pointer = { x: -9999, y: -9999, on: false };
    const push = new Float32Array(n * 2);
    const onPointer = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      pointer.on = true;
    };
    const onLeave = () => {
      pointer.on = false;
    };
    if (fine && !reduce) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }

    let current = stage.target;
    let dirty = true;
    let visible = true;
    let tilt = { x: 0, y: 0 };
    const focusEl = focus.current;
    const projected = new THREE.Vector3();

    // The door's Sunday. Some of the church is already in when you arrive
    // and the rest comes in over the first seconds, each on their own beat
    // (fixed by their seed), so the page is doing what the product does
    // while you read the headline. The ringed one is always there.
    const t0 = gsap.ticker.time;
    const arriveAt = people.map((p) => (p.index === you ? -99 : ((p.seed - 0.35) / 0.65) * ARRIVALS_SECONDS + 0.5));
    let counted = -1;
    let hovered = -1;
    const meetEl = meet.current;
    if (liveNumeralEl) paintNumeral(liveNumeralEl, reduce ? String(n) : "");

    const tick = (time: number, delta: number) => {
      if (!visible) return;
      const dt = Math.min(delta / 1000, 0.05);
      const previous = current;
      current = reduce ? Math.round(stage.target) : current + (stage.target - current) * (1 - Math.exp(-dt * 7));
      if (Math.abs(stage.target - current) < 0.0005) current = stage.target;
      const moving = previous !== current || dirty;
      // The door can be touched at both ends of the story: the hero, and
      // the payoff when it fills again.
      const hero = Math.max(0, 1 - current, current - (LAST - 1));
      // Seconds since the page arrived; the arrivals are told by it.
      const since = time - t0;
      // Arrivals and the hover card run while the hero is the scene, even
      // when nothing is scrolling.
      // Every dot is somebody, in every scene: pointing at one names them.
      const meeting = !reduce && fine;
      if (reduce && !moving) return;

      const segment = Math.min(Math.floor(current), SCENE_COUNT - 2);
      const t = current - segment;
      const from = scenes[segment];
      const to = scenes[segment + 1];
      const dFrom = dists[segment];
      const dTo = dists[segment + 1];
      const pos = position.array as Float32Array;
      const col = color.array as Float32Array;
      const fil = fill.array as Float32Array;
      const alp = alpha.array as Float32Array;
      const siz = size.array as Float32Array;
      const halfW = width / 2;
      const halfH = height / 2;

      // How far through its own journey each person is. They are called in
      // from the one: the nearer to them, the sooner they go, so a scene
      // change spreads outward from the ringed dot as one gesture instead
      // of every dot picking its own moment. Someone who is not drawn in
      // the scene they leave is timed by the one they arrive in.
      const journey = (i: number) => {
        if (reduce) return t >= 0.5 ? 1 : 0;
        const a = dFrom[i];
        const b = dTo[i];
        const near = a >= 0 ? a : b >= 0 ? b : people[i].seed;
        const delay = Math.max(0, near * 0.4 + (people[i].seed - 0.5) * 0.05);
        return clamp01((t - delay) / 0.6);
      };

      // The echo: a ripple leaves the one person on a steady beat. In
      // their own scene it runs wide and shoulders the faint dots aside
      // as it passes; in the door and their cell it is only a small halo.
      const alone = Math.max(0, 1 - Math.abs(current - 1));
      const phase = reduce ? 0.35 : (time / RIPPLE_SECONDS) % 1;
      const reach = 90 + 230 * alone;
      const radius = phase * reach;
      const youU = journey(you);
      const youK = reduce ? youU : spring(youU);
      let youX = from.x[you] + (to.x[you] - from.x[you]) * youK;
      let youY = from.y[you] + (to.y[you] - from.y[you]) * youK;
      if (!reduce && youU > 0 && youU < 1) {
        const mx = to.x[you] - from.x[you];
        const my = to.y[you] - from.y[you];
        const len = Math.hypot(mx, my) || 1;
        const bow = Math.sin(Math.PI * youU) * Math.min(len * 0.2, 110);
        youX += (-my / len) * bow;
        youY += (mx / len) * bow;
      }
      const swell = alone > 0.01 && !reduce ? alone * (1 - phase) * 16 : 0;

      let here = 0;

      for (let i = 0; i < n; i++) {
        const person = people[i];
        const u = journey(i);
        const k = reduce ? u : spring(u);
        const kc = clamp01(k);
        let x = from.x[i] + (to.x[i] - from.x[i]) * k;
        let y = from.y[i] + (to.y[i] - from.y[i]) * k;
        let z = from.z[i] + (to.z[i] - from.z[i]) * k;
        // Flight: a dot curves off its straight line, always the same way
        // round, and rises toward the viewer on the way, so a crowd moving
        // reads as a current with a direction and a depth, not a cloud.
        let lift = 0;
        if (!reduce && u > 0 && u < 1) {
          const mx = to.x[i] - from.x[i];
          const my = to.y[i] - from.y[i];
          const len = Math.hypot(mx, my);
          lift = Math.sin(Math.PI * u);
          if (len > 0.5) {
            const bow = lift * Math.min(len * 0.2, 110);
            x += (-my / len) * bow;
            y += (mx / len) * bow;
          }
          z += lift * 110;
        }

        if (swell > 0 && i !== you) {
          const dx = x - youX;
          const dy = y - youY;
          const d = Math.hypot(dx, dy);
          if (d > 0.01) {
            // A band, not a disc: only the dots the wavefront is passing
            // through are pushed, and they settle back behind it.
            const band = Math.exp(-((d - radius) ** 2) / (2 * 24 * 24));
            x += (dx / d) * band * swell;
            y += (dy / d) * band * swell;
          }
        }

        let attention = 0;
        if (hero > 0 && fine && !reduce) {
          let tx = 0;
          let ty = 0;
          if (pointer.on) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const dist = Math.hypot(dx, dy);
            const radius = 120;
            if (dist < radius && dist > 0.01) {
              // The cursor leans on the dots a little and lights the ones
              // it is over. It no longer scatters them: you cannot meet
              // somebody who is running away from you.
              const near = 1 - dist / radius;
              const force = near * near * 9 * hero;
              tx = (dx / dist) * force;
              ty = (dy / dist) * force;
              attention = near * near * hero;
            }

          }
          push[i * 2] += (tx - push[i * 2]) * 0.14;
          push[i * 2 + 1] += (ty - push[i * 2 + 1]) * 0.14;
          x += push[i * 2];
          y += push[i * 2 + 1];
        }

        pos[i * 3] = x - halfW;
        pos[i * 3 + 1] = halfH - y;
        pos[i * 3 + 2] = z;

        const a = palette[from.hue[i]];
        const b = palette[to.hue[i]];
        col[i * 3] = a[0] + (b[0] - a[0]) * kc;
        col[i * 3 + 1] = a[1] + (b[1] - a[1]) * kc;
        col[i * 3 + 2] = a[2] + (b[2] - a[2]) * kc;

        // The door starts part-filled and fills as people arrive.
        const arrived = since - arriveAt[i];
        const inDoor = reduce ? 1 : clamp01(arrived / 0.45);
        if (arrived >= 0 || reduce) here++;
        const fa = segment === ROOM ? roomFill(person, stage.fill) : segment === 0 ? inDoor : from.fill[i];
        const fb = segment + 1 === ROOM ? roomFill(person, stage.fill) : to.fill[i];
        fil[i] = fa + (fb - fa) * kc;
        alp[i] = from.alpha[i] + (to.alpha[i] - from.alpha[i]) * kc;
        // Size takes the spring's overshoot: a dot lands with a small pop.
        // Someone arriving pops as they take their place; a dot the cursor
        // is over, and the one it is meeting, swell.
        const pop = segment === 0 && arrived >= 0 && arrived < 1.4 && !reduce ? Math.exp(-arrived * 5) * 0.9 * (1 - kc) : 0;
        const meeting1 = i === hovered ? 0.9 : 0;
        siz[i] = (from.size[i] + (to.size[i] - from.size[i]) * k) * (1 + pop + attention * 0.7 + meeting1 + lift * 0.22);
      }

      // The live count, painted only when it changes.
      if (liveNumeralEl && liveEl && !reduce) {
        if (here !== counted) {
          counted = here;
          paintNumeral(liveNumeralEl, String(here));
        }
        liveEl.style.opacity = String(clamp01(1 - current * 2.4));
      } else if (liveEl) {
        liveEl.style.opacity = String(clamp01(1 - current * 2.4));
      }
      if (naveEl) naveEl.style.opacity = String(clamp01(1 - current * 2.4));

      position.needsUpdate = true;
      color.needsUpdate = true;
      fill.needsUpdate = true;
      alpha.needsUpdate = true;
      size.needsUpdate = true;

      // Depth: a few degrees of turn toward the cursor, and a slow sway
      // while the church is one body, so the drawing has a z to it.
      const depth = Math.max(0, 1 - Math.abs(current - 1.5) / 1.5);
      const wantX = fine && !reduce && pointer.on ? (pointer.y / height - 0.5) * 0.08 : 0;
      const wantY = fine && !reduce && pointer.on ? (pointer.x / width - 0.5) * 0.12 : 0;
      tilt = { x: tilt.x + (wantX - tilt.x) * 0.06, y: tilt.y + (wantY - tilt.y) * 0.06 };
      group.rotation.x = tilt.x;
      group.rotation.y = tilt.y + (reduce ? 0 : Math.sin(time * 0.35) * 0.05 * depth);
      uniforms.uTime.value = time;

      // Meeting somebody: the dot nearest the pointer as it is drawn on the
      // screen (projected through the camera and the tilt), in whatever
      // scene the story is on. Faint dots count too: somebody at the back
      // of the room is still somebody.
      if (meetEl) {
        let nearest = -1;
        let nx = 0;
        let ny = 0;
        if (meeting && pointer.on) {
          const box = el.getBoundingClientRect();
          if (box.bottom > 0 && box.top < window.innerHeight) {
            group.updateMatrixWorld();
            let best = Infinity;
            for (let i = 0; i < n; i++) {
              if (alp[i] < 0.12 || siz[i] < 0.2) continue;
              projected.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).applyMatrix4(group.matrixWorld).project(camera);
              const sx = (projected.x * 0.5 + 0.5) * width;
              const sy = (-projected.y * 0.5 + 0.5) * height;
              const dx = sx - pointer.x;
              const dy = sy - pointer.y;
              const d = dx * dx + dy * dy;
              const reach = Math.max(11, (uniforms.uBase.value * siz[i]) / 2 + 7);
              if (d < reach * reach && d < best) {
                best = d;
                nearest = i;
                nx = sx;
                ny = sy - Math.max(0, (uniforms.uBase.value * siz[i]) / 2 - 6);
              }
            }
          }
        }
        if (nearest >= 0) {
          const person = people[nearest];
          if (nearest !== hovered) {
            hovered = nearest;
            const cell = branches[person.branch].cells[person.cell];
            if (meetName.current) meetName.current.textContent = nameOf(person, you);
            if (meetWhere.current) meetWhere.current.textContent = `${cell.name}, ${branches[person.branch].name}`;
            meetEl.toggleAttribute("data-you", nearest === you);
          }
          // What the scene says about them, read off how they are drawn.
          const at = Math.round(current);
          const lit = fil[nearest] > 0.5;
          let note = "";
          if (at === ROOM) note = lit ? "In the room" : "Not here yet";
          else if (at === 2 || at === 3) note = lit ? "Here last Sunday" : "Missed last Sunday";
          else if (at === 6) note = lit ? "Raised a hand" : "Stayed home";
          else if ((at === 0 || at === LAST) && !lit) note = "On the way in";
          const noteEl = meetNote.current;
          if (noteEl) {
            if (noteEl.textContent !== note) noteEl.textContent = note;
            noteEl.dataset.tone = lit ? "in" : "out";
          }
          meetEl.style.transform = `translate3d(${nx}px, ${ny}px, 0)`;
          meetEl.style.opacity = "1";
        } else {
          hovered = -1;
          meetEl.style.opacity = "0";
        }
      }

      // The ring round the one person, laid over the canvas in CSS so it
      // stays crisp: there while the story is about them (the door, alone,
      // their cell), fading as their branch surrounds them, and back when
      // the door fills at the end.
      if (focusEl) {
        const lit = Math.max(Math.max(0, Math.min(1, 3 - current)), Math.max(0, Math.min(1, current - (LAST - 1))));
        if (lit > 0.01) {
          projected.set(pos[you * 3], pos[you * 3 + 1], pos[you * 3 + 2]);
          projected.applyMatrix4(group.matrixWorld).project(camera);
          const sx = (projected.x * 0.5 + 0.5) * width;
          const sy = (-projected.y * 0.5 + 0.5) * height;
          focusEl.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
          // The shaded echo grows with the wavefront and fades as it goes.
          const ring = focusEl.firstElementChild as HTMLElement | null;
          if (ring) {
            ring.style.transform = `scale(${Math.max(0.12, radius / 100)})`;
            ring.style.opacity = String(Math.pow(1 - phase, 1.4));
          }
        }
        focusEl.style.opacity = String(lit);
      }

      renderer.render(scene, camera);
      dirty = false;
    };

    layout();
    gsap.ticker.add(tick);

    const resize = new ResizeObserver(() => layout());
    resize.observe(el);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      dirty = true;
    });
    seen.observe(el);
    const theme = new MutationObserver(() => {
      readPalette();
      dirty = true;
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

    return () => {
      gsap.ticker.remove(tick);
      resize.disconnect();
      seen.disconnect();
      theme.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
      geometry.dispose();
      material.dispose();
      glowMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={host} className="absolute inset-0" aria-hidden>
      <svg ref={nave} className="nave" style={{ opacity: 0 }} />

      <div ref={focus} className="dot-focus" style={{ opacity: 0 }}>
        <span className="dot-focus-ring" />
      </div>

      {/* Somebody, under the cursor: their name and where they sit. Hidden
          from assistive tech with the rest of the stage; it is decoration
          for a pointer, and the same words are in the story. */}
      <div ref={meet} className="meet" style={{ opacity: 0 }}>
        <div className="meet-card">
          <span ref={meetName} className="meet-name" />
          <span ref={meetWhere} className="meet-where" />
          <span ref={meetNote} className="meet-note" />
        </div>
      </div>

      {/* The Sunday's count, in the page's own dots, under the door. */}
      <div ref={live} className="hero-live" style={{ opacity: 0 }}>
        <DotNumeral ref={liveNumeral} value="" slots={String(totals.members).length} label="" cell="4px" />
        <span className="hero-live-label">here on Sunday</span>
      </div>
    </div>
  );
}
