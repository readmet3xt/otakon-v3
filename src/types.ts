// Use a plain object with 'as const' for full compatibility
export const ConnectionStatus = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
} as const;

// Create a TypeScript type from the object's values
export type ConnectionStatus = typeof ConnectionStatus[keyof typeof ConnectionStatus];

// Your other types
export type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; 
  sources?: { uri: string; title: string; }[];
};

export type GeminiModel = 'gemini-2.5-flash';
