"use client";

import React, { useState, useEffect } from "react";
import { countWords } from "@/lib/validations";
import { autoRating, calculateRetrievability, isOptimalFrictionZone } from "@/lib/algorithms/fsrs";
import { InterleavingCardItem } from "@/lib/algorithms/interleaving";
import { Eye, CheckCircle2, Timer, Zap, AlertCircle, ArrowRight, Activity } from "lucide-react";
import { Grade } from "ts-fsrs";

interface InterleavedRetrievalQueueProps {
  queue: InterleavingCardItem[];
  onCardReviewed: (cardId: string, grade: Grade, responseTimeSec: number) => Promise<any>;
  onQueueFinished: () => void;
}

export function InterleavedRetrievalQueue({
  queue,
  onCardReviewed,
  onQueueFinished,
}: InterleavedRetrievalQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commitText, setCommitText] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [responseTimeSec, setResponseTimeSec] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [lastReviewFeedback, setLastReviewFeedback] = useState<any | null>(null);

  const currentCard = queue[currentIndex] || null;

  // Đếm thời gian phản hồi thực tế
  useEffect(() => {
    if (!isTimerActive || !currentCard || isRevealed) return;
    const timer = setInterval(() => {
      setResponseTimeSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerActive, currentCard, isRevealed]);

  // Reset khi chuyển thẻ
  useEffect(() => {
    setCommitText("");
    setIsRevealed(false);
    setResponseTimeSec(0);
    setIsTimerActive(true);
  }, [currentIndex]);

  if (!currentCard) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        <h2 className="text-xl font-bold text-white">Đã Hoàn Tất Hàng Đợi Ôn Tập FSRS!</h2>
        <p className="text-sm text-slate-300 max-w-md">
          Không còn thẻ nào đến hạn trong đợt này. Toàn bộ kiến thức đã được củng cố theo mô hình tương phản đa miền.
        </p>
        <button
          onClick={onQueueFinished}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-xs transition cursor-pointer"
        >
          Tiếp Tục Sang Nhật Ký Quyết Định
        </button>
      </div>
    );
  }

  const wordCount = countWords(commitText);
  const isCommitValid = wordCount >= 30;

  // Gợi ý tự động autoRating chống tự chấm điểm thiên kiến
  const suggestedGrade = autoRating(responseTimeSec, 90.0, 5.0);

  const handleReveal = () => {
    if (!isCommitValid) return;
    setIsRevealed(true);
    setIsTimerActive(false);
  };

  const handleGrade = async (grade: Grade) => {
    try {
      const feedback = await onCardReviewed(currentCard.id, grade, responseTimeSec);
      setLastReviewFeedback(feedback);

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onQueueFinished();
      }
    } catch (err: any) {
      alert("Lỗi ghi nhận kết quả: " + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info & Progress */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            HÀNG ĐỢI TRUY XUẤT ĐAN XEN (Phút 6–15) • FSRS-5 & RULE-04
          </div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Thẻ {currentIndex + 1} / {queue.length}</span>
            <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 text-xs font-mono rounded border border-cyan-800">
              Miền: {currentCard.domain_category}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
            <Timer className="w-4 h-4 text-cyan-400" />
            <span>{responseTimeSec}s</span>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Mô hình: [[{currentCard.zettel_uid}]]
          </span>
        </div>
      </div>

      {/* Card Interface */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
        {/* Front Prompt */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-2">
          <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
            Câu Hỏi Tình Huống Nhiễu Loạn (Front Prompt)
          </div>
          <p className="text-sm font-medium text-slate-100 leading-relaxed">
            {currentCard.front_prompt || "Câu hỏi tình huống phản thực tế..."}
          </p>
        </div>

        {/* RULE-04: Commit Before Reveal Input */}
        {!isRevealed ? (
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-300 font-medium">
                Dàn ý cam kết câu trả lời trước khi lật thẻ (Commit Before Reveal) *
              </label>
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded border ${
                  isCommitValid
                    ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                    : "bg-slate-800 text-amber-400 border-slate-700"
                }`}
              >
                {wordCount} / 30 từ tối thiểu (RULE-04)
              </span>
            </div>

            <textarea
              rows={4}
              value={commitText}
              onChange={(e) => setCommitText(e.target.value)}
              placeholder="Gõ ngắn gọn lập luận và cơ chế phân tích của bạn (tối thiểu 30 từ). Mặt sau bị khóa cho đến khi bạn bấm 'Lật Thẻ'..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
            />

            <div className="flex justify-between items-center pt-2">
              <div className="text-[11px] text-slate-500 italic">
                Chống thiên kiến &ldquo;biết rồi khổ lắm nói mãi&rdquo; (Hindsight Bias).
              </div>

              <button
                onClick={handleReveal}
                disabled={!isCommitValid}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isCommitValid
                    ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                <Eye className="w-4 h-4" />
                Lật Mặt Sau & Đối Chiếu
              </button>
            </div>
          </div>
        ) : (
          /* Mặt sau sau khi được mở khóa */
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            {/* User Commit text preview */}
            <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 text-xs">
              <span className="font-mono text-slate-500 block mb-1">Cam kết của bạn trước khi lật:</span>
              <p className="text-slate-300 italic">&ldquo;{commitText}&rdquo;</p>
            </div>

            {/* Back Structure */}
            <div className="bg-slate-900/70 border border-emerald-900/60 rounded-xl p-5 flex flex-col gap-2">
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đáp Án Cơ Chế Chuẩn Xác (Back Structure)</span>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
                {currentCard.back_structure || "Đáp án chuẩn xác..."}
              </p>
            </div>

            {/* Rating Buttons & autoRating suggestion */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Chấm điểm chất lượng truy xuất FSRS:</span>
                <span className="text-cyan-400 font-mono text-[11px] flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  Gợi ý tự động ({responseTimeSec}s): Grade {suggestedGrade}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => handleGrade(1)}
                  className="px-4 py-3 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition"
                >
                  <span className="text-sm font-bold">Again (1)</span>
                  <span className="text-[10px] text-rose-400/80 font-normal">Quên / Sai cơ chế</span>
                </button>

                <button
                  onClick={() => handleGrade(2)}
                  className={`px-4 py-3 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
                    suggestedGrade === 2 ? "border-amber-400 ring-2 ring-amber-400/20" : "border-amber-800"
                  }`}
                >
                  <span className="text-sm font-bold">Hard (2)</span>
                  <span className="text-[10px] text-amber-400/80 font-normal">Vất vả (&gt; 1.8x thời gian)</span>
                </button>

                <button
                  onClick={() => handleGrade(3)}
                  className={`px-4 py-3 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
                    suggestedGrade === 3 ? "border-cyan-400 ring-2 ring-cyan-400/20" : "border-cyan-800"
                  }`}
                >
                  <span className="text-sm font-bold">Good (3)</span>
                  <span className="text-[10px] text-cyan-400/80 font-normal">Nhớ đúng trong chuẩn</span>
                </button>

                <button
                  onClick={() => handleGrade(4)}
                  className={`px-4 py-3 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition ${
                    suggestedGrade === 4 ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-emerald-800"
                  }`}
                >
                  <span className="text-sm font-bold">Easy (4)</span>
                  <span className="text-[10px] text-emerald-400/80 font-normal">Nhanh & Tự tin</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
