import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
}

/** A short message at the bottom of the screen for an action that failed. It hides by itself. */
export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'max(24px, env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        maxWidth: 'min(520px, calc(100vw - 32px))',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 'var(--eui-border-radius-medium)',
        background: 'var(--eui-ink)',
        color: '#fff',
        fontFamily: 'var(--eui-font-family)',
        fontSize: 14,
        boxShadow: '0 4px 0 rgba(17, 17, 17, 0.35)',
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        aria-label="Close message"
        style={{
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
};
