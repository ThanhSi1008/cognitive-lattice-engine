"use client";

import React, { useState } from "react";
import { ForgettingIndexMetric } from "@/lib/algorithms/telemetry";
import { Target, Cpu, CheckCircle2, Sliders, ChevronDown, ChevronUp, Sparkles, Flame } from "lucide-react";

interface Props {
  fi: ForgettingIndexMetric;
}

export function ForgettingIndexCalibrationCard({ fi }: Props) {
  const [showWeights, setShowWeights] = useState(false);
  const [currentWeights, setCurrentWeights] = useState<number[]>(fi.weights);
  const [retentionMode, setRetentionMode] = useState<number>(0.90);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeMessage, setOptimizeMessage] = useState<string | null>(null);

  const handleToggleRetention = async (newRetention: number) => {
    setRetentionMode(newRetention);
    try {
      const res = await fetch("/api/telemetry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desiredRetention: newRetention, weights: currentWeights }),
      });
      if (res.ok) {
        const data = await res.json();
        setOptimizeMessage(data.message);
      }
    } catch (err) {
      console.error("Lỗi cập nhật retention:", err);
    }
  };

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch("/api/telemetry/optimize-fsrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desiredRetention: retentionMode }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentWeights(data.optimizedWeights);
        setOptimizeMessage(data.message);
        setShowWeights(true);
      }
    } catch (err) {
      console.error("Optimizer error:", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
          <Target className="w-4 h-4" />
          <span>Forgetting Index & Optimizer</span>
        </div>

        {/* Chuyển đổi giữa Chế độ Tiêu Chuẩn (R=90%) và Ma Sát Cao (R=85%) */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => handleToggleRetention(0.90)}
            className={`px-2 py-0.5 rounded transition cursor-pointer ${
              retentionMode === 0.90
                ? "bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Tiêu chuẩn (R = 90%)
          </button>
          <button
            type="button"
            onClick={() => handleToggleRetention(0.85)}
            className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
              retentionMode === 0.85
                ? "bg-amber-950 text-amber-300 border border-amber-700 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400" />
            Ma sát cao (R = 85%)
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white">{(fi.currentFI * 100).toFixed(1)}%</span>
          <span className="text-xs text-slate-400 font-mono">
            Chỉ số quên thực nghiệm (R = {(fi.currentRetention * 100).toFixed(1)}%)
          </span>
        </div>

        {/* Revlogs Progress to Optimizer */}
        <div className="mt-3">
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>Tiến độ FSRS Optimizer:</span>
            <span className={fi.optimizerReady ? "text-emerald-400 font-bold" : "text-slate-400"}>
              {fi.totalRevlogCount} / {fi.optimizerThreshold} lượt ôn tập (revlog)
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                fi.optimizerReady ? "bg-emerald-500" : "bg-cyan-500"
              }`}
              style={{ width: `${Math.min(100, (fi.totalRevlogCount / fi.optimizerThreshold) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 flex flex-col gap-2">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Sai số dự đoán Retention RMSE:
          </span>
          <span className="text-emerald-400 font-mono font-bold">
            SM-2: 10.5% &rarr; FSRS-5: 2.8%
          </span>
        </div>

        {/* Nút bấm chạy Tối Ưu Hóa 19 Trọng Số */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleRunOptimizer}
            disabled={isOptimizing}
            className="flex-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 px-3 py-1.5 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            {isOptimizing ? "Đang tối ưu hóa hồi quy..." : "Chạy Tối Ưu Hóa Trọng Số FSRS-5"}
          </button>

          <button
            type="button"
            onClick={() => setShowWeights(!showWeights)}
            className="text-cyan-400 hover:text-cyan-300 text-[11px] px-2 py-1 flex items-center gap-1 rounded bg-slate-900 border border-slate-800"
            title="Xem 19 Trọng số FSRS-5"
          >
            <span>w₀₋₁₈</span>
            {showWeights ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {optimizeMessage && (
          <div className="bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[10px] p-2 rounded flex items-start gap-1.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{optimizeMessage}</span>
          </div>
        )}

        {showWeights && (
          <div className="grid grid-cols-5 gap-1.5 text-[9px] font-mono text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 mt-1 max-h-24 overflow-y-auto">
            {currentWeights.map((w, idx) => (
              <div key={idx} className="bg-slate-950 px-1 py-0.5 rounded text-center">
                w{idx}: {w.toFixed(2)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
