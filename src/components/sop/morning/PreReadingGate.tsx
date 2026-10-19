"use client";

import React, { useState, useEffect } from "react";
import { countWords } from "@/lib/validations";
import { Timer, Lock, Unlock, AlertCircle } from "lucide-react";

interface PreReadingGateProps {
  conceptTitle: string;
  conceptContext: string;
  sourceTextSnippet: string;
  onUnlocked: (hypothesisText: string) => void;
}

export function PreReadingGate({
  conceptTitle,
  conceptContext,
  sourceTextSnippet,
  onUnlocked,
}: PreReadingGateProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(180); // 3 phút = 180s
  const [hypothesis, setHypothesis] = useState("");
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  const wordCount = countWords(hypothesis);
  const isHypothesisValid = wordCount >= 50;

  useEffect(() => {
    if (!isTimerRunning || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleUnlock = () => {
    if (!isHypothesisValid) return;
    setIsTimerRunning(false);
    onUnlocked(hypothesis);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Concept Header & Timer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
            Cổng Đoán Trước (Phút 1–3) • RULE-04
          </div>
          <h2 className="text-xl font-bold text-white">{conceptTitle}</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">{conceptContext}</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
          <Timer className={`w-5 h-5 ${secondsRemaining < 30 ? "text-rose-400 animate-pulse" : "text-cyan-400"}`} />
          <div className="font-mono text-xl font-bold text-white">{formatTimer(secondsRemaining)}</div>
        </div>
      </div>

      {/* Hypothesis Input Box */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-slate-300">
            Dự đoán cơ chế nhân quả: Tại sao mô hình này vận hành? Điều gì chi phối kết quả?
          </label>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded border ${
              isHypothesisValid
                ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                : "bg-slate-800 text-amber-400 border-slate-700"
            }`}
          >
            {wordCount} / 50 từ tối thiểu
          </span>
        </div>

        <textarea
          rows={5}
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder="Hãy kích hoạt tri thức nền tảng và viết ra phỏng đoán của bạn trước khi đọc tài liệu nguồn (tối thiểu 50 từ)..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition resize-none leading-relaxed"
        />

        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <span>Văn bản gốc bị khóa làm mờ (blur 12px) cho đến khi bạn gõ đủ 50 từ dự đoán.</span>
          </div>

          <button
            onClick={handleUnlock}
            disabled={!isHypothesisValid}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
              isHypothesisValid
                ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 cursor-pointer"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            {isHypothesisValid ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            Mở Khóa Văn Bản Nguồn
          </button>
        </div>
      </div>

      {/* Blurred Source Preview (Enforcing CSS blur-12px & non-selectable) */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950/90 p-8 min-h-[220px]">
        <div
          className="filter blur-[12px] pointer-events-none select-none text-slate-400 text-sm leading-relaxed"
          aria-hidden="true"
        >
          {sourceTextSnippet}
        </div>
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
          <Lock className="w-8 h-8 text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-200">Văn bản nguồn đang bị ẩn</p>
          <p className="text-xs text-slate-400 max-w-md mt-1">
            Gõ đủ 50 từ dự đoán độc lập ở trên để kích hoạt hiệu ứng Generation Effect trước khi đối chiếu.
          </p>
        </div>
      </div>
    </div>
  );
}
