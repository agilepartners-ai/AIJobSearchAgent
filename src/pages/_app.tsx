import { Provider } from 'react-redux';
import { store, persistor } from '../store/store';
import { PersistGate } from 'redux-persist/integration/react';
import { AppProps } from 'next/app';
import { ToastProvider } from '../components/ui/ToastProvider';
import { EmailService } from '../services/emailService';
import { AuthService } from '../services/authService';
import '../index.css';
import '../styles/dashboard-responsive.css';

// Initialize services based on configuration
EmailService.initializeProvider();
AuthService.initializeProvider();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </PersistGate>
    </Provider>
  );
}

export default MyApp;
