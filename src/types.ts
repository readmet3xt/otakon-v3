export const ConnectionStatus = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
} as const;

export type ConnectionStatus = typeof ConnectionStatus[keyof typeof ConnectionStatus];

export type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; 
  sources?: { uri: string; title: string; }[];
};

export type GeminiModel = 'gemini-2.5-flash';
