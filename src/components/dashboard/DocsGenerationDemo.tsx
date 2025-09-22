import React, { useState } from 'react';
import { Download, FileText, AlertCircle } from 'lucide-react';
import { getCleanHTMLForDocs } from './HTMLResumeTemplate';
import { UserProfileData } from '../../services/profileService';

interface DocsGenerationDemoProps {
  profile?: UserProfileData;
}

const DocsGenerationDemo: React.FC<DocsGenerationDemoProps> = ({ profile }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');

  // Mock profile data for demo if not provided
  const mockProfile: UserProfileData = profile || {
    fullName: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    currentJobTitle: 'Senior Software Engineer',
    jobProfile: 'Experienced software engineer with 5+ years developing scalable web applications using React, Node.js, and cloud technologies.',
    experience: 'Experienced',
    workExperience: [
      {
        jobTitle: 'Senior Software Engineer',
        company: 'Tech Company Inc.',
        duration: '2021-01 to Present'
      }
    ],
    education: [
      {
        degree: 'Bachelor of Science in Computer Science',
        institution: 'University of California, Berkeley',
        graduationYear: '2020'
      }
    ],
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'Git'],
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
    portfolio: 'https://johndoe.dev'
  };

  const downloadAsDocx = async (content: string, filename: string) => {
    console.log('[DocsGenerationDemo] downloadAsDocx called, filename=', filename);
    try {
      const payload = { html: content, filename };
      console.log('[DocsGenerationDemo] sending conversion request to /api/convert-html-to-docx');
      
      const resp = await fetch('/api/convert-html-to-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        console.error('[DocsGenerationDemo] conversion API failed', resp.status, txt);
        throw new Error('Conversion API failed');
      }

      console.log('[DocsGenerationDemo] conversion API succeeded, reading blob');
      const arrayBuffer = await resp.arrayBuffer();
      const blob = new Blob([arrayBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.docx') ? filename : filename + '.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[DocsGenerationDemo] Download initiated successfully');
    } catch (error) {
      console.error('[DocsGenerationDemo] Error in downloadAsDocx:', error);
      throw error;
    }
  };

  const handleGenerateDocsResume = async () => {
    setIsGenerating(true);
    setMessage('');

    try {
      // Generate clean HTML using getCleanHTMLForDocs
      console.log('[DocsGenerationDemo] Generating clean HTML for docs...');
      
      // Create mock HTML content for parsing (simulating existing resume HTML)
      const mockHTMLContent = `
        <html>
          <body>
            <h1>${mockProfile.fullName}</h1>
            <p>Email: ${mockProfile.email}</p>
            <p>Phone: ${mockProfile.phone}</p>
            <p>Location: ${mockProfile.location}</p>
            
            <h2>PROFESSIONAL EXPERIENCE</h2>
            ${mockProfile.workExperience?.map(exp => `
              <div>
                <h3>${exp.jobTitle} at ${exp.company}</h3>
                <p>Duration: ${exp.duration}</p>
              </div>
            `).join('') || ''}
            
            <h2>EDUCATION</h2>
            ${mockProfile.education?.map(edu => `
              <div>
                <p>${edu.degree} from ${edu.institution} (${edu.graduationYear})</p>
              </div>
            `).join('') || ''}
            
            <h2>SKILLS</h2>
            ${mockProfile.skills?.join(', ') || ''}
          </body>
        </html>
      `;
      
      const htmlContent = getCleanHTMLForDocs(mockHTMLContent, mockProfile, []);

      console.log('[DocsGenerationDemo] Generated HTML content, length:', htmlContent.length);

      // Convert to Word document using existing API
      await downloadAsDocx(htmlContent, 'demo-resume-from-html-template.docx');
      
      setMessage('✅ Word document generated and downloaded successfully!');
    } catch (error) {
      console.error('[DocsGenerationDemo] Error generating docs:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="text-blue-600 dark:text-blue-400" size={28} />
            📄 Word Document Generation Demo
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Test the new docs generation workflow using HTMLResumeTemplate
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Demo Profile Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Demo Profile Data:</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p><strong>Name:</strong> {mockProfile.fullName}</p>
              <p><strong>Email:</strong> {mockProfile.email}</p>
              <p><strong>Role:</strong> {mockProfile.currentJobTitle}</p>
              <p><strong>Experience:</strong> {mockProfile.workExperience?.length || 0} positions</p>
              <p><strong>Education:</strong> {mockProfile.education?.length || 0} degrees</p>
              <p><strong>Skills:</strong> {mockProfile.skills?.length || 0} technical skills</p>
            </div>
          </div>

          {/* Generation Button */}
          <div className="text-center">
            <button
              onClick={handleGenerateDocsResume}
              disabled={isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium flex items-center gap-2 mx-auto transition-all hover:shadow-lg disabled:cursor-not-allowed"
            >
              <Download size={20} />
              {isGenerating ? 'Generating Word Document...' : 'Generate Word Document'}
            </button>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${
              message.includes('✅') 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              {message.includes('❌') && <AlertCircle size={20} />}
              <span>{message}</span>
            </div>
          )}

          {/* Workflow Explanation */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">How it works:</h3>
            <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>1. <strong>HTMLResumeTemplate.getCleanHTMLForDocs()</strong> - Generates clean, structured HTML</li>
              <li>2. <strong>POST /api/convert-html-to-docx</strong> - Converts HTML to Word document using htmlDocsService</li>
              <li>3. <strong>Download</strong> - Browser downloads the generated .docx file</li>
            </ol>
          </div>

          {/* Technical Details */}
          <details className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer">
              Technical Implementation Details
            </summary>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>HTMLResumeTemplate:</strong> Creates clean HTML with professional styling optimized for Word conversion</p>
              <p><strong>ResumeContentParser:</strong> Parses and formats user profile data into structured sections</p>
              <p><strong>htmlDocsService:</strong> Backend service using docx library to convert HTML to Word format</p>
              <p><strong>Template Support:</strong> Supports modern, classic, creative, and minimal templates</p>
              <p><strong>Styling:</strong> Includes professional CSS that translates well to Word document formatting</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default DocsGenerationDemo;