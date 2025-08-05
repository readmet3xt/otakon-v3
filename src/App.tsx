import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';

import type { ChatMessage } from './types'; // Corrected: type-only import
import { ConnectionStatus } from './types';
import { getGameNews, sendMessageWithImage, sendMessage, resetChat } from './services/geminiService';
import { connect, disconnect } from './services/websocketService';
import CameraIcon from './components/CameraIcon';
import TypingIndicator from './components/TypingIndicator';
import SendIcon from './components/SendIcon';
import UserAvatar from './components/UserAvatar';
import ConnectionModal from './components/ConnectionModal';
import DesktopIcon from './components/DesktopIcon';
import SplashScreen from './components/SplashScreen';
import InitialSplashScreen from './components/InitialSplashScreen';
import Logo from './components/Logo';

const COOLDOWN_KEY = 'geminiCooldownEnd';
const COOLDOWN_DURATION = 60 * 60 * 1000; // 1 hour

const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string, dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [meta, data] = dataUrl.split(',');
      const mimeType = meta.split(';')[0].split(':')[1];
      resolve({ base64: data, mimeType, dataUrl });
    };
    reader.onerror = (error) => reject(error);
  });
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
  const [input, setInput] = useState<string>('');
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<'initial' | 'features' | 'complete'>('initial');
  const [isCooldownActive, setIsCooldownActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages]);
  
  const handleQuotaError = useCallback((failedMessageId?: string) => {
    console.warn("Quota exceeded. Activating cooldown.");
    setIsCooldownActive(true);
    setTimeout(() => {
        setIsCooldownActive(false);
        localStorage.removeItem(COOLDOWN_KEY);
    }, COOLDOWN_DURATION);
    const errorText = "The AI is currently resting due to high traffic. Service will resume in about an hour.";
    if (failedMessageId) {
        setMessages(prev => prev.map(msg => msg.id === failedMessageId ? { ...msg, text: `Error: ${errorText}` } : msg));
    } else {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: errorText }]);
    }
    if(failedMessageId) {
        setLoadingMessages(prev => prev.filter(id => id !== failedMessageId));
    }
  }, []);

  useEffect(() => {
    if (onboardingStatus === 'complete' && messages.length === 0 && loadingMessages.length === 0) {
      const fetchInitialNews = async () => {
        const modelMessageId = crypto.randomUUID();
        setMessages([{ id: modelMessageId, role: 'model', text: '' }]);
        setLoadingMessages(prev => [...prev, modelMessageId]);
        await getGameNews(
          (fullText) => setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: fullText } : msg)),
          (error) => {
            if (error === 'QUOTA_EXCEEDED') handleQuotaError(modelMessageId);
            else setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: `Error fetching news: ${error}` } : msg));
          }
        );
        setLoadingMessages(prev => prev.filter(id => id !== modelMessageId));
      };
      if (!isCooldownActive) fetchInitialNews();
      else setMessages([{ id: crypto.randomUUID(), role: 'model', text: "The AI is resting. News and chat will be available in about an hour." }]);
    }
  }, [onboardingStatus, messages.length, loadingMessages.length, handleQuotaError, isCooldownActive]);

  useEffect(() => {
    return () => {
      disconnect();
      Object.values(abortControllersRef.current).forEach(controller => controller.abort());
    };
  }, []);
  
  const handleInitialSplashComplete = () => setOnboardingStatus('features');
  const handleFeaturesSplashComplete = () => setOnboardingStatus('complete');

  const handleStop = (messageId: string) => {
    abortControllersRef.current[messageId]?.abort();
  };

  const handleImageUpload = async (base64: string, mimeType: string, dataUrl: string) => {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: '', image: dataUrl };
    const modelMessageId = crypto.randomUUID();
    const placeholderMessage: ChatMessage = { id: modelMessageId, role: 'model', text: '' };
    setMessages(prev => [...prev, userMessage, placeholderMessage]);
    setLoadingMessages(prev => [...prev, modelMessageId]);
    const controller = new AbortController();
    abortControllersRef.current[modelMessageId] = controller;

    try {
      await sendMessageWithImage(
        base64, mimeType, controller.signal,
        (chunk) => {
          if (isCooldownActive) setIsCooldownActive(false);
          setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: msg.text + chunk } : msg));
        },
        (error) => {
          if (error === 'QUOTA_EXCEEDED') handleQuotaError(modelMessageId);
          else setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: error } : msg));
        }
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: errorMessage } : msg));
    } finally {
      setLoadingMessages(prev => prev.filter(id => id !== modelMessageId));
      delete abortControllersRef.current[modelMessageId];
    }
  };
  
  const handleConnect = (code: string) => {
    setConnectionStatus(ConnectionStatus.CONNECTING);
    setConnectionError(null);
    connect(
      code,
      () => setConnectionStatus(ConnectionStatus.CONNECTED),
      async (data) => {
        if (data.type === 'screenshot' && data.dataUrl) {
          try {
            const { dataUrl } = data;
            const [meta, base64] = dataUrl.split(',');
            if (!meta || !base64) throw new Error("Invalid Data URL format.");
            const mimeTypeMatch = meta.match(/:(.*?);/);
            if (!mimeTypeMatch?.[1]) throw new Error("Could not extract MIME type.");
            setIsConnectionModalOpen(false);
            await handleImageUpload(base64, mimeTypeMatch[1], dataUrl);
          } catch (e) {
            const error = e instanceof Error ? e.message : 'Unknown error processing screenshot.';
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: `Failed to process screenshot. ${error}` }]);
          }
        }
      },
      (error) => {
        setConnectionStatus(ConnectionStatus.ERROR);
        setConnectionError(error);
      },
      () => setConnectionStatus(ConnectionStatus.DISCONNECTED)
    );
  };

  const handleDisconnect = () => {
    disconnect();
    resetChat();
    setConnectionStatus(ConnectionStatus.DISCONNECTED);
    setConnectionError(null);
    setMessages([]);
    setLoadingMessages([]);
    setInput('');
    setOnboardingStatus('features');
    setIsConnectionModalOpen(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const { base64, mimeType, dataUrl } = await fileToBase64(file);
        await handleImageUpload(base64, mimeType, dataUrl);
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error.';
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: `Failed to process image. ${error}` }]);
      }
    }
    if(event.target) event.target.value = '';
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: input };
    const modelMessageId = crypto.randomUUID();
    const placeholderMessage: ChatMessage = { id: modelMessageId, role: 'model', text: '' };
    
    setMessages(prev => [...prev, userMessage, placeholderMessage]);
    setLoadingMessages(prev => [...prev, modelMessageId]);
    const messageToSend = input;
    setInput('');
    
    const controller = new AbortController();
    abortControllersRef.current[modelMessageId] = controller;

    try {
      await sendMessage(
        messageToSend,
        controller.signal,
        (chunk) => {
          if (isCooldownActive) setIsCooldownActive(false);
          setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: msg.text + chunk } : msg));
        },
        (error) => {
          if (error === 'QUOTA_EXCEEDED') {
            handleQuotaError(modelMessageId);
          } else {
            setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: error } : msg));
          }
        }
      );
    } finally {
      setLoadingMessages(prev => prev.filter(id => id !== modelMessageId));
      delete abortControllersRef.current[modelMessageId];
    }
  };
  
  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';
    const isModel = msg.role === 'model';

    if (isUser) {
      return (
        <div key={msg.id} className="flex items-start gap-3 justify-end animate-fade-in">
          <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-2xl rounded-tr-none p-4 max-w-xl">
            {msg.image && <img src={msg.image} alt="User upload" className="rounded-lg mb-2 max-w-xs" />}
            {msg.text && <p className="text-white whitespace-pre-wrap">{msg.text}</p>}
          </div>
          <UserAvatar className="w-10 h-10 flex-shrink-0 text-indigo-500" />
        </div>
      );
    }

    if (isModel) {
      const isLoading = loadingMessages.includes(msg.id);
      return (
        <div key={msg.id} className="flex items-start gap-3 animate-fade-in">
          <Logo className="w-10 h-10 flex-shrink-0" />
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl rounded-tl-none p-4 max-w-2xl min-w-[60px]">
            <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:text-slate-300 prose-headings:text-white prose-strong:text-white prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline prose-code:text-purple-300 prose-code:bg-slate-900/50 prose-code:p-1 prose-code:rounded-md prose-li:marker:text-indigo-400">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}
              >
                {msg.text}
              </ReactMarkdown>
            </div>
            {isLoading && (
              <div className="flex items-center gap-4 pt-3">
                <TypingIndicator />
                <button
                  onClick={() => handleStop(msg.id)}
                  className="text-xs font-semibold px-3 py-1 rounded-full border transition-colors bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-300 hover:text-white"
                  aria-label="Stop generating response"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (onboardingStatus === 'initial') return <InitialSplashScreen onComplete={handleInitialSplashComplete} />;
  
  // CORRECTED: This block now includes all the required props for SplashScreen
  if (onboardingStatus === 'features') {
    return (
        <SplashScreen
          onComplete={handleFeaturesSplashComplete}
          onConnect={handleConnect}
          status={connectionStatus}
          error={connectionError}
        />
    );
  }
  
  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col font-inter relative">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial-at-top from-slate-900/30 to-transparent -z-0 pointer-events-none"></div>
      <header className="relative flex items-center justify-center p-4 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-lg sticky top-0 z-10">
          <div className="flex items-center gap-3">
              <Logo className="h-8" />
              <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Otakon</h1>
          </div>
          <div className="absolute top-1/2 right-4 -translate-y-1/2">
              <button
                  type="button"
                  onClick={() => setIsConnectionModalOpen(true)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50
                  ${connectionStatus === ConnectionStatus.CONNECTED ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
                  ${connectionStatus === ConnectionStatus.CONNECTING ? 'animate-pulse' : ''}
                  `}
              >
                  <DesktopIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">
                  {
                      connectionStatus === ConnectionStatus.CONNECTED ? 'Connected' :
                      connectionStatus === ConnectionStatus.CONNECTING ? 'Connecting...' :
                      'Connect to PC'
                  }
                  </span>
              </button>
          </div>
      </header>
      <main className="flex-1 flex flex-col p-4 overflow-y-auto">
        <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto my-4">
          {messages.map(renderMessage)}
          <div ref={chatEndRef} />
        </div>
      </main>
      <footer className="p-4 border-t border-slate-800/60 bg-slate-950/70 backdrop-blur-lg sticky bottom-0 z-10">
        <form onSubmit={handleSendMessage} className="w-full max-w-4xl mx-auto flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload screenshot"
            className="p-3 flex-shrink-0 rounded-full text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition-all duration-200 hover:scale-110 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-transparent"
          >
            <CameraIcon className="w-6 h-6"/>
          </button>
          <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isCooldownActive ? "AI is resting..." : "Ask a follow-up question..."}
                className="w-full bg-slate-800 border border-slate-700 rounded-full py-3 pl-5 pr-14 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/80 focus:border-purple-500/80 transition-all duration-200"
                aria-label="Chat input"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 hover:scale-110 active:scale-100 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <SendIcon className="w-5 h-5"/>
              </button>
          </div>
        </form>
      </footer>
      {isConnectionModalOpen && (
        <ConnectionModal
          onClose={() => setIsConnectionModalOpen(false)}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          status={connectionStatus}
          error={connectionError}
        />
      )}
    </div>
  );
};

export default App;
