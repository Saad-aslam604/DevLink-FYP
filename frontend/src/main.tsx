import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
// Monaco loader config (safe to import even if Monaco packages are missing)
try {
  import('./lib/monacoLoader')
} catch (e) { console.warn('monacoLoader import failed', e) }

const container = document.getElementById('root')!;
const root = createRoot(container);

// Disable React.StrictMode for the live-coding pages to avoid double-mount side-effects
const isLiveCodingPage = typeof window !== 'undefined' && (
  window.location.pathname.includes('/live-coding') ||
  window.location.pathname.includes('/test-live-coding')
);

if (isLiveCodingPage) {
  // render without StrictMode to avoid double mounting in development (useful for long-lived resources)
  root.render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  );
} else {
  root.render(
    <React.StrictMode>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
