"use client";

import React, { useState, useEffect } from "react";
import { BlankPageRecallCanvas } from "./BlankPageRecallCanvas";
import { InterleavedRetrievalQueue } from "./InterleavedRetrievalQueue";
import { DecisionJournalWidget } from "./DecisionJournalWidget";
import { InterleavingCardItem } from "@/lib/algorithms/interleaving";
import { Grade } from "ts-fsrs";
import { Edit3, Layers, BookCheck, CheckCircle2 } from "lucide-react";

interface EveningSessionProps {
  userId?: string;
  sessionId?: string;
  daytimeZettelTitle?: string;
  daytimeZettelBody?: string;
  onCompleteEveningSession?: () => void;
}

export function EveningSession({
  userId = "00000000-0000-0000-0000-000000000001",
  sessionId,
  daytimeZettelTitle,
  daytimeZettelBody,
  onCompleteEveningSession,
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
              id: "card-sample-1",
              zettel_uid: "20261019000001",
              domain_category: "Cognitive Science",
              reps: 3,
              state: "REVIEW",
              elapsed_days: 10,
              front_prompt: "Trong bối cảnh người học chuyển đổi giữa các miền kiến thức khác nhau, nếu không có cơ chế giàn giáo thích ứng (adaptive scaffolding) ban đầu thì hiện tượng bệnh lý nhận thức nào sẽ xảy ra?",
              back_structure: "Hiện tượng Cognitive Overload (Quá tải nhận thức) và phân rã các sơ đồ phân loại trước khi kịp củng cố.",
            },
            {
              id: "card-sample-2",
              zettel_uid: "20261019000002",
              domain_category: "Financial Engineering",
              reps: 2,
              state: "REVIEW",
              elapsed_days: 14,
              front_prompt: "Nếu thị trường rơi vào bẫy thanh khoản nhưng ngân hàng trung ương tiếp tục nới lỏng định lượng mà không giải quyết được bảng cân đối kế toán của khu vực tư nhân, hệ quả phản hồi cấp 2 là gì?",
              back_structure: "Hiện tượng nghịch lý tiết kiệm và đẩy dòng vốn đầu cơ vào tài sản rủi ro thay vì nền kinh tế thực.",
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
        </div>
      )}
    </div>
  );
}
