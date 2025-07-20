import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store, persistor } from './store/store';
import { PersistGate } from 'redux-persist/integration/react';

// Suppress console warnings in development - MUST BE FIRST
import './utils/suppressWarnings';

import App from './App.tsx';
import './index.css';

// Validate environment configuration
import { EnvironmentValidator } from './utils/environmentValidator';
import { auth, db } from './lib/firebase';

// Expose Firebase to window for debugging in development
if (import.meta.env.DEV) {
  (window as any).auth = auth;
  (window as any).db = db;
  console.log('🔧 Firebase auth and db exposed to window for debugging');
}

// Validate and log environment status
try {
  EnvironmentValidator.validateEnvironment();
} catch (error) {
  console.error('❌ Application startup failed due to environment configuration:', error);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>
);
