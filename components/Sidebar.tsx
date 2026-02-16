import React from 'react';
import { Film, Plus, Settings, FolderOpen, User } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    { id: 'new', label: 'New Project', icon: Plus },
    { id: 'projects', label: 'My Projects', icon: FolderOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full fixed left-0 top-0">
      <div className="p-6 flex items-center gap-2 border-b border-slate-800">
        <Film className="w-8 h-8 text-indigo-500" />
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          SeeFactory
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentView === item.id
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-lg shadow-indigo-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Gemini Pro Vision</p>
          <p className="text-xs text-indigo-400 font-medium">System Online</p>
        </div>
      </div>
    </div>
  );
};