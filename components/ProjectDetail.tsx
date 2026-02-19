import React, { useState } from 'react';
import { Project, SceneFrame } from '../types';
import { Button } from './Button';
import { ArrowLeft, Play, LayoutGrid, List, Download, Plus, Video, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdateProject?: (project: Project) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onBack, onUpdateProject }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'storyboard' | 'script'>('storyboard');
  const [selectedScene, setSelectedScene] = useState<SceneFrame | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  if (!project.script) return <div>Data missing</div>;

  const handleManualVideoUpload = (file: File) => {
    setIsProcessingVideo(true);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;

    video.onloadedmetadata = () => {
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

          // Create new scene
          const newScene: SceneFrame = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            timeStart: "00:00", // In real app, calculate offset
            timeEnd: "00:05",
            description: `Continuation segment from video: ${file.name}`,
            cameraMovement: "Static",
            visualPrompt: "Manual extension",
            imageUrl: dataUrl
          };

          // Update project
          if (onUpdateProject) {
            const updatedProject = { ...project };
            if (updatedProject.script) {
              updatedProject.script.scenes = [...updatedProject.script.scenes, newScene];
            }
            onUpdateProject(updatedProject);
          }

          setIsProcessingVideo(false);
          URL.revokeObjectURL(video.src);
        }
      } catch (e) {
        console.error("Frame extraction error", e);
        alert(t('newProject.validation.frameError'));
        setIsProcessingVideo(false);
      }
    };

    video.onerror = () => {
      alert(t('newProject.validation.videoLoadError'));
      setIsProcessingVideo(false);
    };
  };


  return (
    <div className="h-full flex flex-col bg-slate-950 relative">
      {/* Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Full screen preview"
            className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white hover:text-red-400 p-2"
            onClick={() => setPreviewImage(null)}
          >
            <Download className="w-8 h-8 rotate-45" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 px-8 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{project.title}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="uppercase tracking-wider">{project.params.type}</span>
              <span>•</span>
              <span>{project.params.length}</span>
              <span>•</span>
              <span>{project.params.style}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 rounded-lg p-1 mr-4">
            <button
              onClick={() => setViewMode('storyboard')}
              className={`p-2 rounded-md transition-all ${viewMode === 'storyboard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Storyboard View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('script')}
              className={`p-2 rounded-md transition-all ${viewMode === 'script' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              title="Script View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button variant="secondary" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> {t('projectDetail.exportPdf')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">

          {/* Synopsis Card */}
          <div className="mb-8 bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700/50 shadow-xl">
            <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-2">{t('projectDetail.logline')}</h3>
            <p className="text-lg text-slate-200 italic font-serif leading-relaxed">"{project.script.logline}"</p>
          </div>

          {viewMode === 'storyboard' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {project.script.scenes.map((scene, idx) => (
                <div
                  key={idx}
                  className={`bg-slate-900 border ${selectedScene === scene ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800'} rounded-xl overflow-hidden hover:border-slate-600 transition-all cursor-pointer group`}
                  onClick={() => setSelectedScene(scene)}
                >
                  <div className="aspect-video bg-black relative">
                    {scene.imageUrl ? (
                      <img
                        src={scene.imageUrl}
                        alt={`Scene ${idx + 1}`}
                        className="w-full h-full object-cover cursor-zoom-in"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(scene.imageUrl!);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">{t('projectDetail.pending')}</div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono pointer-events-none">
                      {scene.timeStart} - {scene.timeEnd}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-slate-200 mb-1">{t('projectDetail.scene')} {idx + 1}</h4>
                    <p className="text-sm text-slate-400 line-clamp-3">{scene.description}</p>
                  </div>
                </div>
              ))}

              {/* Add Next Step Card - ONLY for video_continuation mode */}
              {project.mode === 'video_continuation' && onUpdateProject && (
                <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col items-center justify-center min-h-[300px] cursor-pointer group relative">
                  <input
                    type="file"
                    accept="video/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleManualVideoUpload(e.target.files[0]);
                      }
                    }}
                    disabled={isProcessingVideo}
                  />
                  <div className="p-4 rounded-full bg-slate-800 group-hover:bg-indigo-600/20 transition-colors mb-4">
                    {isProcessingVideo ? <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /> : <Plus className="w-8 h-8 text-indigo-400" />}
                  </div>
                  <h4 className="font-bold text-slate-200 mb-1">{t('projectDetail.addNextStep')}</h4>
                  <p className="text-sm text-slate-500">{t('projectDetail.uploadToContinue')}</p>
                </div>
              )}

            </div>
          ) : (
            <div className="max-w-4xl mx-auto bg-white text-black p-12 min-h-screen shadow-2xl font-serif">
              <h1 className="text-4xl text-center font-bold mb-4 uppercase underline underline-offset-4">{project.title}</h1>
              <div className="text-center mb-12 flex flex-col items-center">
                <img src="/logo.png" alt="Logo" className="w-12 h-12 mb-2 opacity-80" />
                <p className="uppercase text-sm mb-1">{t('projectDetail.by')}</p>
                <p className="font-bold">SeeFactory AI</p>
              </div>

              {project.script.acts.map((act, i) => (
                <div key={i} className="mb-8">
                  <h2 className="text-center font-bold uppercase mb-4 tracking-widest border-b border-black pb-2">{act.title}</h2>
                  <p className="mb-6">{act.content}</p>
                </div>
              ))}

              <hr className="my-8 border-black" />

              {project.script.scenes.map((scene, i) => (
                <div key={i} className="mb-6 font-mono text-sm">
                  <div className="font-bold uppercase mb-1">
                    {i + 1}. {t('projectDetail.extIntScene')} - {scene.timeStart}
                  </div>
                  <p className="mb-2">{scene.description}</p>
                  <p className="italic text-gray-600 pl-4 border-l-2 border-gray-300">
                    {t('projectDetail.camera')}: {scene.cameraMovement}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Details Panel (only in storyboard mode) */}
        {viewMode === 'storyboard' && selectedScene && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto hidden lg:block">
            <h3 className="text-lg font-bold text-white mb-4">{t('projectDetail.sceneDetails')}</h3>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">{t('projectDetail.timing')}</label>
                <p className="text-slate-300 font-mono">{selectedScene.timeStart} - {selectedScene.timeEnd}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">{t('projectDetail.action')}</label>
                <p className="text-slate-300 text-sm leading-relaxed">{selectedScene.description}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">{t('projectDetail.camera')}</label>
                <div className="mt-1 inline-block px-2 py-1 bg-slate-800 rounded text-xs text-indigo-300 border border-indigo-500/20">
                  {selectedScene.cameraMovement}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">{t('projectDetail.visualPrompt')}</label>
                <div className="mt-2 p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-400 italic">
                  "{selectedScene.visualPrompt}"
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};