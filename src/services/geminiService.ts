import { GoogleGenerativeAI, ChatSession, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Gemini API Key not found. Please set the VITE_GEMINI_API_KEY environment variable in your Vercel settings.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

let chat: ChatSession | null = null;

const COOLDOWN_KEY = 'geminiCooldownEnd';
const NEWS_CACHE_KEY = 'otakonNewsCache';
const COOLDOWN_DURATION = 60 * 60 * 1000; // 1 hour

const getSystemInstruction = (): string => {
  return `You are Otakon, a universal, world-class, spoiler-free gaming assistant AI...`; // Your detailed prompt
};

const getChatSession = (): ChatSession => {
    if (!chat) {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: getSystemInstruction(),
            safetySettings,
        });
        chat = model.startChat();
    }
    return chat;
};

export const resetChat = () => {
  chat = null;
  localStorage.removeItem(COOLDOWN_KEY);
  localStorage.removeItem(NEWS_CACHE_KEY);
};

const handleSuccess = () => {
  localStorage.removeItem(COOLDOWN_KEY);
};

const handleError = (error: any, onError: (error: string) => void) => {
    console.error("Error in Gemini Service:", error);
    if (error.toString().includes("API key not valid")) {
        onError("Error: The provided API Key is not valid. Please check your configuration.");
        return;
    }
    if (error.toString().includes("RESOURCE_EXHAUSTED") || error.toString().includes("429")) {
        const cooldownEnd = Date.now() + COOLDOWN_DURATION;
        localStorage.setItem(COOLDOWN_KEY, cooldownEnd.toString());
        onError("QUOTA_EXCEEDED");
        return;
    }
    onError(error.message || "An unknown error occurred while contacting the AI.");
};

const checkCooldown = (onError: (error: string) => void): boolean => {
    const cooldownEnd = localStorage.getItem(COOLDOWN_KEY);
    if (cooldownEnd && Date.now() < parseInt(cooldownEnd, 10)) {
        const timeRemaining = Math.ceil((parseInt(cooldownEnd, 10) - Date.now()) / (1000 * 60));
        onError(`The AI is currently resting due to high traffic. Please try again in about ${timeRemaining} minute(s).`);
        return true;
    }
    return false;
};

export const getGameNews = async (
  onUpdate: (fullText: string) => void,
  onError: (error: string) => void
) => {
    if (checkCooldown(onError)) return;
    const today = new Date().toLocaleDateString('en-CA');
    const cachedNewsData = localStorage.getItem(NEWS_CACHE_KEY);
    if (cachedNewsData) {
      try {
        const { date, news } = JSON.parse(cachedNewsData);
        if (date === today && news) {
          onUpdate(news);
          return;
        }
      } catch (e) { console.error("Failed to parse cached news.", e); }
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        const prompt = `... Your detailed news prompt remains here ...`;
        const result = await model.generateContent(prompt);
        const newNews = result.response.text();
        const newCacheData = { date: today, news: newNews };
        localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(newCacheData));
        onUpdate(newNews);
        handleSuccess();
    } catch(e) {
        handleError(e, onError);
    }
};

export const sendMessageWithImage = async (
  base64ImageData: string,
  mimeType: string,
  signal: AbortSignal,
  onChunk: (chunk: string) => void,
  onError: (error: string) => void
) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        const imagePart = { inlineData: { data: base64ImageData, mimeType } };
        const textPart = { text: "A player needs help..." };
        const result = await model.generateContentStream([textPart, imagePart]);
        handleSuccess();
        for await (const chunk of result.stream) {
            if (signal.aborted) break;
            onChunk(chunk.text());
        }
    } catch(e) {
        handleError(e, onError);
    }
};

export const sendMessage = async (
  message: string,
  signal: AbortSignal,
  onChunk: (chunk: string) => void,
  onError: (error: string) => void
) => {
    try {
        const chatSession = getChatSession();
        const result = await chatSession.sendMessageStream(message);
        handleSuccess();
        for await (const chunk of result.stream) {
            if (signal.aborted) break;
            onChunk(chunk.text());
        }
    } catch(e) {
        handleError(e, onError);
    }
};
