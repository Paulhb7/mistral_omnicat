'use client';

import type { RefObject } from 'react';

interface SearchBarProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isScanning: boolean;
  statusText: string;
  monoFont: string;
}

export function SearchBar({
  inputRef,
  value,
  onChange,
  onSubmit,
  isLoading,
  isScanning,
  statusText,
  monoFont,
}: SearchBarProps) {
  return (
    <div style={{ padding: '12px 14px 14px', borderTop: '1px solid rgba(255,250,235,0.08)', flexShrink: 0 }}>
      <div style={{ display: 'flex', background: 'rgba(255,250,235,0.04)', border: '1px solid rgba(255,250,235,0.08)' }}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
          disabled={isLoading}
          placeholder="location or query..."
          autoComplete="off"
          autoFocus
          style={{ flex: 1, background: 'transparent', border: 'none', color: '#fa500f', fontFamily: monoFont, fontSize: 12, letterSpacing: 1, padding: '10px 14px', outline: 'none', opacity: isLoading ? 0.4 : 1 }}
        />
        <button
          onClick={onSubmit}
          disabled={isLoading}
          style={{ background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,250,235,0.08)', color: 'rgba(255,250,235,0.45)', cursor: 'pointer', fontSize: 15, padding: '8px 13px', fontFamily: monoFont, opacity: isLoading ? 0.3 : 1 }}
        >\u2192</button>
      </div>
      <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,250,235,0.25)', textTransform: 'uppercase', marginTop: 6, height: 11, animation: isScanning ? 'scan 0.8s ease-in-out infinite' : 'none' }}>
        {statusText}
      </div>
    </div>
  );
}
