import { FileEntry, GraphLink, GraphNode } from '../types';

/**
 * Basic regex for finding imports in JS/TS/Python.
 * This is heuristic-based and won't be perfect, but sufficient for context overview.
 */
const IMPORT_PATTERNS = {
  // Matches: import ... from 'path'; or import 'path';
  js: /(?:import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"])|(?:require\(['"]([^'"]+)['"]\))/g,
  // Matches: from path import ... or import path
  python: /(?:^from\s+([^\s]+)\s+import)|(?:^import\s+([^\s]+))/gm,
};

const EXTENSION_COLORS: Record<string, string> = {
  ts: '#3b82f6', // blue
  tsx: '#60a5fa', // blue-light
  js: '#f59e0b', // yellow
  jsx: '#fbbf24', // yellow-light
  css: '#ec4899', // pink
  scss: '#db2777', // pink-dark
  html: '#f97316', // orange
  json: '#84cc16', // lime
  py: '#3b82f6', // blue (python)
  default: '#94a3b8' // slate
};

const resolvePath = (currentPath: string, importPath: string, allPaths: Set<string>): string | null => {
  // Normalize import path
  let normalized = importPath;
  
  // 1. Direct match check
  if (allPaths.has(normalized)) return normalized;

  // 2. Resolve Relative paths
  if (normalized.startsWith('.')) {
    const currentParts = currentPath.split('/');
    currentParts.pop(); // remove filename
    
    const importParts = normalized.split('/');
    
    for (const part of importParts) {
      if (part === '.') continue;
      if (part === '..') {
        currentParts.pop();
      } else {
        currentParts.push(part);
      }
    }
    
    const resolvedPath = currentParts.join('/');
    
    // Check extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.css', '.json', '/index.ts', '/index.js'];
    for (const ext of extensions) {
      const candidate = resolvedPath + ext;
      if (allPaths.has(candidate)) return candidate;
    }
  }

  // 3. Absolute/Root imports (Naive check for typical src/ structure)
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
     if (allPaths.has(normalized + ext)) return normalized + ext;
     if (allPaths.has(`src/${normalized}${ext}`)) return `src/${normalized}${ext}`;
  }

  return null;
};

export const generateDependencyGraph = (files: FileEntry[]) => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const paths = new Set(files.map(f => f.path));

  // 1. Create Nodes
  files.forEach(file => {
    const ext = file.extension.toLowerCase();
    nodes.push({
      id: file.path,
      label: file.name,
      type: ext,
      color: EXTENSION_COLORS[ext] || EXTENSION_COLORS.default,
      connections: 0,
      // Random initial position for simulation
      x: Math.random() * 800,
      y: Math.random() * 600
    });
  });

  // 2. Create Links
  files.forEach(file => {
    const content = file.content;
    const ext = file.extension.toLowerCase();
    let match;

    if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
      while ((match = IMPORT_PATTERNS.js.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        if (importPath && !importPath.startsWith('react') && !importPath.startsWith('lucide')) { // Skip common node_modules
          const target = resolvePath(file.path, importPath, paths);
          if (target && target !== file.path) {
            links.push({ source: file.path, target });
          }
        }
      }
    } else if (ext === 'py') {
       while ((match = IMPORT_PATTERNS.python.exec(content)) !== null) {
         const importPath = match[1] || match[2];
         if (importPath) {
             // Python path resolution is tricky without context, we try basic matching
             const convertedPath = importPath.replace(/\./g, '/');
             const target = resolvePath(file.path, convertedPath, paths);
             if (target && target !== file.path) {
                links.push({ source: file.path, target });
             }
         }
       }
    }
  });

  // Update connection counts
  links.forEach(link => {
    const sourceNode = nodes.find(n => n.id === link.source);
    const targetNode = nodes.find(n => n.id === link.target);
    if (sourceNode) sourceNode.connections++;
    if (targetNode) targetNode.connections++;
  });

  return { nodes, links };
};

export const generateGraphContext = (nodes: GraphNode[], links: GraphLink[]): string => {
    let output = "DEPENDENCY GRAPH (Adjacency List):\n";
    output += "Format: File -> [Imports]\n\n";

    const adjacency: Record<string, string[]> = {};
    
    nodes.forEach(node => {
        adjacency[node.id] = [];
    });

    links.forEach(link => {
        if (adjacency[link.source]) {
            adjacency[link.source].push(link.target);
        }
    });

    Object.entries(adjacency).forEach(([source, targets]) => {
        if (targets.length > 0) {
            output += `${source} -> [${targets.join(', ')}]\n`;
        }
    });

    return output;
}