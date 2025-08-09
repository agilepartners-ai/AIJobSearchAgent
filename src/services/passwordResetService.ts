import { AuthService } from './authService';

export interface PasswordResetRequest {
  identifier: string; // email or phone number
  method: 'email' | 'sms';
}

export interface PasswordResetVerification {
  identifier: string;
  code?: string; // For SMS-based reset
  token?: string; // For email-based reset
  newPassword: string;
}

export class PasswordResetService {
  /**
   * Request password reset via email or SMS
   */
  static async requestPasswordReset(request: PasswordResetRequest): Promise<{ success: boolean; message: string }> {
    try {
      const resetData = {
        method: request.method,
        ...(request.method === 'email' ? { email: request.identifier } : { phoneNumber: request.identifier })
      };

      await AuthService.sendPasswordReset(resetData);

      const methodText = request.method === 'email' ? 'email' : 'SMS';
      return {
        success: true,
        message: `Password reset instructions have been sent via ${methodText}`
      };
    } catch (error) {
      console.error('Password reset request failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send password reset instructions'
      };
    }
  }

  /**
   * Verify password reset code (for SMS) or token (for email)
   */
  static async verifyPasswordResetCode(identifier: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const isValid = await AuthService.verifyPasswordResetCode(code, identifier);
      
      if (isValid) {
        return {
          success: true,
          message: 'Code verified successfully'
        };
      } else {
        return {
          success: false,
          message: 'Invalid or expired code'
        };
      }
    } catch (error) {
      console.error('Code verification failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to verify code'
      };
    }
  }

  /**
   * Complete password reset with new password
   */
  static async completePasswordReset(verification: PasswordResetVerification): Promise<{ success: boolean; message: string }> {
    try {
      // For SMS-based reset, verify the code first
      if (verification.code) {
        const codeVerification = await this.verifyPasswordResetCode(verification.identifier, verification.code);
        if (!codeVerification.success) {
          return codeVerification;
        }
      }

      // Change the password
      await AuthService.changePassword({ newPassword: verification.newPassword });

      return {
        success: true,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      console.error('Password reset completion failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset password'
      };
    }
  }

  /**
   * Validate identifier format
   */
  static validateIdentifier(identifier: string, method: 'email' | 'sms'): { valid: boolean; error?: string } {
    if (method === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        return { valid: false, error: 'Invalid email format' };
      }
    } else if (method === 'sms') {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(identifier) || identifier.length < 10) {
        return { valid: false, error: 'Invalid phone number format' };
      }
    }

    return { valid: true };
  }
}