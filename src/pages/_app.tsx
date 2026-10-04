import Head from 'next/head';
import { Provider } from 'react-redux';
import { store, persistor } from '../store/store';
import { PersistGate } from 'redux-persist/integration/react';
import { AppProps } from 'next/app';
import { ToastProvider } from '../components/ui/ToastProvider';
import { EmailService } from '../services/emailService';
import { AuthService } from '../services/authService';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { handleAuthError, isAuthenticationError, redirectToLogin } from '../utils/authErrorHandler';
import { isOpenToSignedOut, isPublicPage } from '../lib/publicRoutes';
import '../index.css';
import '../styles/dashboard-responsive.css';
// Resume preview fonts (from TeX Live 2025, matching the PDF). Files load only when used.
import '../styles/resume-fonts.css';

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

    // Listen for auth state changes to detect logouts
    let unsubscribe: () => void = () => undefined;
    let disposed = false;
    const onUser = (user: unknown) => {
      const currentPath = router.pathname;
      
      // If user is logged out and not on a public page, redirect to login
      // Development harness pages (not built in production) are usable signed out.
      const isDevHarness = process.env.NODE_ENV !== 'production' && currentPath.startsWith('/dev/');
      // Signed-out visitors may stay on the sign-in flow and on every public page (see lib/publicRoutes.ts).
      if (!user && !isOpenToSignedOut(currentPath) && !isDevHarness) {
        console.log('User session ended, redirecting to login');
        redirectToLogin('expired');
      }
    };
    void AuthService.initializeProvider()
      .then(() => {
        if (!disposed) unsubscribe = AuthService.onAuthStateChange(onUser);
      })
      .catch((error) => {
        console.error('Auth state change error:', error);
        if (isAuthenticationError(error)) handleAuthError(error);
      });

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      disposed = true;
      unsubscribe();
    };
  }, [router]);

  // The public pages (home, features, guides, legal) use no persisted state, so they render on the server and the
  // HTML a crawler receives contains the real content. PersistGate renders nothing until the browser has rehydrated
  // the store, which would send every visitor, and every crawler that does not run JavaScript, an empty page.
  // Account and app pages still wait for their persisted state.
  const page = (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );

  return (
    <Provider store={store}>
      {isPublicPage(router.pathname) ? (
        page
      ) : (
        <>
          {/* Default-deny: anything that is not a registered public page is never indexed. This sits outside
              PersistGate so the directive is in the server HTML, where crawlers that skip JavaScript read it. */}
          <Head>
            <meta name="robots" content="noindex,nofollow" />
          </Head>
          <PersistGate loading={null} persistor={persistor}>
            {page}
          </PersistGate>
        </>
      )}
    </Provider>
  );
}

export default MyApp;
