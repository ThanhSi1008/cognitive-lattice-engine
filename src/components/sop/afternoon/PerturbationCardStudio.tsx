"use client";

import React, { useState } from "react";
import { ANTI_ROTE_REGEX, PerturbationCardType } from "@/lib/validations";
import { Plus, Trash2, CheckCircle2, AlertTriangle, Layers, Edit3, HelpCircle } from "lucide-react";

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
  const [newCardType, setNewCardType] = useState<PerturbationCardType>("COUNTERFACTUAL");
  const [newFrontPrompt, setNewFrontPrompt] = useState("");
  const [newBackStructure, setNewBackStructure] = useState("");

  const isQuantityValid = cards.length >= 2 && cards.length <= 3;

  const handleUpdateCard = (index: number, updatedFields: Partial<PerturbationCardItem>) => {
    const updated = cards.map((c, i) => (i === index ? { ...c, ...updatedFields } : c));
    onChange(updated);
  };

  const handleRemoveCard = (index: number) => {
    onChange(cards.filter((_, i) => i !== index));
  };

  const isNewRoteMatched = ANTI_ROTE_REGEX.test(newFrontPrompt);
  const isNewLengthValid = newFrontPrompt.trim().length >= 80;
  const isNewBackValid = newBackStructure.trim().length >= 10;
  const canAddNewCard = isNewLengthValid && !isNewRoteMatched && isNewBackValid;

  const handleAddCard = () => {
    if (!canAddNewCard) return;

    const newCard: PerturbationCardItem = {
      card_type: newCardType,
      front_prompt: newFrontPrompt.trim(),
      back_structure: newBackStructure.trim(),
    };

    onChange([...cards, newCard]);
    setNewFrontPrompt("");
    setNewBackStructure("");
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 text-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
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

      <p className="text-xs text-slate-400 leading-relaxed">
        Quy tắc chống học vẹt (Anti-Rote Filter): Mọi câu hỏi tình huống mặt trước bắt buộc dài <strong>tối thiểu 80 ký tự</strong>, tuyệt đối không chứa câu hỏi định nghĩa bề mặt (cấm &ldquo;là gì&rdquo;, &ldquo;định nghĩa&rdquo;, &ldquo;khái niệm&rdquo;). Mặt sau bắt buộc tự viết cấu trúc lời giải / cơ chế nhân quả (RULE-04, tối thiểu 10 ký tự).
      </p>

      {/* Danh sách Thẻ Có Khả Năng Soạn Thảo Trực Tiếp (Inline Editing) */}
      <div className="flex flex-col gap-4">
        {cards.map((c, idx) => {
          const isRote = ANTI_ROTE_REGEX.test(c.front_prompt);
          const isFrontValid = c.front_prompt.trim().length >= 80 && !isRote;
          const isBackValid = c.back_structure.trim().length >= 10;

          return (
            <div
              key={idx}
              className={`bg-slate-950 border rounded-xl p-4 flex flex-col gap-3 transition ${
                isFrontValid && isBackValid
                  ? "border-slate-800 focus-within:border-cyan-500/80"
                  : "border-amber-700/60 shadow-lg shadow-amber-950/20"
              }`}
            >
              {/* Header Thẻ: Loại Thẻ & Nút Xóa */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded border border-cyan-800 text-[11px] font-mono font-bold flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Thẻ #{idx + 1}
                  </span>

                  <select
                    value={c.card_type}
                    onChange={(e) => handleUpdateCard(idx, { card_type: e.target.value as PerturbationCardType })}
                    className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500"
                  >
                    <option value="COUNTERFACTUAL">COUNTERFACTUAL (Phản thực tế)</option>
                    <option value="INTERLEAVED_CONTRAST">INTERLEAVED_CONTRAST (Tương phản đan xen)</option>
                    <option value="FAR_TRANSFER">FAR_TRANSFER (Chuyển giao xa)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCard(idx)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition"
                  title="Xóa thẻ này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Ô soạn thảo Front Prompt */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-slate-300 font-medium flex items-center gap-1">
                    <span>Câu hỏi tình huống mặt trước (Front Prompt) *</span>
                  </label>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    {isRote && (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Vi phạm từ khóa học vẹt!
                      </span>
                    )}
                    <span
                      className={`font-semibold ${
                        c.front_prompt.trim().length >= 80 && !isRote ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {c.front_prompt.trim().length} / 80 ký tự tối thiểu
                    </span>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={c.front_prompt}
                  onChange={(e) => handleUpdateCard(idx, { front_prompt: e.target.value })}
                  placeholder="Nhập hoặc chỉnh sửa kịch bản tình huống sâu (tối thiểu 80 ký tự). Tuyệt đối cấm các câu hỏi định nghĩa bề mặt..."
                  className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed ${
                    isRote
                      ? "border-rose-600 focus:border-rose-500"
                      : c.front_prompt.trim().length < 80
                      ? "border-amber-600/70 focus:border-amber-500"
                      : "border-slate-800 focus:border-cyan-500"
                  }`}
                />
              </div>

              {/* Ô soạn thảo Back Structure */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-slate-300 font-medium flex items-center gap-1">
                    <span>Dàn ý đáp án / cơ chế nhân quả mặt sau (Back Structure) *</span>
                  </label>
                  <span
                    className={`font-mono text-[11px] ${
                      isBackValid ? "text-emerald-400 font-semibold" : "text-amber-400 font-bold"
                    }`}
                  >
                    {isBackValid ? (
                      `✓ Đã có đáp án (${c.back_structure.trim().length} ký tự)`
                    ) : (
                      `${c.back_structure.trim().length} / 10 ký tự tối thiểu`
                    )}
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={c.back_structure}
                  onChange={(e) => handleUpdateCard(idx, { back_structure: e.target.value })}
                  placeholder="✍️ Bắt buộc tự viết dàn ý cấu trúc lời giải / cơ chế nhân quả cho tình huống này (RULE-04)..."
                  className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed ${
                    !isBackValid
                      ? "border-amber-500/80 focus:border-amber-400 shadow-sm shadow-amber-950"
                      : "border-slate-800 focus:border-cyan-500"
                  }`}
                />

                {!isBackValid && (
                  <p className="text-[11px] text-amber-400/90 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      ✍️ Bắt buộc tự viết cấu trúc lời giải / cơ chế nhân quả cho tình huống này (RULE-04, tối thiểu 10 ký tự)
                    </span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Tạo Thêm Thẻ Mới Khi Chưa Đủ 3 Thẻ */}
      {cards.length < 3 ? (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 mt-1">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Biên soạn thẻ mới cho [[{zettelUid}]]:</span>
          </div>

          <div>
            <label className="text-xs text-slate-400">Khung tình huống nhận thức</label>
            <select
              value={newCardType}
              onChange={(e) => setNewCardType(e.target.value as PerturbationCardType)}
              className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="COUNTERFACTUAL">COUNTERFACTUAL (Phản thực tế: Nếu điều kiện X bị đảo ngược...)</option>
              <option value="INTERLEAVED_CONTRAST">INTERLEAVED_CONTRAST (Tương phản đan xen: So sánh sự khác biệt cơ chế...)</option>
              <option value="FAR_TRANSFER">FAR_TRANSFER (Chuyển giao xa: Áp dụng nguyên lý vào một miền phi truyền thống...)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-400">Câu hỏi tình huống mặt trước (Front Prompt) *</label>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                {isNewRoteMatched && (
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Chứa từ khóa học vẹt!
                  </span>
                )}
                <span className={isNewLengthValid ? "text-emerald-400" : "text-amber-400"}>
                  {newFrontPrompt.trim().length} / 80 ký tự tối thiểu
                </span>
              </div>
            </div>
            <textarea
              rows={3}
              value={newFrontPrompt}
              onChange={(e) => setNewFrontPrompt(e.target.value)}
              placeholder="Thiết kế một kịch bản tình huống sâu (tối thiểu 80 ký tự). Cấm hỏi 'là gì', 'định nghĩa'..."
              className={`w-full mt-1 bg-slate-900 border rounded px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none leading-relaxed ${
                isNewRoteMatched ? "border-rose-600 focus:border-rose-500" : "border-slate-800 focus:border-cyan-500"
              }`}
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-xs">
              <label className="text-slate-400">Dàn ý đáp án mặt sau (Back Structure) *</label>
              <span className={`font-mono text-[10px] ${isNewBackValid ? "text-emerald-400" : "text-amber-400"}`}>
                {newBackStructure.trim().length} / 10 ký tự tối thiểu
              </span>
            </div>
            <textarea
              rows={2}
              value={newBackStructure}
              onChange={(e) => setNewBackStructure(e.target.value)}
              placeholder="✍️ Tự viết dàn ý câu trả lời chuẩn xác để đối chiếu khi ôn tập..."
              className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
            />
          </div>

          <button
            type="button"
            onClick={handleAddCard}
            disabled={!canAddNewCard}
            className="self-end flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-40 cursor-pointer shadow"
          >
            <Plus className="w-4 h-4" />
            Thêm Thẻ FSRS
          </button>
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-400 text-center">
          ✓ Đã đủ tối đa 3 thẻ FSRS cho Zettel này. Bạn có thể chỉnh sửa trực tiếp nội dung từng thẻ ở các ô bên trên.
        </div>
      )}
    </div>
  );
}
