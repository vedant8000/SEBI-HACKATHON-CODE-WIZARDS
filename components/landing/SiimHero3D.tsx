"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Interactive Three.js hero: ~6k particles scatter through space, then
 * assemble into the SIIM wordmark. The cursor repels nearby particles
 * (they flow back when it leaves), the whole field tilts with pointer
 * parallax, and colours run a blue→teal spectrum across the mark.
 * Respects prefers-reduced-motion. Pure client-side; zero layout shift.
 */

/** Sample target positions from "SIIM" drawn on an offscreen 2D canvas. */
function sampleTextPoints(): { x: number; y: number }[] {
  const w = 1000, h = 300;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.font = "900 235px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SIIM", w / 2, h / 2 + 10);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pts: { x: number; y: number }[] = [];
  const step = 3;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 128) {
        pts.push({ x: (x - w / 2) / 32, y: -(y - h / 2) / 32 });
      }
    }
  }
  return pts;
}

export default function SiimHero3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.z = 11;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // ── particles ────────────────────────────────────────────────────────
    const targets = sampleTextPoints();
    const n = targets.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const tgt = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);

    const cBlue = new THREE.Color("#3b82f6");
    const cTeal = new THREE.Color("#2dd4bf");
    let minX = Infinity, maxX = -Infinity;
    for (const p of targets) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); }

    for (let i = 0; i < n; i++) {
      // start scattered in a wide sphere
      pos[i * 3] = (Math.random() - 0.5) * 46;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
      tgt[i * 3] = targets[i].x;
      tgt[i * 3 + 1] = targets[i].y;
      tgt[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
      const t = (targets[i].x - minX) / (maxX - minX);
      const c = cBlue.clone().lerp(cTeal, t);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    if (reduced) pos.set(tgt); // no motion: render the finished mark

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // faint background starfield for depth
    const bgN = 350;
    const bgPos = new Float32Array(bgN * 3);
    for (let i = 0; i < bgN * 3; i++) bgPos[i] = (Math.random() - 0.5) * 60;
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute("position", new THREE.BufferAttribute(bgPos, 3));
    const bg = new THREE.Points(bgGeo, new THREE.PointsMaterial({
      size: 0.05, color: 0x3b82f6, transparent: true, opacity: 0.35, depthWrite: false,
    }));
    scene.add(bg);

    // ── pointer state ────────────────────────────────────────────────────
    const pointer = { x: 0, y: 0, worldX: 0, worldY: 0, active: false };
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      // unproject pointer onto the z=0 plane
      const vec = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const dist = -camera.position.z / dir.z;
      const world = camera.position.clone().add(dir.multiplyScalar(dist));
      pointer.worldX = world.x; pointer.worldY = world.y;
      pointer.active = true;
    };
    const onLeave = () => { pointer.active = false; };
    mount.addEventListener("pointermove", onMove);
    mount.addEventListener("pointerleave", onLeave);

    // ── animation loop ───────────────────────────────────────────────────
    const start = performance.now();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = (performance.now() - start) / 1000;
      const p = geo.attributes.position.array as Float32Array;

      if (!reduced) {
        const assemble = Math.min(1, t / 2.2); // ~2.2s to form the mark
        const ease = 0.028 + 0.05 * assemble;
        for (let i = 0; i < n; i++) {
          const ix = i * 3, iy = ix + 1, iz = ix + 2;
          // spring toward target
          vel[ix] += (tgt[ix] - p[ix]) * ease * 0.5;
          vel[iy] += (tgt[iy] - p[iy]) * ease * 0.5;
          vel[iz] += (tgt[iz] - p[iz]) * ease * 0.5;
          // cursor repulsion
          if (pointer.active) {
            const dx = p[ix] - pointer.worldX;
            const dy = p[iy] - pointer.worldY;
            const d2 = dx * dx + dy * dy;
            if (d2 < 6.5) {
              const f = (6.5 - d2) * 0.03;
              const d = Math.sqrt(d2) + 0.001;
              vel[ix] += (dx / d) * f;
              vel[iy] += (dy / d) * f;
            }
          }
          // gentle idle shimmer
          vel[iy] += Math.sin(t * 1.4 + i * 0.37) * 0.0006;
          vel[ix] *= 0.86; vel[iy] *= 0.86; vel[iz] *= 0.86;
          p[ix] += vel[ix]; p[iy] += vel[iy]; p[iz] += vel[iz];
        }
        geo.attributes.position.needsUpdate = true;
        // parallax tilt toward the cursor
        points.rotation.y += ((pointer.active ? pointer.x * 0.18 : 0) - points.rotation.y) * 0.05;
        points.rotation.x += ((pointer.active ? -pointer.y * 0.12 : 0) - points.rotation.x) * 0.05;
        bg.rotation.y = t * 0.02;
      }
      renderer.render(scene, camera);
    };
    animate();

    // ── resize & cleanup ─────────────────────────────────────────────────
    const onResize = () => {
      if (!mount.clientWidth) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener("pointermove", onMove);
      mount.removeEventListener("pointerleave", onLeave);
      mount.removeChild(renderer.domElement);
      geo.dispose(); mat.dispose(); bgGeo.dispose();
      (bg.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-label="SIIM: SME IPO Intelligence Mitra"
      className="w-full h-[220px] md:h-[260px] cursor-crosshair"
    />
  );
}
