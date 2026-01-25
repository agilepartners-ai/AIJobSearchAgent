import { isTokenExpiredError, checkTokenExpired, sanitizeErrorMessage, getProfessionalTokenErrorMessage } from "@/utils/tokenErrorHandler";
import { TokenExpiredError } from "./createConversation";

export const endConversation = async (
  token: string,
  conversationId: string,
) => {
  try {
    const response = await fetch(
      `https://tavusapi.com/v2/conversations/${conversationId}/end`,
      {
        method: "POST",
        headers: {
          "x-api-key": token ?? "",
        },
      },
    );

    if (!response.ok) {
      // Check if it's a token expiration error
      if (checkTokenExpired(response)) {
        throw new TokenExpiredError(getProfessionalTokenErrorMessage());
      }
      
      // Check response body for token expiration indicators
      try {
        const errorData = await response.json();
        const errorText = JSON.stringify(errorData);
        if (isTokenExpiredError(errorText)) {
          throw new TokenExpiredError(getProfessionalTokenErrorMessage());
        }
        throw new Error(sanitizeErrorMessage(errorText));
      } catch (_e: unknown) {
        // If JSON parse fails, check response text
        const errorText = await response.text();
        if (isTokenExpiredError(errorText)) {
          throw new TokenExpiredError(getProfessionalTokenErrorMessage());
        }
        throw new Error(sanitizeErrorMessage(errorText));
      }
    }

    return null;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
