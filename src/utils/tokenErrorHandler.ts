/**
 * Utility to detect and handle token expiration errors
 */

export interface TokenErrorResponse {
  isTokenExpired: boolean;
  errorMessage: string;
}

/**
 * Check if an error is due to token expiration
 * Detects various token expiration patterns including:
 * - ExpiredTokenInvalid errors from APIs
 * - Signature expired errors
 * - 401/403 status codes
 * - Custom token expiration messages
 */
export const isTokenExpiredError = (error: unknown): boolean => {
  const errorString = String(error).toLowerCase();
  
  return (
    errorString.includes("expiredtoken") ||
    errorString.includes("expired") ||
    errorString.includes("signature expired") ||
    errorString.includes("invalid argument") ||
    errorString.includes("request signature expired") ||
    errorString.includes("401") ||
    errorString.includes("unauthorized") ||
    errorString.includes("token") && errorString.includes("expired")
  );
};

/**
 * Get a professional error message for token expiration
 * Never shows technical token details to the user
 */
export const getProfessionalTokenErrorMessage = (): string => {
  return "Your session has expired. Please refresh the page and try again.";
};

/**
 * Parse error response to get error details
 * Sanitizes token expiration errors to show professional messages
 */
export const parseErrorResponse = async (
  response: Response
): Promise<TokenErrorResponse> => {
  try {
    const data = await response.clone().json();
    const errorMessage = JSON.stringify(data);
    const isTokenExpired = isTokenExpiredError(errorMessage);
    
    return {
      isTokenExpired,
      // Show professional message for token errors, raw message for others
      errorMessage: isTokenExpired ? getProfessionalTokenErrorMessage() : errorMessage,
    };
  } catch {
    const errorMessage = await response.text();
    const isTokenExpired = isTokenExpiredError(errorMessage);
    
    return {
      isTokenExpired,
      // Show professional message for token errors, raw message for others
      errorMessage: isTokenExpired ? getProfessionalTokenErrorMessage() : errorMessage,
    };
  }
};

/**
 * Check if error is a token expiration error from response
 */
export const checkTokenExpired = (response: Response): boolean => {
  if (response.status === 401 || response.status === 403) {
    return true;
  }
  return false;
};

/**
 * Sanitize error message to hide technical token details
 */
export const sanitizeErrorMessage = (error: unknown): string => {
  const errorString = String(error);
  
  // Check if it's a token expiration error
  if (isTokenExpiredError(errorString)) {
    return getProfessionalTokenErrorMessage();
  }
  
  // Check for sensitive patterns and remove them
  let sanitized = errorString
    .replace(/ExpiredTokenInvalid.*?(?=\s|$|\.)/gi, "Session error")
    .replace(/signature expired at:.*?(?=\s|$|\.)/gi, "")
    .replace(/request signature expired at:.*?(?=\s|$|\.)/gi, "")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*?(?=\s|$|\.)/g, "");
  
  // If all content was technical token info, show professional message
  if (!sanitized || sanitized.trim().length < 5) {
    return getProfessionalTokenErrorMessage();
  }
  
  return sanitized;
};
