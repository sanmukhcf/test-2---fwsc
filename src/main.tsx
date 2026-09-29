import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Ensure window.fetch has both getter and setter across all browser contexts
if (typeof window !== 'undefined') {
  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
    if (desc && !desc.set) {
      let currentFetch = window.fetch.bind(window);
      Object.defineProperty(window, 'fetch', {
        get() {
          return currentFetch;
        },
        set(fn) {
          if (typeof fn === 'function') {
            currentFetch = fn;
          }
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch {}
}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
