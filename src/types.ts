// Use a plain object with 'as const'
export const ConnectionStatus = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
} as const;

// Create a TypeScript type from the object's values
export type ConnectionStatus = typeof ConnectionStatus[keyof typeof ConnectionStatus];

// Your other types remain the same
export type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; 
  sources?: { uri: string; title: string; }[];
};

export type GeminiModel = 'gemini-2.5-flash';
