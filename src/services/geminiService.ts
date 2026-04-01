import { GoogleGenAI, Type } from "@google/genai";

export interface Scene {
  originalText: string;
  enhancedPrompt: string;
  imageUrl?: string;
}

export const VISUAL_STYLES = [
  { id: "digital-art", name: "Digital Art", keyword: "digital art style, vibrant, clean lines, high quality digital illustration" },
  { id: "photorealistic", name: "Photorealistic", keyword: "photorealistic, cinematic lighting, 8k resolution, highly detailed, professional photography" },
  { id: "sketch", name: "Hand-drawn Sketch", keyword: "charcoal sketch, artistic, hand-drawn, paper texture, graphite pencil style" },
  { id: "watercolor", name: "Watercolor", keyword: "watercolor painting, soft edges, artistic, fluid, traditional media look" },
  { id: "cyberpunk", name: "Cyberpunk", keyword: "cyberpunk aesthetic, neon lights, futuristic, dark atmosphere, synthwave colors" },
  { id: "studio-ghibli", name: "Studio Ghibli", keyword: "Studio Ghibli style, whimsical, lush landscapes, anime aesthetic, Joe Hisaishi vibe" },
];

function getAI() {
  // Safely check for both Vite's import.meta.env and Node's process.env
  let apiKey = "";
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  } else if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
    apiKey = process.env.GEMINI_API_KEY;
  }
  
  return new GoogleGenAI({ apiKey });
}

export async function segmentAndEnhance(text: string, styleKeyword: string): Promise<{ scenes: Scene[]; characterLock: string }> {
  const ai = getAI();
  
  const generate = async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following narrative text and break it into 3-5 key logical scenes. 

First, identify the main character(s) and create a "characterLock": a highly detailed, consistent physical description (age, hair, clothing, ethnicity, etc.) that will be used to keep the character's appearance identical across all images.

Then, for each scene, provide:
1. The original text segment.
2. A highly descriptive, visual prompt for an image generation model that captures the action, setting, lighting, and mood of that scene in the style of: ${styleKeyword}. 
(Note: The characterLock will be automatically prepended to your scene prompt, so focus the scene prompt on the action, environment, and camera angles).

Narrative Text:
${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characterLock: { 
              type: Type.STRING, 
              description: "A detailed, consistent physical description of the main character(s) to be used across all panels." 
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalText: { type: Type.STRING },
                  enhancedPrompt: { 
                    type: Type.STRING, 
                    description: "The visual prompt for this specific scene. Do not include the character description here, it will be prepended automatically." 
                  },
                },
                required: ["originalText", "enhancedPrompt"],
              },
            },
          },
          required: ["characterLock", "scenes"],
        },
      },
    });
    return response;
  };

  try {
    const response = await fetchWithRetry(generate);
    const data = JSON.parse(response.text || "{}");
    const characterLock = data.characterLock || "";
    const scenes = data.scenes || [];
    
    return {
      characterLock,
      scenes: scenes.map((scene: any) => ({
        originalText: scene.originalText,
        // Prepend the character lock to ensure visual consistency across all generated images
        enhancedPrompt: `${characterLock}. ${scene.enhancedPrompt}`,
      }))
    };
  } catch (e: any) {
    console.error("Failed to parse scenes", e);
    throw new Error(e.message || "Failed to communicate with the AI model. Please check your API key.");
  }
}

// Helper function for exponential backoff to handle 429 Rate Limit errors
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 3000): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isRateLimit = error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota");
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1); // 3s, 6s, 12s
        console.warn(`Rate limit hit. Retrying attempt ${attempt} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached");
}

export async function generateImageForScene(prompt: string): Promise<string | undefined> {
  const ai = getAI();
  
  const generate = async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });
  };

  try {
    const response = await fetchWithRetry(generate);
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Failed to generate image:", error);
  }
  return undefined;
}
