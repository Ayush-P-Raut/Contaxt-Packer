import React, { useState, useMemo } from 'react';
import { Copy, Check, FileText, RefreshCw, Scissors, Layers, Settings2, FolderTree, Code2, PieChart, Filter, Share2 } from 'lucide-react';
import { FileEntry, OutputFormat, ProcessingStats, Bundle } from '../types';
import { generateAsciiTree } from '../utils/treeGenerator';
import { matchesAnyPattern } from '../utils/patternMatcher';
import { generateDependencyGraph, generateGraphContext } from '../utils/dependencyAnalyzer';
import { DependencyGraph } from './DependencyGraph';

interface OutputViewerProps {
  files: FileEntry[];
  stats: ProcessingStats;
  bundles: Bundle[];
  onReset: () => void;
}

// Internal interface for files that might be split across chunks
interface ChunkFileEntry extends FileEntry {
  originalPath: string;
  isSplit: boolean;
  partIndex: number; // 1-based
  totalParts: number;
}

export const OutputViewer: React.FC<OutputViewerProps> = ({ files, stats, bundles, onReset }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'structure' | 'graph'>('code');
  const [format, setFormat] = useState<OutputFormat>(OutputFormat.XML);
  const [copiedState, setCopiedState] = useState<{[key: string]: boolean}>({});
  const [enableSplitting, setEnableSplitting] = useState(false);
  const [maxTokens, setMaxTokens] = useState(25000); 
  const [activeBundleId, setActiveBundleId] = useState<string>('all');

  // Helper to estimate tokens (approx 4 chars per token)
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  // --- FILTERING LOGIC ---
  const filteredFiles = useMemo(() => {
    if (activeBundleId === 'all') return files;
    
    const bundle = bundles.find(b => b.id === activeBundleId);
    if (!bundle) return files;

    return files.filter(f => matchesAnyPattern(f.path, bundle.patterns));
  }, [files, activeBundleId, bundles]);


  // --- STATS CALCULATION ---
  const fileTypeStats = useMemo(() => {
    const typeCount: Record<string, { count: number; size: number }> = {};
    filteredFiles.forEach(f => {
      const ext = f.extension ? `.${f.extension}` : 'no-ext';
      if (!typeCount[ext]) {
        typeCount[ext] = { count: 0, size: 0 };
      }
      typeCount[ext].count++;
      typeCount[ext].size += f.size;
    });

    return Object.entries(typeCount)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([ext, data]) => ({ ext, ...data }));
  }, [filteredFiles]);

  const treeString = useMemo(() => {
    return generateAsciiTree(filteredFiles.map(f => f.path));
  }, [filteredFiles]);

  // --- GRAPH DATA ---
  const graphData = useMemo(() => {
      return generateDependencyGraph(filteredFiles);
  }, [filteredFiles]);


  // --- CHUNKING LOGIC ---
  const generateContent = (fileList: ChunkFileEntry[], part?: number, totalParts?: number) => {
    if (fileList.length === 0) return '';

    if (format === OutputFormat.XML) {
      const partAttr = part ? ` part="${part}" total_parts="${totalParts}"` : '';
      return `<project_context${partAttr}>\n${fileList.map(f => {
        const splitAttr = f.isSplit ? ` split_part="${f.partIndex}" split_total="${f.totalParts}"` : '';
        return `  <file path="${f.originalPath}"${splitAttr}>\n<![CDATA[\n${f.content}\n]]>\n  </file>`;
      }).join('\n')}\n</project_context>`;
    } else if (format === OutputFormat.MARKDOWN) {
      const header = part ? `# Project Context - Part ${part} of ${totalParts}\n\n` : '';
      return header + fileList.map(f => {
        const splitLabel = f.isSplit ? ` (Part ${f.partIndex} of ${f.totalParts})` : '';
        return `### File: ${f.originalPath}${splitLabel}\n\`\`\`${f.extension}\n${f.content}\n\`\`\``;
      }).join('\n\n');
    } else {
      // JSON
      const data = {
        meta: part ? { part, totalParts } : undefined,
        files: fileList.map(f => ({ 
          path: f.originalPath, 
          content: f.content,
          split: f.isSplit ? { part: f.partIndex, total: f.totalParts } : undefined
        }))
      };
      return JSON.stringify(data, null, 2);
    }
  };

  const chunks = useMemo(() => {
    const PER_FILE_OVERHEAD = 200; 
    const CHUNK_OVERHEAD = 100;

    const allFilesAsChunkFiles: ChunkFileEntry[] = filteredFiles.map(f => ({
      ...f,
      originalPath: f.path,
      isSplit: false,
      partIndex: 1,
      totalParts: 1
    }));

    if (allFilesAsChunkFiles.length === 0) {
        return [];
    }

    if (!enableSplitting) {
      return [{
        id: 'full',
        content: generateContent(allFilesAsChunkFiles),
        files: allFilesAsChunkFiles,
        label: 'Full Context'
      }];
    }

    const resultChunks: { id: string, files: ChunkFileEntry[] }[] = [];
    const limitChars = maxTokens * 4;
    
    let currentChunkFiles: ChunkFileEntry[] = [];
    let currentChunkSize = CHUNK_OVERHEAD;

    const findSplitPoint = (text: string, maxChars: number) => {
      if (text.length <= maxChars) return text.length;
      const searchWindow = Math.min(1000, maxChars * 0.2);
      const lastNewline = text.lastIndexOf('\n', maxChars);
      if (lastNewline > maxChars - searchWindow) {
        return lastNewline + 1;
      }
      return maxChars;
    };

    for (const file of allFilesAsChunkFiles) {
      let remainingContent = file.content;
      let partCounter = 1;
      const fileParts: ChunkFileEntry[] = [];

      while (remainingContent.length > 0) {
        const spaceInCurrent = limitChars - currentChunkSize;
        const maxContentInCurrent = spaceInCurrent - PER_FILE_OVERHEAD;

        if (maxContentInCurrent < 500) {
          if (currentChunkFiles.length > 0) {
            resultChunks.push({ id: `temp-${resultChunks.length}`, files: currentChunkFiles });
            currentChunkFiles = [];
            currentChunkSize = CHUNK_OVERHEAD;
            continue;
          }
        }

        const currentSpace = limitChars - currentChunkSize - PER_FILE_OVERHEAD;
        
        if (remainingContent.length <= currentSpace) {
          fileParts.push({
            ...file,
            content: remainingContent,
            partIndex: partCounter,
          });
          remainingContent = '';
        } else {
          const splitLength = findSplitPoint(remainingContent, currentSpace);
          const chunkContent = remainingContent.slice(0, splitLength);
          
          fileParts.push({
            ...file,
            content: chunkContent,
            partIndex: partCounter,
          });
          
          remainingContent = remainingContent.slice(splitLength);
          partCounter++;
        }

        const lastPart = fileParts[fileParts.length - 1];
        currentChunkFiles.push(lastPart);
        currentChunkSize += lastPart.content.length + PER_FILE_OVERHEAD;
        
        if (remainingContent.length > 0) {
          resultChunks.push({ id: `temp-${resultChunks.length}`, files: currentChunkFiles });
          currentChunkFiles = [];
          currentChunkSize = CHUNK_OVERHEAD;
        }
      }

      const totalParts = fileParts.length;
      if (totalParts > 1) {
        fileParts.forEach(p => {
          p.isSplit = true;
          p.totalParts = totalParts;
        });
      }
    }

    if (currentChunkFiles.length > 0) {
      resultChunks.push({ id: `temp-${resultChunks.length}`, files: currentChunkFiles });
    }

    return resultChunks.map((chunk, index) => ({
      id: `part-${index + 1}`,
      content: generateContent(chunk.files, index + 1, resultChunks.length),
      files: chunk.files,
      label: `Part ${index + 1} of ${resultChunks.length}`
    }));

  }, [filteredFiles, format, enableSplitting, maxTokens]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedState(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleCopyGraphContext = () => {
      const text = generateGraphContext(graphData.nodes, graphData.links);
      handleCopy(text, 'graph-context');
  }

  const totalContentLength = chunks.reduce((acc, chunk) => acc + chunk.content.length, 0);

  return (
    <div className="w-full max-w-[95%] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Stats Bar (Always Visible) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-lg shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Total Files</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{filteredFiles.length} <span className="text-sm text-slate-400 dark:text-slate-500 font-normal">/ {stats.totalFiles}</span></div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-lg shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Active Bundle</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
             {activeBundleId === 'all' ? 'All Files' : bundles.find(b => b.id === activeBundleId)?.name || 'Unknown'}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-lg shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Packed Size</div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {(totalContentLength / 1024).toFixed(1)} KB
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-lg shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Tokens</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {estimateTokens(totalContentLength).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Controls & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex gap-4">
             {/* Tab Toggle */}
            <div className="bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 flex gap-1">
            <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'code' 
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/50'
                }`}
            >
                <Code2 className="w-4 h-4" />
                Code
            </button>
            <button
                onClick={() => setActiveTab('structure')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'structure' 
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/50'
                }`}
            >
                <FolderTree className="w-4 h-4" />
                Structure
            </button>
            <button
                onClick={() => setActiveTab('graph')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'graph' 
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800/50'
                }`}
            >
                <Share2 className="w-4 h-4" />
                Graph
            </button>
            </div>

            {/* Bundle Selector */}
            <div className="relative group min-w-[200px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Filter className="w-4 h-4 text-slate-400" />
                </div>
                <select 
                    value={activeBundleId}
                    onChange={(e) => setActiveBundleId(e.target.value)}
                    className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-8 py-3.5"
                >
                    <option value="all">All Files</option>
                    {bundles.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
        </div>

        <button 
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Start Over
        </button>
      </div>

      {activeTab === 'code' && (
        /* --- CODE VIEW --- */
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Format & Split Toolbar */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              {/* Format Selector */}
              <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1 border border-slate-300 dark:border-slate-700 w-full md:w-auto self-start">
                <button 
                  onClick={() => setFormat(OutputFormat.XML)}
                  className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${format === OutputFormat.XML ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  XML
                </button>
                <button 
                  onClick={() => setFormat(OutputFormat.MARKDOWN)}
                  className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${format === OutputFormat.MARKDOWN ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Markdown
                </button>
                <button 
                  onClick={() => setFormat(OutputFormat.JSON)}
                  className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${format === OutputFormat.JSON ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  JSON
                </button>
              </div>

              {/* Split Controls */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <button
                    onClick={() => setEnableSplitting(!enableSplitting)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium ${enableSplitting ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-500 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
                >
                    <Scissors className="w-4 h-4" />
                    Split Context
                </button>

                {enableSplitting && (
                  <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-300 dark:border-slate-700">
                      <Settings2 className="w-4 h-4 text-slate-500 ml-1" />
                      <input 
                        type="number" 
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(Number(e.target.value))}
                        step={5000}
                        min={1000}
                        className="bg-transparent text-slate-900 dark:text-white w-20 text-sm focus:outline-none text-right font-mono"
                      />
                      <span className="text-xs text-slate-500 mr-1">tokens</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Chunks */}
          <div className="space-y-8">
            {chunks.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <p className="text-slate-400 dark:text-slate-500">No files match the active bundle.</p>
                </div>
            )}
            {chunks.map((chunk) => {
              const isCopied = copiedState[chunk.id];
              const tokenCount = estimateTokens(chunk.content);
              
              return (
                <div key={chunk.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      {enableSplitting ? (
                        <div className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200 dark:border-indigo-500/30 uppercase tracking-wide">
                          {chunk.label}
                        </div>
                      ) : (
                        <Layers className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {chunk.files.length} {chunk.files.length === 1 ? 'entry' : 'entries'}
                        </span>
                        <span className="text-xs text-slate-500">
                          ~{tokenCount.toLocaleString()} tokens
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleCopy(chunk.content, chunk.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${isCopied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {isCopied ? 'Copied' : enableSplitting ? 'Copy Part' : 'Copy Context'}
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      value={chunk.content}
                      className="w-full h-[400px] bg-slate-50 dark:bg-slate-950 p-4 font-mono text-xs md:text-sm text-slate-800 dark:text-slate-300 focus:outline-none resize-none leading-relaxed"
                      spellCheck={false}
                    />
                    <div className="absolute top-0 right-0 pointer-events-none bg-gradient-to-l from-slate-50 dark:from-slate-950 w-8 h-full opacity-50" />
                  </div>
                  
                  {enableSplitting && (
                    <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-3">
                        <details className="group">
                            <summary className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors select-none">
                                <FileText className="w-3 h-3" />
                                View included files
                            </summary>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 pl-2">
                                {chunk.files.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs font-mono" title={f.path}>
                                        <span className={`truncate ${f.isSplit ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                          {f.originalPath}
                                        </span>
                                        {f.isSplit && (
                                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 text-[10px]">
                                            Part {f.partIndex}/{f.totalParts}
                                          </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )} 
      
      {activeTab === 'structure' && (
        /* --- STRUCTURE VIEW --- */
        <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
          
          {/* File Tree Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xl flex flex-col h-[600px]">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <FolderTree className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                <h3 className="font-semibold text-slate-800 dark:text-white">Project Structure</h3>
              </div>
              <button 
                onClick={() => handleCopy(treeString, 'tree')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${copiedState['tree'] ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200'}`}
              >
                {copiedState['tree'] ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedState['tree'] ? 'Copied' : 'Copy Tree'}
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4">
              <pre className="font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre">
                {treeString || "No files match active bundle."}
              </pre>
            </div>
          </div>

          {/* Stats Card */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <PieChart className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                <h3 className="font-semibold text-slate-800 dark:text-white">Project DNA</h3>
              </div>
              
              <div className="space-y-4">
                {fileTypeStats.map((stat) => (
                  <div key={stat.ext} className="group">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{stat.ext === 'no-ext' ? 'No Extension' : stat.ext}</span>
                      <span className="text-xs text-slate-500">
                        {stat.count} files <span className="text-slate-300 dark:text-slate-700">|</span> {(stat.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500 group-hover:bg-indigo-400"
                        style={{ width: `${filteredFiles.length > 0 ? (stat.count / filteredFiles.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                {fileTypeStats.length === 0 && (
                     <div className="text-slate-400 dark:text-slate-500 italic text-sm text-center">No files in current selection</div>
                )}
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-slate-900/50 border border-indigo-100 dark:border-slate-800 rounded-xl p-6">
               <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">AI Context Tip</h4>
               <p className="text-sm text-slate-600 dark:text-slate-500 leading-relaxed">
                 Use <strong>Bundles</strong> to give the AI focused context. Start with the "Project Structure" to orient the model, then switch to a specific bundle (like "Backend") to solve problems in that domain without overwhelming the context window.
               </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'graph' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-center justify-between">
                <div>
                   <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                       <Share2 className="w-5 h-5 text-indigo-500" />
                       Import Dependency Graph
                   </h3>
                   <p className="text-sm text-slate-500">Visualizing imports between {filteredFiles.length} files.</p>
                </div>
                <button
                    onClick={() => handleCopy(generateGraphContext(graphData.nodes, graphData.links), 'graph-context')}
                     className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${copiedState['graph-context'] ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                >
                     {copiedState['graph-context'] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                     Copy Graph Context (Text)
                </button>
             </div>
             <DependencyGraph 
                nodes={graphData.nodes} 
                links={graphData.links}
                onCopyContext={handleCopyGraphContext}
             />
          </div>
      )}

    </div>
  );
};