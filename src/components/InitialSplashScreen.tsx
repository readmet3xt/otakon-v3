
import React, { useState, useEffect } from 'react';
import Logo from './Logo';

interface InitialSplashScreenProps {
    onComplete: () => void;
}

// It's not a standard DOM type, so we define it.
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

const IosShareIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10.5v6m-3-3h6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 6.75V15a2.25 2.25 0 002.25 2.25h4.5A2.25 2.25 0 0016.5 15V6.75" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7.5V5.25a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 5.25V7.5" />
    </svg>
);


const IosInstallPrompt = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
        <div 
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 w-full max-w-sm m-4 text-center"
            onClick={(e) => e.stopPropagation()}
        >
            <h3 className="text-xl font-bold text-white mb-3">Install Otakon</h3>
            <p className="text-slate-300 mb-6">
                To add this app to your Home Screen, tap the Share icon (<IosShareIcon className="inline-block w-5 h-5 align-middle" />) and then select 'Add to Home Screen'.
            </p>
            <button
                onClick={onClose}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
                OK
            </button>
        </div>
    </div>
);


const InitialSplashScreen: React.FC<InitialSplashScreenProps> = ({ onComplete }) => {
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallButtonVisible, setIsInstallButtonVisible] = useState(false);
    const [showIosInstallPrompt, setShowIosInstallPrompt] = useState(false);

    const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPromptEvent(e as BeforeInstallPromptEvent);
            if(!isIos()){
                setIsInstallButtonVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Show button on iOS devices regardless of the event
        if (isIos()) {
            setIsInstallButtonVisible(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleAddToHomeScreen = () => {
        if (installPromptEvent) {
            installPromptEvent.prompt();
            installPromptEvent.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                } else {
                    console.log('User dismissed the A2HS prompt');
                }
                setInstallPromptEvent(null);
                // Hide the button after the prompt is shown
                setIsInstallButtonVisible(false);
            });
        } else if (isIos()) {
            setShowIosInstallPrompt(true);
        } else {
            // This is a fallback for non-iOS browsers where the event didn't fire for some reason
            alert("To install this app, check your browser's menu for an 'Install App' or 'Add to Home Screen' option.");
        }
    };

    return (
        <>
            <div className="h-screen bg-slate-950 text-white flex flex-col items-center justify-center font-inter px-6 py-12 text-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial-at-top from-slate-900/20 to-transparent pointer-events-none"></div>
                
                <div className="animate-fade-in" style={{ animationDuration: '1s' }}>
                    <Logo />
                </div>

                <h1 
                    className="text-6xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mt-6 mb-3 animate-fade-in"
                    style={{ animationDelay: '200ms', animationDuration: '1s' }}
                >
                    Otakon
                </h1>

                <p 
                    className="text-xl md:text-2xl text-slate-300 mb-12 animate-fade-in"
                    style={{ animationDelay: '400ms', animationDuration: '1s' }}
                >
                    Your Spoiler-Free Gaming Companion
                </p>

                <div 
                    className="flex flex-col items-center gap-4 w-full max-w-xs animate-fade-in"
                    style={{ animationDelay: '600ms', animationDuration: '1s' }}
                >
                    <button
                        onClick={onComplete}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 px-10 rounded-full transition-all duration-300 transform hover:scale-105 text-lg animate-pulse-glow"
                    >
                        Get Started
                    </button>
                    
                    <a
                        href="https://drive.google.com/file/d/1OakBBEthMIphbWz3ocR-4touNEhOYVmV/view?usp=sharing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-3 px-6 rounded-full transition-colors flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        <span>Download PC Client</span>
                    </a>
                    
                    {isInstallButtonVisible && (
                        <button
                            onClick={handleAddToHomeScreen}
                            className="w-full bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-3 px-6 rounded-full transition-colors flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Add to Home Screen</span>
                        </button>
                    )}
                </div>
            </div>
            {showIosInstallPrompt && <IosInstallPrompt onClose={() => setShowIosInstallPrompt(false)} />}
        </>
    );
};

export default InitialSplashScreen;
