
export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // data URL for displaying image in chat
  sources?: { uri: string; title: string; }[];
};

export type GeminiModel = 'gemini-2.5-flash';
