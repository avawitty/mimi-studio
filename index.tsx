import React from 'react';
import ReactDOM from 'react-dom/client';
import { inject } from '@vercel/analytics';

const isIgnorableErrorString = (msg: string | null | undefined): boolean => {
  if (!msg || typeof msg !== 'string') return false;
  const lower = msg.toLowerCase();
  return lower.includes('failed to connect to metamask') || 
         lower.includes('metamask') ||
         lower.includes('window.ethereum') ||
         lower.includes('websocket closed without opened') ||
         lower.includes('failed to connect to websocket') ||
         lower.includes('websocket connection') ||
         lower.includes('[vite] failed to connect');
};

// Dispatch error to Service Worker helper for dynamic healing
function dispatchErrorToSW(errorMsg: string) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CONSOLE_ERROR_LOGGED',
      error: errorMsg,
      url: window.location.href
    });
  }
}

// Global top-level capture listeners
window.addEventListener('error', (event) => {
  const msg = event.message || (event.error && event.error.message) || '';
  if (isIgnorableErrorString(msg) || (event.error && isIgnorableErrorString(event.error.message))) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return;
  }
  
  const finalMsg = msg || 'Unknown runtime error';
  console.log(`[Aesthetic Sentinel] Malfunction intercepted: "${finalMsg}". Dispatching self-healing patch to Mimi SW...`);
  dispatchErrorToSW(finalMsg);
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason) {
    const msg = reason instanceof Error ? reason.message : (typeof reason === 'string' ? reason : (reason && reason.message ? String(reason.message) : String(reason)));
    if (isIgnorableErrorString(msg)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    console.log(`[Aesthetic Sentinel] Unhandled promise rejection intercepted: "${msg}". Dispatching self-healing patch to Mimi SW...`);
    dispatchErrorToSW(msg);
  }
}, true);

const originalConsoleError = console.error;
console.error = (...args) => {
  const isIgnorable = args.some(arg => 
    (typeof arg === 'string' && isIgnorableErrorString(arg)) ||
    (arg instanceof Error && isIgnorableErrorString(arg.message)) ||
    (typeof arg === 'object' && arg !== null && 'message' in arg && isIgnorableErrorString(String((arg as any).message)))
  );
  if (isIgnorable) return;
  
  const fullMessage = args.map(a => {
    if (a instanceof Error) return a.message;
    if (typeof a === 'object') {
      try { return JSON.stringify(a); } catch (e) { return '[Object]'; }
    }
    return String(a);
  }).join(' ');

  console.log(`[Console Guardian] Function malfunction detected: "${fullMessage}". Sending telemetry payload to Service Worker for self-corrective push...`);
  dispatchErrorToSW(fullMessage);
  
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const isIgnorable = args.some(arg => 
    (typeof arg === 'string' && isIgnorableErrorString(arg)) ||
    (arg instanceof Error && isIgnorableErrorString(arg.message)) ||
    (typeof arg === 'object' && arg !== null && 'message' in arg && isIgnorableErrorString(String((arg as any).message)))
  );
  if (isIgnorable) return;
  originalConsoleWarn(...args);
};

import { App } from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AgentProvider } from './contexts/AgentContext';

// Initialize Vercel Web Analytics
inject();

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <UserProvider>
            <AgentProvider>
              <App />
            </AgentProvider>
          </UserProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js').catch((err) =>
      console.error('[Mimi Service Worker] Registration failed:', err)
    );
  } else {
    // Unregister service workers in development to prevent stale-cache white screens
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        console.log('[Mimi Service Worker] Unregistered SW in dev mode');
      }
    }).catch((err) => console.error('[Mimi Service Worker] Unregister failed:', err));
  }
}

