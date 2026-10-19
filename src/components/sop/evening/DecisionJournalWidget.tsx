"use client";

import React, { useState } from "react";
import { countWords } from "@/lib/validations";
import { Lock, CheckCircle2, ShieldCheck, Sliders, AlertCircle, FileText } from "lucide-react";

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

  const probSum = probPos + probNeu + probWorst;
  const isProbSumValid = probSum === 100;

  const problemWords = countWords(problemFrame);
  const isProblemFrameValid = problemWords >= 40;

  const isThesisValid = primaryThesis.trim().length > 0;
  const isRejectedValid = rejectedAlts.length >= 2;

  const canCommit = isProbSumValid && isProblemFrameValid && isThesisValid && isRejectedValid;

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
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <span>Định Khung Quyết Định & Đo Lường Brier Score Hậu Kiểm</span>
          </h2>
        </div>

        <span
          className={`text-xs font-mono px-3 py-1 rounded-full border ${
            isProbSumValid
              ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
              : "bg-rose-950/80 text-rose-400 border-rose-800"
          }`}
        >
          Tổng xác suất: {probSum}% / 100% (chk_probability_sum_100)
        </span>
      </div>

      {/* 1. Trạng thái sinh lý & thiên kiến cảm xúc */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 text-xs">
        <div>
          <label className="text-slate-400">Mức độ căng thẳng (Stress: 1 - 10)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={stressLevel}
            onChange={(e) => setStressLevel(parseInt(e.target.value, 10))}
            className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
          />
        </div>
        <div>
          <label className="text-slate-400">Giấc ngủ đêm qua (Giờ)</label>
          <input
            type="number"
            step="0.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(parseFloat(e.target.value))}
            className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
          />
        </div>
        <div>
          <label className="text-slate-400">Thiên kiến cảm xúc hiện hành</label>
          <input
            type="text"
            value={emotionalBias}
            onChange={(e) => setEmotionalBias(e.target.value)}
            className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
          />
        </div>
      </div>

      {/* 2. Định khung vấn đề (>= 40 từ) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs">
          <label className="text-slate-300 font-medium">Định khung vấn đề (Problem Frame) *</label>
          <span className={`font-mono text-[11px] ${isProblemFrameValid ? "text-emerald-400" : "text-amber-400"}`}>
            {problemWords} / 40 từ tối thiểu
          </span>
        </div>
        <textarea
          rows={3}
          value={problemFrame}
          onChange={(e) => setProblemFrame(e.target.value)}
          placeholder="Mô tả cụ thể bài toán, bối cảnh quyết định và điều kiện biên (tối thiểu 40 từ)..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
        />
      </div>

      {/* 3. Quyết định lựa chọn & Giả thuyết chính */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-300 font-medium">
          Quyết định lựa chọn & Giả thuyết chính (Primary Thesis) *
        </label>
        <input
          type="text"
          value={primaryThesis}
          onChange={(e) => setPrimaryThesis(e.target.value)}
          placeholder="Luận điểm chính xác bạn quyết định chọn áp dụng..."
          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* 4. Ba thanh trượt xác suất (Tổng = 100%) */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-3 text-xs">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Phân bổ xác suất 3 kịch bản tương lai</span>
          </span>
          <span className="font-mono text-slate-400">Tổng: {probSum}%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Tích cực (Positive)</span>
              <span className="font-mono text-emerald-400">{probPos}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={probPos}
              onChange={(e) => setProbPos(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Trung hòa (Neutral)</span>
              <span className="font-mono text-cyan-400">{probNeu}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={probNeu}
              onChange={(e) => setProbNeu(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Tiêu cực (Worst-Case)</span>
              <span className="font-mono text-rose-400">{probWorst}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={probWorst}
              onChange={(e) => setProbWorst(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500"
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
    </div>
  );
}
