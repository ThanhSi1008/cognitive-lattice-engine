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
  RefreshCw,
} from "lucide-react";

interface SessionCoordinatorProps {
  onDataMutated?: () => void;
}

export function SessionCoordinator({ onDataMutated }: SessionCoordinatorProps = {}) {
  const userId = "00000000-0000-0000-0000-000000000001";
  const [activeTab, setActiveTab] = useState<"MORNING" | "MIDDAY" | "AFTERNOON" | "EVENING" | "REFACTORING">("MORNING");
  const [session, setSession] = useState<any | null>(null);
  const [governor, setGovernor] = useState<CapacityGovernorResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [latestDaytimeZettel, setLatestDaytimeZettel] = useState<{ title: string; body: string } | null>(null);
  const [quarantinedCards, setQuarantinedCards] = useState<any[]>([]);
  const [isSplittingCardId, setIsSplittingCardId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

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

      // Tải Zettel mới nhất của phiên chiều để truyền cho phiên tối
      const zettelRes = await fetch(`/api/zettels?userId=${userId}`);
      if (zettelRes.ok) {
        const zData = await zettelRes.json();
        if (zData.zettels && zData.zettels.length > 0) {
          const latest = zData.zettels[0];
          setLatestDaytimeZettel({
            title: latest.atomic_title,
            body: latest.body_text,
          });
        }
      }

      // Tải danh sách thẻ đỉa đang bị cách ly
      const cardsRes = await fetch(`/api/cards?userId=${userId}&dueOnly=false`);
      if (cardsRes.ok) {
        const cData = await cardsRes.json();
        const leeches = (cData.orderedQueue || []).filter(
          (c: any) => c.state === "LEECH_QUARANTINE" || c.difficulty >= 8.5 || c.is_leech
        );
        setQuarantinedCards(leeches);
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
    onDataMutated?.();
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
    onDataMutated?.();
    setActiveTab("EVENING");
  };

  const handleResetCycle = async () => {
    if (!session?.id) return;
    setIsResetting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session.id,
          resetCycle: true,
        }),
      });
      if (res.ok) {
        await loadSession();
        setActiveTab("MORNING");
        onDataMutated?.();
      }
    } catch (err) {
      console.error("Lỗi khởi tạo chu kỳ mới:", err);
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-xs font-mono text-slate-500">
        Đang khởi động Máy Trạng Thái SOP 60 Phút...
      </div>
    );
  }

  const isTripped = governor?.isCircuitBreakerTripped || false;
  const morningMinutes = governor?.sessionSchedule?.morningMinutes ?? 20;
  const afternoonMinutes = governor?.sessionSchedule?.afternoonMinutes ?? 20;
  const eveningMinutes = governor?.sessionSchedule?.eveningMinutes ?? 20;
  const isElasticAdaptive = governor?.mode === "ELASTIC_ADAPTIVE";

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
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs transition shrink-0 cursor-pointer"
          >
            Vào Chế Độ Tái Cấu Trúc
          </button>
        </div>
      )}

      {/* Elastic Adaptive Schedule Banner (1.0 < DRLI <= 1.5 - Mục 2.3.3) */}
      {isElasticAdaptive && !isTripped && (
        <div className="bg-amber-950/70 border border-amber-800 text-amber-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-xs uppercase text-amber-300">
                CHẾ ĐỘ THÍCH ỨNG CO GIÃN THEO DRLI ({governor?.drli}) • MỤC 2.3.3
              </div>
              <p className="text-xs text-amber-200 mt-0.5">
                Áp lực ôn tập quá hạn (DRLI &gt; 1.0). Bộ điều tốc Dung lượng 5%/95% đã tự động rút ngắn Phiên Sáng xuống <strong>{morningMinutes} phút</strong> và kéo dài Phiên Tối lên <strong>{eveningMinutes} phút</strong> ({governor?.sessionSchedule?.eveningReviewBudgetSec ? Math.round(governor.sessionSchedule.eveningReviewBudgetSec / 60) : 20}m ôn thẻ) để bảo vệ kho tri thức cũ.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-900/80 text-amber-300 text-xs font-mono rounded-lg border border-amber-700 shrink-0 font-bold">
            {morningMinutes}m Sáng / {eveningMinutes}m Tối
          </span>
        </div>
      )}

      {/* Banner Hoàn Tất Chu Kỳ Học 60 Phút & Nút Khởi Tạo Chu Kỳ Mới */}
      {session?.s3_completed_at && (
        <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-600/50 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xl animate-in fade-in">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white">
                  Chu Kỳ Luyện Tập 60 Phút Hôm Nay Đã Hoàn Tất Toàn Diện!
                </h3>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700 font-bold uppercase tracking-wider">
                  SOP COMPLETED
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Toàn bộ 4 phân hệ (Sáng – Giữa Ngày – Chiều – Tối) đã khép kín. Tri thức đã được bảo toàn qua truy xuất đan xen và cam kết quyết định. Bạn có thể chủ động bắt đầu chu kỳ luyện tập mới để học bài tiếp theo trong lộ trình 5 ngày bất cứ lúc nào.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetCycle}
            disabled={isResetting}
            className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shrink-0 shadow-lg hover:shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
            <span>🔄 Khởi Tạo Chu Kỳ Luyện Tập Mới / Học Tiếp Bài Tiếp Theo</span>
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
            <div className="flex items-center gap-1.5">
              <span>Phân Hệ 1 • Sáng ({morningMinutes}m)</span>
              {isElasticAdaptive && (
                <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 text-[9px] rounded border border-amber-800 font-mono">
                  -10m
                </span>
              )}
            </div>
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
            <div>Phân Hệ 3 • Chiều ({afternoonMinutes}m)</div>
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
            <div className="flex items-center gap-1.5">
              <span>Phân Hệ 4 • Tối ({eveningMinutes}m)</span>
              {isElasticAdaptive && (
                <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 text-[9px] rounded border border-amber-800 font-mono">
                  +10m
                </span>
              )}
            </div>
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
          sessionId={session?.id}
          s1CompletedAt={session?.s1_completed_at}
          incubationUnlockAt={session?.incubation_unlock_at}
          onUnlockedForAfternoon={() => setActiveTab("AFTERNOON")}
          onFastForwardIncubation={async () => {
            await loadSession();
            setActiveTab("AFTERNOON");
          }}
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
          sessionId={session?.id}
          daytimeZettelTitle={latestDaytimeZettel?.title}
          daytimeZettelBody={latestDaytimeZettel?.body}
          onCompleteEveningSession={() => {
            // Hoàn tất chu kỳ ngày
            loadSession();
            onDataMutated?.();
          }}
          onResetCycle={handleResetCycle}
          isResetting={isResetting}
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
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded text-xs transition cursor-pointer"
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
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-xs transition cursor-pointer"
              >
                Vào Hộp Đệm Fleeting Notes
              </button>
            </div>
          </div>

          {/* Trạm Phẫu Thuật Thẻ Đỉa Trực Tiếp (Leech Rehabilitation Studio) */}
          <div className="bg-slate-950 p-5 rounded-xl border border-rose-900/40 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-rose-400 font-semibold uppercase block">
                  Trạm Cách Ly & Phẫu Thuật Thẻ Đỉa (Leech Quarantine Rehabilitation)
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  Các thẻ bị quên nhiều lần (lapses &ge; 3 hoặc difficulty &ge; 8.5)
                </h3>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800">
                {quarantinedCards.length} thẻ đang cách ly
              </span>
            </div>

            {quarantinedCards.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {quarantinedCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs"
                  >
                    <div className="flex flex-col gap-1 max-w-xl">
                      <div className="font-semibold text-slate-200">{card.front_prompt}</div>
                      <div className="text-[11px] text-slate-400 italic">Đáp án: {card.back_structure}</div>
                      <div className="text-[10px] font-mono text-rose-400">
                        Lapses: {card.lapses || 3} • Độ khó: {card.difficulty || 8.5} • Mô hình: [[{card.zettel_uid}]]
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSplittingCardId === card.id}
                      onClick={async () => {
                        setIsSplittingCardId(card.id);
                        try {
                          const res = await fetch("/api/cards/refactor-leech", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              cardId: card.id,
                              atomicCards: [
                                {
                                  front_prompt: `[Phân rã tiền đề ${card.zettel_uid}]: Phân tích điều kiện biên tiên quyết buộc phải hội đủ để kích hoạt cơ chế vận hành trong mô hình này.`,
                                  back_structure: `Điều kiện biên tiên quyết phân lập duy nhất biến số kích hoạt đầu vào.`,
                                },
                                {
                                  front_prompt: `[Phân rã truyền dẫn ${card.zettel_uid}]: Giải trình chuỗi phản ứng dây chuyền chuyển hóa tác động đầu vào thành kết quả đầu ra trong hệ thống này.`,
                                  back_structure: `Chuỗi mắt xích trung gian giải thích cơ chế biến đổi trạng thái hệ thống.`,
                                },
                              ],
                            }),
                          });
                          if (res.ok) {
                            await loadSession();
                            onDataMutated?.();
                          }
                        } catch (e) {
                          console.error("Lỗi phẫu thuật thẻ đỉa:", e);
                        } finally {
                          setIsSplittingCardId(null);
                        }
                      }}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition shrink-0 cursor-pointer shadow"
                    >
                      {isSplittingCardId === card.id ? "Đang bẻ nhỏ..." : "Phân Rã 2 Thẻ Con & Mở Khóa"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded-lg">
                ✓ Tuyệt vời! Hiện tại không có thẻ nào rơi vào diện cách ly Leech Quarantine.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
