# 🎨 The Pitch Visualizer

The Pitch Visualizer is an AI-powered storyboard engine designed to transform narrative text—like customer success stories or sales pitches—into compelling, multi-panel visual sequences. Built as a submission for the Darwix AI engineering challenge.

## ✨ Features & "Wow" Factors Implemented

*   **Intelligent Narrative Segmentation:** Uses an LLM to algorithmically deconstruct input text into logical scenes.
*   **LLM-Powered Prompt Refinement:** Original sentences are never used verbatim. A secondary LLM rewrites them into highly descriptive, visually rich prompts optimized for image generation.
*   **Visual Consistency (Character Lock):** Implements an advanced prompt engineering technique to extract a "Character Lock" (a detailed physical description of the subject) from the overall narrative, prepending it to every scene to ensure the main character looks identical across all panels.
*   **User-Selectable Styles:** Users can choose from 6 distinct artistic styles (e.g., Photorealistic, Studio Ghibli, Cyberpunk) before generation.
*   **Dynamic, Animated UI:** Built with React and Framer Motion, featuring a smooth, panel-by-panel reveal, real-time progress tracking, and a highly polished dark-mode aesthetic.
*   **Export Ready:** Includes native PDF exporting to instantly download the generated storyboard for presentations.

## 🛠️ Technical Stack

*   **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
*   **Animations:** Motion (Framer Motion)
*   **AI / LLMs:** `@google/genai` SDK
    *   *Text/Prompt Engine:* `gemini-3-flash-preview`
    *   *Image Generation:* `gemini-2.5-flash-image`
*   **Export:** `html-to-image`, `jspdf`

## 🚀 Setup & Execution Instructions

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd pitch-visualizer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY="your_api_key_here"
   ```
   *(Note: In the provided AI Studio environment, this was handled via `process.env.GEMINI_API_KEY`, but for standard Vite local development, use the `VITE_` prefix and update the initialization in `geminiService.ts` to use `import.meta.env.VITE_GEMINI_API_KEY`).*

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

## 🧠 Methodology: Prompt Engineering Design Choices

The core challenge of AI storyboarding is **visual consistency**. If you simply prompt an image model with "A man in an office," the man will look completely different in the next panel. 

To solve this, I designed a **Two-Stage Prompt Architecture**:

1.  **Stage 1: The Character Lock:** The text LLM (`gemini-3-flash`) analyzes the *entire* narrative first. It identifies the subject and generates a `characterLock`—a rigid, highly detailed physical description (e.g., "A 35-year-old woman with short curly brown hair, wearing a blue blazer and glasses").
2.  **Stage 2: Scene Isolation:** The LLM then breaks the text into scenes, generating prompts that focus *strictly* on the environment, action, and camera angle, ignoring the character's physical description.
3.  **The Merge:** Before calling the image generation API, the application programmatically concatenates the `characterLock` + `styleKeyword` + `scenePrompt`. 

This ensures the image model receives the exact same physical constraints for every single panel, resulting in a cohesive, professional storyboard suitable for enterprise sales teams.
