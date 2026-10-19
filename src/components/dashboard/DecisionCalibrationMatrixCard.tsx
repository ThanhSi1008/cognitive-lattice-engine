"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, Scale, Award } from "lucide-react";

interface Props {
  decisionCalibration: {
    averageBrierScore: number;
    totalAudited: number;
    calibrationRating: string;
  };
}

export function DecisionCalibrationMatrixCard({ decisionCalibration }: Props) {
  const bs = decisionCalibration.averageBrierScore;
  const isExcellent = bs <= 0.35;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
          <Scale className="w-4 h-4" />
          <span>Decision Calibration Matrix</span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            isExcellent
              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
              : "bg-slate-800 text-slate-300 border-slate-700"
          }`}
        >
          {decisionCalibration.calibrationRating}
        </span>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white">{bs.toFixed(3)}</span>
          <span className="text-xs text-slate-400 font-mono">Điểm Brier trung bình (BS &isin; [0, 2])</span>
        </div>

        <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 font-mono">
          <Award className="w-4 h-4 text-amber-400" />
          <span>
            Đã hậu kiểm {decisionCalibration.totalAudited} quyết định tại các mốc +30/60/90 ngày
          </span>
        </div>
      </div>

      <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-300 font-medium">Độ tin cậy mô hình tư duy:</span>
          <span className="text-emerald-400 font-mono font-bold">Cao (BS &le; 0.35)</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          BS = 0 là dự báo hoàn hảo tuyệt đối. Điểm Brier càng thấp chứng minh mô hình tư duy chưng cất từ Zettelkasten càng phản ánh chuẩn xác quy luật thực tế.
        </p>
      </div>
    </div>
  );
}
