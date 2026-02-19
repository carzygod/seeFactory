import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Key, Save, AlertTriangle, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SettingsProps {
  apiKey: string;
  onSave: (key: string) => void;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: 'Ask (Simplified)' },
  { code: 'zh-TW', label: 'Ask (Traditional)' },
  { code: 'ru', label: 'Русский' }
];

export const Settings: React.FC<SettingsProps> = ({ apiKey, onSave }) => {
  const { t, i18n } = useTranslation();
  const [keyInput, setKeyInput] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKeyInput(apiKey);
  }, [apiKey]);

  const handleSave = () => {
    onSave(keyInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="max-w-2xl mx-auto p-8 mt-10">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <SettingsIcon className="w-8 h-8 text-indigo-500" />
          <h2 className="text-2xl font-bold text-white">{t('settings.title')}</h2>
        </div>

        <div className="space-y-6">
          {/* Language Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('settings.languageLabel')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="h-5 w-5 text-slate-500" />
              </div>
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-100 transition-all appearance-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t('settings.apiKeyLabel')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-100 placeholder-slate-600 transition-all"
                placeholder="sk-or-..."
              />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {t('settings.apiKeyHelp')}
            </p>
          </div>

          {!keyInput && (
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                {t('settings.noKeyWarning')}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <span className={`text-sm font-medium text-green-400 transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}>
              {t('settings.saveSuccess')}
            </span>
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {t('settings.saveButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
