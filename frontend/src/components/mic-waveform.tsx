'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/theme-context';

interface MicWaveformProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
}

export function MicWaveform({ analyser, isActive }: MicWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme, themeKey } = useTheme();
  const isCyber = themeKey === 'cyberpunk';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animId: number;

    const GAIN = 2.5; // Amplify the waveform visually

    const draw = () => {
      animId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;
      ctx.clearRect(0, 0, w, h);

      // Center line (dim reference)
      ctx.strokeStyle = isCyber
        ? 'rgba(0, 240, 255, 0.12)'
        : 'rgba(250, 80, 15, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();

      // Waveform — amplified
      ctx.strokeStyle = isCyber
        ? 'rgba(0, 240, 255, 0.85)'
        : 'rgba(250, 80, 15, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // dataArray[i] is 0-255, center is 128
        const deviation = (dataArray[i] - 128) / 128; // -1 to 1
        const amplified = Math.max(-1, Math.min(1, deviation * GAIN));
        const y = mid - amplified * mid;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.stroke();

      // Glow pass (thicker, more transparent)
      ctx.strokeStyle = isCyber
        ? 'rgba(0, 240, 255, 0.2)'
        : 'rgba(250, 80, 15, 0.15)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const deviation = (dataArray[i] - 128) / 128;
        const amplified = Math.max(-1, Math.min(1, deviation * GAIN));
        const y = mid - amplified * mid;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();

      // Edge ticks (HUD aesthetic)
      ctx.strokeStyle = isCyber
        ? 'rgba(0, 240, 255, 0.25)'
        : 'rgba(250, 80, 15, 0.2)';
      ctx.lineWidth = 1;
      for (const tx of [0, w - 1]) {
        for (let ty = 4; ty < h; ty += 8) {
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + (tx === 0 ? 3 : -3), ty);
          ctx.stroke();
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [analyser, isActive, isCyber]);

  if (!isActive) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '4px 24px 6px',
    }}>
      <canvas
        ref={canvasRef}
        width={280}
        height={48}
        style={{
          width: 280, height: 48,
          filter: isCyber ? `drop-shadow(0 0 6px ${theme.accent})` : 'none',
        }}
      />
      <div style={{
        fontSize: 6, letterSpacing: 3,
        color: theme.fgMuted,
        textTransform: 'uppercase',
        fontFamily: "'Roboto Mono', monospace",
        textShadow: isCyber ? `0 0 6px ${theme.accent}` : 'none',
      }}>
        YOUR VOICE
      </div>
    </div>
  );
}
