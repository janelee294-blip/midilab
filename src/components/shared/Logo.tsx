import React from 'react';

interface LogoProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function Logo({ theme = 'dark', size = 'md', onClick }: LogoProps) {
  const imgPx = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const textSize = size === 'sm' ? '14px' : size === 'lg' ? '22px' : '17px';
  const textColor = theme === 'dark' ? '#ffffff' : '#0f172a';

  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src="/Symbol.png"
        alt="MIDI LAB symbol"
        style={{ width: imgPx, height: imgPx, objectFit: 'contain', flexShrink: 0 }}
      />
      <span style={{
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 800,
        fontSize: textSize,
        letterSpacing: '0.04em',
        lineHeight: 1,
        color: textColor,
        userSelect: 'none',
      }}>
        MIDI LAB
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        {content}
      </button>
    );
  }
  return <>{content}</>;
}
