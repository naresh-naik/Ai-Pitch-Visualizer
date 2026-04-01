/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { 
  Sparkles, 
  Image as ImageIcon, 
  Send, 
  Loader2, 
  LayoutGrid, 
  ChevronRight, 
  RefreshCw,
  Palette,
  Download,
  Share2,
  Check,
  Lock
} from "lucide-react";
import { 
  segmentAndEnhance, 
  generateImageForScene, 
  Scene, 
  VISUAL_STYLES 
} from "./services/geminiService";

export default function App() {
  const [inputText, setInputText] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characterLock, setCharacterLock] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"input" | "generating" | "storyboard">("input");
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const storyboardRef = useRef<HTMLDivElement>(null);

  // Check for saved session on mount
  useEffect(() => {
    const saved = localStorage.getItem('pitch-visualizer-autosave');
    if (saved) {
      setShowRestorePrompt(true);
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (showRestorePrompt) return; // Don't overwrite while asking to restore
    
    if (inputText.trim() || scenes.length > 0) {
      const timer = setTimeout(() => {
        localStorage.setItem('pitch-visualizer-autosave', JSON.stringify({
          inputText,
          selectedStyle,
          scenes,
          characterLock,
          // If they refresh during generation, revert to input step
          currentStep: currentStep === 'generating' ? 'input' : currentStep
        }));
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      localStorage.removeItem('pitch-visualizer-autosave');
    }
  }, [inputText, selectedStyle, scenes, characterLock, currentStep, showRestorePrompt]);

  const restoreSession = () => {
    try {
      const saved = localStorage.getItem('pitch-visualizer-autosave');
      if (saved) {
        const parsed = JSON.parse(saved);
        setInputText(parsed.inputText || "");
        if (parsed.selectedStyle) setSelectedStyle(parsed.selectedStyle);
        setScenes(parsed.scenes || []);
        setCharacterLock(parsed.characterLock || "");
        setCurrentStep(parsed.currentStep || "input");
      }
    } catch (e) {
      console.error("Failed to restore session", e);
    }
    setShowRestorePrompt(false);
  };

  const discardSession = () => {
    localStorage.removeItem('pitch-visualizer-autosave');
    setShowRestorePrompt(false);
  };

  const handleDownload = async () => {
    if (!storyboardRef.current) return;
    setIsDownloading(true);
    try {
      // Small delay to ensure any animations are done
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const element = storyboardRef.current;
      const width = element.offsetWidth;
      const height = element.offsetHeight;

      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#0a0a0a',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });

      const pdf = new jsPDF({
        orientation: width > height ? "landscape" : "portrait",
        unit: "px",
        format: [width, height]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      pdf.save("pitch-storyboard.pdf");
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsShared(true);
    setTimeout(() => setIsShared(false), 2000);
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setCurrentStep("generating");
    setProgress(10);
    setScenes([]);

    try {
      // Step 1: Segment and Enhance
      const { scenes: segmentedScenes, characterLock: generatedLock } = await segmentAndEnhance(inputText, selectedStyle.keyword);
      
      if (!segmentedScenes || segmentedScenes.length === 0) {
        throw new Error("Failed to generate scenes. Please check your API key and try again.");
      }

      setCharacterLock(generatedLock);
      setScenes(segmentedScenes);
      setProgress(30);

      // Step 2: Generate Images one by one
      const updatedScenes = [...segmentedScenes];
      for (let i = 0; i < updatedScenes.length; i++) {
        // Proactive delay between image generation requests to respect API rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        const imageUrl = await generateImageForScene(updatedScenes[i].enhancedPrompt);
        updatedScenes[i] = { ...updatedScenes[i], imageUrl };
        setScenes([...updatedScenes]);
        setProgress(30 + ((i + 1) / updatedScenes.length) * 70);
      }

      setCurrentStep("storyboard");
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Something went wrong during generation. Please try again.");
      setCurrentStep("input");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setScenes([]);
    setCharacterLock("");
    setCurrentStep("input");
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30 print:bg-white print:text-black">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none print:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-orange-500 mb-2"
            >
              <Sparkles size={20} />
              <span className="text-xs font-mono uppercase tracking-[0.2em]">AI Storyboard Engine</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tighter"
            >
              Pitch <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Visualizer</span>
            </motion.h1>
          </div>
          
          {currentStep === "storyboard" && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
            >
              <RefreshCw size={16} />
              New Storyboard
            </motion.button>
          )}
        </header>

        <AnimatePresence>
          {showRestorePrompt && (
            <motion.div 
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3 text-orange-400">
                  <RefreshCw size={20} />
                  <p className="text-sm font-medium">We found an unsaved storyboard from your last visit.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={discardSession}
                    className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={restoreSession}
                    className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors font-medium shadow-lg shadow-orange-500/20"
                  >
                    Restore Session
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentStep === "input" && (
            <motion.div
              key="input-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col gap-8 max-w-4xl mx-auto"
            >
              {/* Input Area */}
              <div className="space-y-6">
                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste your narrative text here (e.g., a customer success story, a pitch deck script, or a short story)..."
                    className="w-full h-80 bg-white/5 border border-white/10 rounded-3xl p-8 text-xl leading-relaxed focus:outline-none focus:border-orange-500/50 transition-colors resize-none placeholder:text-white/20"
                  />
                  <div className="absolute bottom-6 right-8 text-white/20 text-sm font-mono">
                    {inputText.length} characters
                  </div>
                </div>
              </div>

              {/* Controls Area */}
              <div className="space-y-8">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3 text-white/60 mb-2">
                    <Palette size={18} />
                    <h2 className="text-sm font-semibold uppercase tracking-wider">Visual Style</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {VISUAL_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style)}
                        className={`text-left px-5 py-4 rounded-2xl transition-all border ${
                          selectedStyle.id === style.id 
                            ? "bg-orange-500/10 border-orange-500/50 text-orange-400" 
                            : "bg-white/5 border-transparent text-white/60 hover:bg-white/10"
                        }`}
                      >
                        <div className="font-medium">{style.name}</div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!inputText.trim() || isLoading}
                    className="w-full py-5 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 text-lg font-bold shadow-lg shadow-orange-500/20"
                  >
                    {isLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                    Generate Storyboard
                  </button>
                </div>

                <div className="p-6 border border-white/5 rounded-3xl bg-white/[0.02] text-white/40 text-sm leading-relaxed italic">
                  "The Pitch Visualizer uses Gemini AI to deconstruct your narrative into key scenes and generate visually consistent artwork for each moment."
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === "generating" && (
            <motion.div
              key="generating-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 space-y-12"
            >
              <div className="relative w-48 h-48">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-dashed border-orange-500/30 rounded-full"
                />
                <div className="absolute inset-4 border-4 border-orange-500 rounded-full animate-pulse flex items-center justify-center">
                  <ImageIcon size={48} className="text-orange-500" />
                </div>
              </div>

              <div className="text-center space-y-4 max-w-md">
                <h2 className="text-3xl font-bold tracking-tight">Visualizing your story...</h2>
                <p className="text-white/50">
                  Our AI is currently segmenting your narrative and painting each scene with precision.
                </p>
                
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-8">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-orange-500"
                  />
                </div>
                <div className="text-xs font-mono text-orange-500/60 uppercase tracking-widest">
                  {progress < 30 ? "Segmenting Narrative" : `Generating Panel ${Math.min(scenes.filter(s => s.imageUrl).length + 1, scenes.length)} of ${scenes.length}`}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === "storyboard" && (
            <motion.div
              key="storyboard-view"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16"
            >
              <div ref={storyboardRef} className="grid grid-cols-1 gap-12 p-4 print:p-0">
                {characterLock && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 p-6 bg-orange-900/10 border border-orange-500/20 rounded-2xl print:hidden"
                  >
                    <h3 className="text-orange-400 font-semibold mb-2 flex items-center gap-2 uppercase tracking-widest text-xs">
                      <Lock size={14} /> Character Lock Active
                    </h3>
                    <p className="text-sm text-gray-300 italic">
                      "{characterLock}"
                    </p>
                  </motion.div>
                )}
                
                {scenes.map((scene, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className={`flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 items-center print:flex-row print:break-inside-avoid print:mb-8`}
                  >
                    {/* Image Panel */}
                    <div className="w-full lg:w-3/5 group relative print:w-1/2">
                      <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 print:hidden" />
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl print:border-gray-300 print:shadow-none">
                        {scene.imageUrl ? (
                          <img 
                            src={scene.imageUrl} 
                            alt={`Scene ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 print:scale-100"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center print:hidden">
                            <Loader2 className="animate-spin text-white/20" size={48} />
                          </div>
                        )}
                        <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-mono font-bold tracking-widest print:bg-white print:text-black print:border-gray-300">
                          SCENE 0{index + 1}
                        </div>
                      </div>
                    </div>

                    {/* Text Panel */}
                    <div className="w-full lg:w-2/5 space-y-6 print:w-1/2">
                      <div className="space-y-2">
                        <div className="text-orange-500/60 text-xs font-mono uppercase tracking-widest print:text-gray-500">Narrative Moment</div>
                        <p className="text-2xl font-medium leading-relaxed text-white/90 print:text-black">
                          {scene.originalText}
                        </p>
                      </div>
                      
                      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2 print:bg-gray-50 print:border-gray-200">
                        <div className="text-white/30 text-[10px] font-mono uppercase tracking-widest print:text-gray-400">AI Visual Prompt</div>
                        <p className="text-sm text-white/50 italic leading-relaxed print:text-gray-600">
                          "{scene.enhancedPrompt}"
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer CTA */}
              <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 print:hidden">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
                    <LayoutGrid size={24} />
                  </div>
                  <div>
                    <div className="font-bold text-lg">Export Storyboard</div>
                    <div className="text-white/40 text-sm">Ready for your next big presentation.</div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-bold disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    {isDownloading ? "Generating..." : "Download PDF"}
                  </button>
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 transition-all font-bold shadow-lg shadow-orange-500/20"
                  >
                    {isShared ? <Check size={18} /> : <Share2 size={18} />}
                    {isShared ? "Copied!" : "Share Link"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
}
