import { motion } from 'motion/react';
import { Moon, Sun, MessageSquare, FileText, Menu, Brain } from 'lucide-react';
import { useTheme } from '../lib/theme-context';
import { AI_MODELS } from '../lib/constants';

interface HeaderProps {
  mode: 'chat' | 'pdf';
  onModeChange: (mode: 'chat' | 'pdf') => void;
  onMenuClick: () => void;
  isSidebarOpen: boolean;
  pdfReady?: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function Header({ mode, onModeChange, onMenuClick, isSidebarOpen, pdfReady, selectedModel, onModelChange }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-4 md:px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center gap-3">
        {!isSidebarOpen && (
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
        )}

        <h1 className="text-slate-800 dark:text-slate-100 text-lg md:text-xl">
         AI 
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* AI Model Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <Brain className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="text-xs text-slate-600 dark:text-slate-400 hidden md:inline">Model:</span>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="text-sm bg-transparent text-slate-700 dark:text-slate-300 border-none outline-none cursor-pointer"
          >
            {AI_MODELS.map((model) => (
              <option key={model.id} value={model.id} className="bg-white dark:bg-slate-800">
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => onModeChange('chat')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${mode === 'chat'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Chat</span>
          </button>

          <button
            onClick={() => onModeChange('pdf')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${mode === 'pdf'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">PDF</span>
          </button>
        </div>

        {/* PDF Ready Indicator */}
        {mode === 'pdf' && pdfReady && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm">Ready</span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          ) : (
            <Sun className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
