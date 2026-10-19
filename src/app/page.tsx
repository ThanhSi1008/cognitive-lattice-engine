import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <header className="border-b border-slate-800 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse"></span>
            Cognitive Lattice Engine (CLE)
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Nền tảng Tối ưu Nhận thức & Quản trị Tri thức Chuyên sâu (SOP 60 Phút/Ngày • FSRS-5 • Zettelkasten)
          </p>
        </div>
        <div className="flex gap-3">
          <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-mono border border-slate-700">
            DRLI: 0.0 (Cân bằng)
          </span>
          <span className="px-3 py-1 bg-emerald-950/80 text-emerald-400 rounded-full text-xs font-mono border border-emerald-800">
            PostgreSQL 16 + pgvector: Ready
          </span>
        </div>
      </header>

      {/* Grid 4 Phân hệ SOP */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Phân hệ 1 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="text-xs font-mono text-cyan-400 mb-2">PHÂN HỆ 1 • 20 PHÚT</div>
            <h2 className="text-lg font-semibold text-white mb-2">Phiên Sáng: Tiếp Thu Chủ Động</h2>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Cổng Đoán Trước (180s, &ge; 50 từ)</li>
              <li>Tự Giải Thích & Critical Audit</li>
              <li>Ma trận Tương tự (&ge; 3 miền)</li>
              <li>Ghi chú Đóng sách (50-200 từ)</li>
            </ul>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-500 font-mono">
            <span>RULE-01 • Zero Highlight</span>
            <span className="text-cyan-400">08:00 AM</span>
          </div>
        </div>

        {/* Phân hệ 2 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="text-xs font-mono text-amber-400 mb-2">PHÂN HỆ 2 • GIỮA NGÀY</div>
            <h2 className="text-lg font-semibold text-white mb-2">Bộ Đệm Chuyển Hóa Thần Kinh</h2>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Khóa Ủ Sinh học (Neural Incubation &ge; 4h)</li>
              <li>Fleeting Notes Hộp Đệm Nhanh</li>
              <li>Hard TTL 48 Giờ Tự Hủy</li>
              <li>Chống Ngụy biện Tích trữ</li>
            </ul>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-500 font-mono">
            <span>Diffuse Mode</span>
            <span className="text-amber-400">Lock: 4 Hours</span>
          </div>
        </div>

        {/* Phân hệ 3 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="text-xs font-mono text-purple-400 mb-2">PHÂN HỆ 3 • 20 PHÚT</div>
            <h2 className="text-lg font-semibold text-white mb-2">Xưởng Chưng Cất Nguyên Tử</h2>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Permanent Zettel (100-350 từ)</li>
              <li>Liên kết Hai chiều Cưỡng bức (&ge; 2 links)</li>
              <li>Giải thích liên kết &ge; 30 ký tự</li>
              <li>Perturbation Card Studio (2-3 thẻ)</li>
            </ul>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-500 font-mono">
            <span>Zettelkasten Graph</span>
            <span className="text-purple-400">02:00 PM</span>
          </div>
        </div>

        {/* Phân hệ 4 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="text-xs font-mono text-emerald-400 mb-2">PHÂN HỆ 4 • 20 PHÚT</div>
            <h2 className="text-lg font-semibold text-white mb-2">Phòng Thí Nghiệm Truy Xuất</h2>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Gợi nhớ Trang trắng (Excalidraw)</li>
              <li>Hàng đợi FSRS Đan xen Tương phản</li>
              <li>Cam kết &ge; 30 từ trước khi lật mặt</li>
              <li>Nhật ký Quyết định (Brier Score)</li>
            </ul>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-500 font-mono">
            <span>FSRS-5 • RULE-04</span>
            <span className="text-emerald-400">08:00 PM</span>
          </div>
        </div>
      </section>

      {/* Bảng Điều khiển Nhận thức & Telemetry */}
      <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <h3 className="text-md font-semibold text-white mb-4">Điện Tâm Đồ Nhận Thức (Cognitive Telemetry)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            <div className="text-xs text-slate-400">Atomic Zettel Velocity</div>
            <div className="text-2xl font-bold text-white mt-1">0 <span className="text-xs text-slate-500 font-normal">/ tuần (Mục tiêu: 3-7)</span></div>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            <div className="text-xs text-slate-400">Memory Stability Jump (&Delta;S)</div>
            <div className="text-2xl font-bold text-white mt-1">-- <span className="text-xs text-slate-500 font-normal">(R &isin; [0.70, 0.85])</span></div>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            <div className="text-xs text-slate-400">Target Forgetting Index (FI)</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">10.0% <span className="text-xs text-slate-500 font-normal">(R = 90%)</span></div>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
            <div className="text-xs text-slate-400">Active Leech Quarantine</div>
            <div className="text-2xl font-bold text-slate-300 mt-1">0 <span className="text-xs text-slate-500 font-normal">cards (&ge; 3 khóa S1)</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
