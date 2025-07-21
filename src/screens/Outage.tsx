import {
  AnimatedTextBlockWrapper,
  DialogWrapper,
  StaticTextBlockWrapper,
} from "@/components/DialogWrapper";
import React from "react";

export const Outage: React.FC = () => {
  return (
    <DialogWrapper>
      <AnimatedTextBlockWrapper>
        <StaticTextBlockWrapper
          imgSrc="/images/error.png"
          title="System Currently Unavailable"
          titleClassName="sm:max-w-full"
          description="Our service is temporarily unavailable. Please try again later."
        />
      </AnimatedTextBlockWrapper>
    </DialogWrapper>
  );
};
