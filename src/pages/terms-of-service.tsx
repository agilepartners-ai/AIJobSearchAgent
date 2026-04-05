import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, ChevronDown, ChevronUp, Scale, AlertTriangle, CheckCircle, XCircle, CreditCard, Globe, RefreshCw } from 'lucide-react';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ icon, title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-700/50 rounded-2xl overflow-hidden mb-4 bg-gray-800/30 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/30">
      <button
        className="w-full flex items-center justify-between p-6 text-left group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-400 group-hover:from-purple-500/30 group-hover:to-blue-500/30 transition-all">
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <span className="text-gray-400 group-hover:text-purple-400 transition-colors">
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

const TermsOfService: React.FC = () => {
  useEffect(() => {
    document.title = 'Terms of Service | AIJobSearchAgent';
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-3xl" />
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
            href="/privacy-policy"
            className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
          >
            Privacy Policy →
          </Link>
        </div>
      </nav>

      {/* Hero Header */}
      <div className="relative pt-16 pb-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-full text-purple-400 text-sm font-medium mb-6">
            <Scale size={14} />
            Legal Agreement
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white via-purple-100 to-blue-200 bg-clip-text text-transparent mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
            Please read these terms carefully before using AIJobSearchAgent. By using our platform, you agree to be bound by these terms.
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

        {/* Quick Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: <CheckCircle size={20} />, title: 'Fair Use', desc: 'Use our platform responsibly for legitimate job searching activities.' },
            { icon: <XCircle size={20} />, title: 'No Abuse', desc: 'Do not misuse, reverse-engineer, or circumvent our systems.' },
            { icon: <Scale size={20} />, title: 'Mutual Agreement', desc: 'These terms protect both you and AIJobSearchAgent.' },
          ].map((item) => (
            <div key={item.title} className="bg-gray-800/30 border border-gray-700/40 rounded-2xl p-4 flex items-start gap-3 hover:border-purple-500/30 transition-all">
              <div className="w-9 h-9 min-w-[36px] rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-400">
                {item.icon}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{item.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Section icon={<FileText size={18} />} title="1. Acceptance of Terms" defaultOpen>
          <p>By accessing or using the AIJobSearchAgent platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.</p>
          <p>These Terms apply to all visitors, users, and others who access or use the Service. We reserve the right to update these Terms at any time. Your continued use of the Service after changes constitutes acceptance of the new Terms.</p>
        </Section>

        <Section icon={<CheckCircle size={18} />} title="2. Eligibility & Account Registration">
          <p>To use our Service, you must:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Be at least 13 years of age (or 16 in certain jurisdictions)</li>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and update your account information to keep it accurate</li>
            <li>Keep your password confidential and secure</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
          <p className="mt-3">You may not create more than one account per person without explicit written permission from AIJobSearchAgent. We reserve the right to terminate accounts that violate these terms.</p>
        </Section>

        <Section icon={<Globe size={18} />} title="3. Use of the Service">
          <p>AIJobSearchAgent grants you a limited, non-exclusive, non-transferable license to use the Service for personal, non-commercial job searching purposes, subject to these Terms.</p>
          <p className="font-semibold text-white mt-3">You agree NOT to:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Use the Service for any unlawful purpose or in violation of any regulations</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its systems</li>
            <li>Transmit any viruses, malware, or other harmful code</li>
            <li>Scrape, crawl, or spider any portion of the Service without permission</li>
            <li>Use automated systems or bots to access the Service in ways that exceed normal usage</li>
            <li>Impersonate any person or entity or misrepresent your affiliation</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Use the Service to spam other users or send unsolicited communications</li>
          </ul>
        </Section>

        <Section icon={<CreditCard size={18} />} title="4. Subscriptions & Payment">
          <p>Some features of AIJobSearchAgent may require a paid subscription. For paid plans:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong className="text-white">Billing:</strong> Subscription fees are billed in advance on a monthly or annual basis</li>
            <li><strong className="text-white">Automatic Renewal:</strong> Subscriptions automatically renew unless cancelled before the renewal date</li>
            <li><strong className="text-white">Cancellation:</strong> You may cancel your subscription at any time; access continues until the end of the billing period</li>
            <li><strong className="text-white">Refunds:</strong> We offer a 14-day money-back guarantee for first-time subscribers. Subsequent refunds are at our discretion.</li>
            <li><strong className="text-white">Price Changes:</strong> We may change our pricing with 30 days' notice via email or platform notification</li>
          </ul>
        </Section>

        <Section icon={<FileText size={18} />} title="5. AI-Generated Content Disclaimer">
          <p>AIJobSearchAgent uses artificial intelligence to provide job recommendations, resume suggestions, interview coaching, and career advice. You acknowledge that:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>AI-generated content is for informational purposes only and should not be relied upon as professional career or legal advice</li>
            <li>Job market conditions change frequently and AI recommendations may not always be accurate or up-to-date</li>
            <li>You are responsible for verifying information before making career decisions</li>
            <li>AIJobSearchAgent does not guarantee employment outcomes or job placement</li>
            <li>Resume and cover letter suggestions are tools to help you, not guarantees of success</li>
          </ul>
        </Section>

        <Section icon={<Scale size={18} />} title="6. Intellectual Property">
          <p>The Service and its original content, features, and functionality are and will remain the exclusive property of AIJobSearchAgent and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of AIJobSearchAgent.</p>
          <p className="mt-3">Content you create using our tools (resumes, cover letters, etc.) remains your intellectual property. By using the Service, you grant us a limited license to process your content to provide and improve our services.</p>
        </Section>

        <Section icon={<AlertTriangle size={18} />} title="7. Limitation of Liability">
          <p>To the maximum extent permitted by law, AIJobSearchAgent shall not be liable for:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Indirect, incidental, special, consequential, or punitive damages</li>
            <li>Loss of profits, data, use, goodwill, or other intangible losses</li>
            <li>Damages resulting from your use or inability to use the Service</li>
            <li>Unauthorized access to or alteration of your transmissions or data</li>
            <li>Any third-party conduct or content on the Service</li>
          </ul>
          <p className="mt-3 text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/10 rounded-lg p-3">
            ⚖️ Our total liability to you for all claims arising from use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim.
          </p>
        </Section>

        <Section icon={<XCircle size={18} />} title="8. Indemnification">
          <p>You agree to defend, indemnify, and hold harmless AIJobSearchAgent and its affiliates, licensors, and service providers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Your violation of these Terms</li>
            <li>Your use of the Service in a manner not authorized by these Terms</li>
            <li>Your violation of any third-party rights, including intellectual property rights</li>
            <li>Any content you submit to the Service</li>
          </ul>
        </Section>

        <Section icon={<RefreshCw size={18} />} title="9. Termination">
          <p>We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Breach of these Terms</li>
            <li>Fraudulent, abusive, or illegal activity</li>
            <li>Non-payment of applicable fees</li>
            <li>Extended periods of account inactivity</li>
          </ul>
          <p className="mt-3">Upon termination, your right to use the Service will immediately cease. You may request export of your data within 30 days of termination.</p>
        </Section>

        <Section icon={<Globe size={18} />} title="10. Governing Law & Dispute Resolution">
          <p>These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.</p>
          <p className="mt-3">For any disputes arising from these Terms or your use of the Service, we encourage you to first contact us at <a href="mailto:legal@aijobsearchagent.com" className="text-purple-400 hover:text-purple-300 underline">legal@aijobsearchagent.com</a> to resolve the matter amicably. If a resolution cannot be reached, disputes shall be submitted to binding arbitration in accordance with the American Arbitration Association's rules.</p>
        </Section>

        <Section icon={<FileText size={18} />} title="11. Privacy Policy">
          <p>Your privacy is important to us. Our collection and use of personal information in connection with the Service is described in our <Link href="/privacy-policy" className="text-purple-400 hover:text-purple-300 underline">Privacy Policy</Link>, which is incorporated into these Terms by reference. By using the Service, you consent to the practices described in the Privacy Policy.</p>
        </Section>

        <Section icon={<Scale size={18} />} title="12. Miscellaneous">
          <p>These Terms constitute the entire agreement between you and AIJobSearchAgent regarding the Service. If any provision is found invalid or unenforceable, the remaining provisions remain in full force. Our failure to enforce any right or provision does not constitute a waiver of such right.</p>
          <p className="mt-3">We may assign or transfer our rights and obligations under these Terms without restriction. You may not assign your rights under these Terms without our prior written consent.</p>
        </Section>

        {/* Contact Section */}
        <div className="mt-8 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-2xl p-8 text-center">
          <Scale size={32} className="mx-auto mb-4 text-purple-400" />
          <h3 className="text-xl font-bold text-white mb-2">Legal Questions?</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            If you have questions about these Terms of Service, our legal team is ready to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:legal@aijobsearchagent.com"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5"
            >
              Contact Legal Team
            </a>
            <Link
              href="/privacy-policy"
              className="border border-gray-600 hover:border-purple-500/50 text-gray-300 hover:text-white px-6 py-3 rounded-xl font-medium transition-all"
            >
              Read Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} AIJobSearchAgent. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-purple-400 font-medium">Terms of Service</Link>
            <Link href="/#contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfService;
