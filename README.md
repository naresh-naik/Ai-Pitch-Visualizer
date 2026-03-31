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
   git clone https://github.com/naresh-naik/Ai-Pitch-Visualizer.git
   cd Ai-Pitch-Visualizer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Copy `.env.example` to `.env` and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and set your key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
   Get a free API key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

   > **Note for Google AI Studio users:** The platform automatically injects `GEMINI_API_KEY` at runtime—no `.env` file is needed. For all other environments (local dev, CI, etc.), use `VITE_GEMINI_API_KEY` which is the standard Vite convention for exposing env vars to browser code.

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

## 🤖 AI Model Configuration

The app uses two Gemini models, each configurable via environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_TEXT_MODEL` | `gemini-3-flash-preview` | Narrative segmentation & prompt engineering |
| `VITE_IMAGE_MODEL` | `gemini-2.5-flash-image` | Image generation per scene |

To swap a model, add the variable to your `.env` file:
```env
VITE_GEMINI_API_KEY=your_api_key_here
VITE_TEXT_MODEL=gemini-2.0-flash
VITE_IMAGE_MODEL=gemini-2.5-flash-image
```

> **Current models:** `gemini-3-flash-preview` handles all text tasks (segmentation, character lock extraction, prompt enrichment). `gemini-2.5-flash-image` generates the storyboard images with a 16:9 aspect ratio.

## 🧠 Methodology: Prompt Engineering Design Choices

The core challenge of AI storyboarding is **visual consistency**. If you simply prompt an image model with "A man in an office," the man will look completely different in the next panel. 

To solve this, I designed a **Two-Stage Prompt Architecture**:

1.  **Stage 1: The Character Lock:** The text LLM (`gemini-3-flash`) analyzes the *entire* narrative first. It identifies the subject and generates a `characterLock`—a rigid, highly detailed physical description (e.g., "A 35-year-old woman with short curly brown hair, wearing a blue blazer and glasses").
2.  **Stage 2: Scene Isolation:** The LLM then breaks the text into scenes, generating prompts that focus *strictly* on the environment, action, and camera angle, ignoring the character's physical description.
3.  **The Merge:** Before calling the image generation API, the application programmatically concatenates the `characterLock` + `styleKeyword` + `scenePrompt`. 

This ensures the image model receives the exact same physical constraints for every single panel, resulting in a cohesive, professional storyboard suitable for enterprise sales teams.
