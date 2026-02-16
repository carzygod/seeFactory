export type VideoType = 'Action' | 'Racing' | 'Artistic' | 'Other';
export type VideoStyle = 'Cyberpunk' | 'Sketch' | 'Comic' | 'Shaw Brothers' | 'Chaplin Silent' | 'Old American Comic' | 'Realistic' | 'Custom';
export type VideoLength = '1min' | '2min' | '3min' | '5min' | '10min' | '20min' | '30min' | 'Custom';

export interface SceneFrame {
  id: string;
  timeStart: string; // e.g., "00:00"
  timeEnd: string;   // e.g., "00:15"
  description: string;
  cameraMovement: string;
  visualPrompt: string; // The prompt used for generation
  imageUrl?: string; // Base64 data
}

export interface ScriptAct {
  title: string;
  content: string;
}

export interface MovieScript {
  title: string;
  logline: string;
  visualContext: string; // Describes the consistent look, main characters, and setting
  characters: string[];
  acts: ScriptAct[];
  scenes: SceneFrame[];
}

export interface Project {
  id: string;
  title: string;
  createdAt: number;
  params: {
    type: VideoType;
    style: VideoStyle;
    customStyle?: string;
    length: VideoLength;
    customLength?: number; // in minutes
    content: string;
  };
  script: MovieScript | null;
  status: 'draft' | 'generating_script' | 'generating_images' | 'completed' | 'error';
  progress: number; // 0-100
}

export interface AppSettings {
  apiKey: string;
}