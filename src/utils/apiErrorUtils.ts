/**
 * Utility functions for handling API errors
 */

export interface ApiErrorInfo {
  endpoint: string;
  method: string;
  requestData?: any;
  responseData?: any;
  message: string;
  timestamp: string;
}

export class ApiError extends Error {
  public readonly endpoint: string;
  public readonly method: string;
  public readonly requestData?: any;
  public readonly responseData?: any;
  public readonly timestamp: string;

  constructor(
    endpoint: string,
    method: string,
    requestData: any,
    responseData: any,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.endpoint = endpoint;
    this.method = method;
    this.requestData = requestData;
    this.responseData = responseData;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): ApiErrorInfo {
    return {
      endpoint: this.endpoint,
      method: this.method,
      requestData: this.requestData,
      responseData: this.responseData,
      message: this.message,
      timestamp: this.timestamp
    };
  }
}

export function createApiError(
  endpoint: string,
  method: string,
  requestData: any,
  responseData: any,
  message: string
): ApiError {
  return new ApiError(endpoint, method, requestData, responseData, message);
}

/**
 * Extracts error details from a fetch response
 */
export async function handleApiError(
  response: Response,
  endpoint: string,
  params: Record<string, any>
): Promise<never> {
  let errorMessage = `API request failed with status ${response.status}`;
  let responseData = null;

  // Check for CORS errors
  if (response.status === 0 || response.type === 'opaqueredirect') {
    throw createApiError(
      endpoint,
      'POST',
      params,
      { type: 'CORS_ERROR' },
      'CORS error: The request was blocked due to cross-origin restrictions. Please check server CORS configuration.'
    );
  }

  try {
    // Try to parse response as JSON
    responseData = await response.json();
    if (responseData?.message || responseData?.error) {
      errorMessage = responseData.message || responseData.error;
    }
  } catch (e) {
    // If not JSON, try to get text
    try {
      const textResponse = await response.text();
      if (textResponse) {
        errorMessage = textResponse;
      }
    } catch (textError) {
      // If text extraction fails, use default message
    }
  }

  throw createApiError(
    endpoint,
    'POST',
    params,
    responseData,
    errorMessage
  );
}

/**
 * Wraps a fetch call with error handling
 */
export async function fetchWithErrorHandling<T>(
  endpoint: string,
  options: RequestInit = {},
  params: Record<string, any> = {}
): Promise<T> {
  try {
    const response = await fetch(endpoint, options);

    if (!response.ok) {
      await handleApiError(response, endpoint, params);
    }

    return await response.json();
  } catch (error) {
    // Handle network errors (including CORS)
    if (error instanceof TypeError && error.message.includes('NetworkError')) {
      throw createApiError(
        endpoint,
        options.method || 'GET',
        params,
        { type: 'NETWORK_ERROR' },
        'Network error: This could be due to CORS restrictions. Please check server configuration.'
      );
    }

    if ((error as any).endpoint) {
      // Already an enhanced API error
      throw error;
    }

    // Convert regular error to API error
    throw createApiError(
      endpoint,
      options.method || 'GET',
      params,
      null,
      error instanceof Error ? error.message : String(error)
    );
  }
}