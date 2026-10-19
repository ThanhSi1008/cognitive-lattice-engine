"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export interface CriticalAuditData {
  pico_frame: {
    population_or_context: string;
    intervention_or_mechanism: string;
    comparison_baseline: string;
    outcome_measured: string;
  };
  source_database: string;
  study_design: string;
  risk_of_bias_assessment: {
    tool_used: string;
    rating_or_score: string;
    key_limitations: string;
  };
  falsifiability_condition: string;
  sample_size_and_replicability: string;
  counter_evidence_or_rival_model: string;
}

interface CriticalAuditWidgetProps {
  data: CriticalAuditData;
  onChange: (updated: CriticalAuditData) => void;
}

export function CriticalAuditWidget({ data, onChange }: CriticalAuditWidgetProps) {
  const updatePico = (field: keyof CriticalAuditData["pico_frame"], val: string) => {
    onChange({
      ...data,
      pico_frame: { ...data.pico_frame, [field]: val },
    });
  };

  const updateRoB = (field: keyof CriticalAuditData["risk_of_bias_assessment"], val: string) => {
    onChange({
      ...data,
      risk_of_bias_assessment: { ...data.risk_of_bias_assessment, [field]: val },
    });
  };

  const isFalsifiableValid = data.falsifiability_condition.trim().length >= 20;
  const isSampleValid = data.sample_size_and_replicability.trim().length >= 20;
  const isCounterValid = data.counter_evidence_or_rival_model.trim().length >= 20;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <ShieldCheck className="w-5 h-5" />
          <span>Bộ Lọc Kiểm Định Phản Biện (Critical Audit Rubric)</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">PICO • RoB-2 • AMSTAR-2</span>
      </div>

      {/* 1. PICO Framework */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400">P - Đối tượng / Bối cảnh hệ thống</label>
          <input
            type="text"
            value={data.pico_frame.population_or_context}
            onChange={(e) => updatePico("population_or_context", e.target.value)}
            placeholder="Ví dụ: Người học người lớn tự điều hòa"
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">I - Cơ chế / Tác nhân can thiệp</label>
          <input
            type="text"
            value={data.pico_frame.intervention_or_mechanism}
            onChange={(e) => updatePico("intervention_or_mechanism", e.target.value)}
            placeholder="Ví dụ: Lặp lại ngắt quãng đan xen đa miền"
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">C - Nhóm đối chứng / Mô hình ngây thơ (Cấp 1)</label>
          <input
            type="text"
            value={data.pico_frame.comparison_baseline}
            onChange={(e) => updatePico("comparison_baseline", e.target.value)}
            placeholder="Ví dụ: Học nhồi dồn cục theo khối đơn miền"
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">O - Kết quả đo lường thực nghiệm</label>
          <input
            type="text"
            value={data.pico_frame.outcome_measured}
            onChange={(e) => updatePico("outcome_measured", e.target.value)}
            placeholder="Ví dụ: Tỷ lệ nhớ lại sau 30 ngày và khả năng chuyển giao xa"
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* 2. Thiết kế nghiên cứu & Nguy cơ sai lệch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-400">Nguồn cơ sở dữ liệu</label>
          <select
            value={data.source_database}
            onChange={(e) => onChange({ ...data, source_database: e.target.value })}
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="PUBMED_MEDLINE">PubMed / MEDLINE</option>
            <option value="SCOPUS">Scopus</option>
            <option value="WEB_OF_SCIENCE">Web of Science</option>
            <option value="COCHRANE_CENTRAL">Cochrane Central</option>
            <option value="EPISTEMONIKOS">Epistemonikos</option>
            <option value="MONOGRAPH_BOOK">Chuyên khảo học thuật (Monograph)</option>
            <option value="OTHER">Khác</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400">Thiết kế nghiên cứu</label>
          <select
            value={data.study_design}
            onChange={(e) => onChange({ ...data, study_design: e.target.value })}
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="RCT">RCT (Thử nghiệm đối chứng ngẫu nhiên)</option>
            <option value="SYSTEMATIC_REVIEW_META_ANALYSIS">Tổng quan hệ thống / Phân tích gộp</option>
            <option value="COHORT_CASE_CONTROL">Đoàn hệ / Bệnh chứng</option>
            <option value="NON_RANDOMIZED_INTERVENTION">Can thiệp không ngẫu nhiên</option>
            <option value="THEORETICAL_MODEL">Mô hình toán / Lý thuyết thuần túy</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400">Công cụ đánh giá sai lệch</label>
          <select
            value={data.risk_of_bias_assessment.tool_used}
            onChange={(e) => updateRoB("tool_used", e.target.value)}
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="COCHRANE_ROB_2">Cochrane RoB 2</option>
            <option value="ROBINS_I">ROBINS-I</option>
            <option value="NEWCASTLE_OTTAWA_SCALE">Newcastle-Ottawa Scale</option>
            <option value="CASP_CHECKLIST">CASP Checklist</option>
            <option value="AMSTAR_2_ROBIS">AMSTAR 2 / ROBIS</option>
            <option value="LOGIC_CONSISTENCY_CHECK">Kiểm tra tính nhất quán logic</option>
          </select>
        </div>
      </div>

      {/* 3. Ba thông số phản biện bắt buộc (>= 20 ký tự mỗi ô) */}
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex justify-between items-center">
            <label className="text-xs text-slate-300 font-medium">
              1. Điều kiện thực nghiệm bác bỏ mô hình (Falsifiability Condition)
            </label>
            <span className={`text-[10px] font-mono ${isFalsifiableValid ? "text-emerald-400" : "text-amber-400"}`}>
              {data.falsifiability_condition.trim().length} / 20 ký tự tối thiểu
            </span>
          </div>
          <input
            type="text"
            value={data.falsifiability_condition}
            onChange={(e) => onChange({ ...data, falsifiability_condition: e.target.value })}
            placeholder="Nếu xảy ra sự kiện thực nghiệm nào thì mô hình này coi như bị bác bỏ?"
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <label className="text-xs text-slate-300 font-medium">
              2. Quy mô mẫu (N) & Lịch sử tái lập (Replicability)
            </label>
            <span className={`text-[10px] font-mono ${isSampleValid ? "text-emerald-400" : "text-amber-400"}`}>
              {data.sample_size_and_replicability.trim().length} / 20 ký tự tối thiểu
            </span>
          </div>
          <input
            type="text"
            value={data.sample_size_and_replicability}
            onChange={(e) => onChange({ ...data, sample_size_and_replicability: e.target.value })}
            placeholder="Cỡ mẫu (N), phương pháp chọn mẫu và lịch sử tái lập độc lập tránh bẫy Jam Study..."
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <label className="text-xs text-slate-300 font-medium">
              3. Nghiên cứu đối lập / Điều kiện biên thất bại (Counter-evidence)
            </label>
            <span className={`text-[10px] font-mono ${isCounterValid ? "text-emerald-400" : "text-amber-400"}`}>
              {data.counter_evidence_or_rival_model.trim().length} / 20 ký tự tối thiểu
            </span>
          </div>
          <input
            type="text"
            value={data.counter_evidence_or_rival_model}
            onChange={(e) => onChange({ ...data, counter_evidence_or_rival_model: e.target.value })}
            placeholder="Mô hình đối lập nào giải thích tốt hơn? Giới hạn biên nơi nguyên lý này thất bại hoàn toàn..."
            className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}
