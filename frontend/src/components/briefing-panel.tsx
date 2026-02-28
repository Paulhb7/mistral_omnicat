'use client';

import ReactMarkdown from 'react-markdown';
import { useTheme } from '@/context/theme-context';

interface BriefingPanelProps {
  show: boolean;
  width: number;
  briefing: string | null;
  agentMode: string | null;
  monoFont: string;
  onClose: () => void;
}

export function BriefingPanel({ show, width, briefing, agentMode, monoFont, onClose }: BriefingPanelProps) {
  const { theme, themeKey } = useTheme();
  const isCyber = themeKey === 'cyberpunk';

  return (
    <div style={{
      position: 'fixed', top: 56, right: 0, width, height: 'calc(100vh - 56px)',
      background: theme.bg, borderLeft: `1px solid ${theme.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 70, fontFamily: monoFont,
      transform: show ? 'translateX(0)' : `translateX(${width}px)`,
      transition: 'transform 0.4s ease, background 0.5s ease, border-color 0.5s ease',
    }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 7, letterSpacing: 4, color: theme.accent, textTransform: 'uppercase', marginBottom: 7, textShadow: isCyber ? `0 0 6px ${theme.accent}` : 'none' }}>
            Intelligence Brief
          </div>
          {agentMode && (
            <span style={{
              fontSize: 7, letterSpacing: 2, padding: '2px 7px',
              border: `1px solid ${theme.accentBorder}`,
              color: theme.accent,
              textTransform: 'uppercase', display: 'inline-block',
            }}>
              {agentMode.toUpperCase()} AGENT
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: `1px solid ${theme.border}`,
            color: theme.fgDim, fontFamily: monoFont, fontSize: 14,
            width: 26, height: 26, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}
          title="Close"
        >{'\u00d7'}</button>
      </div>

      <div id="briefing-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }}>
        <div style={{ fontSize: 11, color: theme.fg, opacity: 0.85, lineHeight: 1.9, letterSpacing: 0.3 }}>
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 style={{ fontSize: 16, margin: '0 0 12px', lineHeight: 1.4 }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ fontSize: 14, margin: '16px 0 10px', lineHeight: 1.4 }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: 12, margin: '14px 0 8px', lineHeight: 1.5 }}>{children}</h3>,
              p: ({ children }) => <p style={{ margin: '0 0 10px' }}>{children}</p>,
              ul: ({ children }) => <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ margin: '0 0 10px', paddingLeft: 18 }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
              blockquote: ({ children }) => (
                <blockquote style={{ margin: '0 0 10px', padding: '8px 12px', borderLeft: `2px solid ${theme.accent}`, background: theme.card }}>
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code style={{ padding: '1px 4px', borderRadius: 2, background: theme.card, fontSize: 10, border: `1px solid ${theme.border}` }}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre style={{ margin: '0 0 10px', padding: 10, overflowX: 'auto', background: theme.card, border: `1px solid ${theme.border}` }}>
                  {children}
                </pre>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: theme.accent }}>
                  {children}
                </a>
              ),
            }}
          >
            {briefing ?? ''}
          </ReactMarkdown>
        </div>
      </div>

      <div style={{ padding: '8px 16px', borderTop: `1px solid ${theme.border}`, fontSize: 7, color: theme.fgMuted, letterSpacing: 2, flexShrink: 0 }}>
        OPEN-METEO {'\u00b7'} NASA EONET {'\u00b7'} USGS {'\u00b7'} GDELT {'\u00b7'} ACLED
      </div>
    </div>
  );
}
