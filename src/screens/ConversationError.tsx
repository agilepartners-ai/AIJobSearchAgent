import AudioButton from "@/components/AudioButton";
import {
  AnimatedTextBlockWrapper,
  DialogWrapper,
  StaticTextBlockWrapper,
} from "@/components/DialogWrapper";
import { RefreshCcw } from "lucide-react";
import React from "react";

export const ConversationError: React.FC<{ onClick: () => void }> = ({
  onClick,
}) => {
  return (
    <DialogWrapper>
      <AnimatedTextBlockWrapper>
        <StaticTextBlockWrapper
          imgSrc="/images/error.png"
          title="Connection Error"
          titleClassName="sm:max-w-full"
          description="We're having trouble connecting. Please try again in a few moments."
        >
          <AudioButton onClick={onClick} className="mt-6 sm:mt-8">
            <RefreshCcw className="size-5" /> Try Again
          </AudioButton>
        </StaticTextBlockWrapper>
      </AnimatedTextBlockWrapper>
    </DialogWrapper>
  );
};
