import Header from '../src/components/Header';
import Hero from '../src/components/Hero';
import Workflow from '../src/components/Workflow';
import Testimonials from '../src/components/Testimonials';
import Team from '../src/components/Team';
import Contact from '../src/components/Contact';
import Footer from '../src/components/Footer';

export default function HomePage() {
  return (
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
  );
}
