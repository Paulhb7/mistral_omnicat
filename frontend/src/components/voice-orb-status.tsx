'use client';

import dynamic from 'next/dynamic';

const OmniOrb = dynamic(() => import('@/components/omni-orb').then(m => ({ default: m.OmniOrb })), { ssr: false });

interface VoiceOrbStatusProps {
  isSpeaking: boolean;
  analyser: AnalyserNode | null;
}

export function VoiceOrbStatus({ isSpeaking, analyser }: VoiceOrbStatusProps) {
  return (
    <div style={{ padding: '6px 0 4px', borderTop: '1px solid rgba(255,250,235,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
      <OmniOrb isSpeaking={isSpeaking} analyser={analyser} />
      <div style={{ fontSize: 7, letterSpacing: 3, color: isSpeaking ? '#fa500f' : 'rgba(255,250,235,0.18)', textTransform: 'uppercase', transition: 'color 0.4s ease', animation: isSpeaking ? 'pulse 0.6s ease-in-out infinite' : 'none' }}>
        {isSpeaking ? 'SPEAKING' : 'OMNI \u00b7 READY'}
      </div>
    </div>
  );
}
