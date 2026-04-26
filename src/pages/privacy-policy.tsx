
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, ChevronDown, ChevronUp, Lock, Eye, Database, Share2, Bell, UserCheck } from 'lucide-react';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ icon, title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-700/50 rounded-2xl overflow-hidden mb-4 bg-gray-800/30 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30">
      <button
        className="w-full flex items-center justify-between p-6 text-left group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all">
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <span className="text-gray-400 group-hover:text-blue-400 transition-colors">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 text-gray-300 leading-relaxed space-y-3 text-sm border-t border-gray-700/30 pt-4">
          {children}
        </div>
      )}
    </div>
  );
};

const PrivacyPolicy: React.FC = () => {
  useEffect(() => {
    document.title = 'Privacy Policy | AIJobSearchAgent';
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />
      </div>

      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Back to Home</span>
          </Link>
          <Link href="/">
            <img src="/AGENT_Logo.png" alt="AIJobSearchAgent" className="h-8 w-auto" />
          </Link>
          <Link
            href="/terms-of-service"
            className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
          >
            Terms of Service →
          </Link>
        </div>
      </nav>

      {/* Hero Header */}
      <div className="relative pt-16 pb-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-sm font-medium mb-6">
            <Shield size={14} />
            Your Privacy Matters
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
            We are committed to protecting your personal information and being transparent about how we collect, use, and safeguard your data.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>Effective Date: <span className="text-gray-300">April 6, 2025</span></span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>Last Updated: <span className="text-gray-300">April 6, 2025</span></span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-20 relative z-10">

        {/* Quick Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: <Lock size={20} />, title: 'Encrypted & Secure', desc: 'Your data is protected with industry-standard encryption.' },
            { icon: <Eye size={20} />, title: 'No Selling', desc: 'We never sell your personal data to third parties.' },
            { icon: <UserCheck size={20} />, title: 'Your Control', desc: 'You can access, update, or delete your data anytime.' },
          ].map((item) => (
            <div key={item.title} className="bg-gray-800/30 border border-gray-700/40 rounded-2xl p-4 flex items-start gap-3 hover:border-blue-500/30 transition-all">
              <div className="w-9 h-9 min-w-[36px] rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400">
                {item.icon}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{item.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Section icon={<Eye size={18} />} title="1. Information We Collect" defaultOpen>
          <p>We collect information to provide better services to our users. The types of information we collect include:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong className="text-white">Account Information:</strong> When you register, we collect your email address, name, and password.</li>
            <li><strong className="text-white">Profile Data:</strong> Information you provide to enhance your job search experience, such as resume, skills, work history, and preferences.</li>
            <li><strong className="text-white">Usage Data:</strong> How you interact with our platform, including pages visited, features used, and time spent.</li>
            <li><strong className="text-white">Device Information:</strong> Browser type, IP address, operating system, and device identifiers for security and optimization.</li>
            <li><strong className="text-white">Communications:</strong> Emails and support messages you send to us.</li>
          </ul>
        </Section>

        <Section icon={<Database size={18} />} title="2. How We Use Your Information">
          <p>We use the information we collect for the following purposes:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Provide, maintain, and improve our AI-powered job search services</li>
            <li>Personalize job recommendations and career guidance</li>
            <li>Process transactions and send related information including purchase confirmations</li>
            <li>Send technical notices, updates, security alerts, and support messages</li>
            <li>Respond to your comments, questions, and provide customer service</li>
            <li>Monitor and analyze usage patterns to improve user experience</li>
            <li>Detect, investigate, and prevent fraudulent or unauthorized activities</li>
            <li>Comply with legal obligations and enforce our Terms of Service</li>
          </ul>
        </Section>

        <Section icon={<Share2 size={18} />} title="3. Information Sharing & Disclosure">
          <p>We do <strong className="text-white">not sell, trade, or rent</strong> your personal information to third parties. We may share your information only in these limited circumstances:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong className="text-white">Service Providers:</strong> Trusted third-party vendors who assist us in operating our platform (e.g., Firebase, cloud hosting), bound by confidentiality agreements.</li>
            <li><strong className="text-white">Legal Requirements:</strong> When required by law, court order, or governmental authorities.</li>
            <li><strong className="text-white">Safety:</strong> To protect the rights, property, or safety of our users or the public.</li>
            <li><strong className="text-white">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with prior notice to you.</li>
            <li><strong className="text-white">With Your Consent:</strong> Any other sharing will be done only with your explicit permission.</li>
          </ul>
        </Section>

        <Section icon={<Lock size={18} />} title="4. Data Security">
          <p>We implement robust security measures to protect your personal information:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Industry-standard SSL/TLS encryption for data in transit</li>
            <li>Encrypted storage for sensitive data at rest</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Access controls limiting data access to authorized personnel only</li>
            <li>Multi-factor authentication options for your account</li>
          </ul>
          <p className="mt-3 text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/10 rounded-lg p-3">
            ⚠️ While we take extensive precautions, no method of transmission over the Internet is 100% secure. We encourage you to use strong passwords and keep your account credentials confidential.
          </p>
        </Section>

        <Section icon={<UserCheck size={18} />} title="5. Your Rights & Choices">
          <p>You have significant control over your personal information:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong className="text-white">Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong className="text-white">Correction:</strong> Update or correct inaccurate information in your account</li>
            <li><strong className="text-white">Deletion:</strong> Request deletion of your account and associated personal data</li>
            <li><strong className="text-white">Portability:</strong> Receive your data in a machine-readable format</li>
            <li><strong className="text-white">Opt-Out:</strong> Unsubscribe from marketing emails at any time via the link in those emails</li>
            <li><strong className="text-white">Restrict Processing:</strong> Request that we limit how we use your data in certain circumstances</li>
          </ul>
          <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:privacy@aijobsearchagent.com" className="text-blue-400 hover:text-blue-300 underline">privacy@aijobsearchagent.com</a>.</p>
        </Section>

        <Section icon={<Bell size={18} />} title="6. Cookies & Tracking Technologies">
          <p>We use cookies and similar tracking technologies to enhance your experience:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong className="text-white">Essential Cookies:</strong> Required for the platform to function (authentication, security)</li>
            <li><strong className="text-white">Analytics Cookies:</strong> Help us understand how users interact with our platform (Google Analytics)</li>
            <li><strong className="text-white">Preference Cookies:</strong> Remember your settings and preferences</li>
          </ul>
          <p className="mt-3">You can control cookies through your browser settings. Note that disabling certain cookies may affect platform functionality.</p>
        </Section>

        <Section icon={<Shield size={18} />} title="7. Children's Privacy">
          <p>Our services are not directed at individuals under the age of 13 (or 16 in certain jurisdictions). We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a minor, please contact us immediately and we will take steps to delete such information.</p>
        </Section>

        <Section icon={<Database size={18} />} title="8. Data Retention">
          <p>We retain your personal information for as long as your account is active or as needed to provide services. Specifically:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Account data is retained until you request deletion</li>
            <li>Usage logs are retained for up to 12 months for analytical purposes</li>
            <li>Legal and financial records may be retained for up to 7 years as required by law</li>
            <li>Anonymized, aggregated data may be retained indefinitely for research</li>
          </ul>
        </Section>

        <Section icon={<Share2 size={18} />} title="9. International Data Transfers">
          <p>Your data may be processed in countries outside your own. We ensure appropriate safeguards are in place for cross-border transfers in compliance with applicable data protection laws, including Standard Contractual Clauses approved by the European Commission where applicable.</p>
        </Section>

        <Section icon={<Bell size={18} />} title="10. Changes to This Privacy Policy">
          <p>We may update this Privacy Policy periodically. When we make significant changes, we will:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Update the "Last Updated" date at the top of this page</li>
            <li>Notify you via email (if we have your address) or a prominent notice on our platform</li>
            <li>Provide a summary of key changes</li>
          </ul>
          <p className="mt-3">Your continued use of our services after changes take effect constitutes acceptance of the updated Privacy Policy.</p>
        </Section>

        {/* Contact Section */}
        <div className="mt-8 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-2xl p-8 text-center">
          <Shield size={32} className="mx-auto mb-4 text-blue-400" />
          <h3 className="text-xl font-bold text-white mb-2">Questions About Your Privacy?</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Our privacy team is here to help. Reach out to us with any questions or concerns.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:privacy@aijobsearchagent.com"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5"
            >
              Contact Privacy Team
            </a>
            <Link
              href="/terms-of-service"
              className="border border-gray-600 hover:border-blue-500/50 text-gray-300 hover:text-white px-6 py-3 rounded-xl font-medium transition-all"
            >
              Read Terms of Service
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} AIJobSearchAgent. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy-policy" className="text-blue-400 font-medium">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/#contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
