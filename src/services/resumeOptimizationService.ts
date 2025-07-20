import { fetchWithErrorHandling, createApiError } from '../utils/apiErrorUtils';

interface OptimizationRequest {
  firebase_uid: string;
  resume_text: string;
  job_description: string;
}

interface OptimizationResponse {
  success: boolean;
  message: string;
  data?: {
    django_user_id: number;
    firebase_uid: string;
    user_created: boolean;
    analysis: {
      match_score: number;
      strengths: string[];
      gaps: string[];
      suggestions: string[];
      tweaked_resume_text: string;
    };
    optimization_successful: boolean;
    score_threshold_met: boolean;
    tweaked_text: string | null;
    explanation: string;
  };
  error?: string;
}

export class ResumeOptimizationService {
  private static readonly API_URL = 'https://resumebuilder-arfb.onrender.com/optimizer/api/optimize-resume/';
  private static readonly API_TIMEOUT = 30000; // 30 seconds
  private static readonly PROXY_URL = '/api/proxy/resume-optimization'; // Local proxy endpoint

  /**
   * Validate optimization request data
   * @param userId User ID
   * @param resumeText Resume text
   * @param jobDescription Job description
   * @returns Validation result
   */
  static validateOptimizationRequest(
    userId: string,
    resumeText: string,
    jobDescription: string
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userId) {
      errors.push('User ID is required');
    }

    if (!resumeText || resumeText.trim().length < 100) {
      errors.push('Resume text is too short or empty');
    }

    if (!jobDescription || jobDescription.trim().length < 50) {
      errors.push('Job description is too short or empty');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Optimize resume based on job description
   * @param userId User ID
   * @param resumeText Resume text
   * @param jobDescription Job description
   * @returns Optimization results
   */
  static async optimizeResume(
    userId: string,
    resumeText: string,
    jobDescription: string
  ): Promise<OptimizationResponse> {
    try {
      console.log('Starting resume optimization...');
      
      // Prepare request data
      const requestData: OptimizationRequest = {
        firebase_uid: userId,
        resume_text: resumeText,
        job_description: jobDescription.replace(/[\n\s]+/g, ' ')
      };

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);
      
      try {
        // Determine which endpoint to use based on environment
        const endpoint = process.env.NODE_ENV === 'production' 
          ? this.API_URL  // Use direct API in production (with proper CORS on server)
          : this.PROXY_URL; // Use proxy in development
        
        // Send request to API using our error handling utility
        const response = await fetchWithErrorHandling<OptimizationResponse>(
          endpoint,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': '*/*',
              // Add origin for CORS preflight requests
              'Origin': window.location.origin
            },
            // Include credentials if needed (for cookies/auth)
            // credentials: 'include',
            body: JSON.stringify(requestData),
            signal: controller.signal
          },
          requestData
        );
        
        clearTimeout(timeoutId);
        console.log('API response received successfully');
        
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Enhance error with API details if not already present
        if (!(error as any).endpoint) {
          throw createApiError(
            error instanceof Error ? error.message : String(error),
            this.API_URL,
            requestData
          );
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error optimizing resume:', error);
      throw error;
    }
  }

  /**
   * Transform API response to our format
   * @param apiResponse API response
   * @returns Transformed results
   */
  static transformApiResponse(apiResponse: OptimizationResponse): any {
    // If API response has data, use it
    if (apiResponse.success && apiResponse.data) {
      const { data } = apiResponse;
      
      return {
        // Map the new API response structure to our expected format
        matchScore: data.analysis.match_score,
        strengths: data.analysis.strengths || [],
        gaps: data.analysis.gaps || [],
        suggestions: data.analysis.suggestions || [],
        optimizedResumeText: data.analysis.tweaked_resume_text || '',
        tweakedText: data.tweaked_text || '',
        // These fields might not be in the API response, so we'll use defaults
        optimizedResumeUrl: "https://example.com/optimized-resume.pdf",
        optimizedCoverLetterUrl: "https://example.com/optimized-cover-letter.pdf",
        // Include the new fields from the updated interface
        djangoUserId: data.django_user_id,
        firebaseUid: data.firebase_uid,
        optimizationSuccessful: data.optimization_successful,
        explanation: data.explanation || '',
        // Ensure keyword analysis has proper defaults
        keywordAnalysis: {
          coverageScore: 75, // Default value
          coveredKeywords: [],
          missingKeywords: []
        },
        // Ensure experience optimization has proper defaults
        experienceOptimization: [],
        // Ensure skills optimization has proper defaults
        skillsOptimization: {
          technicalSkills: [],
          softSkills: [],
          missingSkills: []
        }
      };
    }
    
    // Otherwise, throw an error
    throw createApiError(
      apiResponse.error || 'API response does not contain valid data',
      this.API_URL,
      { success: apiResponse.success, message: apiResponse.message }
    );
  }
}