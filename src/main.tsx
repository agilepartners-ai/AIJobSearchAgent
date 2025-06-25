import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Suppress console warnings in development - MUST BE FIRST
import './utils/suppressWarnings';

import App from './App.tsx';
import './index.css';

// Validate environment configuration
import { EnvironmentValidator } from './utils/environmentValidator';

// Validate and log environment status
try {
  EnvironmentValidator.validateEnvironment();
} catch (error) {
  console.error('❌ Application startup failed due to environment configuration:', error);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
