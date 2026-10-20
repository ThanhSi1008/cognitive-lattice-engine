"use client";

import React, { useState, useEffect } from "react";
import { countWords } from "@/lib/validations";
import { autoRating } from "@/lib/algorithms/fsrs";
import { InterleavingCardItem } from "@/lib/algorithms/interleaving";
import { RecallEvaluationResult } from "@/lib/ai/socratic-engine";
import { Eye, CheckCircle2, Timer, Zap, AlertCircle, ArrowRight, Sparkles, Brain, Scissors } from "lucide-react";
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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [recallEvaluation, setRecallEvaluation] = useState<RecallEvaluationResult | null>(null);

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
    setRecallEvaluation(null);
    setIsEvaluating(false);
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

  const handleReveal = async () => {
    if (!isCommitValid) return;
    setIsRevealed(true);
    setIsTimerActive(false);

    // Call Socratic Deep Structure Recall Evaluation
    setIsEvaluating(true);
    try {
      const res = await fetch("/api/ai/evaluate-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          committedAnswer: commitText,
          backStructure: currentCard.back_structure || "",
          responseTimeSec,
          avgTimeSec: 90,
          difficulty: currentCard.difficulty || 5.0,
          isLeech: !!currentCard.is_leech,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecallEvaluation(data);
      }
    } catch (err) {
      console.error("Recall evaluation error:", err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGrade = async (grade: Grade) => {
    try {
      await onCardReviewed(currentCard.id, grade, responseTimeSec);

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
            {currentCard.is_leech && (
              <span className="px-2 py-0.5 bg-rose-950 text-rose-400 text-xs font-mono rounded border border-rose-800 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Thẻ Đỉa (Leech Quarantine)
              </span>
            )}
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
                Chống thiên kiến "biết rồi khổ lắm nói mãi" (Hindsight Bias).
              </div>

              <button
                onClick={handleReveal}
                disabled={!isCommitValid}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isCommitValid
                    ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer shadow-lg shadow-cyan-500/20"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                <Eye className="w-4 h-4" />
                Lật Thẻ & Đối Chiếu Cấu Trúc Sâu
              </button>
            </div>
          </div>
        ) : (
          /* Mặt sau thẻ sau khi lật */
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            {/* User committed answer vs back structure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                  Câu Trả Lời Cam Kết Của Bạn
                </span>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{commitText}</p>
              </div>

              <div className="bg-slate-900/60 border border-emerald-900/60 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                  Cấu Trúc Đáp Án Bản Chất (Back Structure)
                </span>
                <p className="text-xs text-emerald-100 leading-relaxed whitespace-pre-wrap">
                  {currentCard.back_structure}
                </p>
              </div>
            </div>

            {/* AI Deep Structure Recall Evaluation Panel */}
            <div className="bg-slate-900/80 border border-purple-800/60 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Đối Chiếu Cấu Trúc Sâu AI (Deep Structure Recall Evaluator)
                </span>
                {isEvaluating && <span className="text-slate-400 font-mono animate-pulse">Đang chấm điểm...</span>}
              </div>

              {recallEvaluation ? (
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-300">
                        Điểm Cấu Trúc: <strong className="text-cyan-400">{recallEvaluation.deepStructureScore}/100</strong>
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="font-mono text-slate-300">
                        Độ phủ Khái niệm: <strong className="text-emerald-400">{Math.round(recallEvaluation.conceptCoverage * 100)}%</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-purple-300 font-mono text-[11px] bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                      <span>Đề xuất FSRS:</span>
                      <strong>{recallEvaluation.ratingLabel} (Điểm {recallEvaluation.recommendedFsrsRating})</strong>
                    </div>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">{recallEvaluation.diagnosticFeedback}</p>

                  {recallEvaluation.blindSpots.length > 0 && (
                    <div className="flex flex-col gap-1 text-[11px] text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-900/40">
                      {recallEvaluation.blindSpots.map((spot, i) => (
                        <div key={i}>• {spot}</div>
                      ))}
                    </div>
                  )}

                  {/* Leech Decomposition Suggestion */}
                  {recallEvaluation.leechDecomposition && (
                    <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-lg flex flex-col gap-2 mt-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-300 text-xs">
                        <Scissors className="w-3.5 h-3.5 text-rose-400" />
                        <span>Socratic Leech Decomposer: Gợi Ý Bẻ Nhỏ Thẻ Đỉa</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{recallEvaluation.leechDecomposition.reason}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                        {recallEvaluation.leechDecomposition.atomicCards.map((ac, idx) => (
                          <div key={idx} className="bg-slate-900/80 p-2 rounded border border-slate-800 text-[11px]">
                            <div className="text-rose-400 font-semibold">{ac.frontScenario}</div>
                            <div className="text-slate-400 mt-0.5">{ac.targetConcept}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* FSRS Scoring Bar */}
            <div className="flex flex-col gap-2 pt-2">
              <span className="text-xs text-slate-400 text-center font-mono">
                Chọn mức điểm lưu giữ FSRS-5:
              </span>

              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => handleGrade(1)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition cursor-pointer ${
                    recallEvaluation?.recommendedFsrsRating === 1
                      ? "bg-rose-950 border-rose-500 ring-2 ring-rose-500/50"
                      : "bg-slate-900/60 border-slate-800 hover:border-rose-700/60 text-rose-300"
                  }`}
                >
                  <span className="font-bold text-sm text-rose-400">1: Again</span>
                  <span className="text-[10px] text-slate-400">Quên hoàn toàn</span>
                </button>

                <button
                  onClick={() => handleGrade(2)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition cursor-pointer ${
                    recallEvaluation?.recommendedFsrsRating === 2
                      ? "bg-amber-950 border-amber-500 ring-2 ring-amber-500/50"
                      : "bg-slate-900/60 border-slate-800 hover:border-amber-700/60 text-amber-300"
                  }`}
                >
                  <span className="font-bold text-sm text-amber-400">2: Hard</span>
                  <span className="text-[10px] text-slate-400">Ma sát cao, nhớ chậm</span>
                </button>

                <button
                  onClick={() => handleGrade(3)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition cursor-pointer ${
                    recallEvaluation?.recommendedFsrsRating === 3
                      ? "bg-cyan-950 border-cyan-500 ring-2 ring-cyan-500/50"
                      : "bg-slate-900/60 border-slate-800 hover:border-cyan-700/60 text-cyan-300"
                  }`}
                >
                  <span className="font-bold text-sm text-cyan-400">3: Good</span>
                  <span className="text-[10px] text-slate-400">Nhớ đúng khung</span>
                </button>

                <button
                  onClick={() => handleGrade(4)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition cursor-pointer ${
                    recallEvaluation?.recommendedFsrsRating === 4
                      ? "bg-emerald-950 border-emerald-500 ring-2 ring-emerald-500/50"
                      : "bg-slate-900/60 border-slate-800 hover:border-emerald-700/60 text-emerald-300"
                  }`}
                >
                  <span className="font-bold text-sm text-emerald-400">4: Easy</span>
                  <span className="text-[10px] text-slate-400">Trực giác tức thì</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
