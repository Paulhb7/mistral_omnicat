'use client';
import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/theme-context';

export default function SolarSystem({
  size = 520,
  opacity = 1,
}: {
  size?: number;
  opacity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { themeKey } = useTheme();
  const isCyber = themeKey === 'cyberpunk';

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

    // 3D projection: tilt the orbital plane
    const TILT = 0.35; // radians — viewing angle above the plane
    const cosTilt = Math.cos(TILT);
    const sinTilt = Math.sin(TILT);

    // Colors
    const sunColor = isCyber ? [0, 240, 255] : [255, 160, 40];
    const sunCore = isCyber ? [200, 255, 255] : [255, 240, 200];
    const accentColor = isCyber ? [0, 200, 255] : [250, 100, 25];
    const starColor = isCyber ? [180, 230, 255] : [255, 220, 180];

    // Planets definition
    interface Planet {
      name: string;
      orbitR: number;        // orbit radius in px
      size: number;          // planet radius
      speed: number;         // radians per frame
      color: string;
      glowColor: string;
      startAngle: number;
      hasRing?: boolean;
    }

    const planets: Planet[] = [
      { name: 'Mercury', orbitR: 55, size: 2.5, speed: 0.003, color: '#aaaaaa', glowColor: 'rgba(170,170,170,0.15)', startAngle: 0.8 },
      { name: 'Venus',   orbitR: 85, size: 3.5, color: '#ddcc88', glowColor: 'rgba(221,204,136,0.12)', speed: 0.002, startAngle: 2.1 },
      { name: 'Earth',   orbitR: 120, size: 5, color: '#4488cc', glowColor: 'rgba(68,136,204,0.2)', speed: 0.0013, startAngle: 4.2 },
      { name: 'Mars',    orbitR: 160, size: 3.8, color: '#cc6633', glowColor: 'rgba(204,102,51,0.12)', speed: 0.0008, startAngle: 1.5 },
      { name: 'Jupiter', orbitR: 210, size: 9, color: '#cc9955', glowColor: 'rgba(204,153,85,0.1)', speed: 0.0004, startAngle: 3.7 },
      { name: 'Saturn',  orbitR: 250, size: 7, color: '#ddbb77', glowColor: 'rgba(221,187,119,0.08)', speed: 0.00025, startAngle: 5.5, hasRing: true },
    ];

    // Asteroid belt particles
    const NUM_ASTEROIDS = 120;
    const asteroids: { angle: number; r: number; size: number; speed: number; brightness: number }[] = [];
    for (let i = 0; i < NUM_ASTEROIDS; i++) {
      asteroids.push({
        angle: Math.random() * Math.PI * 2,
        r: 180 + Math.random() * 25,
        size: 0.5 + Math.random() * 1.2,
        speed: 0.0005 + Math.random() * 0.0003,
        brightness: 0.15 + Math.random() * 0.3,
      });
    }

    // Solar wind particles
    const NUM_WIND = 40;
    const windParticles: { angle: number; dist: number; speed: number; life: number; maxLife: number; size: number }[] = [];
    for (let i = 0; i < NUM_WIND; i++) {
      windParticles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 20 + Math.random() * 30,
        speed: 0.15 + Math.random() * 0.2,
        life: Math.random() * 100,
        maxLife: 60 + Math.random() * 60,
        size: 0.5 + Math.random() * 1.5,
      });
    }

    // Background stars
    const NUM_STARS = 150;
    const bgStars: { x: number; y: number; size: number; brightness: number }[] = [];
    for (let i = 0; i < NUM_STARS; i++) {
      bgStars.push({
        x: Math.random() * size,
        y: Math.random() * size,
        size: 0.3 + Math.random() * 0.9,
        brightness: 0.05 + Math.random() * 0.2,
      });
    }

    // Project 3D point to 2D with tilt
    function project(x3d: number, y3d: number, z3d: number): { x: number; y: number; depth: number } {
      // Rotate around X axis (tilt)
      const y2 = y3d * cosTilt - z3d * sinTilt;
      const z2 = y3d * sinTilt + z3d * cosTilt;
      return { x: cx + x3d, y: cy + y2, depth: z2 };
    }

    // Draw an elliptical orbit (tilted circle)
    function drawOrbit(radius: number, alpha: number) {
      ctx!.beginPath();
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const x3d = Math.cos(a) * radius;
        const z3d = Math.sin(a) * radius;
        const { x, y } = project(x3d, 0, z3d);
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.closePath();
      ctx!.strokeStyle = `rgba(${accentColor[0]},${accentColor[1]},${accentColor[2]},${alpha})`;
      ctx!.lineWidth = 0.6;
      ctx!.stroke();
    }

    let animId: number;
    let frame = 0;

    function draw() {
      ctx!.clearRect(0, 0, size, size);
      frame++;

      // Background stars
      for (const s of bgStars) {
        const twinkle = 0.7 + Math.sin(frame * 0.02 + s.x * 3) * 0.3;
        ctx!.globalAlpha = s.brightness * twinkle;
        ctx!.fillStyle = `rgb(${starColor[0]},${starColor[1]},${starColor[2]})`;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;

      // Sun glow layers
      const glow1 = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 80);
      glow1.addColorStop(0, `rgba(${sunColor[0]},${sunColor[1]},${sunColor[2]},0.12)`);
      glow1.addColorStop(0.5, `rgba(${sunColor[0]},${sunColor[1]},${sunColor[2]},0.04)`);
      glow1.addColorStop(1, `rgba(${sunColor[0]},${sunColor[1]},${sunColor[2]},0)`);
      ctx!.fillStyle = glow1;
      ctx!.fillRect(0, 0, size, size);

      // Orbit rings (behind planets)
      for (const p of planets) {
        drawOrbit(p.orbitR, p.orbitR > 200 ? 0.06 : 0.1);
      }

      // Asteroid belt orbit hint
      ctx!.setLineDash([3, 4]);
      drawOrbit(190, 0.04);
      ctx!.setLineDash([]);

      // Collect all renderables for depth sorting
      interface Renderable {
        depth: number;
        render: () => void;
      }
      const renderables: Renderable[] = [];

      // Planets
      for (const p of planets) {
        const angle = p.startAngle + frame * p.speed;
        const x3d = Math.cos(angle) * p.orbitR;
        const z3d = Math.sin(angle) * p.orbitR;
        const { x, y, depth } = project(x3d, 0, z3d);

        // Scale based on depth for 3D feel
        const depthScale = 1 + depth / (size * 0.8);
        const drawSize = p.size * (0.7 + depthScale * 0.5);
        const drawAlpha = 0.5 + depthScale * 0.3;

        renderables.push({
          depth,
          render: () => {
            // Planet glow
            ctx!.globalAlpha = Math.max(0.05, drawAlpha * 0.4);
            ctx!.fillStyle = p.glowColor;
            ctx!.beginPath();
            ctx!.arc(x, y, drawSize * 3, 0, Math.PI * 2);
            ctx!.fill();

            // Planet body
            ctx!.globalAlpha = Math.max(0.2, drawAlpha);
            const grad = ctx!.createRadialGradient(x - drawSize * 0.3, y - drawSize * 0.3, 0, x, y, drawSize);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, p.color.replace(')', ',0.6)').replace('rgb', 'rgba'));
            ctx!.fillStyle = grad;
            ctx!.beginPath();
            ctx!.arc(x, y, drawSize, 0, Math.PI * 2);
            ctx!.fill();

            // Saturn ring
            if (p.hasRing) {
              ctx!.globalAlpha = Math.max(0.1, drawAlpha * 0.5);
              ctx!.strokeStyle = p.color;
              ctx!.lineWidth = 1.5;
              ctx!.beginPath();
              ctx!.ellipse(x, y, drawSize * 2.2, drawSize * 0.5 * cosTilt, -0.2, 0, Math.PI * 2);
              ctx!.stroke();
            }

            // Earth label
            if (p.name === 'Earth') {
              ctx!.globalAlpha = 0.4;
              ctx!.font = `7px monospace`;
              ctx!.fillStyle = `rgb(${accentColor[0]},${accentColor[1]},${accentColor[2]})`;
              ctx!.textAlign = 'center';
              ctx!.fillText('EARTH', x, y + drawSize + 12);
            }
          },
        });
      }

      // Asteroids
      for (const a of asteroids) {
        a.angle += a.speed;
        const x3d = Math.cos(a.angle) * a.r;
        const z3d = Math.sin(a.angle) * a.r;
        const { x, y, depth } = project(x3d, 0, z3d);
        const depthAlpha = 0.5 + (depth / (size * 0.6)) * 0.5;

        renderables.push({
          depth,
          render: () => {
            ctx!.globalAlpha = a.brightness * Math.max(0.1, depthAlpha);
            ctx!.fillStyle = `rgb(${accentColor[0]},${accentColor[1]},${accentColor[2]})`;
            ctx!.beginPath();
            ctx!.arc(x, y, a.size * (0.6 + depthAlpha * 0.4), 0, Math.PI * 2);
            ctx!.fill();
          },
        });
      }

      // Solar wind particles
      for (const w of windParticles) {
        w.dist += w.speed;
        w.life++;
        if (w.life > w.maxLife || w.dist > 140) {
          w.angle = Math.random() * Math.PI * 2;
          w.dist = 15 + Math.random() * 10;
          w.life = 0;
          w.maxLife = 60 + Math.random() * 60;
        }

        const lifeRatio = w.life / w.maxLife;
        const fadeAlpha = lifeRatio < 0.2 ? lifeRatio / 0.2 : lifeRatio > 0.7 ? (1 - lifeRatio) / 0.3 : 1;

        const x3d = Math.cos(w.angle) * w.dist;
        const z3d = Math.sin(w.angle) * w.dist;
        const { x, y, depth } = project(x3d, 0, z3d);

        renderables.push({
          depth,
          render: () => {
            ctx!.globalAlpha = fadeAlpha * 0.35;
            ctx!.fillStyle = `rgb(${sunColor[0]},${sunColor[1]},${sunColor[2]})`;
            ctx!.beginPath();
            ctx!.arc(x, y, w.size, 0, Math.PI * 2);
            ctx!.fill();
          },
        });
      }

      // Sort by depth (back to front)
      renderables.sort((a, b) => a.depth - b.depth);
      for (const r of renderables) r.render();

      // Sun — always on top at center (depth 0)
      ctx!.globalAlpha = 1;
      const sunGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 18);
      sunGrad.addColorStop(0, `rgba(${sunCore[0]},${sunCore[1]},${sunCore[2]},0.95)`);
      sunGrad.addColorStop(0.5, `rgba(${sunColor[0]},${sunColor[1]},${sunColor[2]},0.7)`);
      sunGrad.addColorStop(1, `rgba(${sunColor[0]},${sunColor[1]},${sunColor[2]},0)`);
      ctx!.fillStyle = sunGrad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx!.fill();

      // Sun bright core
      ctx!.fillStyle = `rgba(${sunCore[0]},${sunCore[1]},${sunCore[2]},0.9)`;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx!.fill();

      // Pulsing corona
      const pulse = 0.8 + Math.sin(frame * 0.03) * 0.2;
      ctx!.globalAlpha = 0.08 * pulse;
      ctx!.fillStyle = `rgb(${sunColor[0]},${sunColor[1]},${sunColor[2]})`;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 35 * pulse, 0, Math.PI * 2);
      ctx!.fill();

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [size, isCyber]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, opacity, display: 'block' }}
    />
  );
}
