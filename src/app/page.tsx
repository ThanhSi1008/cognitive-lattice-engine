"use client";

import React, { useState, useCallback } from "react";
import { SessionCoordinator } from "@/components/sop/SessionCoordinator";
import { CognitiveTelemetryDashboard } from "@/components/dashboard/CognitiveTelemetryDashboard";
import { ZettelkastenNetworkGraph } from "@/components/graph/ZettelkastenNetworkGraph";

export default function Home() {
  const [dataVersion, setDataVersion] = useState(0);

  const handleDataMutated = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  return (
    <main className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-10">
      <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Cognitive Lattice Engine (CLE)
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Nền tảng Tối ưu Nhận thức & Quản trị Tri thức Chuyên sâu (SOP 60 Phút/Ngày • FSRS-5 • Zettelkasten)
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-mono border border-slate-700">
            DRLI Target: &le; 1.0 (5% / 95%)
          </span>
          <span className="px-3 py-1 bg-emerald-950/80 text-emerald-400 rounded-full text-xs font-mono border border-emerald-800">
            PostgreSQL 16 + pgvector: Ready
          </span>
          <span 
            className="px-3 py-1 bg-cyan-950/80 text-cyan-300 rounded-full text-xs font-mono border border-cyan-800 flex items-center gap-1.5"
            title="Lưu trữ bền vững tự động tại .cle-pglite-data (hoặc DATABASE_URL)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Lưu Trữ Bền Vững: .cle-pglite-data (Active)
          </span>
        </div>
      </header>

      {/* Máy Điều Phối SOP 60 Phút (4 Phân Hệ) */}
      <section className="flex flex-col gap-3">
        <SessionCoordinator onDataMutated={handleDataMutated} />
      </section>

      {/* Đồ Thị Mạng Lưới Tư Duy WebGL Cytoscape.js */}
      <section className="flex flex-col gap-3">
        <ZettelkastenNetworkGraph refreshTrigger={dataVersion} />
      </section>

      {/* Bảng Điều Khiển Điện Tâm Đồ Nhận Thức (4 Thước Đo Cốt Lõi) */}
      <section className="flex flex-col gap-3">
        <CognitiveTelemetryDashboard refreshTrigger={dataVersion} />
      </section>
    </main>
  );
}
