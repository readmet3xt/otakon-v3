import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './index.css';

import type { ChatMessage } from './types';
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
  const chatEnd
