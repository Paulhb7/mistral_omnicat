'use client';

import type { RefObject } from 'react';
import { useTheme } from '@/context/theme-context';

interface SearchBarProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMicToggle?: () => void;
  isLoading: boolean;
  isScanning: boolean;
  isListening?: boolean;
  voiceMode?: boolean;
  statusText: string;
  monoFont: string;
}

export function SearchBar({
  inputRef,
  value,
  onChange,
  onSubmit,
  onMicToggle,
  isLoading,
  isScanning,
  isListening = false,
  voiceMode = false,
  statusText,
  monoFont,
}: SearchBarProps) {
  const { theme } = useTheme();

  return (
    <div style={{ padding: '12px 14px 14px', borderTop: `1px solid ${theme.border}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', background: theme.card, border: `1px solid ${theme.border}` }}>
        {/* Mic button */}
        {onMicToggle && (
          <button
            onClick={onMicToggle}
            disabled={isLoading}
            title={voiceMode ? 'Disable voice mode' : 'Enable voice mode'}
            style={{
              background: 'transparent',
              border: 'none',
              borderRight: `1px solid ${theme.border}`,
              color: voiceMode ? theme.accent : theme.fgMuted,
              cursor: 'pointer',
              fontSize: 14,
              padding: '8px 11px',
              fontFamily: monoFont,
              opacity: isLoading ? 0.3 : 1,
              animation: isListening ? 'pulse 0.6s ease-in-out infinite' : 'none',
              transition: 'color 0.3s ease',
            }}
          >
            {voiceMode ? '\u25C9' : '\u25CB'}
          </button>
        )}
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
          disabled={isLoading}
          placeholder={voiceMode ? 'voice mode active...' : 'location or query...'}
          autoComplete="off"
          autoFocus
          style={{ flex: 1, background: 'transparent', border: 'none', color: theme.accent, fontFamily: monoFont, fontSize: 12, letterSpacing: 1, padding: '10px 14px', outline: 'none', opacity: isLoading ? 0.4 : 1 }}
        />
        <button
          onClick={onSubmit}
          disabled={isLoading}
          style={{ background: 'transparent', border: 'none', borderLeft: `1px solid ${theme.border}`, color: theme.fgDim, cursor: 'pointer', fontSize: 15, padding: '8px 13px', fontFamily: monoFont, opacity: isLoading ? 0.3 : 1 }}
        >{'\u2192'}</button>
      </div>
      <div style={{ fontSize: 8, letterSpacing: 2, color: theme.fgMuted, textTransform: 'uppercase', marginTop: 6, height: 11, animation: isScanning ? 'scan 0.8s ease-in-out infinite' : 'none' }}>
        {statusText}
      </div>
    </div>
  );
}
