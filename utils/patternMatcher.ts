/**
 * Converts a glob pattern (e.g., "src/*.ts", "**\/node_modules") to a RegExp.
 * Supported syntax:
 * - * matches any character except /
 * - ** matches any character including /
 * - ? matches one character
 */
const globToRegex = (pattern: string): RegExp => {
  // Escape special regex characters except * and ?
  let regexString = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  // Replace glob wildcards with regex equivalents
  regexString = regexString
    .replace(/\*\*/g, '.*')    // ** -> match anything
    .replace(/\*/g, '[^/]*')   // * -> match anything except separator
    .replace(/\?/g, '.');      // ? -> match single char

  // Anchor start and end
  // If pattern starts with /, anchor to start. Otherwise allow partial match at start? 
  // Standard glob behavior usually implies checking the whole path or relative path.
  // We'll assume the pattern matches the whole relative path.
  
  return new RegExp(`^${regexString}$`, 'i'); // Case insensitive
};

/**
 * Checks if a file path matches any of the provided patterns.
 * @param filePath The relative path of the file (e.g., "src/components/App.tsx")
 * @param patterns Array of glob strings
 */
export const matchesAnyPattern = (filePath: string, patterns: string[]): boolean => {
  // Normalization: Ensure forward slashes
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  return patterns.some(pattern => {
    // exact match check first for speed
    if (pattern === normalizedPath) return true;
    
    // Directory match shorthand: "node_modules" should match "node_modules/..." and "src/node_modules/..."
    // If pattern doesn't have slashes, it might be a simple folder/file name check anywhere in path
    if (!pattern.includes('/') && !pattern.includes('*')) {
       // match "pattern" or "*/pattern/*" or "*/pattern"
       // This mimics simple .gitignore rules like "node_modules"
       return normalizedPath.includes(`/${pattern}/`) || 
              normalizedPath.startsWith(`${pattern}/`) || 
              normalizedPath.endsWith(`/${pattern}`) ||
              normalizedPath === pattern;
    }

    // Standard Glob Match
    try {
      const regex = globToRegex(pattern);
      return regex.test(normalizedPath);
    } catch (e) {
      console.warn(`Invalid pattern: ${pattern}`, e);
      return false;
    }
  });
};

/**
 * Checks if a file is a binary file extension based on the ignore list.
 * This is a specialized helper for extensions.
 */
export const hasIgnoredExtension = (fileName: string, ignoredExtensions: string[]): boolean => {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase();
  return ignoredExtensions.includes(ext);
};
