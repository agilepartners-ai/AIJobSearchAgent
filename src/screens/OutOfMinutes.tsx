import {
  DialogWrapper,
  AnimatedTextBlockWrapper,
  StaticTextBlockWrapper,
} from "@/components/DialogWrapper";
import React from "react";

export const OutOfMinutes: React.FC = () => {
  return (
    <DialogWrapper>
      <AnimatedTextBlockWrapper>
        <StaticTextBlockWrapper
          imgSrc="/images/clock.png"
          title="You've reached your daily limit"
          description="Come back tomorrow to continue chatting. We'll be here!"
        />
      </AnimatedTextBlockWrapper>
    </DialogWrapper>
  );
};
