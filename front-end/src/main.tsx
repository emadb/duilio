import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// EUI Borealis-inspired design tokens (CSS custom properties)
const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }

  :root {
    /* Streamline theme: soft grey ground, ink outlines. Primary actions are ink black: no tag color can match them. */
    --eui-font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;

    /* Colors */
    --eui-color-primary: #111111;
    --eui-on-primary: #FFFFFF;
    --eui-color-danger: #C9362B;
    --eui-color-medium-shade: #6B6B68;
    --eui-ink: #111111;

    /* Backgrounds */
    --eui-page-background: #F4F4F2;
    --eui-bg-plain: #ffffff;
    --eui-bg-subdued: #ECECE8;
    --eui-bg-interactive-hover: #E8E8E4;
    --eui-bg-interactive-overlay: rgba(17, 17, 17, 0.5);
    --eui-bg-base-primary: #E8E8E3;
    --eui-bg-base-success: #E3F4E6;
    --eui-bg-base-warning: #FFF1CC;
    --eui-bg-base-danger: #FFE3DD;

    /* Text */
    --eui-text-color: #111111;
    --eui-title-color: #111111;
    --eui-text-subdued: #6B6B68;
    --eui-text-primary: #111111;
    --eui-text-success: #1E7A4F;
    --eui-text-warning: #8A5A00;
    --eui-text-danger: #B33A25;

    /* Borders and shape */
    --eui-border-color: #D6D6D0;
    --eui-border-color-danger: #E8A79C;
    --eui-border-radius-medium: 10px;
    --eui-border-radius-large: 12px;
    --eui-outline: 1.5px solid #111111;

    /* Header */
    --eui-header-background: #F4F4F2;
    --eui-header-border-color: #D6D6D0;

    /* Forms */
    --eui-form-background: #ffffff;
    --eui-form-border-color: #111111;

    /* Shadows: flat offsets under the edge, no blur */
    --eui-shadow-xs: 0 2px 0 #111111;
    --eui-shadow-s: 0 3px 0 #111111;
    --eui-shadow-m: 0 4px 0 #111111;
    --eui-shadow-l: 0 6px 0 #111111;
  }


  /* Card actions show on hover or keyboard focus. Touch screens have no hover: always show them. */
  .task-card .card-action { opacity: 0; transition: opacity 0.12s ease; }
  .task-card:hover .card-action, .task-card:focus-within .card-action { opacity: 1; }
  @media (hover: none) { .task-card .card-action { opacity: 1; } }

  @keyframes tmFadeIn  { from { opacity: 0; }                              to { opacity: 1; } }
  @keyframes tmSlideIn { from { transform: translateY(12px) scale(0.97); opacity: 0; } to { transform: none; opacity: 1; } }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
