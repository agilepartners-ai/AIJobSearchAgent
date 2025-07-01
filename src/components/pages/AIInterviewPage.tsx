import React, { useState, useRef, useEffect } from 'react';
// Tavus Video Widget Component
const TavusWidget: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  const handleMuteToggle = () => {
    setMuted(m => {
      const newMuted = !m;
      if (!newMuted && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
      return newMuted;
    });
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 100,
      right: 24,
      zIndex: 1000,
      background: 'rgba(255,255,255,0.85)',
      borderRadius: 16,
      boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      width: 370
    }}>
      {/* Cross button */}
      <button
        onClick={() => setVisible(false)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'transparent',
          border: 'none',
          fontSize: 28,
          color: '#6D28D9', // match intro text color
          fontWeight: 900,
          cursor: 'pointer',
          zIndex: 2,
          lineHeight: 1
        }}
        title="Close video"
        aria-label="Close video"
      >
        ×
      </button>
      <div style={{
        fontWeight: 700,
        fontSize: 20,
        color: '#6D28D9',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.5,
        marginTop: 24 // Add space below cross button
      }}>
        👋 Hi guys! Welcome to your AI Interview! 🚀
      </div>
      <video
        ref={videoRef}
        src={videoUrl}
        width={340}
        height={192}
        style={{ borderRadius: 16, background: '#000', boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)' }}
        autoPlay
        loop
        playsInline
        muted={muted}
      />
      <button
        onClick={handleMuteToggle}
        style={{
          background: muted ? '#f3f4f6' : '#6366f1',
          color: muted ? '#374151' : '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 18px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 18,
          marginTop: 12
        }}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  );
};
// Use local video file from public directory
const TAVUS_VIDEO_URL = "/e3db768fa0.mp4";
import { useNavigate, useLocation } from 'react-router-dom';
import { Video, User, LogOut, LayoutDashboard, Loader, ExternalLink, ArrowLeft, Crown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import SupabaseAuthService from '../../services/supabaseAuthService';
import { createConversation as createInterviewConversation } from '../../services/interviewService';
import UpgradeModal from '../dashboard/UpgradeModal';

const AIInterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationData, setConversationData] = useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Extract job context from navigation state
  const jobTitle = location.state?.jobTitle || '';
  const companyName = location.state?.companyName || '';
  const jobDescription = location.state?.jobDescription || '';

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    try {
      await SupabaseAuthService.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUpgrade = () => {
    setIsUpgradeModalOpen(true);
  };

  const handleUpgradeConfirm = async () => {
    try {
      // Temporarily disable beforeunload handlers during upgrade
      const originalBeforeUnload = window.onbeforeunload;
      window.onbeforeunload = null;
      
      const currentUser = await SupabaseAuthService.getCurrentUser();
      if (currentUser && currentUser.uid) {
        const paymentUrl = `https://pay.rev.cat/sandbox/evfhfhevsehbykku/${currentUser.uid}`;
        // Open in same tab for better user experience
        window.location.href = paymentUrl;
      } else {
        // Restore beforeunload handler if navigation failed
        window.onbeforeunload = originalBeforeUnload;
        alert('Please log in to upgrade your subscription.');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error getting user for upgrade:', error);
      alert('There was an error processing your request. Please try again.');
    }
    setIsUpgradeModalOpen(false);
  };
  const createConversation = async () => {
    setLoading(true);
    setError('');
    try {
      // Compose context for the interview
      const context = `Job Title: ${jobTitle}\nCompany: ${companyName}\nJob Description: ${jobDescription}\n\nThis is a mock interview for the position above. Please tailor your questions to this specific role and company.`;
      const data = await createInterviewConversation(context);
      setConversationData(data);
      if (data.conversation_url) {
        window.open(data.conversation_url, '_blank');
      } else {
        setError('Conversation created but no URL found. Check console for details.');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      // Always show the creative error message for API/billing/auth failures
      setError("Can’t even... start this convo rn 😩\nMight be a billing thing. Slide into your settings and fix it up — we’ll wait. 😎");
    } finally {
      setLoading(false);
    }
  };

  const openConversation = () => {
    if (conversationData?.conversation_url) {
      window.open(conversationData.conversation_url, '_blank');
    }
  };

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Tavus Video Widget in top right */}
      <TavusWidget videoUrl={TAVUS_VIDEO_URL} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Back to dashboard"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">AI Interview</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User size={16} />
                <span>Welcome, {userProfile?.email || user?.email}!</span>
              </div>
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                title="Go to Dashboard"
              >
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <Crown size={16} className="relative z-10" />
                <span className="relative z-10 font-semibold">Upgrade Pro</span>
              </button>
              <button 
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI-Powered Interview Practice
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Practice your interview skills with our AI interviewer. Get personalized feedback and improve your confidence.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {error && (
            <div className="relative overflow-hidden bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-900/40 dark:via-purple-900/40 dark:to-blue-900/40 text-pink-700 dark:text-pink-200 p-6 rounded-2xl mb-8 shadow-lg animate-fade-in">
              <div className="flex items-center gap-4">
                <span className="relative flex h-12 w-12 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-30 animate-ping"></span>
                  <span className="inline-flex h-12 w-12 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 items-center justify-center">
                    <Video className="text-white animate-wiggle" size={28} />
                  </span>
                </span>
                <div>
                  {error.split('\n').map((line, i) => (
                    <p key={i} className={
                      i === 0
                        ? "font-bold text-lg mb-1 animate-fade-in-text"
                        : i === 1
                        ? "text-base font-medium animate-fade-in-text delay-100"
                        : "text-xs mt-2 text-pink-500 dark:text-pink-300 animate-fade-in-text delay-200"
                    }>{line}</p>
                  ))}
                </div>
              </div>
              <style>{`
                @keyframes fade-in {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                .animate-fade-in {
                  animation: fade-in 0.7s ease-in;
                }
                @keyframes fade-in-text {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-text {
                  animation: fade-in-text 1.2s ease-in;
                }
                @keyframes wiggle {
                  0%, 100% { transform: rotate(-8deg); }
                  50% { transform: rotate(8deg); }
                }
                .animate-wiggle {
                  animation: wiggle 1.2s infinite;
                }
              `}</style>
            </div>
          )}

          {conversationData && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-lg mb-6">
              <p className="font-medium">Interview Session Created!</p>
              <p className="text-sm mt-1">Your AI interview session has been created successfully.</p>
              {(conversationData.conversation_url || conversationData.url) && (
                <button
                  onClick={openConversation}
                  className="mt-3 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  <ExternalLink size={16} />
                  Open Interview
                </button>
              )}
            </div>
          )}

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    What to Expect
                  </h3>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
                    <li>• Realistic interview simulation</li>
                    <li>• Personalized questions based on your profile</li>
                    <li>• Real-time feedback and suggestions</li>
                    <li>• Practice common interview scenarios</li>
                  </ul>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Tips for Success
                  </h3>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
                    <li>• Ensure good lighting and audio</li>
                    <li>• Dress professionally</li>
                    <li>• Have your resume ready</li>
                    <li>• Practice active listening</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center pt-6">
              <button
                onClick={createConversation}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 mx-auto transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin h-5 w-5" />
                    Creating Interview Session...
                  </>
                ) : (
                  <>
                    <Video size={20} />
                    Start AI Interview
                  </>
                )}
              </button>
              
              {conversationData && (conversationData.conversation_url || conversationData.url) && (
                <button
                  onClick={openConversation}
                  className="mt-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 mx-auto transition-all"
                >
                  <ExternalLink size={16} />
                  Reopen Interview
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>

    <UpgradeModal
      isOpen={isUpgradeModalOpen}
      onClose={() => setIsUpgradeModalOpen(false)}
      onConfirm={handleUpgradeConfirm}
      userProfile={userProfile}
    />
    </>
  );
};

export default AIInterviewPage;
