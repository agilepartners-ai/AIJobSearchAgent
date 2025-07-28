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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching conversation:", error);
    throw error;
  }
};