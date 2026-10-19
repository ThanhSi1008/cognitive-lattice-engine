"use client";

import React from "react";
import { ZettelVelocityMetric } from "@/lib/algorithms/telemetry";
import { Gauge, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

interface Props {
  velocity: ZettelVelocityMetric;
}

export function AtomicZettelVelocityCard({ velocity }: Props) {
  const isOptimal = velocity.status === "OPTIMAL";
  const isCollectorFallacy = velocity.status === "COLLECTOR_FALLACY_RISK";

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
          <Gauge className="w-4 h-4" />
          <span>Atomic Zettel Velocity</span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            isOptimal
              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
              : isCollectorFallacy
              ? "bg-rose-950 text-rose-400 border-rose-800"
              : "bg-amber-950 text-amber-400 border-amber-800"
          }`}
        >
          {velocity.status}
        </span>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white">{velocity.weeklyCount}</span>
          <span className="text-xs text-slate-400 font-mono">
            / {velocity.targetMin}–{velocity.targetMax} Zettels/tuần
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 mt-3 overflow-hidden border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOptimal ? "bg-emerald-500" : isCollectorFallacy ? "bg-rose-500" : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(100, (velocity.weeklyCount / velocity.targetMax) * 100)}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
        {isOptimal ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        ) : isCollectorFallacy ? (
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        )}
        <span className="leading-relaxed">{velocity.statusMessage}</span>
      </div>
    </div>
  );
}
