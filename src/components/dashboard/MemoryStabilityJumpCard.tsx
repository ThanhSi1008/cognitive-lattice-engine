"use client";

import React from "react";
import { StabilityJumpMetric } from "@/lib/algorithms/telemetry";
import { Activity, TrendingUp, Zap, HelpCircle } from "lucide-react";

interface Props {
  stability: StabilityJumpMetric;
}

export function MemoryStabilityJumpCard({ stability }: Props) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
          <Activity className="w-4 h-4" />
          <span>Memory Stability Jump Telemetry</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-purple-950 text-purple-400 border-purple-800">
          R &isin; [0.70, 0.85]
        </span>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white">+{stability.averageDeltaS}d</span>
          <span className="text-xs text-slate-400 font-mono">Độ nhảy vọt ổn định trung bình (&Delta;S)</span>
        </div>

        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>
            {stability.lastJumpExample.fromDays}d &rarr; {stability.lastJumpExample.toDays}d (khi R ={" "}
            {stability.lastJumpExample.retrievabilityAtReview * 100}%)
          </span>
        </div>
      </div>

      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-300 font-medium">Tỷ lệ truy xuất trong vùng ma sát:</span>
          <span className="text-cyan-400 font-mono font-bold">
            {Math.round(stability.optimalFrictionZoneRate * 100)}%
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Khác với SM-2 tăng cứng nhắc, FSRS-5 nhân thừa số (e^(w₁₀ &middot; (1 - R)) - 1) để tạo bước nhảy vọt độ ổn định khi người học truy xuất thành công ở vùng ma sát cao.
        </p>
      </div>
    </div>
  );
}
