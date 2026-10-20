"use client";

import React, { useState } from "react";
import { countWords } from "@/lib/validations";
import { ExcalidrawCanvas } from "@/components/canvas/ExcalidrawCanvas";
import { Edit3, CheckCircle2, Split, Eye, ShieldAlert, Sparkles } from "lucide-react";

interface BlankPageRecallCanvasProps {
  daytimeZettelTitle?: string;
  daytimeZettelBody?: string;
  onRecallCommitted: (recallData: {
    canvasSketch: string;
    textRecall: string;
    excalidrawElements?: readonly any[];
    excalidrawAppState?: any;
  }) => void;
}

export function BlankPageRecallCanvas({
  daytimeZettelTitle = "Mô hình nhận thức nguyên tử",
  daytimeZettelBody = "",
  onRecallCommitted,
}: BlankPageRecallCanvasProps) {
  const [textRecall, setTextRecall] = useState("");
  const [isCommitted, setIsCommitted] = useState(false);
  const [excalidrawElements, setExcalidrawElements] = useState<readonly any[]>([]);
  const [excalidrawAppState, setExcalidrawAppState] = useState<any>(null);

  const wordCount = countWords(textRecall);
  const canCommit = wordCount >= 30;

  const handleCommit = () => {
    if (!canCommit) return;
    setIsCommitted(true);
    onRecallCommitted({
      canvasSketch: `[Excalidraw diagram with ${excalidrawElements.length} elements]`,
      textRecall,
      excalidrawElements,
      excalidrawAppState,
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
        </div>
      )}
    </div>
  );
}
