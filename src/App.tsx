import { useEffect } from 'react';

import Header from './components/Header';
import Hero from './components/Hero';
import Workflow from './components/Workflow';
import Testimonials from './components/Testimonials';
import Team from './components/Team';
import Contact from './components/Contact';
import Footer from './components/Footer';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import VerifyPhone from './components/auth/VerifyPhone';

import JobSearchPage from './components/pages/JobSearchPage';
import JobListingsPage from './components/pages/JobListingsPage';
import AIInterviewPage from './components/pages/AIInterviewPage';
import Dashboard from './components/dashboard/DashboardMain';
import ErrorBoundary from './components/dashboard/ErrorBoundary';
import { ToastProvider } from './components/ui/ToastProvider';

function App() {
  useEffect(() => {
    document.title = 'AIJobSearchAgent | AI-Powered Career Success Platform';
    
    // Remove forced dark mode - let system preference handle it
    // The CSS will automatically handle light/dark mode switching
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white dark:bg-gray-900 theme-transition">
          <Header />
          <main>
            <Hero />
            <Workflow />
            <Testimonials />
            <Team />
            <Contact />
          </main>
          <Footer />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
