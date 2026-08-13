import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// The ميعاد design system (_ds_bundle.js) is a legacy UMD script that reads
// `window.React` / `window.ReactDOM` and registers components onto
// `window.MeaadDesignSystem_54b82a`. Expose the single npm React instance
// globally so the bundle (and anything else) shares one copy of React, then
// load the bundle before evaluating the app — page components destructure
// design-system components at module top level, so they must not be
// imported until the bundle has actually registered them.
window.React = React;
window.ReactDOM = ReactDOM;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

async function bootstrap() {
  await loadScript('/_ds/meaad-design-system-54b82ae0-23b3-4f03-a001-0d94ca67e9ba/_ds_bundle.js');
  const { default: App } = await import('./App.jsx');
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
