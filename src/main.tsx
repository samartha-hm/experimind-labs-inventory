import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import StorefrontApp from './StorefrontApp';
import { AuthProvider } from './AuthContext';
import { UndoRedoProvider } from './contexts/UndoRedoContext';
import './index.css';

const isDesignPreview = import.meta.env.DEV && window.location.pathname === '/__design/13b';
const PrecisionPreview = import.meta.env.DEV ? lazy(() => import('./design/precision/PrecisionPreview')) : null;

// Safely register ServiceWorker with full error suppression for self-signed certificates / raw IPs
if (!isDesignPreview && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onRegisteredSW(swUrl, r) {
        if (import.meta.env.DEV) {
          console.log('[PWA] ServiceWorker registered:', swUrl, r);
        }
      },
      onRegisterError(error) {
        // Silently capture SSL SecurityError on untrusted/self-signed raw IP certificates
        console.warn('[PWA] ServiceWorker registration skipped (SSL/Origin):', error?.message || error);
      },
    });
  } catch (err) {
    console.warn('[PWA] ServiceWorker registration bypassed:', err);
  }
}

const isShop = typeof window !== 'undefined' && 
  (window.location.hostname.startsWith('shop.') || window.location.search.includes('mode=shop'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDesignPreview && PrecisionPreview ? (
      <Suspense fallback={<p role="status">Loading design preview…</p>}><PrecisionPreview /></Suspense>
    ) : isShop ? (
      <StorefrontApp />
    ) : (
      <AuthProvider>
        <UndoRedoProvider>
          <App />
        </UndoRedoProvider>
      </AuthProvider>
    )}
  </StrictMode>,
);
