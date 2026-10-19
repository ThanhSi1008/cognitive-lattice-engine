"use client";

import React, { useState, useEffect } from "react";
import { MorningSession } from "./morning/MorningSession";
import { MiddaySession } from "./midday/MiddaySession";
import { AfternoonSession } from "./afternoon/AfternoonSession";
import { EveningSession } from "./evening/EveningSession";
import { CapacityGovernorResult } from "@/lib/algorithms/governor";
import {
  Sun,
  Coffee,
  Sunset,
  Moon,
  AlertOctagon,
  ShieldAlert,
  Activity,
  Layers,
  CheckCircle2,
} from "lucide-react";

export function SessionCoordinator() {
  const userId = "00000000-0000-0000-0000-000000000001";
  const [activeTab, setActiveTab] = useState<"MORNING" | "MIDDAY" | "AFTERNOON" | "EVENING" | "REFACTORING">("MORNING");
  const [session, setSession] = useState<any | null>(null);
  const [governor, setGovernor] = useState<CapacityGovernorResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/sessions?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setGovernor(data.governor);

        // Nếu ngắt mạch kích hoạt, tự động chuyển hướng sang Refactoring Mode
        if (data.governor?.isCircuitBreakerTripped) {
          setActiveTab("REFACTORING");
        }
      }
    } catch (err) {
      console.error("Lỗi tải thông tin phiên:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const handleMorningCompleted = async (completedAt: Date) => {
    // Cập nhật s1_completed_at lên server
    await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: session?.id,
        s1_completed_at: completedAt.toISOString(),
      }),
    });
    await loadSession();
    setActiveTab("MIDDAY");
  };

  const handleAfternoonCompleted = async (zettelUid: string) => {
    await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: session?.id,
        s2_completed_at: new Date().toISOString(),
      }),
    });
    await loadSession();
    setActiveTab("EVENING");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-xs font-mono text-slate-500">
        Đang khởi động Máy Trạng Thái SOP 60 Phút...
      </div>
    );
  }

  const isTripped = governor?.isCircuitBreakerTripped || false;

  return (
    <div className="flex flex-col gap-8">
      {/* Circuit Breaker Alert Banner (RULE-02) */}
      {isTripped && (
        <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-white">NGẮT MẠCH NỢ NHẬN THỨC ĐÃ KÍCH HOẠT (RULE-02)</div>
              <p className="text-xs text-rose-300 mt-0.5">
                Cổng nạp kiến thức mới bị khóa cứng! Toàn bộ 60 phút được phân bổ cho <strong>System Refactoring Mode</strong> để bảo toàn 95% tri thức cũ.
              </p>
              <div className="text-[11px] text-rose-400 mt-1 font-mono">
                {governor?.circuitBreakerReasons?.join(" | ")}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("REFACTORING")}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs transition shrink-0"
          >
            Vào Chế Độ Tái Cấu Trúc
          </button>
        </div>
      )}

      {/* Phân Hệ Navigation Tabs */}
      <nav className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold gap-1.5">
        <button
          onClick={() => setActiveTab("MORNING")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition ${
            activeTab === "MORNING"
              ? "bg-slate-800 text-white shadow-md border border-slate-700"
              : isTripped
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sun className="w-4 h-4 text-cyan-400" />
          <div className="text-left">
            <div>Phân Hệ 1 • Sáng (20m)</div>
            <div className="text-[10px] text-slate-500 font-normal">Tiếp thu chủ động</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("MIDDAY")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition ${
            activeTab === "MIDDAY"
              ? "bg-slate-800 text-white shadow-md border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Coffee className="w-4 h-4 text-amber-400" />
          <div className="text-left">
            <div>Phân Hệ 2 • Giữa Ngày</div>
            <div className="text-[10px] text-slate-500 font-normal">Khóa ủ 4h & TTL 48h</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("AFTERNOON")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition ${
            activeTab === "AFTERNOON"
              ? "bg-slate-800 text-white shadow-md border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sunset className="w-4 h-4 text-purple-400" />
          <div className="text-left">
            <div>Phân Hệ 3 • Chiều (20m)</div>
            <div className="text-[10px] text-slate-500 font-normal">Xưởng Zettelkasten</div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("EVENING")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition ${
            activeTab === "EVENING"
              ? "bg-slate-800 text-white shadow-md border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Moon className="w-4 h-4 text-emerald-400" />
          <div className="text-left">
            <div>Phân Hệ 4 • Tối (20m)</div>
            <div className="text-[10px] text-slate-500 font-normal">Truy xuất & Quyết định</div>
          </div>
        </button>

        {isTripped && (
          <button
            onClick={() => setActiveTab("REFACTORING")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition ${
              activeTab === "REFACTORING"
                ? "bg-rose-950 text-rose-300 shadow-md border border-rose-800 font-bold"
                : "text-rose-400 hover:text-rose-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <div className="text-left">
              <div>Refactoring Mode</div>
              <div className="text-[10px] text-rose-400/80 font-normal">Dập nợ nhận thức (60m)</div>
            </div>
          </button>
        )}
      </nav>

      {/* Main Tab View */}
      {activeTab === "MORNING" && (
        <MorningSession
          userId={userId}
          isCircuitBreakerTripped={isTripped}
          circuitBreakerReasons={governor?.circuitBreakerReasons}
          onCompleteSession={handleMorningCompleted}
        />
      )}

      {activeTab === "MIDDAY" && (
        <MiddaySession
          userId={userId}
          s1CompletedAt={session?.s1_completed_at}
          incubationUnlockAt={session?.incubation_unlock_at}
          onUnlockedForAfternoon={() => setActiveTab("AFTERNOON")}
        />
      )}

      {activeTab === "AFTERNOON" && (
        <AfternoonSession
          userId={userId}
          onCompleteSession={handleAfternoonCompleted}
        />
      )}

      {activeTab === "EVENING" && (
        <EveningSession
          userId={userId}
          onCompleteEveningSession={() => {
            // Hoàn tất chu kỳ ngày
            loadSession();
          }}
        />
      )}

      {activeTab === "REFACTORING" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <div>
              <h2 className="text-lg font-bold text-white">Chế Độ Tái Cấu Trúc Hệ Thống (System Refactoring Mode)</h2>
              <p className="text-xs text-slate-400">
                Theo Quy luật Tiệm cận Wozniak và RULE-02, người học không được phép nạp thêm bất kỳ tri thức mới nào khi nợ thẻ vượt ngưỡng.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-cyan-400 font-semibold block mb-1">NHIỆM VỤ 1</span>
                <h3 className="text-sm font-bold text-white">Giải quyết toàn bộ hàng đợi FSRS đến hạn</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Có {governor?.dueCardsCount || 0} thẻ đến hạn đang chờ xử lý. Dành thời gian ôn tập kỹ lưỡng và tìm kiếm các liên kết sai lệch.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("EVENING")}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded text-xs transition"
              >
                Vào Hàng Đợi Ôn Tập Ngay
              </button>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-amber-400 font-semibold block mb-1">NHIỆM VỤ 2</span>
                <h3 className="text-sm font-bold text-white">Xử lý hoặc dọn dẹp Fleeting Notes tồn đọng</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Có {governor?.pendingFleetingNotesCount || 0} ghi chú đang pending (&gt; 5 thẻ). Hãy chuyển hóa chúng thành Zettel hoặc xóa bỏ để không bị khóa sáng mai.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("MIDDAY")}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-xs transition"
              >
                Vào Hộp Đệm Fleeting Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
