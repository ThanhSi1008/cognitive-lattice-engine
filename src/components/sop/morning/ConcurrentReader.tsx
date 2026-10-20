"use client";

import React, { useState, useEffect } from "react";
import { CriticalAuditWidget, CriticalAuditData } from "./CriticalAuditWidget";
import { AnalogicalMatrixWidget, AnalogicalDomainItem } from "./AnalogicalMatrixWidget";
import { BookOpen, AlertCircle, ArrowRight, Lightbulb, Network, Sparkles, Layers } from "lucide-react";

interface ConcurrentReaderProps {
  conceptTitle: string;
  sourceTextBlocks: string[];
  initialHypothesis: string;
  onProceedToClosedBook: (analysisData: {
    selfExplanation: string;
    criticalAudit: CriticalAuditData;
    analogicalMatrix: AnalogicalDomainItem[];
  }) => void;
}

export function ConcurrentReader({
  conceptTitle,
  sourceTextBlocks,
  initialHypothesis,
  onProceedToClosedBook,
}: ConcurrentReaderProps) {
  const [selfExplanation, setSelfExplanation] = useState("");
  const [highlightWarning, setHighlightWarning] = useState(false);
  const [priorZettels, setPriorZettels] = useState<any[]>([]);
  const [isLoadingPrior, setIsLoadingPrior] = useState(true);

  // Kích hoạt sơ đồ tri thức nền (Prior Knowledge Schemas Activated - arXiv:2025 Mục 4.2)
  useEffect(() => {
    let isMounted = true;
    const fetchPriorSchemas = async () => {
      try {
        const queryTerm = conceptTitle.split(/[:•–—-]/)[0].trim();
        const res = await fetch(`/api/zettels?q=${encodeURIComponent(queryTerm)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setPriorZettels((data.zettels || []).slice(0, 3));
          }
        }
      } catch (err) {
        console.error("Lỗi kích hoạt sơ đồ tri thức nền:", err);
      } finally {
        if (isMounted) setIsLoadingPrior(false);
      }
    };
    fetchPriorSchemas();
    return () => {
      isMounted = false;
    };
  }, [conceptTitle]);

  const [criticalAudit, setCriticalAudit] = useState<CriticalAuditData>({
    pico_frame: {
      population_or_context: "Người học người lớn tự điều chỉnh",
      intervention_or_mechanism: "Đan xen đa miền và lặp lại ngắt quãng FSRS",
      comparison_baseline: "Học tập dồn cục theo khối đơn miền",
      outcome_measured: "Tỷ lệ lưu giữ dài hạn và khả năng giải quyết vấn đề mới",
    },
    source_database: "PUBMED_MEDLINE",
    study_design: "RCT",
    risk_of_bias_assessment: {
      tool_used: "COCHRANE_ROB_2",
      rating_or_score: "Low Risk",
      key_limitations: "Không thể làm mù đối tượng do tính chất can thiệp nhận thức",
    },
    falsifiability_condition: "Nếu việc đan xen làm giảm hiệu suất dài hạn trong bài test chuyển giao sau 30 ngày",
    sample_size_and_replicability: "Cỡ mẫu N = 1200 qua ba lần tái lập độc lập tại hai trường đại học khác nhau",
    counter_evidence_or_rival_model: "Nghiên cứu của Kornell (2008) chỉ ra đan xen gây khó khăn nhận thức ban đầu",
  });

  const [analogicalMatrix, setAnalogicalMatrix] = useState<AnalogicalDomainItem[]>([
    {
      domain_name: "Đầu tư Tài chính",
      surface_features: "Cổ phiếu, thanh khoản thị trường, định giá",
      first_order_naive_reaction: "Đu đỉnh khi giá tăng mạnh và hoảng loạn bán tháo",
      second_order_systemic_mechanism: "Chu kỳ phản hồi tâm lý thị trường và biên an toàn nội tại",
      structural_invariant_shared: "Phản hồi phi tuyến tính và cân bằng động",
    },
    {
      domain_name: "Chính sách Công",
      surface_features: "Thuế, trợ cấp, quy định hành chính",
      first_order_naive_reaction: "Áp giá trần để kiểm soát lạm phát trước mắt",
      second_order_systemic_mechanism: "Xuất hiện chợ đen và suy giảm sản lượng sản xuất",
      structural_invariant_shared: "Phản hồi phi tuyến tính và cân bằng động",
    },
    {
      domain_name: "Kiến trúc Phần mềm",
      surface_features: "Microservices, cache, queue, circuit breaker",
      first_order_naive_reaction: "Thêm cache vào mọi service để tăng tốc độ",
      second_order_systemic_mechanism: "Mất tính nhất quán dữ liệu và sự cố cascade",
      structural_invariant_shared: "Phản hồi phi tuyến tính và cân bằng động",
    },
  ]);

  // RULE-01: Cấm tô sáng thụ động. Nếu người dùng bôi đen văn bản, hiển thị nhắc nhở chuyển sang tự giải thích.
  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setHighlightWarning(true);
      setTimeout(() => setHighlightWarning(false), 3000);
    }
  };

  const isAuditValid =
    criticalAudit.falsifiability_condition.trim().length >= 20 &&
    criticalAudit.sample_size_and_replicability.trim().length >= 20 &&
    criticalAudit.counter_evidence_or_rival_model.trim().length >= 20;

  const isAnalogicalValid = analogicalMatrix.length >= 3;
  const isExplanationValid = selfExplanation.trim().length >= 30;

  const canProceed = isAuditValid && isAnalogicalValid && isExplanationValid;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
        <div>
          <div className="text-xs font-mono text-cyan-400">TRÌNH ĐỌC PHÂN ĐOẠN & TỰ GIẢI THÍCH (Phút 4–15)</div>
          <h2 className="text-lg font-bold text-white">{conceptTitle}</h2>
        </div>
        <button
          onClick={() =>
            onProceedToClosedBook({
              selfExplanation,
              criticalAudit,
              analogicalMatrix,
            })
          }
          disabled={!canProceed}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition ${
            canProceed
              ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <span>Sang Ghi Chú Đóng Sách (Phút 16–20)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {highlightWarning && (
        <div className="bg-amber-950/90 border border-amber-800 text-amber-200 px-4 py-2 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>RULE-01 (Zero-Highlighting Policy):</strong> CLE không hỗ trợ tô màu thụ động. Mọi điểm trọng yếu bắt buộc phải được giải thích ở cột phân tích bên phải.
          </span>
        </div>
      )}

      {/* 2-Column Split: Left = Source Text, Right = Critical Analysis Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Source Text divided into argument blocks */}
        <div
          onMouseUp={handleSelection}
          className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col gap-4 text-slate-300 text-sm leading-relaxed max-h-[800px] overflow-y-auto"
        >
          <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Văn bản nguồn (Tự động đóng sập ở phút 16)</span>
          </div>

          {sourceTextBlocks.map((block, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 transition"
            >
              <div className="text-[10px] font-mono text-cyan-400/80 mb-1">Khối luận điểm #{idx + 1}</div>
              <p>{block}</p>
            </div>
          ))}

          {/* Sơ đồ tri thức nền được kích hoạt (Prior Knowledge Schemas Activated) */}
          <div className="mt-2 pt-3 border-t border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-300 flex items-center gap-1.5 font-mono text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Sơ Đồ Tri Thức Nền Kích Hoạt (Prior Schemas)
              </span>
              <span className="text-[10px] font-mono text-slate-500">Mục 4.2 arXiv:2025</span>
            </div>

            {isLoadingPrior ? (
              <div className="text-[11px] font-mono text-slate-500 italic">
                Đang quét vector các sơ đồ tri thức nền liên quan...
              </div>
            ) : priorZettels.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {priorZettels.map((z) => (
                  <div
                    key={z.zettel_uid}
                    className="p-2.5 rounded bg-purple-950/20 border border-purple-800/40 text-xs flex flex-col gap-1 hover:border-purple-600 transition"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-cyan-400 font-bold">[[{z.zettel_uid}]]</span>
                      <span className="px-1.5 py-0.2 bg-slate-900 text-slate-400 rounded">
                        {z.domain_category}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-200 line-clamp-1">{z.atomic_title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-2 italic">
                      {z.body_text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic p-2 bg-slate-900/40 rounded border border-slate-800/60">
                Chưa có Zettel cũ nào liên quan trực tiếp. Khái niệm này sẽ là hạt mầm tri thức mới cho hộp phiếu.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mandatory Analysis Sidebar */}
        <div className="lg:col-span-7 flex flex-col gap-5 max-h-[800px] overflow-y-auto pr-1">
          {/* Đối chiếu với dự đoán ban đầu */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Lightbulb className="w-4 h-4" />
              <span>Khung Tự Giải Thích & Đối Chiếu Giả Thuyết Ban Đầu</span>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800/80 text-xs text-slate-400">
              <span className="text-slate-500 font-medium">Dự đoán của bạn ở Cổng Đoán Trước: </span>
              <em>&ldquo;{initialHypothesis}&rdquo;</em>
            </div>

            <div>
              <label className="text-xs text-slate-300">
                Tại sao nguyên lý này đúng? Dự đoán ban đầu của bạn đúng ở đâu và sai lệch/bỏ sót điểm mấu chốt nào?
              </label>
              <textarea
                rows={3}
                value={selfExplanation}
                onChange={(e) => setSelfExplanation(e.target.value)}
                placeholder="Viết tự giải thích đối chiếu (tối thiểu 30 ký tự)..."
                className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Critical Audit Widget */}
          <CriticalAuditWidget data={criticalAudit} onChange={setCriticalAudit} />

          {/* Analogical Matrix Widget */}
          <AnalogicalMatrixWidget domains={analogicalMatrix} onChange={setAnalogicalMatrix} />
        </div>
      </div>
    </div>
  );
}
