"use client";

import React, { useState } from "react";
import { ForgettingIndexMetric } from "@/lib/algorithms/telemetry";
import { Target, Cpu, CheckCircle2, Sliders, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  fi: ForgettingIndexMetric;
}

export function ForgettingIndexCalibrationCard({ fi }: Props) {
  const [showWeights, setShowWeights] = useState(false);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
          <Target className="w-4 h-4" />
          <span>Forgetting Index & Optimizer</span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            fi.isWithinTargetRange
              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
              : "bg-amber-950 text-amber-400 border-amber-800"
          }`}
        >
          FI Mục Tiêu: 10% (R = 90%)
        </span>
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

        <button
          type="button"
          onClick={() => setShowWeights(!showWeights)}
          className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center justify-between pt-1 border-t border-slate-800/80"
        >
          <span>Xem 19 Trọng Số Cá Nhân Hóa w = (w₀ ... w₁₈)</span>
          {showWeights ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showWeights && (
          <div className="grid grid-cols-5 gap-1.5 text-[9px] font-mono text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 mt-1 max-h-24 overflow-y-auto">
            {fi.weights.map((w, idx) => (
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
