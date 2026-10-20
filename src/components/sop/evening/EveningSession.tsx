"use client";

import React, { useState, useEffect } from "react";
import { BlankPageRecallCanvas } from "./BlankPageRecallCanvas";
import { InterleavedRetrievalQueue } from "./InterleavedRetrievalQueue";
import { DecisionJournalWidget } from "./DecisionJournalWidget";
import { InterleavingCardItem } from "@/lib/algorithms/interleaving";
import { Grade } from "ts-fsrs";
import { Edit3, Layers, BookCheck, CheckCircle2, RefreshCw } from "lucide-react";

interface EveningSessionProps {
  userId?: string;
  sessionId?: string;
  daytimeZettelTitle?: string;
  daytimeZettelBody?: string;
  onCompleteEveningSession?: () => void;
  onResetCycle?: () => void;
  isResetting?: boolean;
}

export function EveningSession({
  userId = "00000000-0000-0000-0000-000000000001",
  sessionId,
  daytimeZettelTitle,
  daytimeZettelBody,
  onCompleteEveningSession,
  onResetCycle,
  isResetting,
}: EveningSessionProps) {
  const [subStep, setSubStep] = useState<"RECALL_4_1" | "RETRIEVAL_4_2" | "DECISION_4_3" | "ALL_COMPLETED">("RECALL_4_1");
  const [queue, setQueue] = useState<InterleavingCardItem[]>([]);

  useEffect(() => {
    // Tải hàng đợi thẻ FSRS đến hạn đã được sắp xếp bởi Max-Contrast Greedy Ordering
    fetch(`/api/cards?userId=${userId}&dueOnly=false`)
      .then((res) => res.json())
      .then((data) => {
        if (data.orderedQueue && data.orderedQueue.length > 0) {
          setQueue(data.orderedQueue);
        } else {
          // Dữ liệu mẫu nếu chưa có thẻ trong db
          setQueue([
            {
              id: "11111111-1111-4111-8111-111111111101",
              zettel_uid: "20261019000001",
              domain_category: "Cognitive Science",
              reps: 2,
              state: "REVIEW",
              elapsed_days: 2,
              front_prompt: "Giả sử tỷ lệ nợ nhận thức DRLI vượt quá ngưỡng 1.5 nhưng hệ thống không ngắt mạch mà tiếp tục cho nạp tài liệu mới, phản ứng dây chuyền nào sẽ xảy ra đối với cấu trúc mạng lưới nơ-ron?",
              back_structure: "Hiện tượng quá tải bộ nhớ làm việc (Cognitive Overload), suy thoái độ ổn định của các thẻ cũ và kích hoạt ảo tưởng thông thạo (Illusion of Competence).",
            },
            {
              id: "11111111-1111-4111-8111-111111111102",
              zettel_uid: "20261019000002",
              domain_category: "System Dynamics",
              reps: 2,
              state: "REVIEW",
              elapsed_days: 2,
              front_prompt: "So sánh sự khác biệt bản chất giữa phản ứng thích ứng ngắn hạn của các tác tử đơn lẻ với cân bằng động dài hạn của toàn bộ hệ thống phức hợp khi có can thiệp chính sách cục bộ?",
              back_structure: "Can thiệp cục bộ giải quyết triệu chứng bề mặt tức thời nhưng tạo ra các vòng phản hồi bù trừ cấp hai làm trầm trọng thêm vấn đề gốc rễ sau một khoảng trễ thời gian.",
            },
          ]);
        }
      })
      .catch((err) => console.error(err));
  }, [userId]);

  const handleCardReview = async (cardId: string, grade: Grade, responseTimeSec: number) => {
    const res = await fetch("/api/cards", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, grade, responseTimeSec }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Lỗi lưu kết quả ôn tập thẻ FSRS");
    }
    return await res.json();
  };

  const handleDecisionCommitted = async () => {
    try {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userId,
          s3_completed_at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error("Lỗi cập nhật s3_completed_at:", e);
    }
    setSubStep("ALL_COMPLETED");
    if (onCompleteEveningSession) onCompleteEveningSession();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Step Navigator */}
      <div className="flex bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setSubStep("RECALL_4_1")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
            subStep === "RECALL_4_1"
              ? "bg-slate-800 text-white shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
          <span>1. Gợi Nhớ Trang Trắng (Phút 1–5)</span>
        </button>

        <button
          onClick={() => setSubStep("RETRIEVAL_4_2")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
            subStep === "RETRIEVAL_4_2"
              ? "bg-slate-800 text-white shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>2. Hàng Đợi FSRS Đan Xen (Phút 6–15)</span>
        </button>

        <button
          onClick={() => setSubStep("DECISION_4_3")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
            subStep === "DECISION_4_3"
              ? "bg-slate-800 text-white shadow"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>3. Nhật Ký Quyết Định (Phút 16–20)</span>
        </button>
      </div>

      {/* Sub-step content */}
      {subStep === "RECALL_4_1" && (
        <BlankPageRecallCanvas
          daytimeZettelTitle={daytimeZettelTitle}
          daytimeZettelBody={daytimeZettelBody}
          onRecallCommitted={async (recallData) => {
            try {
              await fetch("/api/sessions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionId,
                  userId,
                  s3_blank_recall_data: recallData,
                }),
              });
            } catch (e) {
              console.error("Lỗi lưu s3_blank_recall_data:", e);
            }
          }}
          onProceedToRetrievalQueue={() => setSubStep("RETRIEVAL_4_2")}
        />
      )}

      {subStep === "RETRIEVAL_4_2" && (
        <InterleavedRetrievalQueue
          queue={queue}
          onCardReviewed={handleCardReview}
          onQueueFinished={() => setSubStep("DECISION_4_3")}
        />
      )}

      {subStep === "DECISION_4_3" && (
        <DecisionJournalWidget
          userId={userId}
          onDecisionCommitted={handleDecisionCommitted}
        />
      )}

      {subStep === "ALL_COMPLETED" && (
        <div className="bg-emerald-950/30 border border-emerald-800 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">SOP 60 Phút Hôm Nay Đã Hoàn Tất Toàn Diện!</h2>
          <p className="text-sm text-slate-300 max-w-lg">
            95% tri thức đã được bảo toàn qua truy xuất đan xen. Nhật ký quyết định đã được khóa an toàn và hẹn giờ kiểm toán tại mốc +30 ngày.
          </p>
          {onResetCycle && (
            <button
              type="button"
              onClick={onResetCycle}
              disabled={isResetting}
              className="mt-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
              <span>🔄 Khởi Tạo Chu Kỳ Luyện Tập Mới / Học Tiếp Bài Tiếp Theo</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
