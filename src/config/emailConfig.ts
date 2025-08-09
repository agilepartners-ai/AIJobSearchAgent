export interface EmailConfig {
  provider: 'firebase' | 'sendgrid' | 'aws-ses' | 'console';
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
}

export const getEmailConfig = (): EmailConfig => {
  // Check environment variables for email configuration
  const provider = (process.env.NEXT_PUBLIC_EMAIL_PROVIDER as EmailConfig['provider']) || 'firebase';
  
  return {
    provider,
    apiKey: process.env.NEXT_PUBLIC_EMAIL_API_KEY,
    fromEmail: process.env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@aijobsearchagent.com',
    fromName: process.env.NEXT_PUBLIC_FROM_NAME || 'AIJobSearchAgent',
  };
};