import React, { useEffect, useState } from "react";
import { healthCheckApi, getConversation } from "@/api";
import { screenAtom } from "@/store/screens";
import { conversationAtom } from "@/store/conversation";
import { useAtom, useAtomValue } from "jotai";
import { quantum } from 'ldrs';
import { getConversationIdFromUrl, isDirectConversationAccess } from "@/utils/urlUtils";
import { apiTokenAtom } from "@/store/tokens";

const screens = {
  error: "outage",
  success: "intro",
  outOfTime: "outOfMinutes",
  conversation: "conversation",
} as const;

const useHealthCheck = () => {
  const [screenState, setScreenState] = useState<keyof typeof screens | null>(
    null,
  );
  const [, setConversation] = useAtom(conversationAtom);
  const token = useAtomValue(apiTokenAtom);

  const healthCheck = async (): Promise<void> => {
    try {
      const response = await healthCheckApi();
      if (response?.status) {
        // Check if there's a conversation_id in the URL
        const conversationId = getConversationIdFromUrl();
        
        if (conversationId && token) {
          try {
            // Try to fetch the conversation
            const conversation = await getConversation(token, conversationId);
            setConversation(conversation);
            setScreenState("conversation");
          } catch (error) {
            console.error("Failed to load conversation:", error);
            // If conversation fetch fails, go to normal intro
            setScreenState("success");
          }
        } else {
          setScreenState("success");
        }
      } else {
        setScreenState("error");
      }
    } catch (error) {
      setScreenState("error");
    }
  };

  useEffect(() => {
    healthCheck();
  }, []);

  return { screenState };
};

quantum.register();

export const IntroLoading: React.FC = () => {
  const { screenState } = useHealthCheck();
  const [, setScreenState] = useAtom(screenAtom);

  useEffect(() => {
    if (screenState !== null) {
      const timer = setTimeout(() => {
        setScreenState({ currentScreen: screens[screenState] });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [screenState]);

  return (
    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <l-quantum
        size="45"
        speed="1.75"
        color="white"
      ></l-quantum>
    </div>
  );
};