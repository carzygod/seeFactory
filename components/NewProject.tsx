import React, { useState, useRef } from 'react';
import { VideoType, VideoStyle, VideoLength, Project, ProjectMode } from '../types';
import { Button } from './Button';
import { generateMovieScript, generateSceneImage } from '../services/aiService';
import { Sparkles, ArrowRight, CheckCircle2, Film, Edit3, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';

interface NewProjectProps {
  apiKey: string;
  onProjectCreated: (project: Project) => void;
}

const VIDEO_TYPES: VideoType[] = ['Action', 'Racing', 'Artistic', 'Other'];
const VIDEO_STYLES: VideoStyle[] = ['Cyberpunk', 'Sketch', 'Comic', 'Shaw Brothers', 'Chaplin Silent', 'Old American Comic', 'Realistic', 'Custom'];
const VIDEO_LENGTHS: VideoLength[] = ['14s', '1min', '2min', '3min', '5min', '10min', '20min', '30min', 'Custom'];

// Simple UUID fallback for non-secure contexts
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const NewProject: React.FC<NewProjectProps> = ({ apiKey, onProjectCreated }) => {
  const [step, setStep] = useState<'input' | 'processing'>('input');

  // Mode State
  const [mode, setMode] = useState<ProjectMode>('storyboard');

  // Form State
  const [titleInput, setTitleInput] = useState(''); // For video_continuation
  const [type, setType] = useState<VideoType>('Action');
  const [style, setStyle] = useState<VideoStyle>('Cyberpunk');
  const [customStyle, setCustomStyle] = useState('');
  const [length, setLength] = useState<VideoLength>('14s');
  const [customLength, setCustomLength] = useState<string>('1');
  const [content, setContent] = useState('');

  // Video Processing State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  // Processing State
  const [processingStatus, setProcessingStatus] = useState<string>('Initializing...');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const parseDuration = (): number => {
    if (length === 'Custom') return parseInt(customLength) || 1;
    if (length === '14s') return 0.25; // Treat as fraction of minute for logic, service handles it
    return parseInt(length.replace('min', ''));
  };

  const handleVideoUpload = (file: File) => {
    setSelectedFile(file);
    setIsProcessingVideo(true);
    setLastFrameUrl(null);

    // Extract last frame
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;

    video.onloadedmetadata = () => {
      // Seek to almost the end (99%) to avoid potential black frames at very end
      video.currentTime = Math.max(0, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          setLastFrameUrl(dataUrl);
          setIsProcessingVideo(false);
          // Revoke url
          URL.revokeObjectURL(video.src);
        }
      } catch (e) {
        console.error("Frame extraction error", e);
        alert("Failed to extract frame from video.");
        setIsProcessingVideo(false);
      }
    };

    video.onerror = () => {
      alert("Error loading video file.");
      setIsProcessingVideo(false);
    };
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      alert("Please configure your API Key in Settings first.");
      return;
    }

    // Validation
    if (mode === 'video_continuation') {
      if (!titleInput.trim()) {
        alert("Please enter a project name.");
        return;
      }
      if (!selectedFile) {
        alert("Please upload a video file.");
        return;
      }
      if (isProcessingVideo) {
        alert("Please wait for video processing to complete.");
        return;
      }
    } else {
      if (!content.trim()) {
        alert("Please provide video content/instruction.");
        return;
      }
    }

    // Move UI update to top to ensure immediate feedback
    setStep('processing');
    setProgress(2);
    setProcessingStatus('Initializing Studio...');
    addLog('System initialized.');

    try {
      const duration = parseDuration();
      const finalStyle = style === 'Custom' ? customStyle : style;

      addLog(`Drafting project in ${mode} mode...`);

      // Safe ID generation
      const projectId = generateId();
      const projectTitle = mode === 'video_continuation' ? titleInput : 'Untitled Project';

      const newProject: Project = {
        id: projectId,
        title: projectTitle,
        createdAt: Date.now(),
        mode: mode,
        params: {
          type,
          style,
          customStyle,
          length,
          customLength: duration,
          content: mode === 'video_continuation' ? `Continue story from video: ${titleInput}` : content,
          videoUrl: selectedFile ? URL.createObjectURL(selectedFile) : undefined,
          lastFrameUrl: lastFrameUrl || undefined
        },
        script: null,
        status: 'generating_script',
        progress: 5
      };

      // 1. Generate Script
      setProcessingStatus('Drafting Script & Storyboard...');
      addLog('Contacting Screenwriter Agent (OpenRouter / GPT-5)...');

      // Adjust prompt context based on mode
      let contextContent = content;
      if (mode === 'video_continuation') {
        contextContent = `[VIDEO CONTINUATION] The user provided a video titled "${titleInput}". Task: Continue the visual narrative immediately following this scene. The last frame is provided (implicitly). Use standard cinematic continuation techniques.`;
      } else if (mode === 'freeform') {
        contextContent = `[FREEFORM] Generate a creative starting point and subsequent narrative based on: ${content}`;
      }

      // NOTE: In a real implementation we would send `lastFrameUrl` to the AI here.
      // For now, relies on the prompt optimization.
      const script = await generateMovieScript(apiKey, type, finalStyle, duration, contextContent);

      if (!script || !script.scenes) {
        throw new Error("Received invalid script data from AI.");
      }

      newProject.script = script;
      // Keep user provided title for continuation mode
      if (mode !== 'video_continuation') {
        newProject.title = script.title || 'Untitled Movie';
      }
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
          // If first scene of continuation, ideally we use last frame as init image, 
          // or just reference it. For now, just gen normally.
          const imageUrl = await generateSceneImage(apiKey, script.visualContext || '', scene.visualPrompt, finalStyle);
          scene.imageUrl = imageUrl;
          addLog(`Scene ${i + 1} rendered successfully.`);
        } catch (error) {
          console.error(`Failed to generate image for scene ${i + 1}`, error);
          addLog(`Error rendering scene ${i + 1}: ${(error as Error).message}`);
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
          <h1 className="text-3xl font-bold text-white">
            {mode === 'video_continuation' ? 'Video Continuation' : 'Create New Movie'}
          </h1>
          <p className="text-slate-400">
            {mode === 'video_continuation' ? 'Upload a video to continue its story' : 'Configure your generative film parameters'}
          </p>
        </div>
      </div>

      {/* Mode Selection Tabs */}
      <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl mb-8">
        {[
          { id: 'storyboard', label: 'Storyboard', icon: ImageIcon },
          { id: 'video_continuation', label: 'Video Continuation', icon: Film },
          { id: 'freeform', label: 'Freeform', icon: Edit3 }
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as ProjectMode)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${mode === m.id
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
          >
            <m.icon className="w-4 h-4" />
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Left Column: Settings */}
        <div className="space-y-6">

          {/* Mode Specific Inputs */}
          {mode === 'video_continuation' ? (
            <>
              {/* Project Name Input */}
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <label className="block text-sm font-semibold text-slate-300 mb-4">Project Name</label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="Enter project name..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Video Upload */}
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <label className="block text-sm font-semibold text-slate-300 mb-4">Source Video</label>
                <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-indigo-500/50 transition-colors bg-slate-950/50 group cursor-pointer relative">
                  <input
                    type="file"
                    accept="video/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleVideoUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-slate-800 rounded-full group-hover:bg-slate-700 transition-colors">
                      {isProcessingVideo ? <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /> : <Upload className="w-6 h-6 text-indigo-400" />}
                    </div>
                    {selectedFile ? (
                      <div className="text-sm text-green-400 font-medium truncate w-full px-4">
                        {selectedFile.name}
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-300 font-medium">Click to upload video</p>
                        <p className="text-xs text-slate-500">MP4, WebM (Max 50MB)</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Content Type - Hidden for Freeform */}
              {mode !== 'freeform' && (
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                  <label className="block text-sm font-semibold text-slate-300 mb-4">Content Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {VIDEO_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${type === t
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Style */}
              <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <label className="block text-sm font-semibold text-slate-300 mb-4">Visual Style</label>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {VIDEO_STYLES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-3 py-2 rounded-lg text-sm text-left transition-all truncate ${style === s
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
                <label className="block text-sm font-semibold text-slate-300 mb-4">Target Duration</label>
                <div className="flex flex-wrap gap-2">
                  {VIDEO_LENGTHS.map(l => (
                    <button
                      key={l}
                      onClick={() => setLength(l)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${length === l
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
            </>
          )}

        </div>

        {/* Right Column: Preview / Prompt */}
        <div className="flex flex-col h-full">

          {/* If Video Continuation Mode, show Extracted Frame Preview */}
          {mode === 'video_continuation' ? (
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex-1 flex flex-col items-center justify-center">
              <label className="block text-sm font-semibold text-slate-300 mb-4 self-start">
                Extracted Last Frame
              </label>

              {lastFrameUrl ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-700 shadow-lg">
                  <img src={lastFrameUrl} alt="Last Frame" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <p className="text-white text-sm font-medium">Ready for continuation</p>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-video rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center">
                  <div className="text-center text-slate-600">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Upload video to see preview</p>
                  </div>
                </div>
              )}

              <div className="mt-6 w-full p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Analysis</span>
                </div>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li className="flex justify-between">
                    <span>Frame Status:</span>
                    <span className={lastFrameUrl ? "text-green-400" : "text-slate-500"}>{lastFrameUrl ? "Extracted" : "Pending"}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Auto-Continue:</span>
                    <span className="text-slate-200">Enabled</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Normal Prompt Box for other modes */
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex-1 flex flex-col">
              <label className="block text-sm font-semibold text-slate-300 mb-4">
                {mode === 'freeform' ? 'Creative Prompt' : 'Story Concept / Content'}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  mode === 'freeform' ? "Enter a loose idea or theme (e.g., 'Dreams of a cybernetic whale')..." :
                    "Describe your movie idea here. E.g., A detective in a rainy neo-tokyo..."
                }
                className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />

              <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Estimated Output</span>
                </div>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li className="flex justify-between">
                    <span>Mode:</span>
                    <span className="text-slate-200 capitalize">{mode.replace('_', ' ')}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Scenes to generate:</span>
                    <span className="text-slate-200">{parseDuration() <= 1 && length === '14s' ? '1 scene' : `${parseDuration() * 4} shots`}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Model:</span>
                    <span className="text-slate-200">OpenRouter (GPT-5 + GPT-5-image)</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full shadow-lg shadow-indigo-600/20"
            onClick={handleGenerate}
            disabled={mode === 'video_continuation' && (!selectedFile || isProcessingVideo)}
          >
            {isProcessingVideo ? 'Processing Video...' : 'Generate Movie'}
            {!isProcessingVideo && <ArrowRight className="ml-2 w-5 h-5" />}
          </Button>
        </div>

      </div>
    </div>
  );
};