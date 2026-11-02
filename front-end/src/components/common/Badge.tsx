import React from 'react';

export const Badge: React.FC<{ label: string }> = ({ label }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: 'var(--eui-bg-subdued)',
      color: 'var(--eui-text-color)',
      borderRadius: 8,
      padding: '1px 8px',
      fontSize: 11,
      fontWeight: 600,
      lineHeight: '18px',
      fontFamily: 'var(--eui-font-family)',
    }}
  >
    {label}
  </span>
);
