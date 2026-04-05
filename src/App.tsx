import { useEffect } from 'react';

import Header from './components/Header';
import Hero from './components/Hero';
import LiveDemo from './components/LiveDemo';
import Workflow from './components/Workflow';
import ResumeShowcase from './components/ResumeShowcase';
import Testimonials from './components/Testimonials';
import Team from './components/Team';
import FAQ from './components/FAQ';
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
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-950 theme-transition">
          <Header />
          <main>
            {/* 1. Hero — Hook & value prop */}
            <Hero />

            {/* 2. Live Demo — Show don't tell (product credibility) */}
            <LiveDemo />

            {/* 3. How It Works — 5-step workflow */}
            <Workflow />

            {/* 4. Resume AI Showcase — Key differentiator, before/after */}
            <ResumeShowcase />

            {/* 5. Testimonials — Social proof */}
            <Testimonials />

            {/* 6. Team — Trust & credibility */}
            <Team />

            {/* 7. FAQ — Objection handling */}
            <FAQ />

            {/* 8. Contact / CTA — Conversion close */}
            <Contact />
          </main>
          <Footer />
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
