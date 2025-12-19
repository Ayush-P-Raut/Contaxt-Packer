import React, { useState } from 'react';
import { X, Plus, Trash2, Save, FileCode, Ban, FolderCog } from 'lucide-react';
import { Bundle } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ignorePatterns: string[];
  setIgnorePatterns: (patterns: string[]) => void;
  bundles: Bundle[];
  setBundles: (bundles: Bundle[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  ignorePatterns,
  setIgnorePatterns,
  bundles,
  setBundles
}) => {
  const [activeTab, setActiveTab] = useState<'ignore' | 'bundles'>('ignore');
  
  // Local state for bundles editing
  const [editingBundles, setEditingBundles] = useState<Bundle[]>(JSON.parse(JSON.stringify(bundles)));
  // Local state for ignore patterns
  const [newIgnorePattern, setNewIgnorePattern] = useState('');

  if (!isOpen) return null;

  const handleAddIgnore = () => {
    if (newIgnorePattern.trim()) {
      setIgnorePatterns([...ignorePatterns, newIgnorePattern.trim()]);
      setNewIgnorePattern('');
    }
  };

  const handleRemoveIgnore = (index: number) => {
    const newPatterns = [...ignorePatterns];
    newPatterns.splice(index, 1);
    setIgnorePatterns(newPatterns);
  };

  // --- Bundle Handlers ---
  const handleAddBundle = () => {
    const newBundle: Bundle = {
      id: crypto.randomUUID(),
      name: 'New Bundle',
      patterns: ['src/**/*']
    };
    setEditingBundles([...editingBundles, newBundle]);
  };

  const updateBundle = (index: number, field: keyof Bundle, value: any) => {
    const updated = [...editingBundles];
    updated[index] = { ...updated[index], [field]: value };
    setEditingBundles(updated);
  };

  const updateBundlePattern = (bundleIndex: number, patternIndex: number, value: string) => {
    const updated = [...editingBundles];
    const newPatterns = [...updated[bundleIndex].patterns];
    newPatterns[patternIndex] = value;
    updated[bundleIndex].patterns = newPatterns;
    setEditingBundles(updated);
  };

  const addPatternToBundle = (bundleIndex: number) => {
    const updated = [...editingBundles];
    updated[bundleIndex].patterns.push('');
    setEditingBundles(updated);
  };

  const removePatternFromBundle = (bundleIndex: number, patternIndex: number) => {
    const updated = [...editingBundles];
    updated[bundleIndex].patterns.splice(patternIndex, 1);
    setEditingBundles(updated);
  };

  const removeBundle = (index: number) => {
    const updated = [...editingBundles];
    updated.splice(index, 1);
    setEditingBundles(updated);
  };

  const saveBundles = () => {
    setBundles(editingBundles);
    // Visual feedback could be added here
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FolderCog className="w-6 h-6 text-indigo-500" />
            Configuration
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('ignore')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'ignore'
                ? 'border-indigo-500 text-indigo-600 dark:text-white bg-slate-50 dark:bg-slate-800/50'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Ban className="w-4 h-4" />
              Ignore Rules
            </div>
          </button>
          <button
            onClick={() => setActiveTab('bundles')}
            className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'bundles'
                ? 'border-indigo-500 text-indigo-600 dark:text-white bg-slate-50 dark:bg-slate-800/50'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileCode className="w-4 h-4" />
              Intelligent Bundles
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {activeTab === 'ignore' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-2">Add Ignore Rule</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Use glob patterns (e.g., <code>*.log</code>, <code>dist/</code>, <code>src/**/*.test.ts</code>) to exclude files from processing.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIgnorePattern}
                    onChange={(e) => setNewIgnorePattern(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIgnore()}
                    placeholder="e.g. node_modules"
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddIgnore}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Active Rules</h3>
                <div className="space-y-2">
                  {ignorePatterns.map((pattern, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                      <code className="text-sm text-slate-700 dark:text-amber-100 font-mono">{pattern}</code>
                      <button
                        onClick={() => handleRemoveIgnore(idx)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {ignorePatterns.length === 0 && (
                    <p className="text-center text-slate-400 dark:text-slate-500 py-4 italic">No ignore rules defined.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bundles' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 p-4 rounded-lg">
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  <span className="font-semibold">Bundles</span> allow you to group specific parts of your project (e.g., "Backend", "UI Components") for focused context sharing.
                </p>
              </div>

              <div className="space-y-4">
                {editingBundles.map((bundle, bIdx) => (
                  <div key={bundle.id} className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 mr-4">
                        <label className="text-xs text-slate-500 font-semibold uppercase">Bundle Name</label>
                        <input
                          type="text"
                          value={bundle.name}
                          onChange={(e) => updateBundle(bIdx, 'name', e.target.value)}
                          className="w-full bg-transparent text-lg font-bold text-slate-800 dark:text-white border-b border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:outline-none py-1"
                        />
                      </div>
                      <button
                        onClick={() => removeBundle(bIdx)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Delete Bundle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 font-semibold uppercase">Include Patterns</label>
                      {bundle.patterns.map((pat, pIdx) => (
                        <div key={pIdx} className="flex gap-2">
                          <input
                            type="text"
                            value={pat}
                            onChange={(e) => updateBundlePattern(bIdx, pIdx, e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-700 dark:text-slate-300 focus:border-indigo-500 focus:outline-none"
                            placeholder="e.g. src/components/**"
                          />
                          <button
                             onClick={() => removePatternFromBundle(bIdx, pIdx)}
                             className="text-slate-400 hover:text-red-500"
                          >
                             <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addPatternToBundle(bIdx)}
                        className="text-xs flex items-center gap-1 text-indigo-500 dark:text-indigo-400 hover:text-indigo-400 mt-2"
                      >
                        <Plus className="w-3 h-3" /> Add Pattern
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddBundle}
                className="w-full py-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                Create New Bundle
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          {activeTab === 'bundles' && (
             <button
             onClick={saveBundles}
             className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-500/20"
           >
             <Save className="w-4 h-4" />
             Apply Changes
           </button>
          )}
        </div>
      </div>
    </div>
  );
};