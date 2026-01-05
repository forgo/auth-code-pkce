import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// StrictMode enabled - the library is designed to handle React 18's
// double-mounting behavior with idempotent initialization and proper
// effect cleanup patterns
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
