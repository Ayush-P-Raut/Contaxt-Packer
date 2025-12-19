import React, { useState, useCallback, useEffect } from 'react';
import { PackageOpen, Info, Settings, Moon, Sun } from 'lucide-react';
import { DirectoryPicker } from './components/DirectoryPicker';
import { OutputViewer } from './components/OutputViewer';
import { SettingsModal } from './components/SettingsModal';
import { FileEntry, ProcessingStats, Bundle, DEFAULT_IGNORED_DIRECTORIES, DEFAULT_IGNORED_EXTENSIONS } from './types';
import { processFiles } from './utils/fileProcessor';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalFilesToProcess, setTotalFilesToProcess] = useState(0);
  const [stats, setStats] = useState<ProcessingStats>({
    totalFiles: 0,
    processedFiles: 0,
    totalSize: 0,
    skippedFiles: 0
  });

  // --- THEME STATE ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // --- SETTINGS STATE ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ignorePatterns, setIgnorePatterns] = useState<string[]>(DEFAULT_IGNORED_DIRECTORIES);
  const [bundles, setBundles] = useState<Bundle[]>([
    {
      id: 'default-frontend',
      name: 'Frontend',
      patterns: ['src/components/**/*', 'src/pages/**/*', 'src/app/**/*']
    },
    {
      id: 'default-backend',
      name: 'Backend',
      patterns: ['api/**/*', 'server/**/*', 'src/backend/**/*']
    },
    {
      id: 'default-config',
      name: 'Config & Types',
      patterns: ['*.config.*', 'package.json', 'src/types/**/*']
    }
  ]);

  const handleFilesSelected = useCallback(async (fileList: FileList) => {
    setIsProcessing(true);
    setTotalFilesToProcess(fileList.length);
    setProgress(0);

    try {
      // Small delay to allow UI to update to loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      const processed = await processFiles(
        fileList, 
        ignorePatterns,
        DEFAULT_IGNORED_EXTENSIONS,
        (current, total) => {
        if (current % 10 === 0 || current === total) {
            setProgress(current);
        }
      });

      const totalSize = processed.reduce((acc, curr) => acc + curr.size, 0);

      setStats({
        totalFiles: fileList.length,
        processedFiles: processed.length,
        totalSize,
        skippedFiles: fileList.length - processed.length
      });

      setFiles(processed);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("An error occurred while reading files. Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  }, [ignorePatterns]);

  const handleReset = () => {
    setFiles([]);
    setStats({
      totalFiles: 0,
      processedFiles: 0,
      totalSize: 0,
      skippedFiles: 0
    });
    setProgress(0);
    setTotalFilesToProcess(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50 transition-colors duration-300">
        <div className="w-full max-w-[95%] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shadow-sm">
              <PackageOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:to-slate-400">
              ContextPacker
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <button
               onClick={() => setIsDarkMode(!isDarkMode)}
               className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
               title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
             >
               {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>

             <button 
               onClick={() => setIsSettingsOpen(true)}
               className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors"
             >
               <Settings className="w-4 h-4" />
               Settings
             </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[95%] mx-auto px-4 py-12">
        {files.length === 0 && !isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="max-w-2xl text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
                Turn your codebase into <br/>
                <span className="text-indigo-600 dark:text-indigo-400">AI-ready context</span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                As an AI, I cannot directly access your file system. To provide me with full context of your project, 
                upload your folder here. I'll filter out the noise (binary files, node_modules) 
                and format the code into a single block you can paste into our chat.
              </p>
            </div>
            
            <DirectoryPicker 
              onFilesSelected={handleFilesSelected} 
              isProcessing={isProcessing}
              progress={progress}
              totalToProcess={totalFilesToProcess}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mt-12">
               <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                    <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Local Processing</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Files are processed entirely in your browser. Nothing is uploaded to any server.</p>
               </div>
               <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
                    <PackageOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Smart Filtering</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Automatically ignores node_modules, .git, build artifacts, and binary media files.</p>
               </div>
               <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4">
                    <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Optimized Format</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Generates XML or Markdown structures optimized for LLM context windows.</p>
               </div>
            </div>
          </div>
        ) : (
          <OutputViewer 
            files={files} 
            stats={stats}
            bundles={bundles}
            onReset={handleReset}
          />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        ignorePatterns={ignorePatterns}
        setIgnorePatterns={setIgnorePatterns}
        bundles={bundles}
        setBundles={setBundles}
      />
    </div>
  );
};

export default App;