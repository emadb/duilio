import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// EUI Borealis theme — install @elastic/eui and @elastic/eui-theme-borealis
import '@elastic/eui/dist/eui_theme_borealis.min.css';

// Global modal animations
const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }

  @keyframes tmFadeIn  { from { opacity: 0; }                              to { opacity: 1; } }
  @keyframes tmSlideIn { from { transform: translateY(12px) scale(0.97); opacity: 0; } to { transform: none; opacity: 1; } }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
