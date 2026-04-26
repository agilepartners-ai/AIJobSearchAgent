"use client";
// eslint-disable-next-line
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText, CheckCircle, Target, TrendingUp, Award, Brain, ChevronDown, ChevronUp, AlertCircle, Eye, ThumbsUp, ThumbsDown, Palette, X } from 'lucide-react';
import { PDFViewer, PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

import { PerfectHTMLToPDF } from './ResumeTemplate';
import ResumePDFPreview from './ResumePDFPreview';
import { getCleanHTMLForDocs } from './HTMLResumeTemplate';
import { UserProfileData } from '@/services/profileService';
import { ProfileService } from '@/services/profileService';
import { AuthService } from '@/services/authService';
import { FirebaseDBService } from '@/services/firebaseDBService';
import DocxResumeGenerator from '@/services/docxResumeGenerator';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { TemplatePicker } from '../TemplatePicker';
import { TEMPLATE_REGISTRY } from '@/lib/templateRegistry';
import { setSelectedTemplate } from '@/store/resumeTemplateFormSlice';

interface OptimizationResultsProps {
  results: {
    resume_html: string;
    cover_letter_html: string;
    aiEnhancements?: any;
    applicationData?: {
      company_name?: string;
      position?: string;
      location?: string;
      [key: string]: any;
    };
  };
  jobDetails: {
    title: string;
    company: string;
    description: string;
    location?: string;
  };
  analysisData?: {
    matchScore: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    suggestions: string[];
    keywordAnalysis: {
      coverageScore: number;
      coveredKeywords: string[];
      missingKeywords: string[];
    };
  };
  onBack: () => void;
  onRegenerate?: (customPrompt: string) => void;
}

// PDF Styles with tighter spacing
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.2,
  },
  header: {
    marginBottom: 15,
    borderBottom: '1 solid #2563eb',
    paddingBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 3,
    lineHeight: 1.1,
  },
  title: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 1.1,
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.1,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
    borderLeft: '2 solid #2563eb',
    paddingLeft: 6,
    lineHeight: 1.1,
  },
  text: {
    fontSize: 9,
    lineHeight: 1.3,
    color: '#374151',
    marginBottom: 2,
  },
});


// Cover Letter PDF Document Component with direct data usage
const CoverLetterPDFDocument: React.FC<{ content: string; jobDetails: any; resultsData?: any }> = ({ content, jobDetails, resultsData }) => {
  const normalizedJobDetails = {
    company_name: resultsData?.applicationData?.company_name || jobDetails?.company || 'Company Name',
    position: resultsData?.applicationData?.position || jobDetails?.title || 'Position Title',
    location: resultsData?.applicationData?.location || jobDetails?.location || ''
  };
  
  const parseCoverLetterData = (htmlContent: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const nameElement = tempDiv.querySelector('h1');
    const name = nameElement?.textContent?.trim() || 'Your Name';
    const text = tempDiv.textContent || '';
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = text.match(/(\+?\d[\d\-\s]{6,}\d)/);
    const email = emailMatch?.[0] || 'email@example.com';
    const phone = phoneMatch?.[0] || '';
    const contactInfo = [email, phone].filter(Boolean).join(' • ');

    let paragraphs: string[] = [];
    const detailed_cover_letter = resultsData?.aiEnhancements?.detailed_cover_letter;
    
    if (detailed_cover_letter && Object.keys(detailed_cover_letter).length > 0) {
      if (detailed_cover_letter.opening_paragraph) paragraphs.push(detailed_cover_letter.opening_paragraph);
      if (detailed_cover_letter.body_paragraph) paragraphs.push(detailed_cover_letter.body_paragraph);
      if (detailed_cover_letter.closing_paragraph) paragraphs.push(detailed_cover_letter.closing_paragraph);
    } else {
      paragraphs = [(tempDiv.textContent || '').substring(0, 500)];
    }
    
    return { name, contactInfo, paragraphs };
  };

  const coverLetterData = parseCoverLetterData(content);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{coverLetterData.name}</Text>
          <Text style={styles.contactInfo}>{coverLetterData.contactInfo}</Text>
        </View>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11 }}>Hiring Manager</Text>
          <Text style={{ fontSize: 11 }}>{normalizedJobDetails.company_name}</Text>
        </View>
        <View style={{ marginBottom: 15 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold' }}>Re: Application for {normalizedJobDetails.position}</Text>
        </View>
        {coverLetterData.paragraphs.map((paragraph, index) => (
          <View key={index} style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 11, lineHeight: 1.6 }}>{paragraph}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
};

const OptimizationResults: React.FC<OptimizationResultsProps> = ({ results, jobDetails, analysisData, onBack, onRegenerate }) => {
  const [activeDocument, setActiveDocument] = useState<'resume' | 'cover-letter'>('resume');
  const [showPDFPreview, setShowPDFPreview] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  
  const dispatch = useDispatch();
  const selectedTemplateId = useSelector((state: RootState) => state.resumeTemplateForm.selectedTemplateId);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          const profile = await ProfileService.getUserProfile(currentUser.id);
          if (profile) setUserProfile(profile);
          else setUserProfile({ fullName: currentUser.displayName || 'Name', email: currentUser.email || '' });
        }
      } catch (error) { console.error(error); }
      finally { setLoadingProfile(false); }
    };
    fetchUserProfile();
  }, []);

  const downloadAsHtml = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDocxFilename = (type: string) => `ai-enhanced-${type}-${jobDetails.company.replace(/\s+/g, '-')}.docx`;

  const downloadAsDocxPowerful = async (profile: any, keywords: string[], filename: string) => {
    const htmlContent = activeDocument === 'resume' ? modifiedResumeHtml : modifiedCoverLetterHtml;
    const payload = { htmlContent, profile, jobKeywords: keywords, templateId: selectedTemplateId };
    const resp = await fetch('/api/convert-html-to-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      const blob = new Blob([await resp.arrayBuffer()], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const modifyHtmlWithProfile = (htmlContent: string, profile: { fullName?: string }) => {
    if (!profile?.fullName) return htmlContent;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const h1 = tempDiv.querySelector('h1');
    if (h1) h1.textContent = profile.fullName;
    return tempDiv.innerHTML;
  };

  let resumeProfile = userProfile || { fullName: '' };
  if (results.aiEnhancements?.detailedResumeSections) {
    resumeProfile = { ...resumeProfile, detailedResumeSections: results.aiEnhancements.detailedResumeSections };
  }

  const modifiedResumeHtml = modifyHtmlWithProfile(results.resume_html, resumeProfile);
  const modifiedCoverLetterHtml = modifyHtmlWithProfile(results.cover_letter_html, resumeProfile);

  if (loadingProfile) return <div className="fixed inset-0 flex items-center justify-center">Loading...</div>;

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold">🎯 Enhancement Results</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="text-xl font-semibold">Enhanced Documents</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTemplatePicker(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"><Palette size={16} />Change Template</button>
              <button onClick={() => setShowPDFPreview(!showPDFPreview)} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg"><Eye size={16} />{showPDFPreview ? 'Hide Preview' : 'Show Preview'}</button>
            </div>
          </div>

          <AnimatePresence>
            {showTemplatePicker && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTemplatePicker(false)} className="fixed inset-0 bg-black/40 z-[60]" />
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl z-[70] overflow-y-auto">
                  <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <h3 className="text-xl font-bold">Choose Resume Template</h3>
                    <button onClick={() => setShowTemplatePicker(false)}><X size={24} /></button>
                  </div>
                  <div className="p-4">
                    <TemplatePicker
                      currentTemplateId={selectedTemplateId}
                      profileData={resumeProfile as UserProfileData}
                      onSelect={async (id) => {
                        dispatch(setSelectedTemplate(id));
                        const user = await AuthService.getCurrentUser();
                        if (user) await ProfileService.updateUserProfile(user.id, { selectedTemplateId: id });
                        toast.success(`Switched to template`);
                      }}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="p-6">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
              <button onClick={() => setActiveDocument('resume')} className={`flex-1 py-2 rounded-md text-sm font-medium ${activeDocument === 'resume' ? 'bg-white dark:bg-gray-800 shadow-sm' : 'text-gray-500'}`}>Resume</button>
              <button onClick={() => setActiveDocument('cover-letter')} className={`flex-1 py-2 rounded-md text-sm font-medium ${activeDocument === 'cover-letter' ? 'bg-white dark:bg-gray-800 shadow-sm' : 'text-gray-500'}`}>Cover Letter</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-xl border-2">
                  <h4 className="font-bold mb-4 flex items-center gap-2"><Download size={18} />Download Options</h4>
                  <div className="space-y-3">
                    <button onClick={() => downloadAsHtml(activeDocument === 'resume' ? modifiedResumeHtml : modifiedCoverLetterHtml, 'resume.html')} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">Download HTML</button>
                    <button onClick={() => downloadAsDocxPowerful(resumeProfile, [], getDocxFilename(activeDocument))} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Download Word DOC</button>
                  </div>
                </div>
              </div>

              {showPDFPreview && (
                <div className="h-full min-h-[600px] bg-white border-2 rounded-xl overflow-hidden shadow-lg">
                  {activeDocument === 'resume' ? (
                    <ResumePDFPreview resumeHtml={modifiedResumeHtml} profile={resumeProfile} jobKeywords={[]} height="100%" />
                  ) : (
                    <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
                      <CoverLetterPDFDocument content={modifiedCoverLetterHtml} jobDetails={jobDetails} resultsData={results} />
                    </PDFViewer>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationResults;
export { CoverLetterPDFDocument };
