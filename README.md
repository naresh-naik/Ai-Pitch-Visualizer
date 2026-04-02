# 🎨 AI Pitch Visualizer

## 📖 Project Description & Capabilities
The **AI Pitch Visualizer** is an intelligent storyboarding engine designed to transform narrative text (such as customer success stories, sales pitches, or short stories) into compelling, multi-panel visual sequences. Built as a submission for the Darwix AI engineering challenge, it bridges the gap between textual ideas and visual presentations.

### Core Capabilities:
*   **Intelligent Narrative Segmentation:** Algorithmically deconstructs long-form text into logical, distinct scenes.
*   **Visual Consistency (Character Lock):** Extracts a detailed physical description of the main subject to ensure they look identical across all generated panels.
*   **Multi-Style Generation:** Supports 6 distinct artistic styles (Digital Art, Photorealistic, Hand-drawn Sketch, Watercolor, Cyberpunk, Studio Ghibli).
*   **Resilient Auto-Save:** Automatically saves progress to local storage, allowing users to recover unsaved storyboards if they accidentally close the tab.
*   **Export Ready:** Native PDF exporting to instantly download the generated storyboard for presentations.

---

## ⚙️ Step-by-Step Setup & Execution

Follow these instructions from start to finish to get the application running on your local machine.

### Phase 1: Prerequisites
Before you begin, ensure you have the following installed on your system:
1. **Node.js** (v20.0.0 or higher is **required**). You can download it from [nodejs.org](https://nodejs.org/).
2. **Git** installed on your machine.

### Phase 2: Installation
1. **Clone the repository:**
   Open your terminal and run:
   ```bash
   git clone <YOUR_GITHUB_REPO_URL>
   ```
2. **Navigate into the project directory:**
   ```bash
   cd Ai-Pitch-Visualizer
   ```
3. **Install dependencies:**
   Run the following command to install all required packages:
   ```bash
   npm install
   ```

### Phase 3: API Key Management (Environment Setup)
This application requires an API key to communicate with the AI models. 

1. **Create your environment file:**
   In the root directory of the project, copy the provided template file to create your own hidden `.env` file:
   ```bash
   cp .env.example .env
   ```
2. **Configure your keys:**
   You can open the newly created `.env` file in your code editor, OR you can do it entirely from your terminal.
   
   **Option A: Using a Code Editor**
   * Open the `.env` file.
   * Paste your API key inside the quotes for `VITE_GEMINI_API_KEY`.
   * Leave the other placeholders exactly as they are.

 **Option B: Terminal Only (Mac/Linux)**
   Run one of the following commands, replacing `YOUR_ACTUAL_API_KEY` with your real key:

   **Gemini**
   ```bash
   sed -i '' 's/"your_gemini_api_key_here"/"YOUR_ACTUAL_API_KEY"/' .env
   ```
   **OpenAI**
   ```bash
   sed -i '' 's/"your_openai_api_key_here"/"YOUR_ACTUAL_API_KEY"/' .env
   ```

   **Stability AI**
   ```bash
   sed -i '' 's/"your_stability_api_key_here"/"YOUR_ACTUAL_API_KEY"/' .env
   ```

   **Hugging Face**
   ```bash
   sed -i '' 's/"your_huggingface_api_key_here"/"YOUR_ACTUAL_API_KEY"/' .env
   
   *⚠️ Security Note: Never commit your actual `.env` file to GitHub. The `.gitignore` file is already configured to prevent this.*

### Phase 4: Execution
1. **Start the development server:**
   ```bash
   npm run dev
   ```
2. **Open the application:**
   Open your web browser and navigate to `http://localhost:5173` (or the port provided in your terminal).
3. **Usage:**
   * Paste a story into the text area.
   * Select a visual style from the right-hand menu.
   * Click "Generate Storyboard" and watch the AI segment and illustrate your pitch!

---

## 🧠 Design Choices & Prompt Engineering Methodology

### 1. The "Two-Stage Prompt Architecture" (Prompt Engineering)
The core challenge of AI storyboarding is **visual consistency**. If you prompt an image model with "A man in an office" for panel 1, and "A man presenting" for panel 2, the AI will generate two completely different-looking men. 

To solve this, I designed a Two-Stage Prompt Architecture:
*   **Stage 1 (The Character Lock):** The text LLM (`gemini-3-flash`) analyzes the *entire* narrative first. It identifies the main subject and generates a `characterLock`—a rigid, highly detailed physical description (e.g., *"A 35-year-old woman with short curly brown hair, wearing a blue blazer and glasses"*).
*   **Stage 2 (Scene Isolation):** The LLM then breaks the text into scenes, generating prompts that focus *strictly* on the environment, action, and camera angle, ignoring the character's physical description.
*   **The Merge:** Before calling the image generation API, the application programmatically concatenates: `[Character Lock] + [Style Keyword] + [Scene Prompt]`. 

This ensures the image model receives the exact same physical constraints for every single panel, resulting in a cohesive, professional storyboard.

### 2. UI/UX Design Choices
*   **Vertical Stack Layout:** Designed to give the text input maximum breathing room while keeping controls easily accessible on all screen sizes.
*   **Continuous Auto-Save:** Implemented a debounced `localStorage` caching system. AI generation takes time and effort; ensuring the user never loses their prompt or generated images due to an accidental refresh is a critical UX choice.
*   **Dark Mode Aesthetic:** Chosen to make the generated, vibrant storyboard images "pop" off the screen, mimicking a professional presentation environment.
