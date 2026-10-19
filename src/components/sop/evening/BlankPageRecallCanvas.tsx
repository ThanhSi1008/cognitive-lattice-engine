"use client";

import React, { useState, useRef } from "react";
import { countWords } from "@/lib/validations";
import { Edit3, CheckCircle2, Split, Eye, ShieldAlert, Sparkles } from "lucide-react";

interface BlankPageRecallCanvasProps {
  daytimeZettelTitle?: string;
  daytimeZettelBody?: string;
  onRecallCommitted: (recallData: { canvasSketch: string; textRecall: string }) => void;
}

export function BlankPageRecallCanvas({
  daytimeZettelTitle = "Mô hình nhận thức nguyên tử",
  daytimeZettelBody = "",
  onRecallCommitted,
}: BlankPageRecallCanvasProps) {
  const [textRecall, setTextRecall] = useState("");
  const [isCommitted, setIsCommitted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const wordCount = countWords(textRecall);
  const canCommit = wordCount >= 30;

  // Xử lý vẽ canvas đơn giản cho sơ đồ nhân quả
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = "#38bdf8"; // Cyan
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCommit = () => {
    if (!canCommit) return;
    const canvas = canvasRef.current;
    const sketchData = canvas ? canvas.toDataURL("image/png") : "";
    setIsCommitted(true);
    onRecallCommitted({
      canvasSketch: sketchData,
      textRecall,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            Gợi Nhớ Trang Trắng (Phút 1–5) • RULE-04
          </div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-400" />
            <span>Khung Vẽ Gợi Nhớ Tự Do (Blank-Page Recall Canvas)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Toàn bộ ghi chú ban ngày bị ẩn hoàn toàn. Hãy vẽ lại sơ đồ nhân quả và viết lại cơ chế cốt lõi hoàn toàn từ trí nhớ.
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
            {wordCount} / 30 từ tối thiểu
          </span>
        )}
      </div>

      {!isCommitted ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Cột trái: Khung vẽ sơ đồ tư duy nhân quả */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
              <span>Khung vẽ sơ đồ nhân quả (Sketchpad)</span>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-slate-500 hover:text-slate-300 transition"
              >
                Xóa nét vẽ
              </button>
            </div>

            <canvas
              ref={canvasRef}
              width={500}
              height={320}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full h-[320px] bg-slate-900/60 border border-slate-800/80 rounded-lg cursor-crosshair touch-none"
            />
            <div className="text-[10px] text-slate-500 italic">
              Dùng chuột vẽ các mũi tên nhân quả A &rarr; B &rarr; C biểu diễn quy luật.
            </div>
          </div>

          {/* Cột phải: Nhập văn bản hồi tưởng tự do */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <label className="text-xs text-slate-300 font-medium">
              Diễn giải lại cơ chế vận hành từ trí nhớ (Free Recall) *
            </label>
            <textarea
              rows={12}
              value={textRecall}
              onChange={(e) => setTextRecall(e.target.value)}
              placeholder="Nhớ lại không nhìn tài liệu: Mô hình buổi sáng/chiều giải quyết vấn đề gì? Quy luật bất biến cấu trúc là gì? Cơ chế phản hồi cấp 2 vận hành ra sao?..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
            />

            <button
              onClick={handleCommit}
              disabled={!canCommit}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                canCommit
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Cam Kết Gợi Nhớ & Đối Chiếu Bản Gốc
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
              <span className="text-xs font-mono text-cyan-400 font-semibold">BẢN HỒI TƯỞNG CỦA BẠN</span>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{textRecall}</p>
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
