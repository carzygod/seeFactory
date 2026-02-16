import React, { useState } from 'react';
import { VideoType, VideoStyle, VideoLength, Project } from '../types';
import { Button } from './Button';
import { generateMovieScript, generateSceneImage } from '../services/geminiService';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

interface NewProjectProps {
  apiKey: string;
  onProjectCreated: (project: Project) => void;
}

const VIDEO_TYPES: VideoType[] = ['Action', 'Racing', 'Artistic', 'Other'];
const VIDEO_STYLES: VideoStyle[] = ['Cyberpunk', 'Sketch', 'Comic', 'Shaw Brothers', 'Chaplin Silent', 'Old American Comic', 'Realistic', 'Custom'];
const VIDEO_LENGTHS: VideoLength[] = ['1min', '2min', '3min', '5min', '10min', '20min', '30min', 'Custom'];

// Simple UUID fallback for non-secure contexts
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const NewProject: React.FC<NewProjectProps> = ({ apiKey, onProjectCreated }) => {
  const [step, setStep] = useState<'input' | 'processing'>('input');
  
  // Form State
  const [type, setType] = useState<VideoType>('Action');
  const [style, setStyle] = useState<VideoStyle>('Cyberpunk');
  const [customStyle, setCustomStyle] = useState('');
  const [length, setLength] = useState<VideoLength>('1min');
  const [customLength, setCustomLength] = useState<string>('1');
  const [content, setContent] = useState('');
  
  // Processing State
  const [processingStatus, setProcessingStatus] = useState<string>('Initializing...');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const parseDuration = (): number => {
    if (length === 'Custom') return parseInt(customLength) || 1;
    return parseInt(length.replace('min', ''));
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      alert("Please configure your API Key in Settings first.");
      return;
    }
    if (!content.trim()) {
      alert("Please provide video content description.");
      return;
    }

    // Move UI update to top to ensure immediate feedback
    setStep('processing');
    setProgress(2);
    setProcessingStatus('Initializing Studio...');
    addLog('System initialized.');

    try {
      const duration = parseDuration();
      const finalStyle = style === 'Custom' ? customStyle : style;

      addLog('Drafting script parameters...');

      // Safe ID generation
      const projectId = generateId();

      const newProject: Project = {
        id: projectId,
        title: 'Untitled Project',
        createdAt: Date.now(),
        params: { type, style, customStyle, length, customLength: duration, content },
        script: null,
        status: 'generating_script',
        progress: 5
      };

      // 1. Generate Script
      setProcessingStatus('Drafting Script & Storyboard...');
      addLog('Contacting Screenwriter Agent (Gemini 3 Pro)...');
      
      const script = await generateMovieScript(apiKey, type, finalStyle, duration, content);
      
      if (!script || !script.scenes) {
        throw new Error("Received invalid script data from AI.");
      }

      newProject.script = script;
      newProject.title = script.title || 'Untitled Movie';
      newProject.status = 'generating_images';
      
      setProgress(20);
      setProcessingStatus(`Script "${script.title}" generated. Starting visual production...`);
      addLog(`Script generated with ${script.scenes.length} scenes.`);
      if (script.visualContext) {
        addLog(`Visual Context established: ${script.visualContext.substring(0, 60)}...`);
      }

      // 2. Generate Images
      const totalScenes = script.scenes.length;
      
      for (let i = 0; i < totalScenes; i++) {
        const scene = script.scenes[i];
        const progressPercent = 20 + Math.floor(((i + 1) / totalScenes) * 80);
        
        setProcessingStatus(`Rendering Scene ${i + 1} of ${totalScenes}...`);
        setProgress(progressPercent);
        
        try {
          // We pass script.visualContext to ensure high consistency across frames
          const imageUrl = await generateSceneImage(apiKey, script.visualContext || '', scene.visualPrompt, finalStyle);
          scene.imageUrl = imageUrl;
          addLog(`Scene ${i + 1} rendered successfully.`);
        } catch (error) {
          console.error(`Failed to generate image for scene ${i+1}`, error);
          addLog(`Error rendering scene ${i + 1}: ${(error as Error).message}`);
          // Fallback placeholder or just leave undefined
        }
      }

      newProject.status = 'completed';
      newProject.progress = 100;
      setProcessingStatus('Production Complete! Saving to Database...');
      addLog('All scenes rendered. Saving...');

      // Save and Redirect
      // Small delay to let user see "Complete"
      await new Promise(resolve => setTimeout(resolve, 500));
      onProjectCreated(newProject);

    } catch (error) {
      console.error(error);
      setProcessingStatus('Error Occurred');
      addLog(`CRITICAL ERROR: ${(error as Error).message}`);
      // Don't auto-redirect, let user see error
    }
  };

  if (step === 'processing') {
    return (
      <div className="max-w-3xl mx-auto mt-10 p-8 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-900/50 text-indigo-400 mb-4 relative">
             <Sparkles className={`w-8 h-8 ${progress < 100 ? 'animate-pulse' : ''}`} />
             <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping opacity-20"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{processingStatus}</h2>
          <div className="w-full bg-slate-800 rounded-full h-2.5 mt-4 overflow-hidden">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-slate-400 mt-2 text-sm">{progress}% Complete</p>
          {progress > 80 && <p className="text-xs text-amber-500 mt-1">Finalizing and saving high-res images... Do not close.</p>}
        </div>

        <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto border border-slate-800 custom-scrollbar">
          {logs.map((log, idx) => (
            <div key={idx} className="mb-1 opacity-80">
              <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
              {log}
            </div>
          ))}
          {progress < 100 && <div className="animate-pulse">_</div>}
        </div>
        
        {processingStatus === 'Error Occurred' && (
           <div className="mt-6 text-center">
             <Button variant="secondary" onClick={() => setStep('input')}>Back to Editor</Button>
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Create New Movie</h1>
          <p className="text-slate-400">Configure your generative film parameters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Settings */}
        <div className="space-y-6">
          
          {/* Genre */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <label className="block text-sm font-semibold text-slate-300 mb-4">Content Type</label>
            <div className="grid grid-cols-2 gap-3">
              {VIDEO_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    type === t 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <label className="block text-sm font-semibold text-slate-300 mb-4">Visual Style</label>
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {VIDEO_STYLES.map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`px-3 py-2 rounded-lg text-sm text-left transition-all truncate ${
                    style === s 
                      ? 'bg-cyan-700 text-white ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {style === 'Custom' && (
              <input
                type="text"
                value={customStyle}
                onChange={(e) => setCustomStyle(e.target.value)}
                placeholder="Enter custom style prompt..."
                className="mt-4 w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              />
            )}
          </div>

          {/* Length */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
            <label className="block text-sm font-semibold text-slate-300 mb-4">Duration</label>
            <div className="flex flex-wrap gap-2">
              {VIDEO_LENGTHS.map(l => (
                <button
                  key={l}
                  onClick={() => setLength(l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    length === l 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
             {length === 'Custom' && (
              <div className="mt-4 flex items-center gap-2">
                 <input
                  type="number"
                  min="1"
                  max="60"
                  value={customLength}
                  onChange={(e) => setCustomLength(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-slate-400 text-sm">minutes</span>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Prompt */}
        <div className="flex flex-col h-full">
           <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex-1 flex flex-col">
            <label className="block text-sm font-semibold text-slate-300 mb-4">
              Story Concept / Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe your movie idea here. E.g., A detective in a rainy neo-tokyo discovers a robot that can dream..."
              className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
            
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Estimated Output</span>
              </div>
              <ul className="text-sm text-slate-400 space-y-1">
                <li className="flex justify-between">
                  <span>Scenes to generate:</span>
                  <span className="text-slate-200">{parseDuration() * 4} shots</span>
                </li>
                <li className="flex justify-between">
                  <span>Script detail:</span>
                  <span className="text-slate-200">Full dialogue & action</span>
                </li>
                 <li className="flex justify-between">
                  <span>Model:</span>
                  <span className="text-slate-200">Gemini 3 Pro + Imagen</span>
                </li>
              </ul>
            </div>
           </div>

           <Button 
            variant="primary" 
            size="lg" 
            className="mt-6 w-full shadow-lg shadow-indigo-600/20"
            onClick={handleGenerate}
           >
            Generate Movie
            <ArrowRight className="ml-2 w-5 h-5" />
           </Button>
        </div>

      </div>
    </div>
  );
};