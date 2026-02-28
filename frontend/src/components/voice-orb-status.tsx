'use client';

import dynamic from 'next/dynamic';
import { useTheme } from '@/context/theme-context';

const OmniOrb = dynamic(() => import('@/components/omni-orb').then(m => ({ default: m.OmniOrb })), { ssr: false });

interface VoiceOrbStatusProps {
  isSpeaking: boolean;
  analyser: AnalyserNode | null;
}

export function VoiceOrbStatus({ isSpeaking, analyser }: VoiceOrbStatusProps) {
  const { theme, themeKey } = useTheme();
  const isCyber = themeKey === 'cyberpunk';

  return (
    <div style={{ padding: '6px 0 4px', borderTop: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
      <OmniOrb isSpeaking={isSpeaking} analyser={analyser} />
      <div style={{
        fontSize: isCyber ? 9 : 7,
        letterSpacing: isCyber ? 4 : 3,
        color: isSpeaking ? theme.accent : theme.fgMuted,
        textTransform: 'uppercase',
        transition: 'color 0.4s ease',
        animation: isSpeaking ? 'pulse 0.6s ease-in-out infinite' : 'none',
        textShadow: isCyber ? `0 0 8px ${theme.accent}, 0 0 16px ${theme.accent}` : 'none',
      }}>
        {isSpeaking ? 'SPEAKING' : 'OMNI \u00b7 READY'}
      </div>
    </div>
  );
}
