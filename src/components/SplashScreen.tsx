import React, { useState } from 'react';
import ScreenshotIcon from './ScreenshotIcon';
import HintIcon from './HintIcon';
import DesktopIcon from './DesktopIcon';
import { ConnectionStatus } from '../types';

const slides = [
  {
    icon: <ScreenshotIcon className="w-20 h-20 text-indigo-400" />,
    title: "Analyze Any Screenshot",
    description: "Upload a screenshot from any game. Otakon instantly identifies the game, your location, and what's happening in the scene."
  },
  {
    icon: <HintIcon className="w-20 h-20 text-indigo-400" />,
    title: "Spoiler-Free Hints & Lore",
    description: "Stuck? Get contextual guidance without ruining the story. Discover rich lore about characters, items, and the world around you."
  },
  {
    icon: <DesktopIcon className="w-20 h-20 text-indigo-400" />,
    title: "Seamless PC Connection",
    description: "Sync with the Otakon desktop app. Press a hotkey to instantly send a screenshot for analysis without ever leaving your game."
  }
];

interface SplashScreenProps {
  onComplete: () => void;
  onConnect: (code: string) => void;
  onDisconnect: () => void; // ✅ this is required
  status: ConnectionStatus;
  error: string | null;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete,
  onConnect,
  onDisconnect, // ✅ added to destructure
  status,
  error
}) => {
  const [step, setStep] = useState(0);
  const [code, setCode] = useState('');

  const currentSlide = slides[step];
  const isLastStep = step === slides.length - 1;
  const isConnecting = status === ConnectionStatus.CONNECTING;
  const isConnected = status === ConnectionStatus.CONNECTED;

  const handleNext = () => {
    if (!isLastStep) {
      setStep(s => s + 1);
    }
  };

  const handleConnectClick = () => {
    if (isConnecting || isConnected) return;
    onConnect(code);
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col font-inter">
      <div className="flex-shrink-0 px-6 pt-8 flex justify-end">
        <button onClick={handleSkip} className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Skip Intro</button>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center overflow-y-auto p-6">
        <div className="text-center max-w-md w-full my-auto">
          <div className="mb-8 flex justify-center items-center h-20 animate-fade-in">
            {currentSlide.icon}
          </div>
          <h1 className="text-3xl font-bold text-white mb-4 animate-fade-in" style={{ animationDelay: '100ms' }}>{currentSlide.title}</h1>
          <p className="text-slate-300 text-lg mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>{currentSlide.description}</p>

          {isLastStep && (
            <div className="space-y-4 text-left animate-fade-in" style={{ animationDelay: '300ms' }}>
              <div>
                <label htmlFor="connection-code" className="block text-sm font-medium text-slate-300 mb-1">
                  4-Digit Connection Code
                </label>
                <input
                  id="connection-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="1234"
                  maxLength={4}
                  pattern="\d{4}"
                  title="Enter exactly 4 digits"
                  disabled={isConnecting || isConnected}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 px-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                />
              </div>
              <div className="h-5 text-center text-sm">
                {error && <p className="text-red-400 animate-fade-in">{error}</p>}
                {isConnected && <p className="text-green-400 animate-fade-in">Connected successfully. Ready for action!</p>}
                {isConnecting && <p className="text-slate-400 animate-fade-in">Attempting to connect...</p>}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="flex-shrink-0 px-6 pt-0 pb-8">
        <div className="w-full max-w-md mx-auto">
          <div className="flex justify-center items-center mb-6 gap-2">
            {slides.map((_, index) => (
              <div key={index} className={`w-2.5 h-2.5 rounded-full transition-all ${step === index ? 'bg-indigo-400 scale-125' : 'bg-slate-700'}`}></div>
            ))}
          </div>

          {isLastStep ? (
            <div className="space-y-3">
              {!isConnected && (
                <button
                  onClick={handleConnectClick}
                  disabled={isConnecting || !/^\d{4}$/.test(code)}
                  className="w-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-full transition-all duration-200"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </button>
              )}
              <button
                onClick={onComplete}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-full transition-all duration-300 transform hover:scale-105"
              >
                {isConnected ? "Continue to App" : "Skip & Start"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-full transition-all duration-300 transform hover:scale-105"
            >
              Next
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default SplashScreen;
