import { IConversation } from '../types';

/**
 * Creates a new interview conversation with Tavus API
 * @param context Optional context for the interview (job description, resume, etc.)
 * @returns Promise with the conversation data
 */
export const createConversation = async (context?: string): Promise<IConversation> => {
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
        "persona_id": "pe13ed370726",
        "conversational_context": context || undefined,
        "properties": {
          "max_call_duration": 1800, // 30 minutes
          "enable_recording": true,
          "enable_closed_captions": true,
          "language": "english"
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as IConversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};