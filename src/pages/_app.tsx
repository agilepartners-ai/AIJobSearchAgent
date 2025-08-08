import { Provider } from 'react-redux';
import { store, persistor } from '../store/store';
import { PersistGate } from 'redux-persist/integration/react';
import { AppProps } from 'next/app';
import { ToastProvider } from '../components/ui/ToastProvider';
import { useEffect } from 'react';
import { initializeDatabaseForNextJS } from '../database/init';
import '../index.css';
import '../styles/dashboard-responsive.css';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize database abstraction layer
    initializeDatabaseForNextJS().catch(console.error);
  }, []);

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
