"use client";

import React, { useState } from "react";
import { countWords } from "@/lib/validations";
import { ExcalidrawCanvas } from "@/components/canvas/ExcalidrawCanvas";
import { Edit3, CheckCircle2, Split, Sparkles, Brain, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface BlankPageRecallCanvasProps {
  daytimeZettelTitle?: string;
  daytimeZettelBody?: string;
  onRecallCommitted: (recallData: {
    canvasSketch: string;
    textRecall: string;
    excalidrawElements?: readonly any[];
    excalidrawAppState?: any;
    aiEvaluation?: any;
  }) => void;
  onProceedToRetrievalQueue?: () => void;
}

export function BlankPageRecallCanvas({
  daytimeZettelTitle = "Mô hình nhận thức nguyên tử",
  daytimeZettelBody = "",
  onRecallCommitted,
  onProceedToRetrievalQueue,
}: BlankPageRecallCanvasProps) {
  const [textRecall, setTextRecall] = useState("");
  const [isCommitted, setIsCommitted] = useState(false);
  const [excalidrawElements, setExcalidrawElements] = useState<readonly any[]>([]);
  const [excalidrawAppState, setExcalidrawAppState] = useState<any>(null);

  const [aiEvaluation, setAiEvaluation] = useState<{
    rating?: number;
    recommendedFsrsRating?: number;
    scorePercent?: number;
    deepStructureScore?: number;
    conceptCoverage?: number;
    causalLinkAccuracy?: string;
    causalConnectivesDetected?: string[];
    diagnosticFeedback?: string;
    feedback?: string;
    blindSpots?: string[];
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const wordCount = countWords(textRecall);
  const canCommit = wordCount >= 30;

  const handleCommit = async () => {
    if (!canCommit) return;
    setIsCommitted(true);

    let evalResult: any = null;
    const backStructure = daytimeZettelBody && daytimeZettelBody.trim().length > 0
      ? daytimeZettelBody
      : "Mô hình nhận thức nguyên tử: Cơ chế cấu trúc sâu và liên kết nhân quả liên miền.";

    setIsEvaluating(true);
    try {
      const res = await fetch("/api/ai/evaluate-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          committedAnswer: textRecall,
          backStructure: backStructure,
          responseTimeSec: 45,
          avgTimeSec: 60,
          difficulty: 5.0,
          isLeech: false,
        }),
      });

      if (res.ok) {
        evalResult = await res.json();
        setAiEvaluation(evalResult);
      }
    } catch (err) {
      console.error("Lỗi đối chiếu cấu trúc sâu với Socratic AI:", err);
    } finally {
      setIsEvaluating(false);
    }

    onRecallCommitted({
      canvasSketch: `[Excalidraw diagram with ${excalidrawElements.length} elements]`,
      textRecall,
      excalidrawElements,
      excalidrawAppState,
      aiEvaluation: evalResult,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            Gợi Nhớ Trang Trắng (Phút 1–5) • RULE-04 & EXCALIDRAW
          </div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-400" />
            <span>Khung Vẽ Gợi Nhớ Tự Do (Excalidraw Vector Canvas)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Toàn bộ ghi chú ban ngày bị ẩn hoàn toàn. Hãy vẽ lại sơ đồ nhân quả và viết lại cơ chế cốt lõi hoàn toàn từ trí nhớ trên khung vẽ Excalidraw.
          </p>
        </div>

        {!isCommitted && (
          <span
            className={`text-xs font-mono px-3 py-1 rounded-full border ${
              canCommit
                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                : "bg-slate-800 text-amber-400 border-slate-700"
            }`}
          >
            {wordCount} / 30 từ tối thiểu (RULE-04)
          </span>
        )}
      </div>

      {!isCommitted ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Khung vẽ Excalidraw Vector */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Excalidraw Vector Canvas (elements: {excalidrawElements.length})
              </span>
              <span className="text-slate-500">Chế độ trang trắng hoàn toàn</span>
            </div>

            <ExcalidrawCanvas
              height="450px"
              onChange={(elements, appState) => {
                setExcalidrawElements(elements);
                setExcalidrawAppState(appState);
              }}
            />
            <div className="text-[10px] text-slate-500 italic">
              Vẽ hình hộp, mũi tên quan hệ, hoặc sơ đồ khối nhân quả biểu diễn khái niệm đã học ban ngày.
            </div>
          </div>

          {/* Cột phải: Nhập văn bản hồi tưởng tự do */}
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <label className="text-xs text-slate-300 font-medium">
              Diễn giải lại cơ chế vận hành từ trí nhớ (Free Recall) *
            </label>
            <textarea
              rows={16}
              value={textRecall}
              onChange={(e) => setTextRecall(e.target.value)}
              placeholder="Nhớ lại không nhìn tài liệu: Mô hình buổi sáng/chiều giải quyết vấn đề gì? Quy luật bất biến cấu trúc là gì? Cơ chế phản hồi cấp 2 vận hành ra sao?..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
            />

            <button
              onClick={handleCommit}
              disabled={!canCommit}
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold transition ${
                canCommit
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-lg shadow-emerald-500/20"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Cam Kết Sơ Đồ & Sang Hàng Đợi FSRS
            </button>
          </div>
        </div>
      ) : (
        /* Màn hình đối chiếu song song sau khi Commit */
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm border-b border-slate-800 pb-3">
            <Split className="w-4 h-4" />
            <span>Màn Hình Đối Chiếu Song Song (Recall vs. Original Zettel)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex flex-col gap-2">
              <span className="text-xs font-mono text-cyan-400 font-semibold">BẢN HỒI TƯỞNG CỦA BẠN (VĂN BẢN & SƠ ĐỒ)</span>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{textRecall}</p>
              <div className="text-[11px] font-mono text-emerald-400 mt-2">
                ✓ Dữ liệu Excalidraw đã lưu ({excalidrawElements.length} phần tử đồ họa)
              </div>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex flex-col gap-2">
              <span className="text-xs font-mono text-purple-400 font-semibold">BẢN ZETTEL GỐC BUỔI CHIỀU</span>
              <h4 className="text-xs font-bold text-white">{daytimeZettelTitle}</h4>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                {daytimeZettelBody || "Chưa có nội dung thân bài Zettel."}
              </p>
            </div>
          </div>

          {/* Khối Đánh Giá Cấu Trúc Sâu Từ Socratic AI Mentor */}
          {isEvaluating && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center gap-3 text-slate-300 text-sm">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              <span>Socratic AI Mentor đang phân tích cấu trúc sâu và phát hiện điểm mù hồi tưởng...</span>
            </div>
          )}

          {aiEvaluation && (
            <div className="p-5 rounded-xl bg-slate-900/90 border border-emerald-900/60 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Đánh Giá Cấu Trúc Sâu & Điểm Mù (Socratic Evaluation)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Điểm Cấu Trúc: {aiEvaluation.deepStructureScore ?? aiEvaluation.scorePercent ?? 0}/100
                  </span>
                  {typeof aiEvaluation.conceptCoverage === "number" && (
                    <span className="px-3 py-1 rounded-full text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                      Bao Phủ Khái Niệm: {Math.round(aiEvaluation.conceptCoverage * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Nhận xét phản hồi */}
              {(aiEvaluation.diagnosticFeedback || aiEvaluation.feedback) && (
                <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  <span className="font-semibold text-emerald-400 block mb-1">Nhận xét Socratic:</span>
                  {aiEvaluation.diagnosticFeedback || aiEvaluation.feedback}
                </div>
              )}

              {/* Các liên kết nhân quả & Điểm mù */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {aiEvaluation.causalLinkAccuracy && (
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1.5 font-medium">Độ chuẩn xác liên kết nhân quả:</span>
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-[11px] font-mono border ${
                        aiEvaluation.causalLinkAccuracy === "HIGH"
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/50"
                          : "bg-amber-950/60 text-amber-300 border-amber-800/50"
                      }`}
                    >
                      {aiEvaluation.causalLinkAccuracy === "HIGH"
                        ? "✓ Cao (Đã kết nối cơ chế nhân quả)"
                        : "⚠ Thấp (Liệt kê thụ động, thiếu cơ chế)"}
                    </span>
                  </div>
                )}

                {aiEvaluation.blindSpots && aiEvaluation.blindSpots.length > 0 && (
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                    <span className="text-amber-400 flex items-center gap-1.5 mb-1.5 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Điểm mù nhận thức cần bổ sung:
                    </span>
                    <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                      {aiEvaluation.blindSpots.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nút chuyển tiếp liền mạch sang Bước 2 */}
          {onProceedToRetrievalQueue && (
            <div className="flex justify-end pt-2">
              <button
                onClick={onProceedToRetrievalQueue}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer text-sm"
              >
                <span>Tiếp Tục Sang Bước 2: Hàng Đợi FSRS Đan Xen (Phút 6–15)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
