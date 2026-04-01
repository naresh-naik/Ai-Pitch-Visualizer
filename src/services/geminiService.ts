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

export async function segmentAndEnhance(text: string, styleKeyword: string, provider: string = "gemini"): Promise<{ scenes: Scene[]; characterLock: string }> {
  const generate = async () => {
    const response = await fetch("/api/generate-scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, styleKeyword, provider })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate scenes");
    }
    
    return await response.json();
  };

  try {
    const data = await fetchWithRetry(generate);
    return data;
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
      // Add a 30-second timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out after 30 seconds")), 30000);
      });
      return await Promise.race([fn(), timeoutPromise]);
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

export async function generateImageForScene(prompt: string, provider: string = "gemini", referenceImage?: string): Promise<string | undefined> {
  const generate = async () => {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, provider, referenceImage })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate image");
    }
    
    const data = await response.json();
    return data.imageUrl;
  };

  try {
    return await fetchWithRetry(generate);
  } catch (error: any) {
    console.error("Failed to generate image:", error);
    throw new Error(`Image Generation Failed: ${error.message}`);
  }
}
