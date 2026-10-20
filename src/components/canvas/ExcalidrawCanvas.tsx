"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import Excalidraw with SSR disabled to prevent server-side window errors
const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl text-slate-500 font-mono text-xs">
        <span className="animate-pulse">Đang nạp Khung Vẽ Excalidraw...</span>
      </div>
    ),
  }
);

export interface ExcalidrawCanvasProps {
  initialData?: any;
  onChange?: (elements: readonly any[], appState: any) => void;
  height?: string;
}

export function ExcalidrawCanvas({
  initialData,
  onChange,
  height = "420px",
}: ExcalidrawCanvasProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ height }} className="w-full flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl text-slate-500 font-mono text-xs">
        Khởi tạo Excalidraw Canvas...
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full rounded-xl overflow-hidden border border-slate-800 relative shadow-inner">
      <Excalidraw
        theme="dark"
        initialData={initialData}
        onChange={(elements, appState) => {
          onChange?.(elements, appState);
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: { saveFileToDisk: false },
          },
        }}
      />
    </div>
  );
}
