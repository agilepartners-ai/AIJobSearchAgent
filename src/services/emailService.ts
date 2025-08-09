import { getEmailConfig } from '../config/emailConfig';

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
}

export interface EmailProvider {
  sendEmail(template: EmailTemplate): Promise<boolean>;
}

// Simple email service that can be extended with different providers
export class EmailService {
  private static provider: EmailProvider | null = null;

  static setProvider(provider: EmailProvider) {
    this.provider = provider;
  }

  static initializeProvider() {
    const config = getEmailConfig();
    
    switch (config.provider) {
      case 'firebase':
        this.setProvider(new FirebaseEmailProvider());
        break;
      case 'console':
        this.setProvider(new ConsoleEmailProvider());
        break;
      default:
        console.warn(`Email provider '${config.provider}' not implemented, falling back to console`);
        this.setProvider(new ConsoleEmailProvider());
    }
  }

  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const config = getEmailConfig();
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const template: EmailTemplate = {
      to: email,
      subject: 'Reset Your Password - AIJobSearchAgent',
      from: config.fromEmail,
      fromName: config.fromName,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Reset Your Password</h2>
          <p>You requested to reset your password for your AIJobSearchAgent account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
          <p style="color: #6b7280; font-size: 14px;">
            This link will expire in 15 minutes. If you didn't request this password reset, please ignore this email.
          </p>
        </div>
      `,
      text: `
        Reset Your Password
        
        You requested to reset your password for your AIJobSearchAgent account.
        
        Click this link to reset your password: ${resetUrl}
        
        This link will expire in 15 minutes. If you didn't request this password reset, please ignore this email.
      `
    };

    // Initialize provider if not set
    if (!this.provider) {
      this.initializeProvider();
    }

    if (this.provider) {
      return await this.provider.sendEmail(template);
    } else {
      // Fallback: log to console for development
      console.log('=== EMAIL WOULD BE SENT ===');
      console.log('To:', template.to);
      console.log('Subject:', template.subject);
      console.log('Reset URL:', resetUrl);
      console.log('========================');
      return true; // Return true for development
    }
  }
}

// Development email provider (logs to console)
export class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(template: EmailTemplate): Promise<boolean> {
    console.log('=== SENDING EMAIL ===');
    console.log('To:', template.to);
    console.log('Subject:', template.subject);
    console.log('HTML:', template.html);
    console.log('==================');
    return true;
  }
}

// Firebase email provider using Firebase Auth's email capabilities
export class FirebaseEmailProvider implements EmailProvider {
  async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      // For now, we'll use Firebase's built-in password reset email
      // In the future, this could be extended with Firebase Functions + email service
      
      // Since Firebase Auth only sends password reset emails to existing users,
      // we'll simulate the email sending for development
      console.log('=== FIREBASE EMAIL SERVICE ===');
      console.log('To:', template.to);
      console.log('Subject:', template.subject);
      console.log('Content:', template.text);
      console.log('HTML:', template.html);
      console.log('==============================');
      
      // TODO: Implement Firebase Functions email sending
      // This would involve:
      // 1. Creating a Firebase Function
      // 2. Using a service like SendGrid, Mailgun, or Nodemailer
      // 3. Calling the function from here
      
      return true; // Return true for development
    } catch (error) {
      console.error('Firebase email sending failed:', error);
      return false;
    }
  }
}

// Future: Add real email providers like SendGrid, AWS SES, etc.
// export class SendGridProvider implements EmailProvider {
//   async sendEmail(template: EmailTemplate): Promise<boolean> {
//     // Implementation for SendGrid
//   }
// }