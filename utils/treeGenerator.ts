export interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  children: TreeNode[];
}

export const generateAsciiTree = (paths: string[]): string => {
  const root: TreeNode = { name: '.', type: 'folder', children: [] };

  // 1. Build Tree
  for (const path of paths) {
    const parts = path.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      let node = current.children.find(c => c.name === part);
      if (!node) {
        node = {
          name: part,
          type: i === parts.length - 1 ? 'file' : 'folder',
          children: []
        };
        current.children.push(node);
      }
      current = node;
    }
  }

  // 2. Sort Nodes (Folders first, then files)
  const sortNodes = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortNodes);
  };
  sortNodes(root);

  // 3. Generate String
  let output = '';
  
  const draw = (nodes: TreeNode[], prefix: string) => {
    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      output += `${prefix}${connector}${node.name}\n`;
      
      if (node.children.length > 0) {
        draw(node.children, prefix + (isLast ? '    ' : '│   '));
      }
    });
  };

  output += '.\n';
  draw(root.children, '');
  
  return output;
};