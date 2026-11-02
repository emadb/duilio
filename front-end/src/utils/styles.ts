import type { CSSProperties } from 'react';

/** Button looks shared by the dialogs: Streamline outline with a flat shadow under the edge. */
export const PRIMARY_BTN: CSSProperties = {
  background: 'var(--eui-color-primary)',
  color: 'var(--eui-on-primary)',
  border: 'var(--eui-outline)',
  boxShadow: 'var(--eui-shadow-s)',
};

export const DANGER_BTN: CSSProperties = {
  background: 'var(--eui-color-danger)',
  color: '#fff',
  border: 'var(--eui-outline)',
  boxShadow: 'var(--eui-shadow-s)',
};

export const GHOST_BTN: CSSProperties = {
  background: 'transparent',
  color: 'var(--eui-text-color)',
  border: 'var(--eui-outline)',
};
