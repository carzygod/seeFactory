import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { NewProject } from './components/NewProject';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { Settings } from './components/Settings';
import { Project } from './types';
import { getProjects, saveProject, deleteProject } from './utils/db';

// Mock Profile Component
const Profile = () => (
    <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">User Profile</h2>
            <p>Coming Soon</p>
        </div>
    </div>
);

function App() {
  const [currentView, setCurrentView] = useState('new');
  const [apiKey, setApiKey] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Load API Key from LS
  useEffect(() => {
    const savedKey = localStorage.getItem('seeFactory_apiKey');
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Load Projects from DB
  useEffect(() => {
    loadProjects();
  }, [currentView]); // Reload when view changes (e.g. back to list)

  const loadProjects = async () => {
    try {
      const dbProjects = await getProjects();
      setProjects(dbProjects);
    } catch (e) {
      console.error("Failed to load projects from DB", e);
    }
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('seeFactory_apiKey', key);
  };

  const handleProjectCreated = async (newProject: Project) => {
    // Save to DB
    try {
        await saveProject(newProject);
        // Refresh local list
        setProjects([newProject, ...projects]);
        setSelectedProject(newProject);
        setCurrentView('project-detail');
    } catch (e) {
        console.error("Failed to save project", e);
        alert("Failed to save project. Database error.");
    }
  };

  const handleDeleteProject = async (id: string) => {
      if(window.confirm("Are you sure you want to delete this project?")) {
        try {
            await deleteProject(id);
            const updated = projects.filter(p => p.id !== id);
            setProjects(updated);
            
            if (selectedProject?.id === id) {
                setSelectedProject(null);
                setCurrentView('projects');
            }
        } catch(e) {
            console.error("Delete failed", e);
        }
      }
  }

  const renderContent = () => {
    if (currentView === 'project-detail' && selectedProject) {
      return (
        <ProjectDetail 
          project={selectedProject} 
          onBack={() => setCurrentView('projects')} 
        />
      );
    }

    switch (currentView) {
      case 'new':
        return <NewProject apiKey={apiKey} onProjectCreated={handleProjectCreated} />;
      case 'projects':
        return (
          <ProjectList 
            projects={projects} 
            onSelectProject={(p) => {
              setSelectedProject(p);
              setCurrentView('project-detail');
            }}
            onDeleteProject={handleDeleteProject}
          />
        );
      case 'settings':
        return <Settings apiKey={apiKey} onSave={saveApiKey} />;
      case 'profile':
        return <Profile />;
      default:
        return <NewProject apiKey={apiKey} onProjectCreated={handleProjectCreated} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-50">
      <Sidebar currentView={currentView} onNavigate={(view) => {
          setCurrentView(view);
          if (view !== 'project-detail') setSelectedProject(null);
      }} />
      
      <main className="flex-1 ml-64 min-h-screen transition-all duration-300 ease-in-out">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;