'use client';
import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/theme-context';

export default function SpiralGalaxy({
  size = 540,
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

    // Galaxy colors
    const coreColor = isCyber ? [0, 240, 255] : [250, 120, 40];
    const armColor = isCyber ? [0, 180, 220] : [250, 100, 25];
    const starColor = isCyber ? [200, 240, 255] : [255, 220, 180];
    const dustColor = isCyber ? [0, 100, 140] : [180, 70, 15];

    let rot = 0;
    let animId: number;

    // Pre-generate star positions along spiral arms
    const NUM_ARMS = 4;
    const ARM_STARS = 800;
    const FIELD_STARS = 300;
    const CORE_STARS = 500;

    interface Star {
      angle: number;   // base angle on spiral
      radius: number;  // distance from center
      spread: number;  // perpendicular offset
      size: number;
      brightness: number;
      arm: number;
    }

    const armStars: Star[] = [];
    const coreStars: Star[] = [];
    const fieldStars: { x: number; y: number; size: number; brightness: number }[] = [];

    // Spiral arm stars
    for (let a = 0; a < NUM_ARMS; a++) {
      const armOffset = (a / NUM_ARMS) * Math.PI * 2;
      for (let i = 0; i < ARM_STARS; i++) {
        const t = i / ARM_STARS;
        const radius = 20 + t * (size * 0.42);
        // Logarithmic spiral: angle increases with log of radius
        const spiralAngle = armOffset + t * Math.PI * 2.8;
        // Stars spread more at larger radii
        const spreadAmount = 4 + t * 28;
        const spread = (Math.random() - 0.5) * 2 * spreadAmount;

        armStars.push({
          angle: spiralAngle,
          radius,
          spread,
          size: 0.3 + Math.random() * 1.8 * (1 - t * 0.5),
          brightness: 0.15 + Math.random() * 0.6 * (1 - t * 0.3),
          arm: a,
        });
      }
    }

    // Core bulge stars (concentrated at center)
    for (let i = 0; i < CORE_STARS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * Math.random() * size * 0.15; // concentrated near center
      coreStars.push({
        angle,
        radius: r,
        spread: 0,
        size: 0.4 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
        arm: -1,
      });
    }

    // Random field stars (background)
    for (let i = 0; i < FIELD_STARS; i++) {
      fieldStars.push({
        x: Math.random() * size,
        y: Math.random() * size,
        size: 0.3 + Math.random() * 0.8,
        brightness: 0.05 + Math.random() * 0.2,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, size, size);

      // Background field stars (static, no rotation)
      for (const s of fieldStars) {
        ctx!.globalAlpha = s.brightness;
        ctx!.fillStyle = `rgb(${starColor[0]},${starColor[1]},${starColor[2]})`;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Core glow layers
      ctx!.globalAlpha = 1;
      const glow1 = ctx!.createRadialGradient(cx, cy, 0, cx, cy, size * 0.22);
      glow1.addColorStop(0, `rgba(${coreColor[0]},${coreColor[1]},${coreColor[2]},0.15)`);
      glow1.addColorStop(0.3, `rgba(${coreColor[0]},${coreColor[1]},${coreColor[2]},0.06)`);
      glow1.addColorStop(0.6, `rgba(${coreColor[0]},${coreColor[1]},${coreColor[2]},0.02)`);
      glow1.addColorStop(1, `rgba(${coreColor[0]},${coreColor[1]},${coreColor[2]},0)`);
      ctx!.fillStyle = glow1;
      ctx!.fillRect(0, 0, size, size);

      // Bright inner core
      const glow2 = ctx!.createRadialGradient(cx, cy, 0, cx, cy, size * 0.06);
      glow2.addColorStop(0, `rgba(${starColor[0]},${starColor[1]},${starColor[2]},0.7)`);
      glow2.addColorStop(0.4, `rgba(${coreColor[0]},${coreColor[1]},${coreColor[2]},0.3)`);
      glow2.addColorStop(1, `rgba(${coreColor[0]},${coreColor[1]},${coreColor[2]},0)`);
      ctx!.fillStyle = glow2;
      ctx!.beginPath();
      ctx!.arc(cx, cy, size * 0.06, 0, Math.PI * 2);
      ctx!.fill();

      // Draw dust lanes along arms (wider, dimmer strokes)
      ctx!.lineCap = 'round';
      for (let a = 0; a < NUM_ARMS; a++) {
        const armOffset = (a / NUM_ARMS) * Math.PI * 2;
        ctx!.beginPath();
        for (let i = 0; i < 100; i++) {
          const t = i / 100;
          const radius = 30 + t * (size * 0.38);
          const spiralAngle = armOffset + t * Math.PI * 2.8 + rot;
          const x = cx + Math.cos(spiralAngle) * radius;
          const y = cy + Math.sin(spiralAngle) * radius;
          if (i === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.strokeStyle = `rgba(${dustColor[0]},${dustColor[1]},${dustColor[2]},0.06)`;
        ctx!.lineWidth = 35 - 10; // wide dust lane
        ctx!.stroke();

        // Brighter inner arm
        ctx!.strokeStyle = `rgba(${armColor[0]},${armColor[1]},${armColor[2]},0.04)`;
        ctx!.lineWidth = 14;
        ctx!.stroke();
      }

      // Draw arm stars
      for (const s of armStars) {
        const angle = s.angle + rot;
        // Calculate position along spiral
        const px = cx + Math.cos(angle) * s.radius;
        const py = cy + Math.sin(angle) * s.radius;
        // Apply perpendicular spread
        const perpAngle = angle + Math.PI / 2;
        const x = px + Math.cos(perpAngle) * s.spread;
        const y = py + Math.sin(perpAngle) * s.spread;

        // Distance from center for color blending
        const dist = s.radius / (size * 0.42);
        const r = Math.round(armColor[0] + (starColor[0] - armColor[0]) * dist * 0.5);
        const g = Math.round(armColor[1] + (starColor[1] - armColor[1]) * dist * 0.5);
        const b = Math.round(armColor[2] + (starColor[2] - armColor[2]) * dist * 0.5);

        ctx!.globalAlpha = s.brightness;
        ctx!.fillStyle = `rgb(${r},${g},${b})`;
        ctx!.beginPath();
        ctx!.arc(x, y, s.size, 0, Math.PI * 2);
        ctx!.fill();

        // Soft glow on brighter stars
        if (s.brightness > 0.45 && s.size > 1) {
          ctx!.globalAlpha = s.brightness * 0.15;
          ctx!.beginPath();
          ctx!.arc(x, y, s.size * 3, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // Draw core stars
      for (const s of coreStars) {
        const angle = s.angle + rot * 1.2; // core rotates slightly faster
        const x = cx + Math.cos(angle) * s.radius;
        const y = cy + Math.sin(angle) * s.radius;

        ctx!.globalAlpha = s.brightness;
        ctx!.fillStyle = `rgb(${starColor[0]},${starColor[1]},${starColor[2]})`;
        ctx!.beginPath();
        ctx!.arc(x, y, s.size, 0, Math.PI * 2);
        ctx!.fill();
      }

      // "You Are Here" marker — on arm 0, about 60% out
      const markerT = 0.55;
      const markerAngle = (0 / NUM_ARMS) * Math.PI * 2 + markerT * Math.PI * 2.8 + rot;
      const markerR = 20 + markerT * (size * 0.42);
      const mx = cx + Math.cos(markerAngle) * markerR;
      const my = cy + Math.sin(markerAngle) * markerR;

      // Pulsing ring
      const pulse = 0.7 + Math.sin(Date.now() * 0.003) * 0.3;
      ctx!.globalAlpha = 0.5 * pulse;
      ctx!.strokeStyle = `rgb(${coreColor[0]},${coreColor[1]},${coreColor[2]})`;
      ctx!.lineWidth = 1;
      ctx!.setLineDash([2, 2]);
      ctx!.beginPath();
      ctx!.arc(mx, my, 8, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.setLineDash([]);

      ctx!.globalAlpha = 0.7;
      ctx!.fillStyle = `rgb(${coreColor[0]},${coreColor[1]},${coreColor[2]})`;
      ctx!.beginPath();
      ctx!.arc(mx, my, 3, 0, Math.PI * 2);
      ctx!.fill();

      // Label
      ctx!.globalAlpha = 0.55;
      ctx!.font = `7px monospace`;
      ctx!.fillStyle = `rgb(${coreColor[0]},${coreColor[1]},${coreColor[2]})`;
      ctx!.textAlign = 'center';
      ctx!.fillText('YOU ARE HERE', mx, my - 14);

      // Exoplanet highlight — on arm 2, about 45% out
      const exoT = 0.45;
      const exoArm = 2;
      const exoAngle = (exoArm / NUM_ARMS) * Math.PI * 2 + exoT * Math.PI * 2.8 + rot;
      const exoR = 20 + exoT * (size * 0.42);
      const ex = cx + Math.cos(exoAngle) * exoR;
      const ey = cy + Math.sin(exoAngle) * exoR;

      ctx!.globalAlpha = 0.5;
      ctx!.fillStyle = '#5588cc';
      ctx!.beginPath();
      ctx!.arc(ex, ey, 4, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.globalAlpha = 0.12;
      ctx!.beginPath();
      ctx!.arc(ex, ey, 8, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.globalAlpha = 0.04;
      ctx!.beginPath();
      ctx!.arc(ex, ey, 14, 0, Math.PI * 2);
      ctx!.fill();

      rot -= 0.0008;
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
