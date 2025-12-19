import { FileEntry } from '../types';
import { matchesAnyPattern, hasIgnoredExtension } from './patternMatcher';

export const readFileContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string || '');
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

export const processFiles = async (
  fileList: FileList, 
  ignorePatterns: string[],
  ignoreExtensions: string[],
  onProgress: (current: number, total: number) => void
): Promise<FileEntry[]> => {
  const processedFiles: FileEntry[] = [];
  const filesArray = Array.from(fileList);
  const total = filesArray.length;

  for (let i = 0; i < total; i++) {
    const file = filesArray[i];
    
    // throttle progress updates slightly
    if (i % 5 === 0 || i === total - 1) {
        onProgress(i + 1, total);
    }

    // webkitRelativePath gives us "folder/subfolder/file.ext"
    const path = file.webkitRelativePath || file.name;
    
    // 1. Check Ignore Patterns (Directories, specific files, wildcards)
    if (matchesAnyPattern(path, ignorePatterns)) continue;

    // 2. Check Extension (Binary files)
    if (hasIgnoredExtension(file.name, ignoreExtensions)) continue;

    // 3. Size Check
    // Skip large files (> 500KB) to avoid browser freezing/token limits
    if (file.size > 500 * 1024) continue; 

    try {
      const content = await readFileContent(file);
      // Basic check for binary content that might have slipped through extension check
      // If content has excessive null bytes, skip it
      if (content.includes('\0')) continue;

      processedFiles.push({
        path,
        name: file.name,
        content,
        size: file.size,
        extension: file.name.split('.').pop() || ''
      });
    } catch (err) {
      console.warn(`Failed to read file ${path}`, err);
    }
  }

  return processedFiles.sort((a, b) => a.path.localeCompare(b.path));
};