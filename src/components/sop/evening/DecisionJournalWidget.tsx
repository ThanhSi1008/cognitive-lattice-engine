"use client";

import React, { useState } from "react";
import { countWords } from "@/lib/validations";
import { DecisionRedflagsResult } from "@/lib/ai/socratic-engine";
import { Lock, CheckCircle2, ShieldCheck, Sliders, AlertCircle, FileText, Sparkles, AlertTriangle } from "lucide-react";

export interface DecisionJournalData {
  id?: string;
  user_id?: string;
  physio_emotional_state: {
    stress_level: number;
    sleep_hours: number;
    emotional_bias: string;
    context_notes?: string;
  };
  problem_frame: string;
  rejected_alternatives: {
    alternative: string;
    rationale_for_rejection: string;
    linked_zettel_uid?: string;
  }[];
  linked_zettel_uids: string[];
  primary_thesis: string;
  prob_positive: number;
  prob_neutral: number;
  prob_worst: number;
  second_third_order_effects: {
    short_term_opportunity_cost: string;
    second_order_5_weeks: string;
    third_order_5_months: string;
  };
  is_locked?: boolean;
}

interface DecisionJournalWidgetProps {
  userId?: string;
  availableZettelUids?: string[];
  onDecisionCommitted?: (journal: any) => void;
}

export function DecisionJournalWidget({
  userId = "00000000-0000-0000-0000-000000000001",
  availableZettelUids = ["20261019000001", "20261019000002"],
  onDecisionCommitted,
}: DecisionJournalWidgetProps) {
  const [stressLevel, setStressLevel] = useState(3);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [emotionalBias, setEmotionalBias] = useState("Thiên kiến hành động (Action Bias)");

  const [problemFrame, setProblemFrame] = useState("");
  const [primaryThesis, setPrimaryThesis] = useState("");

  const [probPos, setProbPos] = useState(60);
  const [probNeu, setProbNeu] = useState(30);
  const [probWorst, setProbWorst] = useState(10);

  const [rejectedAlts, setRejectedAlts] = useState([
    {
      alternative: "Duy trì cách tiếp cận cũ và tăng thời gian học thụ động",
      rationale_for_rejection: "Gây mệt mỏi nhận thức mà không cải thiện khả năng lưu giữ dài hạn",
      linked_zettel_uid: availableZettelUids[0] || "20261019000001",
    },
    {
      alternative: "Áp dụng kỹ thuật flashcards truyền thống hỏi định nghĩa bề mặt",
      rationale_for_rejection: "Tạo ảo tưởng về năng lực (Illusion of Competence) mà thất bại khi chuyển giao xa",
      linked_zettel_uid: availableZettelUids[1] || "20261019000002",
    },
  ]);

  const [oppCost, setOppCost] = useState("Chi phí cơ hội ngắn hạn: Thời gian 60 phút mỗi ngày");
  const [secondOrder, setSecondOrder] = useState("Hệ quả cấp 2 (5 tuần): Tốc độ hấp thu mô hình mới tăng gấp 2 lần");
  const [thirdOrder, setThirdOrder] = useState("Hệ quả cấp 3 (5 tháng): Hình thành trực giác liên ngành vững chắc");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [committedRecord, setCommittedRecord] = useState<any | null>(null);

  // Socratic Bias Audit State
  const [redflagsResult, setRedflagsResult] = useState<DecisionRedflagsResult | null>(null);
  const [isScanningRedflags, setIsScanningRedflags] = useState(false);

  // Outcome Audit State (+30 / +60 / +90 Days)
  const [lockedDecisions, setLockedDecisions] = useState<any[]>([]);
  const [selectedAuditDecision, setSelectedAuditDecision] = useState<any | null>(null);
  const [auditMilestone, setAuditMilestone] = useState<"30d" | "60d" | "90d">("30d");
  const [actualOutcome, setActualOutcome] = useState<"POSITIVE" | "NEUTRAL" | "WORST">("POSITIVE");
  const [auditNotes, setAuditNotes] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditFeedback, setAuditFeedback] = useState<any | null>(null);

  const loadDecisions = async () => {
    try {
      const res = await fetch(`/api/decisions?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        const locked = (data.decisions || []).filter((d: any) => d.is_locked);
        setLockedDecisions(locked);
      }
    } catch (e) {
      console.error("Lỗi tải danh sách quyết định:", e);
    }
  };

  React.useEffect(() => {
    loadDecisions();
  }, [userId]);

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuditDecision || isAuditing) return;
    setIsAuditing(true);
    try {
      const res = await fetch("/api/decisions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAuditDecision.id,
          milestone: auditMilestone,
          outcome: actualOutcome,
          reviewNotes: auditNotes.trim() || "Hậu kiểm kết quả thực tế.",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi cập nhật hậu kiểm");
      }

      const data = await res.json();
      setAuditFeedback(data.brierResult);
      await loadDecisions();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const probSum = probPos + probNeu + probWorst;
  const isProbSumValid = probSum === 100;

  const problemWords = countWords(problemFrame);
  const isProblemFrameValid = problemWords >= 40;

  const isThesisValid = primaryThesis.trim().length > 0;
  const isRejectedValid = rejectedAlts.length >= 2;

  const canCommit = isProbSumValid && isProblemFrameValid && isThesisValid && isRejectedValid;

  const handleScanRedflags = async () => {
    if (!problemFrame.trim() || !primaryThesis.trim() || isScanningRedflags) return;
    setIsScanningRedflags(true);
    try {
      const res = await fetch("/api/ai/decision-redflags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemFraming: problemFrame,
          selectedOption: primaryThesis,
          discardedOptions: rejectedAlts,
          probabilityOutcomes: { probPos, probNeu, probWorst },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRedflagsResult(data);
      }
    } catch (err) {
      console.error("Redflags scan error:", err);
    } finally {
      setIsScanningRedflags(false);
    }
  };

  const handleCommitAndLock = async () => {
    if (!canCommit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: DecisionJournalData = {
        user_id: userId,
        physio_emotional_state: {
          stress_level: stressLevel,
          sleep_hours: sleepHours,
          emotional_bias: emotionalBias,
        },
        problem_frame: problemFrame.trim(),
        rejected_alternatives: rejectedAlts,
        linked_zettel_uids: availableZettelUids.slice(0, 2),
        primary_thesis: primaryThesis.trim(),
        prob_positive: probPos,
        prob_neutral: probNeu,
        prob_worst: probWorst,
        second_third_order_effects: {
          short_term_opportunity_cost: oppCost.trim(),
          second_order_5_weeks: secondOrder.trim(),
          third_order_5_months: thirdOrder.trim(),
        },
        is_locked: true, // Khóa bất biến chống Hindsight Bias
      };

      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi lưu quyết định");
      }

      const data = await res.json();
      setCommittedRecord(data.decision);
      if (onDecisionCommitted) onDecisionCommitted(data.decision);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (committedRecord) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
          <ShieldCheck className="w-5 h-5" />
          <span>Bản Ghi Nhật Ký Quyết Định Đã Bị Khóa Bất Biến (is_locked = TRUE)</span>
        </div>
        <p className="text-xs text-slate-300">
          Hệ thống chống thiên kiến Hindsight Bias đã kích hoạt. Mọi nội dung định khung, xác suất và phương án bị loại bỏ không thể chỉnh sửa.
        </p>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 font-mono space-y-1">
          <div>ID: {committedRecord.id}</div>
          <div>Xác suất dự báo: Pos {committedRecord.prob_positive}% / Neu {committedRecord.prob_neutral}% / Worst {committedRecord.prob_worst}%</div>
          <div className="text-cyan-400">Đã lập lịch kiểm toán Brier Score tự động ở các mốc: +30d, +60d, +90d.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6 text-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
            Phân Hệ Nhật Ký Quyết Định (Phút 16–20) • Farnam Street Standard
          </div>
          <h2 className="text-lg font-bold text-white">Lập Hồ Sơ Quyết Định Bất Biến</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Buộc người ra quyết định công khai các phương án bị loại bỏ và phân phối xác suất trước khi kết quả xảy ra.
          </p>
        </div>
      </div>

      {/* 1. Trạng thái sinh lý & cảm xúc */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs">
        <div>
          <label className="text-slate-400">Mức độ căng thẳng (1-10): {stressLevel}</label>
          <input
            type="range"
            min={1}
            max={10}
            value={stressLevel}
            onChange={(e) => setStressLevel(parseInt(e.target.value, 10))}
            className="w-full mt-2 accent-cyan-400"
          />
        </div>
        <div>
          <label className="text-slate-400">Thời gian ngủ đêm qua: {sleepHours}h</label>
          <input
            type="number"
            step="0.5"
            min={0}
            max={16}
            value={sleepHours}
            onChange={(e) => setSleepHours(parseFloat(e.target.value))}
            className="w-full mt-1.5 bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
          />
        </div>
        <div>
          <label className="text-slate-400">Thiên kiến nhận diện lúc ra quyết định:</label>
          <select
            value={emotionalBias}
            onChange={(e) => setEmotionalBias(e.target.value)}
            className="w-full mt-1.5 bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
          >
            <option>Thiên kiến hành động (Action Bias)</option>
            <option>Sợ bỏ lỡ cơ hội (FOMO)</option>
            <option>Quá tự tin (Overconfidence)</option>
            <option>Mệt mỏi nhận thức (Decision Fatigue)</option>
            <option>Cân bằng & Tỉnh táo (Neutral Rational)</option>
          </select>
        </div>
      </div>

      {/* 2. Định khung vấn đề (>= 40 từ) */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <label className="font-semibold text-slate-200">
            Định khung vấn đề & Bối cảnh (Problem Frame & Context) *
          </label>
          <span
            className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
              isProblemFrameValid
                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                : "bg-slate-800 text-amber-400 border-slate-700"
            }`}
          >
            {problemWords} / 40 từ tối thiểu (chk_problem_frame_depth)
          </span>
        </div>
        <textarea
          rows={3}
          value={problemFrame}
          onChange={(e) => setProblemFrame(e.target.value)}
          placeholder="Mô tả bản chất vấn đề đang giải quyết (tối thiểu 40 từ). Điểm nghẽn cốt lõi là gì? Các biến số nào đang tác động trực tiếp?..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
        />
      </div>

      {/* 3. Luận điểm lựa chọn chính */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-200">
          Phương án lựa chọn & Luận điểm chính (Primary Thesis) *
        </label>
        <input
          type="text"
          value={primaryThesis}
          onChange={(e) => setPrimaryThesis(e.target.value)}
          placeholder="Phương án hành động cụ thể bạn quyết định thực thi..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* 4. Phân bổ xác suất (Tổng đúng 100%) */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-3 text-xs">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-200">Phân bổ xác suất kịch bản (Tổng phải bằng đúng 100%):</span>
          <span
            className={`font-mono font-bold px-2 py-0.5 rounded border ${
              isProbSumValid
                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                : "bg-rose-950 text-rose-400 border-rose-800"
            }`}
          >
            Tổng: {probSum}% {isProbSumValid ? "✓ Hợp lệ" : "(Phải bằng 100%)"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-emerald-400">Kịch bản Tốt (Positive): {probPos}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={probPos}
              onChange={(e) => setProbPos(parseInt(e.target.value, 10))}
              className="w-full mt-1.5 accent-emerald-500"
            />
          </div>
          <div>
            <label className="text-cyan-400">Kịch bản Trung tính (Neutral): {probNeu}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={probNeu}
              onChange={(e) => setProbNeu(parseInt(e.target.value, 10))}
              className="w-full mt-1.5 accent-cyan-500"
            />
          </div>
          <div>
            <label className="text-rose-400">Kịch bản Xấu nhất (Worst): {probWorst}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={probWorst}
              onChange={(e) => setProbWorst(parseInt(e.target.value, 10))}
              className="w-full mt-1.5 accent-rose-500"
            />
          </div>
        </div>
      </div>

      {/* 5. Phương án đã loại bỏ (>= 2 phương án) */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-2.5 text-xs">
        <span className="font-semibold text-slate-200">Các phương án đã loại bỏ (&ge; 2 phương án kèm Zettel UID):</span>
        {rejectedAlts.map((alt, i) => (
          <div key={i} className="p-2.5 bg-slate-900/50 rounded border border-slate-800/80 flex flex-col gap-1">
            <div className="text-slate-300 font-medium">• {alt.alternative}</div>
            <div className="text-slate-400 text-[11px] italic">Lý do: {alt.rationale_for_rejection} (Nhúng [[{alt.linked_zettel_uid}]])</div>
          </div>
        ))}
      </div>

      {/* AI Socratic Redflags Scan Panel */}
      <div className="bg-slate-950 p-4 rounded-xl border border-purple-900/60 flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 font-semibold text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Rà Soát Thiên Kiến & Hệ Quả Cấp 2/3 (AI Socratic Redflags)</span>
          </div>
          <button
            type="button"
            onClick={handleScanRedflags}
            disabled={!problemFrame.trim() || !primaryThesis.trim() || isScanningRedflags}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              problemFrame.trim() && primaryThesis.trim() && !isScanningRedflags
                ? "bg-purple-900/70 hover:bg-purple-800 text-purple-200 border border-purple-700 cursor-pointer"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            {isScanningRedflags ? "Đang quét..." : "Quét Thiên Kiến Trước Khi Khóa"}
          </button>
        </div>

        {redflagsResult && (
          <div className="flex flex-col gap-3 text-xs pt-2 border-t border-slate-800 animate-in fade-in duration-150">
            {redflagsResult.identifiedBiases.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Phát Hiện Thiên Kiến Nhận Thức Tiềm Ẩn:
                </span>
                {redflagsResult.identifiedBiases.map((b, idx) => (
                  <div key={idx} className="bg-amber-950/30 border border-amber-900/50 p-2.5 rounded text-[11px]">
                    <div className="font-bold text-amber-300 flex items-center justify-between">
                      <span>{b.name}</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-200">
                        Mức rủi ro: {b.severity}
                      </span>
                    </div>
                    <div className="text-slate-300 mt-1">{b.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-emerald-400 text-xs">✓ Không phát hiện ngụy biện nhận thức nghiêm trọng.</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <span className="font-semibold text-cyan-400">Hệ Quả Cấp 2 Cần Dự Liệu:</span>
                <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5">
                  {redflagsResult.secondOrderConsequences.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                <span className="font-semibold text-purple-400">Hệ Quả Cấp 3 Dài Hạn:</span>
                <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5">
                  {redflagsResult.thirdOrderConsequences.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Commit & Lock Button */}
      <button
        onClick={handleCommitAndLock}
        disabled={!canCommit || isSubmitting}
        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition ${
          canCommit && !isSubmitting
            ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 cursor-pointer"
            : "bg-slate-800 text-slate-500 cursor-not-allowed"
        }`}
      >
        <Lock className="w-4 h-4" />
        {isSubmitting ? "Đang khóa..." : "Khóa Quyết Định Bất Biến & Lập Lịch Hậu Kiểm 30-60-90 Ngày"}
      </button>

      {/* 6. Bảng Kiểm Toán Hậu Nghiệm Quyết Định (+30 / +60 / +90 Ngày & Brier Score) */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs font-mono text-cyan-400 font-semibold uppercase block">
              HẬU KIỂM KẾT QUẢ THỰC TẾ (+30 / +60 / +90 NGÀY)
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Đo Lường Điểm Brier Đa Lớp & Hiệu Chuẩn Nhận Thức
            </h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
            {lockedDecisions.length} quyết định đã khóa
          </span>
        </div>

        {lockedDecisions.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lockedDecisions.map((dec) => (
                <div
                  key={dec.id}
                  onClick={() => {
                    setSelectedAuditDecision(dec);
                    setAuditFeedback(null);
                  }}
                  className={`p-3.5 rounded-lg border cursor-pointer transition flex flex-col gap-1.5 ${
                    selectedAuditDecision?.id === dec.id
                      ? "bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/50"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-xs line-clamp-1">{dec.primary_thesis}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
                      Đã khóa
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{dec.problem_frame}</p>
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                    <span>Dự báo: {dec.prob_positive}% / {dec.prob_neutral}% / {dec.prob_worst}%</span>
                    {dec.brier_score !== null && dec.brier_score !== undefined ? (
                      <span className="text-cyan-400 font-bold">BS: {dec.brier_score.toFixed(3)}</span>
                    ) : (
                      <span className="text-amber-400">Chờ hậu kiểm</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Audit Form for Selected Decision */}
            {selectedAuditDecision && (
              <form onSubmit={handleAuditSubmit} className="bg-slate-900/80 border border-cyan-900/50 rounded-xl p-4 flex flex-col gap-3 mt-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-300">
                    Hậu kiểm cho: &ldquo;{selectedAuditDecision.primary_thesis}&rdquo;
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Xác suất gán ban đầu: Pos {selectedAuditDecision.prob_positive}% / Neu {selectedAuditDecision.prob_neutral}% / Worst {selectedAuditDecision.prob_worst}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-medium">Mốc thời gian hậu kiểm:</label>
                    <select
                      value={auditMilestone}
                      onChange={(e) => setAuditMilestone(e.target.value as any)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                    >
                      <option value="30d">Mốc +30 ngày</option>
                      <option value="60d">Mốc +60 ngày</option>
                      <option value="90d">Mốc +90 ngày</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-medium">Kịch bản thực tế đã xảy ra:</label>
                    <select
                      value={actualOutcome}
                      onChange={(e) => setActualOutcome(e.target.value as any)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                    >
                      <option value="POSITIVE">Kịch bản Tích cực (Positive Outcome)</option>
                      <option value="NEUTRAL">Kịch bản Trung tính (Neutral Outcome)</option>
                      <option value="WORST">Kịch bản Xấu nhất (Worst Outcome)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-medium">Ghi chú đối chiếu & Bài học rút ra:</label>
                  <textarea
                    rows={2}
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="Mô tả diễn biến thực tế so với giả định ban đầu..."
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200"
                  />
                </div>

                <div className="flex justify-between items-center pt-1">
                  <div className="text-[11px] text-slate-400">
                    Công thức Brier Score đa lớp: \(BS = \sum (p_k - o_k)^2 \in [0, 2]\)
                  </div>
                  <button
                    type="submit"
                    disabled={isAuditing}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer shadow"
                  >
                    {isAuditing ? "Đang tính điểm..." : "Ghi Nhận & Tính Brier Score Thời Gian Thực"}
                  </button>
                </div>

                {auditFeedback && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-cyan-800/80 flex items-center justify-between text-xs mt-1">
                    <span className="font-mono text-cyan-300">
                      Điểm Brier Đã Cập Nhật: <strong>{auditFeedback.brierScore.toFixed(4)}</strong>
                    </span>
                    <span className="font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800">
                      Xếp loại: {auditFeedback.calibrationRating}
                    </span>
                  </div>
                )}
              </form>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-lg">
            Chưa có quyết định nào bị khóa. Hãy tạo quyết định mới ở khung phía trên và bấm Khóa Quyết Định Bất Biến.
          </div>
        )}
      </div>
    </div>
  );
}
