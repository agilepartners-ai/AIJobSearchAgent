import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress console warnings in development
import './utils/suppressWarnings';

// Validate environment configuration
import { EnvironmentValidator } from './utils/environmentValidator';
import './utils/apiTester'; // Make APITester available in browser console

// Validate and log environment status
try {
  EnvironmentValidator.validateEnvironment();
  EnvironmentValidator.logEnvironmentStatus();
} catch (error) {
  console.error('❌ Application startup failed due to environment configuration:', error);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
