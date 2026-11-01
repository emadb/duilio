import React from 'react';

export const Badge: React.FC<{ label: string }> = ({ label }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: 'var(--eui-bg-subdued)',
      border: '1px solid var(--eui-border-color)',
      color: 'var(--eui-text-subdued)',
      borderRadius: 999,
      padding: '0 7px',
      fontSize: 11,
      fontWeight: 600,
      lineHeight: '18px',
      fontFamily: 'var(--eui-font-family)',
    }}
  >
    {label}
  </span>
);
