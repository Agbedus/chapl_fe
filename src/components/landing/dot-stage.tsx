"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";

import { stage, SCENE_COUNT } from "@/components/landing/stage-state";
import { branches } from "@/lib/congregation";
import {
  HUES,
  branchScene,
  branchesScene,
  cellScene,
  doorScene,
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
    gl_PointSize = vPx + 2.0;
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

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Where the drawing sits for each scene: beside the copy on a wide
    screen, under it (hero) or above it (story) on a phone. */
function rectFor(scene: number, w: number, h: number): Rect {
  if (w >= 900) {
    return scene === 0
      ? { x: w * 0.5, y: h * 0.1, w: w * 0.44, h: h * 0.84 }
      : { x: w * 0.43, y: h * 0.1, w: w * 0.54, h: h * 0.8 };
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
    group.add(points);

    // The six hues as the page currently draws them, read off the CSS so
    // the toggle in the header recolours the congregation too.
    let palette: [number, number, number][] = [];
    const readPalette = () => {
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
      if (reduce && !moving) return;

      const segment = Math.min(Math.floor(current), SCENE_COUNT - 2);
      const t = current - segment;
      const from = scenes[segment];
      const to = scenes[segment + 1];
      const pos = position.array as Float32Array;
      const col = color.array as Float32Array;
      const fil = fill.array as Float32Array;
      const alp = alpha.array as Float32Array;
      const siz = size.array as Float32Array;
      const halfW = width / 2;
      const halfH = height / 2;

      for (let i = 0; i < n; i++) {
        const person = people[i];
        // Everyone leaves on their own beat.
        const k = reduce ? (t >= 0.5 ? 1 : 0) : easeInOut(Math.min(1, Math.max(0, (t - person.seed * 0.3) / 0.7)));
        let x = from.x[i] + (to.x[i] - from.x[i]) * k;
        let y = from.y[i] + (to.y[i] - from.y[i]) * k;
        const z = from.z[i] + (to.z[i] - from.z[i]) * k;

        if (hero > 0 && fine && !reduce) {
          let tx = 0;
          let ty = 0;
          if (pointer.on) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const dist = Math.hypot(dx, dy);
            const radius = 110;
            if (dist < radius && dist > 0.01) {
              const force = Math.pow(1 - dist / radius, 2) * 34 * hero;
              tx = (dx / dist) * force;
              ty = (dy / dist) * force;
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
        col[i * 3] = a[0] + (b[0] - a[0]) * k;
        col[i * 3 + 1] = a[1] + (b[1] - a[1]) * k;
        col[i * 3 + 2] = a[2] + (b[2] - a[2]) * k;

        const fa = segment === ROOM ? roomFill(person, stage.fill) : from.fill[i];
        const fb = segment + 1 === ROOM ? roomFill(person, stage.fill) : to.fill[i];
        fil[i] = fa + (fb - fa) * k;
        alp[i] = from.alpha[i] + (to.alpha[i] - from.alpha[i]) * k;
        siz[i] = from.size[i] + (to.size[i] - from.size[i]) * k;
      }
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
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={host} className="absolute inset-0" aria-hidden>
      <div ref={focus} className="dot-focus" style={{ opacity: 0 }}>
        <span className="dot-focus-ring" />
      </div>
    </div>
  );
}
