import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, User, LogOut, LayoutDashboard, Loader, ExternalLink, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import SupabaseAuthService from '../../services/supabaseAuthService';

const AIInterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationData, setConversationData] = useState<any>(null);

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
  const createConversation = async () => {
    setLoading(true);
    setError('');
    
    try {
      const apiKey = import.meta.env.VITE_TAVUS_API_KEY;
      
      if (!apiKey) {
        throw new Error('Tavus API key not found. Please check your environment configuration.');
      }

      const response = await fetch('https://tavusapi.com/v2/conversations', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          "replica_id": "r9d30b0e55ac",
          "persona_id": "pf19822be876"
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Conversation created:', data);
      setConversationData(data);

      // If there's a conversation URL, open it in a new tab
      if (data.conversation_url) {
        window.open(data.conversation_url, '_blank');
      } else if (data.url) {
        window.open(data.url, '_blank');
      } else {
        console.log('Conversation data:', data);
        setError('Conversation created but no URL found. Check console for details.');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const openConversation = () => {
    if (conversationData?.conversation_url) {
      window.open(conversationData.conversation_url, '_blank');
    } else if (conversationData?.url) {
      window.open(conversationData.url, '_blank');
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
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
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
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
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

              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
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
  );
};

export default AIInterviewPage;
