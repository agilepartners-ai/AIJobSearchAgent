import { isTokenExpiredError, checkTokenExpired } from "@/utils/tokenErrorHandler";

export class TokenExpiredError extends Error {
  constructor(message: string = "Token has expired") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

export const getConversation = async (
  token: string,
  conversationId: string
) => {
  try {
    const response = await fetch(
      `https://tavusapi.com/v2/conversations/${conversationId}`,
      {
        method: "GET",
        headers: {
          "x-api-key": token ?? "",
        },
      }
    );

    if (!response.ok) {
      // Check if it's a token expiration error
      if (checkTokenExpired(response)) {
        throw new TokenExpiredError("API token has expired. Please refresh the page.");
      }
      
      // Check response body for token expiration indicators
      try {
        const errorData = await response.json();
        const errorText = JSON.stringify(errorData);
        if (isTokenExpiredError(errorText)) {
          throw new TokenExpiredError("API token has expired. Please refresh the page.");
        }
      } catch (e) {
        // If JSON parse fails, check response text
        const errorText = await response.text();
        if (isTokenExpiredError(errorText)) {
          throw new TokenExpiredError("API token has expired. Please refresh the page.");
        }
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching conversation:", error);
    throw error;
  }
};