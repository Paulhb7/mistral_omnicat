'use client';
import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/theme-context';

export default function OrangeGlobe({
  size = 640,
  opacity = 0.22,
}: {
  size?: number;
  opacity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { themeKey } = useTheme();
  const isCyber = themeKey === 'cyberpunk';

  // Color config per theme
  const gridColor = isCyber ? 'rgba(0,240,255,1)' : 'rgba(250,110,25,1)';
  const glowColor = isCyber ? [0, 240, 255] : [250, 80, 15];
  const rimColor = isCyber ? 'rgba(0,240,255,0.45)' : 'rgba(250,80,15,0.45)';
  const specColor = isCyber ? [0, 200, 255] : [255, 160, 90];
  const sphereBase = isCyber
    ? { a: 'rgba(8, 16, 48, 0.88)', b: 'rgba(5, 8, 20, 0.92)', c: 'rgba(4, 4, 12, 0.96)' }
    : { a: 'rgba(48, 24, 8, 0.88)', b: 'rgba(20, 12, 5, 0.92)', c: 'rgba(6, 6, 8, 0.96)' };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r  = size * 0.44;
    const tilt = 22 * (Math.PI / 180);

    let rot = 0;
    let animId: number;

    function project(phi: number, lam: number): [number, number, number] {
      const x  = Math.cos(phi) * Math.sin(lam + rot);
      const y  = Math.sin(phi);
      const z  = Math.cos(phi) * Math.cos(lam + rot);
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
      const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      return [cx + r * x, cy - r * y2, z2];
    }

    function seg(
      phi1: number, lam1: number,
      phi2: number, lam2: number,
      frontAlpha: number,
    ) {
      const [x1, y1, z1] = project(phi1, lam1);
      const [x2, y2, z2] = project(phi2, lam2);
      const depth = (z1 + z2) * 0.5;
      ctx!.globalAlpha = depth > 0 ? frontAlpha : frontAlpha * 0.15;
      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(x2, y2);
      ctx!.stroke();
    }

    const STEPS = 96;

    function draw() {
      ctx!.clearRect(0, 0, size, size);
      ctx!.globalAlpha = 1;

      // Atmosphere glow
      const glow = ctx!.createRadialGradient(cx, cy, r * 0.82, cx, cy, r * 1.28);
      glow.addColorStop(0,   `rgba(${glowColor[0]},${glowColor[1]},${glowColor[2]},0)`);
      glow.addColorStop(0.4, `rgba(${glowColor[0]},${glowColor[1]},${glowColor[2]},0.07)`);
      glow.addColorStop(1,   `rgba(${glowColor[0]},${glowColor[1]},${glowColor[2]},0)`);
      ctx!.beginPath();
      ctx!.arc(cx, cy, r * 1.28, 0, Math.PI * 2);
      ctx!.fillStyle = glow;
      ctx!.fill();

      // Dark sphere base
      const sg = ctx!.createRadialGradient(
        cx - r * 0.3, cy - r * 0.25, r * 0.04,
        cx, cy, r,
      );
      sg.addColorStop(0,   sphereBase.a);
      sg.addColorStop(0.5, sphereBase.b);
      sg.addColorStop(1,   sphereBase.c);
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fillStyle = sg;
      ctx!.fill();
      ctx!.restore();

      // Grid
      ctx!.strokeStyle = gridColor;
      ctx!.lineWidth = 0.55;

      for (let lat = -80; lat <= 80; lat += 20) {
        const phi = lat * (Math.PI / 180);
        const isEquator = lat === 0;
        ctx!.lineWidth = isEquator ? 0.9 : 0.55;
        for (let i = 0; i < STEPS; i++) {
          const l1 = (i / STEPS) * Math.PI * 2;
          const l2 = ((i + 1) / STEPS) * Math.PI * 2;
          seg(phi, l1, phi, l2, isEquator ? 0.65 : 0.38);
        }
      }

      ctx!.lineWidth = 0.55;
      for (let lng = 0; lng < 360; lng += 30) {
        const lam = lng * (Math.PI / 180);
        for (let i = 0; i < STEPS; i++) {
          const p1 = ((i / STEPS) - 0.5) * Math.PI;
          const p2 = (((i + 1) / STEPS) - 0.5) * Math.PI;
          seg(p1, lam, p2, lam, 0.38);
        }
      }

      ctx!.globalAlpha = 1;

      // Sphere rim
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.strokeStyle = rimColor;
      ctx!.lineWidth = 1.6;
      ctx!.stroke();

      // Specular highlight
      const spec = ctx!.createRadialGradient(
        cx - r * 0.42, cy - r * 0.38, 0,
        cx - r * 0.2,  cy - r * 0.18, r * 0.52,
      );
      spec.addColorStop(0, `rgba(${specColor[0]},${specColor[1]},${specColor[2]},0.14)`);
      spec.addColorStop(1, `rgba(${specColor[0]},${specColor[1]},${specColor[2]},0)`);
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.clip();
      ctx!.fillStyle = spec;
      ctx!.fillRect(0, 0, size, size);
      ctx!.restore();

      rot -= 0.0025;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [size, gridColor, glowColor, rimColor, specColor, sphereBase]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, opacity, display: 'block' }}
    />
  );
}
