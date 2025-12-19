import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GraphNode, GraphLink } from '../types';
import { ZoomIn, ZoomOut, RefreshCw, Copy, Check } from 'lucide-react';

interface DependencyGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onCopyContext: () => void;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({ nodes: initialNodes, links: initialLinks, onCopyContext }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.8 }); // pan x, pan y, scale
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<GraphNode | null>(null);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize simulation data
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    // Clone to avoid mutating props and allow physics mutation
    const simNodes = initialNodes.map(n => ({ 
        ...n, 
        x: width / 2 + (Math.random() - 0.5) * 100, 
        y: height / 2 + (Math.random() - 0.5) * 100,
        vx: 0, vy: 0 
    }));
    
    const simLinks = initialLinks.map(l => ({ 
        ...l, 
        sourceNode: simNodes.find(n => n.id === l.source),
        targetNode: simNodes.find(n => n.id === l.target)
    })).filter(l => l.sourceNode && l.targetNode);

    setNodes(simNodes);
    setLinks(simLinks);
    setTransform(prev => ({ ...prev, x: width / 2, y: height / 2 }));
  }, [initialNodes, initialLinks]);

  // Physics Loop
  useEffect(() => {
    if (nodes.length === 0) return;

    let animationFrameId: number;
    const REPULSION = 1000;
    const SPRING_LENGTH = 100;
    const SPRING_STRENGTH = 0.05;
    const DAMPING = 0.85; // Air resistance

    const step = () => {
      // 1. Repulsion (Nodes push each other away)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = (a.x || 0) - (b.x || 0);
          const dy = (a.y || 0) - (b.y || 0);
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          if (dist < 300) {
              const force = REPULSION / (dist * dist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              
              if (a !== dragNode) { a.vx = (a.vx || 0) + fx; a.vy = (a.vy || 0) + fy; }
              if (b !== dragNode) { b.vx = (b.vx || 0) - fx; b.vy = (b.vy || 0) - fy; }
          }
        }
      }

      // 2. Spring (Connected nodes pull together)
      links.forEach(link => {
        const source = link.sourceNode!;
        const target = link.targetNode!;
        
        const dx = (target.x || 0) - (source.x || 0);
        const dy = (target.y || 0) - (source.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        if (source !== dragNode) { source.vx = (source.vx || 0) + fx; source.vy = (source.vy || 0) + fy; }
        if (target !== dragNode) { target.vx = (target.vx || 0) - fx; target.vy = (target.vy || 0) - fy; }
      });

      // 3. Center Gravity (Pull loosely to center)
      nodes.forEach(node => {
        if (node === dragNode) return;
        node.vx = (node.vx || 0) - (node.x || 0) * 0.001; 
        node.vy = (node.vy || 0) - (node.y || 0) * 0.001;
        
        // Update Position
        node.vx = (node.vx || 0) * DAMPING;
        node.vy = (node.vy || 0) * DAMPING;
        
        // Limit speed
        const speed = Math.sqrt(node.vx*node.vx + node.vy*node.vy);
        if (speed > 10) {
            node.vx = (node.vx/speed) * 10;
            node.vy = (node.vy/speed) * 10;
        }

        node.x = (node.x || 0) + node.vx;
        node.y = (node.y || 0) + node.vy;
      });

      draw();
      animationFrameId = requestAnimationFrame(step);
    };

    // Drawing Logic
    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.k, transform.k);

        // Draw Links
        ctx.strokeStyle = window.matchMedia('(prefers-color-scheme: dark)').matches || document.body.classList.contains('dark') ? '#475569' : '#cbd5e1'; 
        ctx.lineWidth = 1;
        
        links.forEach(link => {
            const s = link.sourceNode!;
            const t = link.targetNode!;
            ctx.beginPath();
            ctx.moveTo(s.x || 0, s.y || 0);
            ctx.lineTo(t.x || 0, t.y || 0);
            ctx.stroke();
        });

        // Draw Nodes
        nodes.forEach(node => {
            const radius = 5 + Math.min(node.connections, 10);
            ctx.fillStyle = node.color || '#94a3b8';
            
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, radius, 0, Math.PI * 2);
            ctx.fill();

            // Hover Outline
            if (node === hoverNode) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw Label on Top
                ctx.fillStyle = document.body.classList.contains('dark') ? '#fff' : '#0f172a';
                ctx.font = '12px sans-serif';
                ctx.fillText(node.label, (node.x || 0) + radius + 5, (node.y || 0) + 4);
            }
        });

        ctx.restore();
    };

    step();
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, links, dragNode, transform, hoverNode]);


  // Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Mouse Pos in Graph Coords
    const mx = (e.clientX - rect.left - transform.x) / transform.k;
    const my = (e.clientY - rect.top - transform.y) / transform.k;

    // Find clicked node
    const clickedNode = nodes.find(n => {
        const dist = Math.sqrt((mx - (n.x||0))**2 + (my - (n.y||0))**2);
        const radius = 5 + Math.min(n.connections, 10);
        return dist < radius + 5;
    });

    if (clickedNode) {
        setDragNode(clickedNode);
        setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - transform.x) / transform.k;
    const my = (e.clientY - rect.top - transform.y) / transform.k;

    if (isDragging && dragNode) {
        dragNode.x = mx;
        dragNode.y = my;
        dragNode.vx = 0;
        dragNode.vy = 0;
    } else {
        // Hit test for hover
        const hovered = nodes.find(n => {
            const dist = Math.sqrt((mx - (n.x||0))**2 + (my - (n.y||0))**2);
            const radius = 5 + Math.min(n.connections, 10);
            return dist < radius + 5;
        });
        setHoverNode(hovered || null);
        canvas.style.cursor = hovered ? 'pointer' : 'default';
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragNode(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
      setTransform(prev => ({
          ...prev,
          k: Math.max(0.1, Math.min(3, prev.k - e.deltaY * 0.001))
      }));
  };

  const handleCopyClick = () => {
      onCopyContext();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div ref={containerRef} className="relative w-full h-[600px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm dark:shadow-xl">
        {/* Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button 
              onClick={handleCopyClick} 
              className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 hover:text-indigo-500 hover:border-indigo-500"
              title="Copy Graph as Text"
            >
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setTransform(prev => ({ ...prev, k: prev.k * 1.2 }))}
              className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 hover:text-indigo-500"
            >
                <ZoomIn className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setTransform(prev => ({ ...prev, k: prev.k * 0.8 }))}
              className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 hover:text-indigo-500"
            >
                <ZoomOut className="w-5 h-5" />
            </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-lg pointer-events-none select-none">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2">File Types</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-slate-600 dark:text-slate-400">TypeScript</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400"></span><span className="text-slate-600 dark:text-slate-400">JavaScript</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500"></span><span className="text-slate-600 dark:text-slate-400">Style/CSS</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span><span className="text-slate-600 dark:text-slate-400">Other</span></div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400">
                Drag nodes to rearrange.<br/>Scroll to zoom.
            </div>
        </div>

        <canvas 
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        />
        
        {nodes.length === 0 && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-slate-400">No dependencies found in selected files.</p>
             </div>
        )}
    </div>
  );
};