/**
 * Utility to detect and handle token expiration errors
 */

export interface TokenErrorResponse {
  isTokenExpired: boolean;
  errorMessage: string;
}

/**
 * Check if an error is due to token expiration
 */
export const isTokenExpiredError = (error: unknown): boolean => {
  const errorString = String(error).toLowerCase();
  
  return (
    errorString.includes("expired") ||
    errorString.includes("signature expired") ||
    errorString.includes("invalid argument") ||
    errorString.includes("401") ||
    errorString.includes("unauthorized")
  );
};

/**
 * Parse error response to get error details
 */
export const parseErrorResponse = async (
  response: Response
): Promise<TokenErrorResponse> => {
  try {
    const data = await response.clone().json();
    const errorMessage = JSON.stringify(data);
    return {
      isTokenExpired: isTokenExpiredError(errorMessage),
      errorMessage,
    };
  } catch {
    const errorMessage = await response.text();
    return {
      isTokenExpired: isTokenExpiredError(errorMessage),
      errorMessage,
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
