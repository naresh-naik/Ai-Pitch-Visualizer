import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API routes FIRST
  app.post("/api/generate-scenes", async (req, res) => {
    try {
      const { text, styleKeyword, provider } = req.body;
      
      let characterLock = "";
      let scenes = [];

      const prompt = `Analyze the following narrative text and break it into 3-5 key logical scenes. 

First, identify the main character(s) and create a "characterLock": a highly detailed, consistent physical description (age, hair, clothing, ethnicity, etc.) that will be used to keep the character's appearance identical across all images.

Then, for each scene, provide:
1. The original text segment.
2. A highly descriptive, visual prompt for an image generation model that captures the action, setting, lighting, and mood of that scene in the style of: ${styleKeyword}. 
(Note: The characterLock will be automatically prepended to your scene prompt, so focus the scene prompt on the action, environment, and camera angles).

Narrative Text:
${text}`;

      if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
        const openai = new OpenAI({ apiKey });
        
        const openaiPrompt = prompt + `\n\nReturn ONLY a JSON object with this exact structure: { "characterLock": "string", "scenes": [{ "originalText": "string", "enhancedPrompt": "string" }] }`;
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: openaiPrompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });
        
        const data = JSON.parse(response.choices[0].message.content || "{}");
        characterLock = data.characterLock || "";
        scenes = data.scenes || [];
        
      } else {
        // Default to Gemini
        let apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
        apiKey = apiKey.replace(/^["']|["']$/g, "").trim();
        
        if (!apiKey) {
          throw new Error("Gemini API key is missing. Please set VITE_GEMINI_API_KEY.");
        }
        
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                characterLock: { type: Type.STRING },
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      originalText: { type: Type.STRING },
                      enhancedPrompt: { type: Type.STRING },
                    },
                    required: ["originalText", "enhancedPrompt"],
                  },
                },
              },
              required: ["characterLock", "scenes"],
            },
          },
        });
        
        let rawText = response.text || "{}";
        rawText = rawText.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
        const data = JSON.parse(rawText);
        characterLock = data.characterLock || "";
        scenes = data.scenes || [];
      }

      res.json({
        characterLock,
        scenes: scenes.map((scene: any) => ({
          originalText: scene.originalText,
          enhancedPrompt: `${characterLock}. ${scene.enhancedPrompt}`,
        }))
      });
    } catch (error: any) {
      console.error("Error generating scenes:", error);
      res.status(500).json({ error: error.message || "Failed to generate scenes" });
    }
  });

  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, provider, referenceImage } = req.body;

      if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
        const openai = new OpenAI({ apiKey });
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
        });
        res.json({ imageUrl: `data:image/png;base64,${response.data[0].b64_json}` });
        
      } else if (provider === "stability") {
        const apiKey = process.env.STABILITY_API_KEY || process.env.VITE_STABILITY_API_KEY;
        if (!apiKey) throw new Error("Stability API key not configured");
        
        const response = await axios.post(
          "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
          {
            text_prompts: [{ text: prompt }],
            cfg_scale: 7,
            height: 1024,
            width: 1024,
            samples: 1,
            steps: 30,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );
        
        const base64Image = response.data.artifacts[0].base64;
        res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
        
      } else if (provider === "huggingface") {
        const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.VITE_HUGGINGFACE_API_KEY;
        if (!apiKey) throw new Error("Hugging Face API key not configured");
        
        // Using a popular SDXL model on HF Inference API
        const response = await axios.post(
          "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
          { inputs: prompt },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            responseType: "arraybuffer",
          }
        );
        
        const base64Image = Buffer.from(response.data, 'binary').toString('base64');
        res.json({ imageUrl: `data:image/jpeg;base64,${base64Image}` });
        
      } else {
        // Default to Gemini
        let apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
        apiKey = apiKey.replace(/^["']|["']$/g, "").trim();
        
        if (!apiKey) {
          throw new Error("Gemini API key is missing. Please set VITE_GEMINI_API_KEY.");
        }
        
        const ai = new GoogleGenAI({ apiKey });
        
        const parts: any[] = [];
        if (referenceImage) {
          // Remove the data URI prefix if present
          const base64Data = referenceImage.replace(/^data:image\/\w+;base64,/, "");
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg"
            }
          });
          parts.push({ text: `[CHARACTER REFERENCE PROVIDED]. Generate the following scene maintaining the exact character design from the reference image: ${prompt}` });
        } else {
          parts.push({ text: prompt });
        }

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-image-preview",
          contents: { parts },
          config: { imageConfig: { aspectRatio: "16:9" } },
        });
        
        let imageUrl;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
        if (!imageUrl) throw new Error("No image generated");
        res.json({ imageUrl });
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: error.message || "Failed to generate image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
