import { OpenAIResumeOptimizer, ResumeOptimizationRequest } from './openaiService';

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
   * Optimize resume using OpenAI instead of external API
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
      console.log('Starting resume optimization with OpenAI...');

      // Call OpenAI service directly
      const aiResults = await OpenAIResumeOptimizer.optimizeResume({
        resumeText: resumeText,
        jobDescription: jobDescription
      });

      // Transform OpenAI results to expected format
      const response: OptimizationResponse = {
        success: true,
        message: 'Resume optimization completed successfully',
        data: {
          django_user_id: 1,
          firebase_uid: userId,
          user_created: false,
          analysis: {
            match_score: aiResults.matchScore,
            strengths: aiResults.strengths,
            gaps: aiResults.gaps,
            suggestions: aiResults.suggestions,
            tweaked_resume_text: aiResults.optimizedResumeText
          },
          optimization_successful: true,
          score_threshold_met: aiResults.matchScore >= 70,
          tweaked_text: aiResults.optimizedResumeText,
          explanation: aiResults.summary
        }
      };

      console.log('OpenAI optimization completed successfully');
      return response;

    } catch (error) {
      console.error('Error optimizing resume:', error);

      return {
        success: false,
        message: 'Resume optimization failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
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
    throw new Error(
      apiResponse.error || 'API response does not contain valid data'
    );
  }
}