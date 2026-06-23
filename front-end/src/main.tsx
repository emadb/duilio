import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// EUI Borealis-inspired design tokens (CSS custom properties)
const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }

  :root {
    /* Typography */
    --eui-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;

    /* Colors */
    --eui-color-primary: #0071c2;
    --eui-color-danger: #bd271e;
    --eui-color-medium-shade: #69707d;

    /* Backgrounds */
    --eui-page-background: #f5f7fa;
    --eui-bg-plain: #ffffff;
    --eui-bg-subdued: #f5f7fa;
    --eui-bg-interactive-hover: #e9edf3;
    --eui-bg-interactive-overlay: rgba(0, 0, 0, 0.5);
    --eui-bg-base-primary: #e6f0f8;
    --eui-bg-base-success: #e9f7ef;
    --eui-bg-base-warning: #fff8e6;
    --eui-bg-base-danger: #fce8e8;

    /* Text */
    --eui-text-color: #1a1c21;
    --eui-title-color: #1a1c21;
    --eui-text-subdued: #69707d;
    --eui-text-primary: #0071c2;
    --eui-text-success: #017d73;
    --eui-text-warning: #8a6a0a;
    --eui-text-danger: #bd271e;

    /* Borders */
    --eui-border-color: #d3dae6;
    --eui-border-color-danger: #f5a8a8;
    --eui-border-radius-medium: 6px;
    --eui-border-radius-large: 8px;

    /* Header */
    --eui-header-background: #ffffff;
    --eui-header-border-color: #d3dae6;

    /* Forms */
    --eui-form-background: #ffffff;
    --eui-form-border-color: #c2c8d0;

    /* Shadows */
    --eui-shadow-xs: 0 1px 2px rgba(0,0,0,0.08);
    --eui-shadow-s: 0 2px 4px rgba(0,0,0,0.1);
    --eui-shadow-m: 0 4px 8px rgba(0,0,0,0.12);
    --eui-shadow-l: 0 8px 20px rgba(0,0,0,0.15);
  }

  @keyframes tmFadeIn  { from { opacity: 0; }                              to { opacity: 1; } }
  @keyframes tmSlideIn { from { transform: translateY(12px) scale(0.97); opacity: 0; } to { transform: none; opacity: 1; } }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
