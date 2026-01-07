import { IConversation } from "@/types";
import { settingsAtom } from "@/store/settings";
import { getDefaultStore } from "jotai";
import { setConversationIdInUrl } from "@/utils/urlUtils";
import { isTokenExpiredError, checkTokenExpired } from "@/utils/tokenErrorHandler";

export class TokenExpiredError extends Error {
  constructor(message: string = "Token has expired") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

export const createConversation = async (
  token: string,
): Promise<IConversation> => {
  // Get settings from Jotai store
  const settings = getDefaultStore().get(settingsAtom);
  
  // Build the context string
  let contextString = "";
  if (settings.name) {
    contextString = `You are talking with the user, ${settings.name}. Additional context: `;
  }
  contextString += settings.context || "";
  
  const payload = {
    persona_id: settings.persona || "pd43ffef",
    custom_greeting: settings.greeting !== undefined && settings.greeting !== null 
      ? settings.greeting 
      : "Hey there! I'm your technical co-pilot! Let's get get started building with Tavus.",
    conversational_context: contextString
  };
  
  const response = await fetch("https://tavusapi.com/v2/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": token ?? "",
    },
    body: JSON.stringify(payload),
  });

  if (!response?.ok) {
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
  
  // Add conversation_id to URL for sharing/bookmarking
  if (data.conversation_id) {
    setConversationIdInUrl(data.conversation_id);
  }
  
  return data;
};