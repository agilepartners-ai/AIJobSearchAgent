import AudioButton from "@/components/AudioButton";
import { RefreshCcw } from "lucide-react";
import React from "react";

export const ConversationError: React.FC<{ onClick: () => void }> = ({
  onClick,
}) => {
  return (
    <div>
      <div>
        <div>
          <AudioButton onClick={onClick} className="mt-6 sm:mt-8">
            <RefreshCcw className="size-5" /> Try Again
          </AudioButton>
        </div>
      </div>
    </div>
  );
};
