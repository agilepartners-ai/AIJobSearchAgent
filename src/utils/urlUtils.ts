// URL utility functions for handling conversation routing
export const getConversationIdFromUrl = (): string | null => {
  const path = window.location.pathname;
  // Remove leading slash and check if it's a valid conversation ID format
  const pathSegment = path.substring(1);
  
  // Basic validation: conversation IDs are typically alphanumeric strings
  // Adjust this regex based on your actual conversation ID format
  const conversationIdPattern = /^[a-zA-Z0-9]{16,}$/;
  
  if (pathSegment && conversationIdPattern.test(pathSegment)) {
    return pathSegment;
  }
  
  return null;
};

export const setConversationIdInUrl = (conversationId: string): void => {
  const newUrl = `/${conversationId}`;
  window.history.pushState({}, '', newUrl);
};

export const removeConversationIdFromUrl = (): void => {
  window.history.pushState({}, '', '/');
};

export const isDirectConversationAccess = (): boolean => {
  return getConversationIdFromUrl() !== null;
};


// Use React Router navigation for client-side routing
// Pass a navigate function from useNavigate to this util when needed
export const navigateToConversation = (conversationId: string, navigate?: (path: string) => void): void => {
  if (navigate) {
    navigate(`/${conversationId}`);
  } else {
    window.history.pushState({}, '', `/${conversationId}`);
  }
};

export const navigateToHome = (navigate?: (path: string) => void): void => {
  if (navigate) {
    navigate('/');
  } else {
    window.history.pushState({}, '', '/');
  }
};