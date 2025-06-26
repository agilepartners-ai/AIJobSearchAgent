import { DialogWrapper, AnimatedTextBlockWrapper } from "@/components/DialogWrapper";
import React from "react";
import { useAtom } from "jotai";
import { screenAtom } from "@/store/screens";
import { Button } from "@/components/ui/button";

export const FinalScreen: React.FC = () => {
  const [, setScreenState] = useAtom(screenAtom);

  const handleReturn = () => {
    setScreenState({ currentScreen: "intro" });
  };

  return (
    <DialogWrapper>
      <AnimatedTextBlockWrapper>
        <div className="flex flex-col items-center justify-center gap-6 py-12">
          <h1 className="text-3xl font-bold text-white mb-4 text-center">Thank you for your conversation!</h1>
          <Button
            onClick={handleReturn}
            className="relative z-20 flex items-center justify-center gap-2 rounded-3xl border border-[rgba(255,255,255,0.3)] px-8 py-3 text-base text-white transition-all duration-200 hover:text-primary disabled:opacity-50"
            style={{
              height: '48px',
              transition: 'all 0.2s ease-in-out',
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 15px rgba(34, 197, 254, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Return to Main Screen
          </Button>
        </div>
      </AnimatedTextBlockWrapper>
    </DialogWrapper>
  );
};
