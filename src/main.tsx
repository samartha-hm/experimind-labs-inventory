import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './AuthContext';
import { UndoRedoProvider } from './contexts/UndoRedoContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <UndoRedoProvider>
        <App />
      </UndoRedoProvider>
    </AuthProvider>
  </StrictMode>,
);
