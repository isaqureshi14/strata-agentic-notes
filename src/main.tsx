import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Intercept localStorage to sandbox guest sessions into sessionStorage,
// while allowing developer sessions to write persistently to actual localStorage.
const originalLocalStorage = window.localStorage;
const originalSessionStorage = window.sessionStorage;

const localStorageProxy = new Proxy(originalLocalStorage, {
  get(_target, prop) {
    const isDev = originalSessionStorage.getItem('antigravity_dev_logged_in') === 'true';

    if (prop === 'getItem') {
      return (key: string) => {
        if (key === 'antigravity_web_feedback') {
          return originalLocalStorage.getItem(key);
        }
        const storage = isDev ? originalLocalStorage : originalSessionStorage;
        return storage.getItem(key);
      };
    }
    if (prop === 'setItem') {
      return (key: string, value: string) => {
        if (key === 'antigravity_web_feedback') {
          return originalLocalStorage.setItem(key, value);
        }
        const storage = isDev ? originalLocalStorage : originalSessionStorage;
        return storage.setItem(key, value);
      };
    }
    if (prop === 'removeItem') {
      return (key: string) => {
        if (key === 'antigravity_web_feedback') {
          return originalLocalStorage.removeItem(key);
        }
        const storage = isDev ? originalLocalStorage : originalSessionStorage;
        return storage.removeItem(key);
      };
    }
    if (prop === 'clear') {
      return () => {
        if (!isDev) {
          originalSessionStorage.clear();
        } else {
          const feedback = originalLocalStorage.getItem('antigravity_web_feedback');
          originalLocalStorage.clear();
          if (feedback) {
            originalLocalStorage.setItem('antigravity_web_feedback', feedback);
          }
        }
      };
    }
    if (prop === 'key') {
      return (index: number) => {
        const storage = isDev ? originalLocalStorage : originalSessionStorage;
        return storage.key(index);
      };
    }

    const storage = isDev ? originalLocalStorage : originalSessionStorage;
    if (prop === 'length') {
      return storage.length;
    }

    const val = storage[prop as any];
    if (typeof val === 'function') {
      return val.bind(storage);
    }
    return val;
  }
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageProxy,
  writable: true,
  configurable: true
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

