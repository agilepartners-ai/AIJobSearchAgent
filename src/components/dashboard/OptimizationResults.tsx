import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ResumeTemplate from './ResumeTemplate';
import { PDFGenerationService } from '../../services/pdfGenerationService';
import { UserProfileData, ProfileService } from '../../services/profileService';
import { useAuth } from '../../hooks/useAuth';
import { User } from 'firebase/auth';

interface OptimizationResultsProps {
  results: {
    resume_html: string;
    cover_letter_html: string;
  };
  jobDetails: {
    title: string;
    company: string;
    description: string;
  };
  onBack: () => void;
}

const OptimizationResults: React.FC<OptimizationResultsProps> = ({ results, jobDetails, onBack }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const profile = await ProfileService.getUserProfile(user.uid);
        setUserProfile(profile);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 text-blue-500">Back to Form</button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Optimized Resume</h2>
          <div dangerouslySetInnerHTML={{ __html: results.resume_html }} />
          {userProfile && (
            <PDFDownloadLink
              document={<ResumeTemplate profile={userProfile} resumeHtml={results.resume_html} />}
              fileName="optimized_resume.pdf"
              className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded"
            >
              {({ blob, url, loading, error }) => (loading ? 'Loading document...' : 'Download Resume')}
            </PDFDownloadLink>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Optimized Cover Letter</h2>
          <div dangerouslySetInnerHTML={{ __html: results.cover_letter_html }} />
          {userProfile && (
            <PDFDownloadLink
              document={<ResumeTemplate profile={userProfile} resumeHtml={results.cover_letter_html} />}
              fileName="optimized_cover_letter.pdf"
              className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded"
            >
              {({ blob, url, loading, error }) => (loading ? 'Loading document...' : 'Download Cover Letter')}
            </PDFDownloadLink>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizationResults;
