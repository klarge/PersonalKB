import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Network } from "lucide-react";

interface MindmapNode {
  id: string;
  label: string;
  date: string;
}

interface MindmapData {
  nodes: MindmapNode[];
  edges: { from: string; to: string }[];
}

export default function MindmapPage() {
  const { data: mindmapData, isLoading } = useQuery<MindmapData>({
    queryKey: ["/api/mindmap"],
  });

  return (
    <div className="min-h-screen flex bg-neutral">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-dark">Knowledge Mindmap</h2>
            <span className="text-sm text-secondary">
              Visualize connections between your entries
            </span>
          </div>
        </header>

        {/* Mindmap Content */}
        <div className="flex-1 overflow-auto">
          <div className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-secondary">Loading mindmap...</div>
              </div>
            ) : !mindmapData || mindmapData.nodes.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Network className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-dark mb-2">No data to visualize</h3>
                  <p className="text-secondary">
                    Start creating entries to see connections in your knowledge base
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full bg-white">
                {/* Simple visualization - in a real implementation, you'd use a library like D3.js or vis.js */}
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mindmapData.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="bg-primary/10 border border-primary/20 rounded-lg p-4 cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => window.location.href = `/entry/${node.id}`}
                      >
                        <h4 className="font-medium text-dark mb-2">{node.label}</h4>
                        <p className="text-sm text-secondary">
                          {new Date(node.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-dark mb-2">Coming Soon: Interactive Mindmap</h4>
                    <p className="text-secondary text-sm">
                      We're working on a fully interactive mindmap visualization that will show 
                      connections between your entries based on shared tags and references.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
