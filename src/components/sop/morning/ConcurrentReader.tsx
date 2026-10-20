"use client";

import React, { useState, useEffect } from "react";
import { CriticalAuditWidget, CriticalAuditData } from "./CriticalAuditWidget";
import { AnalogicalMatrixWidget, AnalogicalDomainItem } from "./AnalogicalMatrixWidget";
import { BookOpen, AlertCircle, ArrowRight, Lightbulb, Network, Sparkles, Layers } from "lucide-react";

interface ConcurrentReaderProps {
  conceptTitle: string;
  sourceTextBlocks: string[];
  initialHypothesis: string;
  initialCriticalAudit?: Partial<CriticalAuditData>;
  initialAnalogicalMatrix?: AnalogicalDomainItem[];
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
  initialCriticalAudit,
  initialAnalogicalMatrix,
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

  // Đồng bộ động Critical Audit theo chủ đề học liệu thực tế (thay vì gán cứng FSRS)
  const [criticalAudit, setCriticalAudit] = useState<CriticalAuditData>(() => {
    if (initialCriticalAudit) {
      return {
        pico_frame: {
          population_or_context:
            initialCriticalAudit.pico_frame?.population_or_context ||
            `Bối cảnh ứng dụng của mô hình ${conceptTitle}`,
          intervention_or_mechanism:
            initialCriticalAudit.pico_frame?.intervention_or_mechanism ||
            "Cơ chế tác động nguyên lý gốc và phản hồi cấp 2",
          comparison_baseline:
            initialCriticalAudit.pico_frame?.comparison_baseline ||
            "Cách tiếp cận ngây thơ hoặc phản ứng tuyến tính cấp 1",
          outcome_measured:
            initialCriticalAudit.pico_frame?.outcome_measured ||
            "Hiệu quả dài hạn và tính vững chắc của hệ thống",
        },
        source_database: initialCriticalAudit.source_database || "SCOPUS",
        study_design: initialCriticalAudit.study_design || "THEORETICAL_MODEL",
        risk_of_bias_assessment: {
          tool_used:
            initialCriticalAudit.risk_of_bias_assessment?.tool_used || "LOGIC_CONSISTENCY_CHECK",
          rating_or_score:
            initialCriticalAudit.risk_of_bias_assessment?.rating_or_score || "High Structural Validity",
          key_limitations:
            initialCriticalAudit.risk_of_bias_assessment?.key_limitations ||
            "Giới hạn về bối cảnh lịch sử hoặc thiên kiến mẫu",
        },
        falsifiability_condition:
          initialCriticalAudit.falsifiability_condition ||
          `Điều kiện biên thực nghiệm làm sai lệch hoặc bác bỏ mô hình ${conceptTitle}`,
        sample_size_and_replicability:
          initialCriticalAudit.sample_size_and_replicability ||
          "Dữ liệu kiểm chứng thực nghiệm và khả năng tái lập độc lập",
        counter_evidence_or_rival_model:
          initialCriticalAudit.counter_evidence_or_rival_model ||
          "Mô hình đối lập và các nghiên cứu phản biện chỉ ra giới hạn lý thuyết",
      };
    }
    return {
      pico_frame: {
        population_or_context: `Bối cảnh nghiên cứu: ${conceptTitle.split(/[:•–—-]/)[0].trim()}`,
        intervention_or_mechanism: "Cơ chế tác động phi tuyến tính và phản hồi cấp độ hai",
        comparison_baseline: "Tiếp cận trực quan tuyến tính thông thường",
        outcome_measured: "Tính bền vững và khả năng dự báo kết quả dài hạn",
      },
      source_database: "SCOPUS",
      study_design: "THEORETICAL_MODEL",
      risk_of_bias_assessment: {
        tool_used: "LOGIC_CONSISTENCY_CHECK",
        rating_or_score: "High Structural Validity",
        key_limitations: "Phụ thuộc vào các điều kiện tiên đề ban đầu của môi trường",
      },
      falsifiability_condition: `Bác bỏ nếu quan sát thấy hệ thống vận hành theo chiều hướng ngược lại trong môi trường kiểm chuẩn`,
      sample_size_and_replicability: "Dữ liệu quan sát đa chu kỳ và các nghiên cứu trường hợp độc lập",
      counter_evidence_or_rival_model: "Các trường phái lý thuyết đối trọng chỉ ra ngoại lệ và điểm đứt gãy",
    };
  });

  // Đồng bộ động Ma Trận Tương Tự Đa Miền
  const [analogicalMatrix, setAnalogicalMatrix] = useState<AnalogicalDomainItem[]>(() => {
    if (initialAnalogicalMatrix && initialAnalogicalMatrix.length >= 1) {
      return initialAnalogicalMatrix;
    }
    return [
      {
        domain_name: "Tài chính & Đầu tư",
        surface_features: "Thị trường vốn, chu kỳ kinh tế, biên an toàn",
        first_order_naive_reaction: "Phản ứng cục bộ theo biến động thị giá trước mắt",
        second_order_systemic_mechanism: "Cân bằng động thông qua cơ chế phản hồi thị trường",
        structural_invariant_shared: "Cơ chế phản hồi phi tuyến tính và bảo toàn cấu trúc",
      },
      {
        domain_name: "Kiến trúc Hệ thống",
        surface_features: "Phân tán, độ trễ, chịu lỗi, mạch ngắt",
        first_order_naive_reaction: "Tối ưu hóa cục bộ từng thành phần đơn lẻ",
        second_order_systemic_mechanism: "Sự cố lan truyền cascade và cân bằng tải hệ thống",
        structural_invariant_shared: "Cơ chế phản hồi phi tuyến tính và bảo toàn cấu trúc",
      },
      {
        domain_name: "Sinh thái Học & Tiến hóa",
        surface_features: "Chọn lọc tự nhiên, thích nghi, cân bằng loài",
        first_order_naive_reaction: "Can thiệp loại bỏ một loài nhằm bảo vệ mục tiêu trước mắt",
        second_order_systemic_mechanism: "Biến đổi chuỗi thức ăn và mất cân bằng sinh thái vĩ mô",
        structural_invariant_shared: "Cơ chế phản hồi phi tuyến tính và bảo toàn cấu trúc",
      },
    ];
  });

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
                LƯỢC ĐỒ TRI THỨC TIỀN NGHIỆM ĐÃ KÍCH HOẠT (Prior Schemas)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Mục 4.2 arXiv:2025</span>
            </div>

            {isLoadingPrior ? (
              <div className="text-[11px] text-slate-500 font-mono py-2 animate-pulse">
                Đang quét các nút tri thức liên quan...
              </div>
            ) : priorZettels.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {priorZettels.map((z: any) => (
                  <div
                    key={z.zettel_uid}
                    className="p-2.5 rounded bg-purple-950/20 border border-purple-900/40 text-xs text-slate-300 flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-purple-400 font-bold">
                        [[{z.zettel_uid.slice(-6)}]]
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{z.domain_category}</span>
                    </div>
                    <div className="font-medium text-slate-200 line-clamp-1">{z.atomic_title}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400">
                Chưa có Zettel tiền nghiệm trực tiếp về chủ đề này. Tri thức mới sẽ tạo nút tiên phong (Pioneer Node) trong mạng lưới.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Construction Widgets */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Tự giải thích (Self-Explanation Prompt) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Tự Giải Thích Bằng Lời Của Bạn (Self-Explanation Prompts) *</span>
              </label>
              <span
                className={`text-xs font-mono ${
                  selfExplanation.trim().length >= 30 ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {selfExplanation.trim().length}/30 ký tự
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Hãy trả lời: <em>&quot;Tại sao nguyên lý này lại hoạt động như vậy? Nó khác gì với trực giác thông thường của tôi?&quot;</em>
            </p>
            <textarea
              rows={4}
              value={selfExplanation}
              onChange={(e) => setSelfExplanation(e.target.value)}
              placeholder="Viết diễn giải cá nhân của bạn ở đây... Tuyệt đối không sao chép nguyên văn văn bản bên trái."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
            />
          </div>

          {/* Phản biện Học thuật (Critical Audit) */}
          <CriticalAuditWidget data={criticalAudit} onChange={setCriticalAudit} />

          {/* Ma trận Tương tự Đa miền (Analogical Matrix) */}
          <AnalogicalMatrixWidget domains={analogicalMatrix} onChange={setAnalogicalMatrix} />
        </div>
      </div>
    </div>
  );
}
