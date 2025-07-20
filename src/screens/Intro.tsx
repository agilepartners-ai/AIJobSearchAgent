import { AnimatedWrapper } from "@/components/DialogWrapper";
import React from "react";
import { useAtom } from "jotai";
import { screenAtom } from "@/store/screens";
import { Play, Lock } from "lucide-react";
import AudioButton from "@/components/AudioButton";
import { apiTokenAtom } from "@/store/tokens";
import gloriaVideo from "@/assets/video/gloria.mp4";

export const Intro: React.FC = () => {
  const [, setScreenState] = useAtom(screenAtom);
  const [token] = useAtom(apiTokenAtom);

  const handleClick = () => {
    setScreenState({ currentScreen: "instructions" });
  };

  return (
    <AnimatedWrapper>
      <div className="flex size-full flex-col items-center justify-center">
        <video
          src={gloriaVideo}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-primary-overlay backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col items-center gap-2 py-4 px-4 rounded-xl border border-[rgba(255,255,255,0.2)]" 
          style={{ 
            fontFamily: 'Inter, sans-serif',
            background: 'rgba(0,0,0,0.3)'
          }}>

          <h1 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Source Code Pro, monospace' }}>CVI Demo Playground</h1>

          <p className="text-sm text-white text-center mb-4 max-w-sm">
            Experience face-to-face conversation with AI so real, it feels human.
          </p>

          {!token && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-center">
              <p className="text-sm text-red-200">
                API key not configured. Please set VITE_TAVUS_API_KEY in your environment variables.
              </p>
            </div>
          )}

          <AudioButton 
            onClick={handleClick}
            className="relative z-20 flex items-center justify-center gap-2 rounded-3xl border border-[rgba(255,255,255,0.3)] px-4 py-2 text-sm text-white transition-all duration-200 hover:text-primary mt-4 disabled:opacity-50"
            disabled={!token}
            style={{
              height: '44px',
              transition: 'all 0.2s ease-in-out',
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}
            onMouseEnter={(e) => {
              if (token) {
                e.currentTarget.style.boxShadow = '0 0 15px rgba(34, 197, 254, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {token ? <Play className="size-4" /> : <Lock className="size-4" />}
            {token ? "Start Demo" : "API Key Required"}
          </AudioButton>
        </div>
      </div>
    </AnimatedWrapper>
  );
};