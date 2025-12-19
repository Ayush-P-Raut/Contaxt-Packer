import React, { useState, useCallback, useEffect } from 'react';
import { PackageOpen, Info, Settings, Moon, Sun } from 'lucide-react';

import { DirectoryPicker } from '../components/DirectoryPicker';
import { OutputViewer } from '../components/OutputViewer';
import { SettingsModal } from '../components/SettingsModal';

import {
  FileEntry,
  ProcessingStats,
  Bundle,
  DEFAULT_IGNORED_DIRECTORIES,
  DEFAULT_IGNORED_EXTENSIONS,
} from '../types';

import { processFiles } from '../utils/fileProcessor';

const App: React.FC = () => {
  /* ===================== FILE PROCESSING STATE ===================== */
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalFilesToProcess, setTotalFilesToProcess] = useState(0);

  const [stats, setStats] = useState<ProcessingStats>({
    totalFiles: 0,
    processedFiles: 0,
    totalSize: 0,
    skippedFiles: 0,
  });

  /* ===================== THEME ===================== */
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
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

  /* ===================== SETTINGS ===================== */
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ignorePatterns, setIgnorePatterns] = useState<string[]>(
    DEFAULT_IGNORED_DIRECTORIES
  );

  const [bundles, setBundles] = useState<Bundle[]>([
    {
      id: 'frontend',
      name: 'Frontend',
      patterns: ['src/components/**/*', 'src/pages/**/*', 'src/app/**/*'],
    },
    {
      id: 'backend',
      name: 'Backend',
      patterns: ['api/**/*', 'server/**/*', 'src/backend/**/*'],
    },
    {
      id: 'config',
      name: 'Config & Types',
      patterns: ['*.config.*', 'package.json', 'src/types/**/*'],
    },
  ]);

  /* ===================== FILE HANDLERS ===================== */
  const handleFilesSelected = useCallback(
    async (fileList: FileList) => {
      setIsProcessing(true);
      setFiles([]);
      setProgress(0);
      setTotalFilesToProcess(fileList.length);

      try {
        await new Promise((r) => setTimeout(r, 100)); // allow UI update

        const processed = await processFiles(
          fileList,
          ignorePatterns,
          DEFAULT_IGNORED_EXTENSIONS,
          (current, total) => {
            if (current % 10 === 0 || current === total) {
              setProgress(current);
            }
          }
        );

        const totalSize = processed.reduce((sum, f) => sum + f.size, 0);

        setStats({
          totalFiles: fileList.length,
          processedFiles: processed.length,
          skippedFiles: fileList.length - processed.length,
          totalSize,
        });

        setFiles(processed);
      } catch (err) {
        console.error('File processing error:', err);
        alert('Error while processing files. Check console for details.');
      } finally {
        setIsProcessing(false);
      }
    },
    [ignorePatterns]
  );

  const handleReset = () => {
    setFiles([]);
    setProgress(0);
    setTotalFilesToProcess(0);
    setStats({
      totalFiles: 0,
      processedFiles: 0,
      skippedFiles: 0,
      totalSize: 0,
    });
  };

  /* ===================== RENDER ===================== */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 transition-colors duration-300">
      {/* ===================== HEADER ===================== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
        <div className="max-w-[95%] mx-auto h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <PackageOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-white dark:to-slate-400">
              ContextPacker
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode((v) => !v)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun /> : <Moon />}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 text-sm font-medium hover:text-indigo-600"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* ===================== MAIN ===================== */}
      <main className="max-w-[95%] mx-auto px-4 py-12">
        {files.length === 0 && !isProcessing ? (
          <>
            <div className="max-w-2xl mx-auto text-center mb-12">
              <h2 className="text-4xl font-bold mb-6">
                Turn your codebase into{' '}
                <span className="text-indigo-600 dark:text-indigo-400">
                  AI-ready context
                </span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Upload your project folder. This tool filters noise
                (node_modules, binaries) and generates structured context you
                can paste directly into an AI chat.
              </p>
            </div>

            <DirectoryPicker
              onFilesSelected={handleFilesSelected}
              isProcessing={isProcessing}
              progress={progress}
              totalToProcess={totalFilesToProcess}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
              <Feature
                title="Local Processing"
                description="Everything runs inside your browser. No uploads, no servers."
              />
              <Feature
                title="Smart Filtering"
                description="Automatically ignores dependencies, build files and binaries."
              />
              <Feature
                title="LLM Optimized"
                description="Outputs clean Markdown / XML for AI context windows."
              />
            </div>
          </>
        ) : (
          <OutputViewer
            files={files}
            stats={stats}
            bundles={bundles}
            onReset={handleReset}
          />
        )}
      </main>

      {/* ===================== SETTINGS MODAL ===================== */}
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

/* ===================== SMALL FEATURE CARD ===================== */
const Feature = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
    <div className="w-10 h-10 mb-4 flex items-center justify-center rounded-lg bg-indigo-500/10">
      <Info className="text-indigo-600 dark:text-indigo-400" />
    </div>
    <h3 className="font-semibold mb-2">{title}</h3>
    <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
  </div>
);

export default App;
