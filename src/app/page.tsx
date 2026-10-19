import { SessionCoordinator } from "@/components/sop/SessionCoordinator";

export default function Home() {
  return (
    <main className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-8">
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
        <div className="flex gap-3">
          <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-mono border border-slate-700">
            DRLI Target: &le; 1.0 (5% / 95%)
          </span>
          <span className="px-3 py-1 bg-emerald-950/80 text-emerald-400 rounded-full text-xs font-mono border border-emerald-800">
            PostgreSQL 16 + pgvector: Ready
          </span>
        </div>
      </header>

      {/* Máy Điều Phối SOP 60 Phút (4 Phân Hệ) */}
      <SessionCoordinator />

      {/* Bảng Điều khiển Nhận thức & Telemetry */}
      <footer className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 mt-4">
        <h3 className="text-md font-semibold text-white mb-4">Điện Tâm Đồ Nhận Thức (Cognitive Telemetry)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            <div className="text-slate-400">Atomic Zettel Velocity</div>
            <div className="text-2xl font-bold text-white mt-1">
              3 – 7 <span className="text-xs text-slate-500 font-normal">Zettels / tuần (Mục tiêu)</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            <div className="text-slate-400">Memory Stability Jump (&Delta;S)</div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              +22.5d <span className="text-xs text-slate-500 font-normal">(vùng R &isin; [0.70, 0.85])</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            <div className="text-slate-400">Target Forgetting Index (FI)</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              10.0% <span className="text-xs text-slate-500 font-normal">(R = 90% Lưu giữ)</span>
            </div>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            <div className="text-slate-400">Leech Quarantine Threshold</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              &ge; 3 <span className="text-xs text-slate-500 font-normal">thẻ kích hoạt ngắt mạch S1</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
