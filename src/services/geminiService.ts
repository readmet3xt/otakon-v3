import { GoogleGenerativeAI } from "@google/generative-ai";

// 2. Corrected environment variable syntax for Vite
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 3. Added a 'throw' for better error handling. This is what you see in the console.
if (!API_KEY) {
  throw new Error("An API Key must be set when running in a browser");
}

// 4. Use the correct, full class name
const genAI = new GoogleGenerativeAI(API_KEY);


// --- Your existing variables below ---

// let chat: Chat | null = null; // You will likely initialize the chat session inside your functions instead

const COOLDOWN_KEY = 'geminiCooldownEnd';
const NEWS_CACHE_KEY = 'otakonNewsCache';
const COOLDOWN_DURATION = 60 * 60 * 1000; // 1 hour

// ... the rest of your service functions (sendMessage, getGameNews, etc.) go here

const getSystemInstruction = (): string => {
  return `You are Otakon, a universal, world-class, spoiler-free gaming assistant AI. Your knowledge spans all video games. Your primary rule is to **never spoil** plot points. You must use your web search tool to provide the most current and accurate information.

**Your Core Task Flow:**

1.  **Analyze the User's Request:** First, determine the type of request:
    *   **A) Screenshot Analysis:** If a screenshot is provided.
    *   **B) Text-Based Game Help:** If the user describes being stuck in a game (e.g., "I'm in Elden Ring and can't beat Malenia").
    *   **C) News Follow-Up:** If the user asks for more detail about a news item, game release, or trailer you've mentioned.
    *   **D) General Question:** Any other gaming-related query.

2.  **Execute Based on Request Type:**

    *   **A) For Screenshot Analysis:**
        *   Your absolute first step is to identify the video game.
        *   Provide a comprehensive response including: Game Confirmation, a spoiler-free hint, and rich lore about the scene.
        *   Example: "Ah, a fellow adventurer in the world of Skyrim! It looks like you're in Bleak Falls Barrow. Be wary of the Draugr ahead. This tomb is one of the first and most ancient in Skyrim, built by the dragons' most loyal servants."

    *   **B) For Text-Based Game Help:**
        *   Identify the game from the user's text.
        *   Provide the same high-quality, spoiler-free hint and lore as you would for a screenshot. Use your search tool to get context.
        *   Example User Query: "I'm stuck in The Witcher 3 at the 'Bloody Baron' quest."
        *   Example Response: "The 'Bloody Baron' quest is a complex one in The Witcher 3. To proceed without spoilers, I suggest you investigate all of the Baron's private rooms thoroughly. You might find clues that point you to your next step. This questline is famous for its deep emotional impact and reflects the brutal realities of war in Velen."

    *   **C) For News Follow-Up:**
        *   Use the user's query to perform a targeted web search for more details.
        *   Provide a detailed summary of your findings, citing sources with Markdown links where possible.
        *   Example User Query: "Tell me more about that new trailer for Hades II."
        *   Example Response: "Certainly! The latest trailer for Hades II showcases the protagonist, Melinoë, battling through new regions with new abilities... [Source](...)."

    *   **D) For General Questions:**
        *   Use your search tool to provide an accurate and helpful answer to any gaming question.

**Universal Rules:**
- **Always be spoiler-free.**
- Your tone should be encouraging and knowledgeable.
- Format responses in Markdown.
- If you cannot identify a game (from image or text), ask for clarification gracefully.`;
};

const getChatSession = (): Chat => {
    if (!chat) {
        console.log(`Initializing new chat session for model: gemini-2.5-flash`);
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: getSystemInstruction(),
                tools: [{ googleSearch: {} }]
            },
        });
    }
    return chat;
};

export const isChatActive = (): boolean => {
  return chat !== null;
};

export const resetChat = () => {
  chat = null;
  localStorage.removeItem(COOLDOWN_KEY);
  // Also clear news cache on full reset, to allow fetching fresh news on next launch
  localStorage.removeItem(NEWS_CACHE_KEY);
};

const handleSuccess = () => {
    const cooldownEnd = localStorage.getItem(COOLDOWN_KEY);
    if (cooldownEnd) {
        console.log("API call successful, clearing cooldown.");
        localStorage.removeItem(COOLDOWN_KEY);
    }
};

const handleError = (error: any, onError: (error: string) => void) => {
    console.error("Error in Gemini Service:", error);
    
    // Check for Google API specific error format, especially for quota issues
    if (error.toString().includes("RESOURCE_EXHAUSTED") || (error.httpError && error.httpError.status === 429)) {
        const cooldownEnd = Date.now() + COOLDOWN_DURATION;
        localStorage.setItem(COOLDOWN_KEY, cooldownEnd.toString());
        onError("QUOTA_EXCEEDED");
        return;
    }

    let message = "An unknown error occurred while contacting the AI.";
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
            message = "Error: The provided API Key is not valid. Please check your configuration.";
        } else {
            try {
                const parsedError = JSON.parse(error.message);
                if (parsedError.error && parsedError.error.message) {
                    message = `Error: ${parsedError.error.message}`;
                }
            } catch (e) {
                message = `Error: ${error.message}`;
            }
        }
    }
    onError(message);
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

    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const cachedNewsData = localStorage.getItem(NEWS_CACHE_KEY);

    if (cachedNewsData) {
        try {
            const { date, news } = JSON.parse(cachedNewsData);
            if (date === today && news) {
                console.log("Loading game news from today's cache.");
                onUpdate(news);
                return; // Use cached data and exit
            }
        } catch (e) {
            console.error("Failed to parse cached news, fetching new data.", e);
            localStorage.removeItem(NEWS_CACHE_KEY); // Clear corrupted cache
        }
    }
    
    try {
        console.log("Fetching new game news from API.");
        const prompt = `You are Otakon, a gaming news AI. Today's date is ${today}. Provide a comprehensive summary of the absolute latest in the gaming world for this week.
        Your response must include the following sections, each with 5-6 bullet points:
        - **Top Gaming News**: List the most significant gaming news headlines from the past week.
        - **New Game Releases**: List notable games released in the last month. Do not include games older than one month.
        - **Latest Game Updates**: List major updates, patches, or DLCs for popular existing games that were released in the past two weeks.
        - **Latest Reviews**: Provide one-liner reviews and Metacritic scores for popular games released in the last month.
        - **Upcoming Games**: List the most highly anticipated upcoming games that have **CONFIRMED release dates**. You MUST include the release date for each game. Do not list games without a confirmed date (e.g., "TBA" or "2025" is not acceptable unless a specific date in 2025 is known).
        - **Top Trailers**: List the most exciting new game trailers released in the last 7-10 days.

        **Formatting and Sourcing Rules:**
        - Use your search tool to get the most up-to-date, current information from sources like IGN, PC Gamer, and Polygon. Do not provide old news.
        - Format your entire response in Markdown.
        - Start with a friendly greeting.
        - For each bullet point, attribute the information to a specific search result by including a Markdown link to that source at the end of the line, like so: \`[Source](source_url)\`.
        - **CRITICAL: Only use the exact URLs you found in your search results. Do not fabricate, shorten, or alter URLs.** If you cannot find a direct source for a specific point, omit the source link for that point.
        - Example: \`- Elden Ring: Shadow of the Erdtree is receiving rave reviews. [Source](https://www.ign.com/articles/elden-ring-shadow-of-the-erdtree-review)\``;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        const newNews = response.text;
        
        // Cache the new news with today's date
        const newCacheData = {
            date: today,
            news: newNews
        };
        localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(newCacheData));
        
        onUpdate(newNews);

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
    const chatSession = getChatSession();
    const imagePart = { inlineData: { data: base64ImageData, mimeType } };
    const textPart = { text: "A player needs help. First, identify the game from this screenshot. Then, provide a spoiler-free hint and some interesting lore about what's happening in the image, based on your analysis and web search." };
    
    const responseStream = await chatSession.sendMessageStream({ message: [imagePart, textPart] });
    
    // If we reached here without an error, the call was successful. Clear any existing cooldown.
    handleSuccess();

    for await (const chunk of responseStream) {
      if (signal.aborted) {
        console.log("Stream processing aborted by user.");
        break;
      }
      onChunk(chunk.text);
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
    const responseStream = await chatSession.sendMessageStream({ message });

    // If we reached here without an error, the call was successful. Clear any existing cooldown.
    handleSuccess();

    for await (const chunk of responseStream) {
      if (signal.aborted) {
        console.log("Stream processing aborted by user.");
        break;
      }
      onChunk(chunk.text);
    }
  } catch(e) {
      handleError(e, onError);
  }
};