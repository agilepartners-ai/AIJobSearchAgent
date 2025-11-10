import { Provider } from 'react-redux';
import { store, persistor } from '../store/store';
import { PersistGate } from 'redux-persist/integration/react';
import { AppProps } from 'next/app';
import { ToastProvider } from '../components/ui/ToastProvider';
import { EmailService } from '../services/emailService';
import { AuthService } from '../services/authService';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { handleAuthError, isAuthenticationError, redirectToLogin } from '../utils/authErrorHandler';
import '../index.css';
import '../styles/dashboard-responsive.css';

// Initialize services based on configuration
EmailService.initializeProvider();
AuthService.initializeProvider();

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Global error handler for uncaught errors
    const handleError = (event: ErrorEvent) => {
      if (isAuthenticationError(event.error)) {
        console.error('Authentication error detected:', event.error);
        handleAuthError(event.error);
        event.preventDefault();
      }
    };

    // Global promise rejection handler
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isAuthenticationError(event.reason)) {
        console.error('Authentication error in promise:', event.reason);
        handleAuthError(event.reason);
        event.preventDefault();
      }
    };

    // Listen for Firebase auth state changes to detect logouts
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const currentPath = router.pathname;
      const publicPaths = ['/login', '/register', '/verify-phone', '/', '/forgot-password'];
      
      // If user is logged out and not on a public page, redirect to login
      if (!user && !publicPaths.includes(currentPath)) {
        console.log('User session ended, redirecting to login');
        redirectToLogin('expired');
      }
    }, (error) => {
      // Handle auth state change errors
      console.error('Auth state change error:', error);
      if (isAuthenticationError(error)) {
        handleAuthError(error);
      }
    });

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      unsubscribe();
    };
  }, [router]);

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
