import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Network, BookOpen, StickyNote, User, MapPin, Package } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useRef } from "react";
import type { Entry } from "@shared/schema";

interface MindmapNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
  connections: string[];
}

export default function MindmapViewPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { data: allEntries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
  });

  // Process entries to create nodes and connections
  const processEntriesToNodes = (entries: Entry[]): MindmapNode[] => {
    const nodes: MindmapNode[] = [];
    const entryConnections: Record<string, string[]> = {};

    // Create nodes for each entry
    entries.forEach(entry => {
      const hashtags = entry.content.match(/#[\w]+/g) || [];
      const connections: string[] = [];
      
      // Find connections to other entries through hashtags
      hashtags.forEach(hashtag => {
        const cleanHashtag = hashtag.slice(1).toLowerCase();
        entries.forEach(otherEntry => {
          if (otherEntry.id !== entry.id && 
              otherEntry.title.replace(/\s+/g, '').toLowerCase() === cleanHashtag) {
            connections.push(otherEntry.id.toString());
          }
        });
      });

      nodes.push({
        id: entry.id.toString(),
        label: entry.title,
        type: entry.type,
        connections
      });
    });

    return nodes;
  };

  const nodes = processEntriesToNodes(allEntries);

  // Simple force-directed layout algorithm
  const positionNodes = (nodes: MindmapNode[], width: number, height: number) => {
    const positioned = nodes.map((node, index) => ({
      ...node,
      x: Math.random() * (width - 100) + 50,
      y: Math.random() * (height - 100) + 50,
    }));

    // Simple physics simulation
    for (let iteration = 0; iteration < 50; iteration++) {
      positioned.forEach(node => {
        let fx = 0, fy = 0;

        // Repulsion from other nodes
        positioned.forEach(other => {
          if (other.id !== node.id) {
            const dx = (node.x || 0) - (other.x || 0);
            const dy = (node.y || 0) - (other.y || 0);
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 500 / (distance * distance);
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        });

        // Attraction to connected nodes
        node.connections.forEach(connId => {
          const connected = positioned.find(n => n.id === connId);
          if (connected) {
            const dx = (connected.x || 0) - (node.x || 0);
            const dy = (connected.y || 0) - (node.y || 0);
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = distance * 0.01;
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        });

        // Center attraction
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = centerX - (node.x || 0);
        const dy = centerY - (node.y || 0);
        fx += dx * 0.001;
        fy += dy * 0.001;

        // Update position
        node.x = Math.max(30, Math.min(width - 30, (node.x || 0) + fx * 0.1));
        node.y = Math.max(30, Math.min(height - 30, (node.y || 0) + fy * 0.1));
      });
    }

    return positioned;
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case "journal": return "#3B82F6"; // blue
      case "note": return "#EAB308"; // yellow
      case "person": return "#10B981"; // green
      case "place": return "#EF4444"; // red
      case "thing": return "#8B5CF6"; // purple
      default: return "#6B7280"; // gray
    }
  };

  // Draw the mindmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Position nodes
    const positionedNodes = positionNodes([...nodes], width, height);

    // Clear canvas
    ctx.fillStyle = "#F9FAFB";
    ctx.fillRect(0, 0, width, height);

    // Draw connections
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;
    positionedNodes.forEach(node => {
      node.connections.forEach(connId => {
        const connected = positionedNodes.find(n => n.id === connId);
        if (connected && node.x && node.y && connected.x && connected.y) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(connected.x, connected.y);
          ctx.stroke();
        }
      });
    });

    // Draw nodes
    positionedNodes.forEach(node => {
      if (!node.x || !node.y) return;

      const color = getNodeColor(node.type);
      
      // Draw node circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 15, 0, 2 * Math.PI);
      ctx.fill();

      // Draw white border
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw label
      ctx.fillStyle = "#374151";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      const maxWidth = 80;
      let label = node.label;
      if (ctx.measureText(label).width > maxWidth) {
        while (ctx.measureText(label + "...").width > maxWidth && label.length > 0) {
          label = label.slice(0, -1);
        }
        label += "...";
      }
      ctx.fillText(label, node.x, node.y + 30);
    });
  }, [nodes]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading mindmap...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Network className="h-5 w-5 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Knowledge Mindmap</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Legend */}
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Entry Types</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              <BookOpen className="h-3 w-3 mr-1" />
              <span>Journal</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              <StickyNote className="h-3 w-3 mr-1" />
              <span>Notes</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <User className="h-3 w-3 mr-1" />
              <span>People</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <MapPin className="h-3 w-3 mr-1" />
              <span>Places</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
              <Package className="h-3 w-3 mr-1" />
              <span>Things</span>
            </div>
          </div>
        </div>

        {/* Mindmap Canvas */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {nodes.length > 0 ? (
            <canvas
              ref={canvasRef}
              className="w-full h-96 md:h-[600px]"
              style={{ background: "#F9FAFB" }}
            />
          ) : (
            <div className="h-96 md:h-[600px] flex items-center justify-center">
              <div className="text-center">
                <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No connections yet</h3>
                <p className="text-gray-500">
                  Create entries and use hashtags to link them together. Your mindmap will appear here!
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            Lines connect entries that reference each other through hashtags. 
            The closer entries are positioned, the more connected they are in your knowledge base.
          </p>
        </div>
      </div>
    </div>
  );
}