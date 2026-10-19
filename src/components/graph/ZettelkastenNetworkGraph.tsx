"use client";

import React, { useEffect, useRef, useState } from "react";
import cytoscape, { Core, NodeSingular } from "cytoscape";
import { Network, Search, Filter, ZoomIn, ZoomOut, Maximize2, Sparkles, Layers } from "lucide-react";

interface NodeData {
  id: string;
  label: string;
  title: string;
  domain: string;
  wordCount: number;
  state: string;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  rationale: string;
}

interface ZettelkastenNetworkGraphProps {
  initialNodes?: Array<{ data: NodeData }>;
  initialEdges?: Array<{ data: EdgeData }>;
}

const DOMAIN_COLORS: Record<string, string> = {
  "Cognitive Science": "#06b6d4", // Cyan
  "Financial Engineering": "#10b981", // Emerald
  "System Architecture": "#8b5cf6", // Purple
  "Evolutionary Biology": "#f59e0b", // Amber
  "Decision Theory": "#ec4899", // Pink
  "General": "#64748b", // Slate
};

export function ZettelkastenNetworkGraph({
  initialNodes,
  initialEdges,
}: ZettelkastenNetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("ALL");
  const [graphStats, setGraphStats] = useState({ nodesCount: 0, edgesCount: 0, isClustered: false });

  useEffect(() => {
    if (!containerRef.current) return;

    const loadGraphData = async () => {
      let nodes = initialNodes || [];
      let edges = initialEdges || [];

      if (!initialNodes || initialNodes.length === 0) {
        try {
          const res = await fetch("/api/telemetry");
          if (res.ok) {
            const json = await res.json();
            nodes = json.networkGraph?.nodes || [];
            edges = json.networkGraph?.edges || [];
          }
        } catch (err) {
          console.error("Lỗi nạp đồ thị:", err);
        }
      }

      setGraphStats({
        nodesCount: nodes.length,
        edgesCount: edges.length,
        isClustered: nodes.length >= 50,
      });

      // Khởi tạo Cytoscape instance
      const cy = cytoscape({
        container: containerRef.current,
        elements: [...nodes, ...edges],
        style: [
          {
            selector: "node",
            style: {
              "background-color": (ele: NodeSingular) => {
                const domain = ele.data("domain") || "General";
                return DOMAIN_COLORS[domain] || "#3b82f6";
              },
              label: "data(label)",
              color: "#e2e8f0",
              "font-size": "10px",
              "font-family": "monospace",
              "text-valign": "bottom",
              "text-margin-y": 6,
              width: (ele: NodeSingular) => Math.min(48, Math.max(24, (ele.data("wordCount") || 150) / 7)),
              height: (ele: NodeSingular) => Math.min(48, Math.max(24, (ele.data("wordCount") || 150) / 7)),
              "border-width": 2,
              "border-color": "#1e293b",
            },
          },
          {
            selector: "node:selected",
            style: {
              "border-width": 4,
              "border-color": "#38bdf8",
              "background-color": "#ffffff",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "arrow-scale": 0.8,
              "line-color": (ele: any) => {
                const type = ele.data("type");
                if (type === "PATHOLOGY_VIOLATION") return "#f43f5e"; // Rose
                if (type === "SUPPORTS") return "#a855f7"; // Purple
                if (type === "CONTRADICTS") return "#fb923c"; // Orange
                if (type === "BIOLOGICAL_MECHANISM") return "#10b981"; // Emerald
                return "#38bdf8"; // Light Blue
              },
              "target-arrow-color": (ele: any) => {
                const type = ele.data("type");
                if (type === "PATHOLOGY_VIOLATION") return "#f43f5e";
                if (type === "SUPPORTS") return "#a855f7";
                if (type === "CONTRADICTS") return "#fb923c";
                if (type === "BIOLOGICAL_MECHANISM") return "#10b981";
                return "#38bdf8";
              },
              opacity: 0.65,
            },
          },
        ],
        layout: {
          name: nodes.length >= 50 ? "cose" : "concentric",
          animate: false,
          padding: 30,
        },
      });

      cy.on("tap", "node", (evt) => {
        const node = evt.target;
        setSelectedNode(node.data());
      });

      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          setSelectedNode(null);
        }
      });

      cyRef.current = cy;
    };

    loadGraphData();

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [initialNodes, initialEdges]);

  // Bộ lọc tìm kiếm
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const title = (node.data("title") || "").toLowerCase();
        const id = (node.data("id") || "").toLowerCase();
        const domain = node.data("domain") || "";

        const matchesQuery =
          searchQuery.trim() === "" ||
          title.includes(searchQuery.toLowerCase()) ||
          id.includes(searchQuery.toLowerCase());

        const matchesDomain = selectedDomain === "ALL" || domain === selectedDomain;

        if (matchesQuery && matchesDomain) {
          node.style("display", "element");
        } else {
          node.style("display", "none");
        }
      });
    });
  }, [searchQuery, selectedDomain]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit();

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-0.5">
            Mục 2.4 & 2.5 • Đồ Thị Mạng Lưới Tư Duy WebGL
          </div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <span>Đồ Thị Tri Thức Zettelkasten & Phân Cụm Ngữ Nghĩa (Cytoscape.js)</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-mono px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              graphStats.isClustered
                ? "bg-purple-950 text-purple-400 border-purple-800"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            {graphStats.isClustered && <Sparkles className="w-3.5 h-3.5" />}
            {graphStats.nodesCount} Zettels • {graphStats.edgesCount} Liên kết{" "}
            {graphStats.isClustered && "(&ge; 50 Cụm Tự Động)"}
          </span>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm Zettel theo UID hoặc từ khóa tiêu đề..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">Tất cả miền kiến thức</option>
            <option value="Cognitive Science">Cognitive Science</option>
            <option value="Financial Engineering">Financial Engineering</option>
            <option value="System Architecture">System Architecture</option>
            <option value="Evolutionary Biology">Evolutionary Biology</option>
            <option value="Decision Theory">Decision Theory</option>
          </select>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition border-l border-slate-800"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFit}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition border-l border-slate-800"
              title="Khớp khung nhìn"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph Canvas Container */}
      <div className="relative w-full h-[540px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 bg-slate-900/95 border border-slate-700/80 rounded-xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-2 text-xs animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-start">
              <span className="font-mono text-cyan-400 font-bold">[[{selectedNode.id}]]</span>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono">
                {selectedNode.domain}
              </span>
            </div>
            <h4 className="font-bold text-white text-sm leading-snug">{selectedNode.title}</h4>
            <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono pt-1 border-t border-slate-800">
              <span>Độ dài: {selectedNode.wordCount} từ</span>
              <span>Trạng thái: {selectedNode.state}</span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 text-[10px] font-mono flex flex-col gap-1.5 backdrop-blur-sm pointer-events-none">
          <div className="text-slate-400 font-bold mb-0.5">Quy ước màu miền:</div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]"></span> Cognitive Science
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> Financial Engineering
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]"></span> System Architecture
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> Evolutionary Biology
          </div>
        </div>
      </div>
    </div>
  );
}
