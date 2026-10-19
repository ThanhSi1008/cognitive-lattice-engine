"use client";

import React, { useState } from "react";
import { ANTI_ROTE_REGEX, PerturbationCardType } from "@/lib/validations";
import { ShieldCheck, Plus, Trash2, CheckCircle2, AlertTriangle, Layers } from "lucide-react";

export interface PerturbationCardItem {
  id?: string;
  card_type: PerturbationCardType;
  front_prompt: string;
  back_structure: string;
}

interface PerturbationCardStudioProps {
  zettelUid: string;
  zettelTitle: string;
  cards: PerturbationCardItem[];
  onChange: (updatedCards: PerturbationCardItem[]) => void;
}

export function PerturbationCardStudio({
  zettelUid,
  zettelTitle,
  cards,
  onChange,
}: PerturbationCardStudioProps) {
  const [cardType, setCardType] = useState<PerturbationCardType>("COUNTERFACTUAL");
  const [frontPrompt, setFrontPrompt] = useState("");
  const [backStructure, setBackStructure] = useState("");

  const isRoteMatched = ANTI_ROTE_REGEX.test(frontPrompt);
  const isLengthValid = frontPrompt.trim().length >= 80;
  const isBackValid = backStructure.trim().length > 0;
  const canAddCard = isLengthValid && !isRoteMatched && isBackValid;

  const isQuantityValid = cards.length >= 2 && cards.length <= 3;

  const handleAddCard = () => {
    if (!canAddCard) return;

    const newCard: PerturbationCardItem = {
      card_type: cardType,
      front_prompt: frontPrompt.trim(),
      back_structure: backStructure.trim(),
    };

    onChange([...cards, newCard]);
    setFrontPrompt("");
    setBackStructure("");
  };

  const handleRemoveCard = (index: number) => {
    onChange(cards.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <Layers className="w-5 h-5" />
          <span>Xưởng Thiết Kế Thẻ Nhiễu Loạn & Phản Thực Tế (Perturbation Studio)</span>
        </div>
        <span
          className={`text-xs font-mono px-2.5 py-0.5 rounded border flex items-center gap-1 ${
            isQuantityValid
              ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
              : "bg-slate-800 text-amber-400 border-slate-700"
          }`}
        >
          {isQuantityValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {cards.length} / 2 – 3 thẻ mục tiêu cho Zettel
        </span>
      </div>

      <p className="text-xs text-slate-400">
        Tuyệt đối chống học vẹt (Anti-Rote Regex). Bộ lọc sẽ từ chối các câu hỏi định nghĩa bề mặt (&ldquo;là gì&rdquo;, &ldquo;định nghĩa&rdquo;, &ldquo;khái niệm&rdquo;) và bắt buộc câu hỏi tình huống dài tối thiểu 80 ký tự.
      </p>

      {/* Existing Cards */}
      <div className="flex flex-col gap-3">
        {cards.map((c, idx) => (
          <div
            key={idx}
            className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex justify-between items-start gap-3"
          >
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.2 bg-cyan-950 text-cyan-400 rounded border border-cyan-800 text-[10px] font-mono font-bold">
                  Thẻ #{idx + 1} • {c.card_type}
                </span>
              </div>
              <p className="text-slate-200 mt-1 font-medium">{c.front_prompt}</p>
              <p className="text-slate-400 text-[11px] mt-0.5 italic">Đáp án: {c.back_structure}</p>
            </div>

            <button
              onClick={() => handleRemoveCard(idx)}
              className="text-slate-600 hover:text-rose-400 transition"
              title="Xóa thẻ này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* New Card Form */}
      {cards.length < 3 && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
          <div className="text-xs font-semibold text-slate-300">Biên soạn thẻ mới cho [[{zettelUid}]]:</div>

          <div>
            <label className="text-xs text-slate-400">Khung tình huống nhận thức</label>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value as PerturbationCardType)}
              className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="COUNTERFACTUAL">COUNTERFACTUAL (Phản thực tế: Nếu điều kiện X bị đảo ngược...)</option>
              <option value="INTERLEAVED_CONTRAST">INTERLEAVED_CONTRAST (Tương phản đan xen: So sánh sự khác biệt cơ chế...)</option>
              <option value="FAR_TRANSFER">FAR_TRANSFER (Chuyển giao xa: Áp dụng nguyên lý vào một miền phi truyền thống...)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-400">Câu hỏi tình huống mặt trước (Front Prompt)</label>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                {isRoteMatched && (
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Chứa từ khóa học vẹt!
                  </span>
                )}
                <span className={isLengthValid ? "text-emerald-400" : "text-amber-400"}>
                  {frontPrompt.trim().length} / 80 ký tự tối thiểu
                </span>
              </div>
            </div>
            <textarea
              rows={3}
              value={frontPrompt}
              onChange={(e) => setFrontPrompt(e.target.value)}
              placeholder="Thiết kế một kịch bản tình huống sâu (tối thiểu 80 ký tự). Cấm hỏi 'là gì', 'định nghĩa'..."
              className={`w-full mt-1 bg-slate-900 border rounded px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed ${
                isRoteMatched ? "border-rose-600 focus:border-rose-500" : "border-slate-800 focus:border-cyan-500"
              }`}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Dàn ý phân tích mặt sau (Back Structure)</label>
            <textarea
              rows={2}
              value={backStructure}
              onChange={(e) => setBackStructure(e.target.value)}
              placeholder="Dàn ý câu trả lời chuẩn xác để đối chiếu khi ôn tập..."
              className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
            />
          </div>

          <button
            type="button"
            onClick={handleAddCard}
            disabled={!canAddCard}
            className="self-end flex items-center gap-1 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded text-xs transition disabled:opacity-40 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm Thẻ FSRS
          </button>
        </div>
      )}
    </div>
  );
}
