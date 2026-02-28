'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '@/context/theme-context';

interface OmniOrbProps {
  isSpeaking: boolean;
  analyser: AnalyserNode | null;
}

export function OmniOrb({ isSpeaking, analyser }: OmniOrbProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ isSpeaking, analyser });
  const { themeKey } = useTheme();
  const isCyber = themeKey === 'cyberpunk';

  // Store theme in ref so animation loop can read it
  const themeRef = useRef(isCyber);
  useEffect(() => { themeRef.current = isCyber; }, [isCyber]);

  useEffect(() => {
    stateRef.current = { isSpeaking, analyser };
  }, [isSpeaking, analyser]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const SIZE = 180;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.z = 3.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(SIZE, SIZE);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // ── Soft circular dot texture ─────────────────────────────────────────
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = dotCanvas.height = 32;
    const dotCtx = dotCanvas.getContext('2d')!;
    const grad = dotCtx.createRadialGradient(16, 16, 0, 16, 16, 14);
    grad.addColorStop(0,   'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1,   'rgba(255,255,255,0)');
    dotCtx.fillStyle = grad;
    dotCtx.beginPath();
    dotCtx.arc(16, 16, 14, 0, Math.PI * 2);
    dotCtx.fill();
    const dotTexture = new THREE.CanvasTexture(dotCanvas);

    // ── Fibonacci sphere — uniform point distribution ─────────────────────
    const N = 2800;
    const rawPos = new Float32Array(N * 3);
    const PHI = Math.PI * (3 - Math.sqrt(5)); // golden angle

    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = PHI * i;
      rawPos[i * 3]     = Math.cos(theta) * r;
      rawPos[i * 3 + 1] = y;
      rawPos[i * 3 + 2] = Math.sin(theta) * r;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(rawPos.slice(), 3));
    const originalPos = rawPos; // keep a pristine copy

    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(0xfa500f),
      size: 0.048,
      sizeAttenuation: true,
      map: dotTexture,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
    });

    const dots = new THREE.Points(geo, mat);
    scene.add(dots);

    // ── Outer halo particles (sparser, farther ring) ───────────────────────
    const HATM = 700;
    const atmRaw = new Float32Array(HATM * 3);
    for (let i = 0; i < HATM; i++) {
      const y = 1 - (i / (HATM - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = PHI * i * 1.618; // different spiral
      const scale = 1.22 + (i % 7) * 0.012;
      atmRaw[i * 3]     = Math.cos(theta) * r * scale;
      atmRaw[i * 3 + 1] = y * scale;
      atmRaw[i * 3 + 2] = Math.sin(theta) * r * scale;
    }

    const atmGeo = new THREE.BufferGeometry();
    atmGeo.setAttribute('position', new THREE.BufferAttribute(atmRaw.slice(), 3));
    const atmOrigPos = atmRaw;

    const atmMat = new THREE.PointsMaterial({
      color: new THREE.Color(0xff7030),
      size: 0.022,
      sizeAttenuation: true,
      map: dotTexture,
      transparent: true,
      alphaTest: 0.01,
      opacity: 0.2,
      depthWrite: false,
    });

    const halo = new THREE.Points(atmGeo, atmMat);
    scene.add(halo);

    // ── Frequency buffer ──────────────────────────────────────────────────
    const freqData = new Uint8Array(128);

    const clock = new THREE.Clock();
    let animId: number;

    function animate() {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const { isSpeaking, analyser } = stateRef.current;
      const cyber = themeRef.current;

      // Audio sampling
      let avgFreq = 0;
      if (analyser && isSpeaking) {
        analyser.getByteFrequencyData(freqData);
        for (let i = 0; i < freqData.length; i++) avgFreq += freqData[i];
        avgFreq = avgFreq / freqData.length / 255; // 0..1
      }

      // Deformation params
      const amplitude = isSpeaking ? 0.07 + avgFreq * 0.32 : 0.028;
      const speed     = isSpeaking ? 2.6  : 0.42;

      // ── Displace inner dots outward/inward along their own direction ──────
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < N; i++) {
        const ox = originalPos[i * 3];
        const oy = originalPos[i * 3 + 1];
        const oz = originalPos[i * 3 + 2];

        const n =
          Math.sin(t * speed       + ox * 4.5 + oy * 2.8) * 0.5 +
          Math.sin(t * speed * 1.4 + oy * 5.2 - oz * 3.1) * 0.3 +
          Math.sin(t * speed * 0.65+ oz * 4.1 + ox * 2.3) * 0.2;

        const r = 1 + n * amplitude;
        posAttr.setXYZ(i, ox * r, oy * r, oz * r);
      }
      posAttr.needsUpdate = true;

      // ── Halo drift ────────────────────────────────────────────────────────
      const atmAttr = atmGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < HATM; i++) {
        const ox = atmOrigPos[i * 3];
        const oy = atmOrigPos[i * 3 + 1];
        const oz = atmOrigPos[i * 3 + 2];
        const drift = Math.sin(t * 0.4 + i * 0.15) * (isSpeaking ? 0.06 : 0.015);
        atmAttr.setXYZ(i, ox + drift, oy + drift * 0.5, oz + drift * 0.8);
      }
      atmAttr.needsUpdate = true;

      // Rotation
      dots.rotation.y += isSpeaking ? 0.013 : 0.003;
      dots.rotation.x  = Math.sin(t * 0.28) * 0.07;
      halo.rotation.y -= 0.0025;
      halo.rotation.x  = Math.cos(t * 0.2) * 0.05;

      // Color & size reactivity — switch palette based on theme
      const bright = isSpeaking ? 1 + avgFreq * 0.6 : 0.85;
      if (cyber) {
        // Cyberpunk: neon cyan core, magenta halo
        mat.color.setRGB(
          Math.min(1, 0.0 * bright),
          Math.min(1, 0.94 * bright),
          Math.min(1, 1.0 * bright),
        );
        atmMat.color.setRGB(
          Math.min(1, 1.0 * bright * 0.7),
          Math.min(1, 0.0),
          Math.min(1, 0.67 * bright),
        );
      } else {
        // OmniCAT: warm orange
        mat.color.setRGB(
          Math.min(1, 0.98 * bright),
          Math.min(1, 0.31 * bright),
          Math.min(1, 0.06 * bright),
        );
        atmMat.color.setRGB(1, 0.44, 0.19);
      }
      mat.size = isSpeaking ? 0.048 + avgFreq * 0.025 : 0.042;
      atmMat.opacity = isSpeaking ? 0.38 + avgFreq * 0.35 : 0.12;

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      atmGeo.dispose();
      atmMat.dispose();
      dotTexture.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      style={{
        transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.5s ease',
        transform: isSpeaking ? 'scale(1.14)' : 'scale(1)',
        filter: isSpeaking
          ? isCyber
            ? 'drop-shadow(0 0 28px rgba(0, 240, 255, 0.9)) drop-shadow(0 0 60px rgba(255, 0, 170, 0.4))'
            : 'drop-shadow(0 0 22px rgba(250, 80, 15, 0.85))'
          : isCyber
            ? 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.35)) drop-shadow(0 0 30px rgba(255, 0, 170, 0.15))'
            : 'drop-shadow(0 0 6px rgba(250, 80, 15, 0.22))',
      }}
    >
      <div ref={mountRef} />
    </div>
  );
}
