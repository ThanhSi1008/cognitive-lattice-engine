"use client";

import React from "react";
import { Plus, Trash2, Network, CheckCircle2, AlertCircle } from "lucide-react";

export interface AnalogicalDomainItem {
  domain_name: string;
  surface_features: string;
  first_order_naive_reaction: string;
  second_order_systemic_mechanism: string;
  structural_invariant_shared: string;
}

interface AnalogicalMatrixWidgetProps {
  domains: AnalogicalDomainItem[];
  onChange: (updated: AnalogicalDomainItem[]) => void;
}

export function AnalogicalMatrixWidget({ domains, onChange }: AnalogicalMatrixWidgetProps) {
  const isSatisfied = domains.length >= 3;

  const updateDomain = (index: number, field: keyof AnalogicalDomainItem, value: string) => {
    const next = [...domains];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const addDomain = () => {
    const newDomain: AnalogicalDomainItem = {
      domain_name: "",
      surface_features: "",
      first_order_naive_reaction: "",
      second_order_systemic_mechanism: "",
      structural_invariant_shared: domains[0]?.structural_invariant_shared || "",
    };
    onChange([...domains, newDomain]);
  };

  const removeDomain = (index: number) => {
    if (domains.length <= 1) return;
    const next = domains.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <Network className="w-5 h-5" />
          <span>Ma Trận Ánh Xạ Tương Tự Đa Miền (Analogical Matrix)</span>
        </div>
        <span
          className={`text-xs font-mono px-2.5 py-0.5 rounded border flex items-center gap-1 ${
            isSatisfied
              ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
              : "bg-rose-950/80 text-rose-400 border-rose-800"
          }`}
        >
          {isSatisfied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {domains.length} / 3 miền tối thiểu (chk_analogical_matrix_min_domains)
        </span>
      </div>

      <p className="text-xs text-slate-400">
        Áp dụng Lý thuyết Ánh xạ Cấu trúc (Gentner): Bắt buộc trừu tượng hóa mô hình và đối chiếu cơ chế nhân quả qua tối thiểu 3 miền ứng dụng khác nhau.
      </p>

      {/* Domain Cards */}
      <div className="flex flex-col gap-4">
        {domains.map((item, idx) => (
          <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center text-xs font-mono font-bold">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={item.domain_name}
                  onChange={(e) => updateDomain(idx, "domain_name", e.target.value)}
                  placeholder={`Miền ứng dụng ${idx + 1} (Ví dụ: Đầu tư Tài chính / Kiến trúc Hệ thống / Sinh thái học)`}
                  className="bg-transparent font-medium text-slate-200 text-xs focus:outline-none border-b border-slate-700 focus:border-cyan-500 pb-0.5 w-72"
                />
              </div>

              {domains.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDomain(idx)}
                  className="text-slate-500 hover:text-rose-400 transition"
                  title="Xóa miền này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400">Chi tiết bề mặt (Surface Features)</label>
                <input
                  type="text"
                  value={item.surface_features}
                  onChange={(e) => updateDomain(idx, "surface_features", e.target.value)}
                  placeholder="Các thực thể cụ thể bề mặt của miền này..."
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400">Quy luật cấu trúc bất biến chung (Structural Invariant)</label>
                <input
                  type="text"
                  value={item.structural_invariant_shared}
                  onChange={(e) => updateDomain(idx, "structural_invariant_shared", e.target.value)}
                  placeholder="Quy luật trừu tượng chung không đổi..."
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-amber-400/90">Phản ứng tuyến tính ngây thơ (Tư duy Cấp 1)</label>
                <textarea
                  rows={2}
                  value={item.first_order_naive_reaction}
                  onChange={(e) => updateDomain(idx, "first_order_naive_reaction", e.target.value)}
                  placeholder="Cách tiếp cận trực giác ngây thơ không xét đến phản hồi..."
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="text-emerald-400/90">Cơ chế thích ứng bậc cao / Phản hồi (Tư duy Cấp 2)</label>
                <textarea
                  rows={2}
                  value={item.second_order_systemic_mechanism}
                  onChange={(e) => updateDomain(idx, "second_order_systemic_mechanism", e.target.value)}
                  placeholder="Cơ chế phản hồi phi tuyến tính, thích ứng của hệ thống..."
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addDomain}
        className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition border border-slate-700"
      >
        <Plus className="w-3.5 h-3.5" />
        Thêm miền ứng dụng mới
      </button>
    </div>
  );
}
