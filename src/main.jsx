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

// Registered after load so fetching the worker never competes with the first paint.
// Dev is skipped: the cache-first rules would serve stale modules over Vite's HMR.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // updateViaCache:'none' makes the browser revalidate sw.js on every check rather
    // than trusting the HTTP cache — the CDN puts a 7-day max-age on it, which would
    // otherwise let a superseded worker keep serving an old cache after a deploy.
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {});
  });
}
