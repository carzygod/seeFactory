import React from 'react';
import { Project } from '../types';
import { Clock, Film, Trash2 } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelectProject, onDeleteProject }) => {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <Film className="w-16 h-16 mb-4 opacity-20" />
        <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
        <p>Start a new project from the sidebar to create your movie masterpiece.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8 text-slate-100">My Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
            onClick={() => onSelectProject(project)}
          >
            <div className="aspect-video bg-slate-800 relative">
              {project.script?.scenes?.[0]?.imageUrl ? (
                <img
                  src={project.script.scenes[0].imageUrl}
                  alt={project.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Film className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-mono text-white">
                {project.params.length}
              </div>
            </div>

            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-slate-100 truncate pr-4">{project.title || 'Untitled Project'}</h3>
              </div>
              
              <p className="text-sm text-slate-400 line-clamp-2 mb-4 h-10">
                {project.params.content}
              </p>

              <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded-full ${
                    project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    project.status === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
             <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                }}
                className="absolute top-2 left-2 p-2 bg-black/50 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 hover:text-red-300"
                title="Delete Project"
            >
                <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};