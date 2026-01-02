import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { FirebaseDBService } from '../services/firebaseDBService';
import { TrendingUp, Award, BarChart3, ArrowLeft, Calendar } from 'lucide-react';
import type { EnhancementAnalytics } from '../services/aiEnhancementService';
import { useRouter } from 'next/router';

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    try {
      if (!user?.id) return;
      
      const data = await FirebaseDBService.getList<any>(
        `users/${user.id}/enhancementAnalytics`
      );
      
      // Sort by timestamp descending
      const sortedData = data.sort((a: any, b: any) => {
        const dateA = a.timestamp?.seconds ? new Date(a.timestamp.seconds * 1000) : new Date(a.timestamp);
        const dateB = b.timestamp?.seconds ? new Date(b.timestamp.seconds * 1000) : new Date(b.timestamp);
        return dateB.getTime() - dateA.getTime();
      });
      
      setAnalytics(sortedData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const avgMatchScore = analytics.length > 0
    ? Math.round(analytics.reduce((sum, a) => sum + (a.matchScore || 0), 0) / analytics.length)
    : 0;

  const positiveCount = analytics.filter(a => a.feedback === 'positive').length;
  const totalFeedback = analytics.filter(a => a.feedback !== null).length;
  const feedbackRatio = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 0;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Enhancement Analytics
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Track your resume enhancement performance over time
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Match Score</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{avgMatchScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Award className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Positive Feedback</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{feedbackRatio}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{positiveCount} of {totalFeedback} responses</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Enhancements</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{analytics.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Enhancements Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar size={20} />
              Recent Enhancements
            </h2>
          </div>
          
          {analytics.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart3 className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No enhancement data yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Create your first AI-enhanced resume to see analytics here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Job Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Match Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Feedback
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {analytics.slice(0, 20).map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.jobDescription || 'Untitled Job'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-300">
                          {formatDate(item.timestamp)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(item.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          (item.matchScore || 0) >= 85
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : (item.matchScore || 0) >= 70
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            : (item.matchScore || 0) >= 50
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {item.matchScore || 0}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.feedback === 'positive' ? (
                          <span className="inline-flex items-center text-green-600 dark:text-green-400 text-sm">
                            👍 Helpful
                          </span>
                        ) : item.feedback === 'negative' ? (
                          <span className="inline-flex items-center text-red-600 dark:text-red-400 text-sm">
                            👎 Not helpful
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-sm">
                            No feedback
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
