export interface FileEntry {
  path: string;
  name: string;
  content: string;
  size: number;
  extension: string;
}

export interface ProcessingStats {
  totalFiles: number;
  processedFiles: number;
  totalSize: number;
  skippedFiles: number;
}

export enum OutputFormat {
  XML = 'XML',
  MARKDOWN = 'MARKDOWN',
  JSON = 'JSON'
}

export interface Bundle {
  id: string;
  name: string;
  description?: string;
  patterns: string[]; // e.g. ["src/components/**/*.tsx", "src/hooks/*"]
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  radius?: number;
  color?: string;
  connections: number;
}

export interface GraphLink {
  source: string;
  target: string;
  sourceNode?: GraphNode;
  targetNode?: GraphNode;
}

export const DEFAULT_IGNORED_DIRECTORIES = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.vscode',
  '.idea',
  '__pycache__',
  'target', // Rust/Java
  'bin',
  'obj'
];

export const DEFAULT_IGNORED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.mp4', '.mov', '.mp3', '.wav',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.class', '.jar',
  '.pyc', '.tsbuildinfo', '.lock'
];