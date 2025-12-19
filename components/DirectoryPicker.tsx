import React, { useRef } from 'react';
import { FolderUp, Loader2 } from 'lucide-react';

interface DirectoryPickerProps {
  onFilesSelected: (files: FileList) => void;
  isProcessing: boolean;
  progress: number;
  totalToProcess: number;
}

export const DirectoryPicker: React.FC<DirectoryPickerProps> = ({ 
  onFilesSelected, 
  isProcessing,
  progress,
  totalToProcess
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div 
        onClick={handleClick}
        className={`
          relative flex flex-col items-center justify-center w-full h-64 
          border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
          ${isProcessing 
            ? 'border-indigo-500 bg-indigo-500/10' 
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900'}
        `}
      >
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          onChange={handleChange}
          webkitdirectory="" 
          directory="" 
          multiple 
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium text-slate-700 dark:text-indigo-300">Processing files...</p>
              <p className="text-sm text-slate-500 dark:text-indigo-400/70">
                {progress} / {totalToProcess}
              </p>
            </div>
            {/* Progress Bar */}
            <div className="w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-indigo-500 transition-all duration-200"
                style={{ width: `${totalToProcess > 0 ? (progress / totalToProcess) * 100 : 0}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
              <FolderUp className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Select Project Directory</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">
                Click here to upload your entire project folder. 
                <br />
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                  Processing happens locally in your browser. No files are uploaded to any server.
                </span>
              </p>
            </div>
            <div className="flex gap-2 text-xs text-slate-500 bg-slate-100 dark:bg-slate-950/50 py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-800">
              <span>Ignores: node_modules, .git, images, binaries</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};