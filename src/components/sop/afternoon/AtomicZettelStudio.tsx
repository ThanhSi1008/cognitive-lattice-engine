"use client";

import React, { useState } from "react";
import { countWords } from "@/lib/validations";
import { TipTapEditor } from "@/components/editor/TipTapEditor";
import { BiDirectionalLinkEngine, ZettelLinkItem } from "./BiDirectionalLinkEngine";
import { PerturbationCardStudio, PerturbationCardItem } from "./PerturbationCardStudio";
import { SocraticProbeResult } from "@/lib/ai/socratic-engine";
import { CheckCircle2, AlertCircle, FileText, Send, Split, Sparkles, Brain, ArrowDown } from "lucide-react";

interface LiteratureNotePreview {
  id: string;
  source_citation: any;
  paraphrased_summary: string;
  analogical_matrix: any[];
}

interface FleetingNotePreview {
  id: string;
  raw_content: string;
}

interface ExistingZettelPreview {
  zettel_uid: string;
  atomic_title: string;
  domain_category: string;
}

interface AtomicZettelStudioProps {
  userId?: string;
  literatureNote?: LiteratureNotePreview | null;
  fleetingNotes?: FleetingNotePreview[];
  existingZettels?: ExistingZettelPreview[];
  onZettelPublished: (zettelUid: string) => void;
}

export function AtomicZettelStudio({
  userId = "00000000-0000-0000-0000-000000000001",
  literatureNote,
  fleetingNotes = [],
  existingZettels = [],
  onZettelPublished,
}: AtomicZettelStudioProps) {
  // Sinh UID theo định dạng YYYYMMDDHHMMSS
  const generateZettelUid = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  };

  const [zettelUid] = useState(generateZettelUid());
  const [atomicTitle, setAtomicTitle] = useState("");
  const [domainCategory, setDomainCategory] = useState("Cognitive Engineering");
  const [bodyText, setBodyText] = useState("");
  const [links, setLinks] = useState<ZettelLinkItem[]>([]);
  const [cards, setCards] = useState<PerturbationCardItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Socratic Mentor Evaluation State
  const [socraticResult, setSocraticResult] = useState<SocraticProbeResult | null>(null);
  const [isProbing, setIsProbing] = useState(false);

  const wordCount = countWords(bodyText);
  const isWordCountValid = wordCount >= 100 && wordCount <= 350;

  const isTitleLengthValid = atomicTitle.trim().length >= 20 && atomicTitle.trim().length <= 250;
  const isTitlePropositional = !atomicTitle.includes("?");
  const isTitleValid = isTitleLengthValid && isTitlePropositional;

  const isLinksValid = links.length >= 2;
  const isCardsValid = cards.length >= 2 && cards.length <= 3;

  const canPublish = isWordCountValid && isTitleValid && isLinksValid && isCardsValid;

  const handleSocraticAudit = async () => {
    if (!atomicTitle.trim() || !bodyText.trim() || isProbing) return;
    setIsProbing(true);
    try {
      const res = await fetch("/api/ai/socratic-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "AFTERNOON",
          input: {
            atomicTitle,
            bodyText,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSocraticResult(data);
      }
    } catch (err) {
      console.error("Socratic afternoon probe error:", err);
    } finally {
      setIsProbing(false);
    }
  };

  const handleApplyScenariosToCards = () => {
    if (!socraticResult?.scenarios) return;
    const { counterfactual, interleavedContrast, farTransfer } = socraticResult.scenarios;
    setCards([
      {
        card_type: "COUNTERFACTUAL",
        front_prompt: counterfactual,
        back_structure: `[Cơ chế phản thực tế cho: ${atomicTitle}]`,
      },
      {
        card_type: "INTERLEAVED_CONTRAST",
        front_prompt: interleavedContrast,
        back_structure: `[Điểm tương phản then chốt giữa hai mô hình]`,
      },
      {
        card_type: "FAR_TRANSFER",
        front_prompt: farTransfer,
        back_structure: `[Nguyên lý ánh xạ chuyển giao xa sang miền mới]`,
      },
    ]);
  };

  const handlePublish = async () => {
    if (!canPublish || isPublishing) return;
    setIsPublishing(true);
    try {
      // 1. Tạo Permanent Zettel ở trạng thái DRAFT
      const zettelPayload = {
        zettel_uid: zettelUid,
        user_id: userId,
        atomic_title: atomicTitle.trim(),
        body_text: bodyText.trim(),
        word_count: wordCount,
        domain_category: domainCategory.trim(),
        literature_note_id: literatureNote?.id || null,
        state: "DRAFT",
      };

      const zettelRes = await fetch("/api/zettels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zettelPayload),
      });

      if (!zettelRes.ok) {
        const err = await zettelRes.json();
        throw new Error(err.error || "Lỗi lưu Zettel nháp");
      }

      // 2. Lưu tối thiểu 2 liên kết hai chiều vào zettel_links
      for (const link of links) {
        const linkRes = await fetch("/api/zettels", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(link),
        });
        if (!linkRes.ok) {
          const err = await linkRes.json();
          throw new Error(err.error || "Lỗi lưu liên kết hai chiều");
        }
      }

      // 3. Chuyển trạng thái sang PUBLISHED (Trigger trg_enforce_zettel_links kiểm tra >= 2 links)
      const publishRes = await fetch("/api/zettels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zettel_uid: zettelUid,
          state: "PUBLISHED",
        }),
      });

      if (!publishRes.ok) {
        const err = await publishRes.json();
        throw new Error(err.error || "Lỗi chuyển Zettel sang trạng thái PUBLISHED");
      }

      // 4. Tạo các thẻ FSRS
      for (const card of cards) {
        await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            zettel_uid: zettelUid,
            card_type: card.card_type,
            front_prompt: card.front_prompt,
            back_structure: card.back_structure,
          }),
        });
      }

      onZettelPublished(zettelUid);
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-1">
            XƯỞNG CHƯNG CẤT NGUYÊN TỬ (Phút 1–12) • UID: {zettelUid}
          </div>
          <h2 className="text-xl font-bold text-white">Chế Tác Ghi Chú Vĩnh Viễn (Permanent Zettel)</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Một Zettel chỉ chứa đúng MỘT nguyên lý/luận điểm nhân quả hoàn chỉnh. Hỗ trợ TipTap Editor và gợi ý liên kết hai chiều khi gõ <code className="text-purple-400">[[</code>.
          </p>
        </div>

        <button
          onClick={handlePublish}
          disabled={!canPublish || isPublishing}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition ${
            canPublish && !isPublishing
              ? "bg-purple-500 hover:bg-purple-400 text-slate-950 shadow-lg shadow-purple-500/20 cursor-pointer"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
          {isPublishing ? "Đang xuất bản..." : "Xuất Bản Zettel & Thẻ FSRS (PUBLISHED)"}
        </button>
      </div>

      {/* Split-Screen: Left = Context, Right = Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Context (Literature Note + Analogical Matrix + Fleeting Notes) */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 max-h-[850px] overflow-y-auto text-xs">
          <div className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-1.5 pb-2 border-b border-slate-800">
            <Split className="w-3.5 h-3.5" />
            <span>Nguyên Liệu Đầu Vào (Buổi Sáng & Giữa Ngày)</span>
          </div>

          {/* Ghi chú tài liệu buổi sáng */}
          {literatureNote ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-3.5 flex flex-col gap-2">
              <span className="font-semibold text-slate-200">Ghi chú đóng sách (Literature Note):</span>
              <p className="text-slate-300 leading-relaxed italic">{literatureNote.paraphrased_summary}</p>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Nguồn: {literatureNote.source_citation?.author} ({literatureNote.source_citation?.year})
              </div>
            </div>
          ) : (
            <div className="text-slate-500 italic">Chưa có Literature Note từ phiên sáng.</div>
          )}

          {/* Ma trận tương tự */}
          {literatureNote?.analogical_matrix && literatureNote.analogical_matrix.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">Ánh xạ tương tự đa miền:</span>
              {literatureNote.analogical_matrix.map((m: any, i: number) => (
                <div key={i} className="bg-slate-900/30 border border-slate-800/60 rounded p-2.5">
                  <div className="font-bold text-cyan-400">{m.domain_name}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{m.second_order_systemic_mechanism}</div>
                </div>
              ))}
            </div>
          )}

          {/* Fleeting Notes */}
          {fleetingNotes.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-slate-200">Fleeting Notes liên quan:</span>
              {fleetingNotes.map((fn) => (
                <div key={fn.id} className="bg-slate-900/30 border border-slate-800/60 rounded p-2 text-slate-300">
                  {fn.raw_content}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Permanent Zettel Editor */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            {/* Title */}
            <div>
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-medium">Tiêu đề mệnh đề (Atomic Propositional Title) *</label>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  {!isTitlePropositional && (
                    <span className="text-rose-400 font-bold flex items-center gap-0.5">
                      <AlertCircle className="w-3 h-3" /> Không được dùng dấu chấm hỏi (?)
                    </span>
                  )}
                  <span className={isTitleLengthValid ? "text-emerald-400" : "text-amber-400"}>
                    {atomicTitle.trim().length} / 20 – 250 ký tự
                  </span>
                </div>
              </div>
              <input
                type="text"
                value={atomicTitle}
                onChange={(e) => setAtomicTitle(e.target.value)}
                placeholder="Ví dụ: Giàn giáo thích ứng ngăn chặn quá tải nhận thức trong luyện tập đan xen"
                className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 font-semibold focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Domain */}
            <div>
              <label className="text-xs text-slate-400">Danh mục miền (Domain Category)</label>
              <input
                type="text"
                value={domainCategory}
                onChange={(e) => setDomainCategory(e.target.value)}
                placeholder="Ví dụ: Cognitive Science / System Architecture / Behavioral Economics"
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Body using TipTap Editor */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <label className="text-slate-300 font-medium">Thân bài nguyên tử (TipTap Editor với [[ Autocomplete) *</label>
              </div>
              <TipTapEditor
                content={bodyText}
                placeholder="Trình bày mạch lạc lập luận nhân quả nguyên tử của Zettel này (100 đến 350 từ). Gõ [[ để liên kết với các Zettels khác trong hộp phiếu..."
                minWords={100}
                maxWords={350}
                enableZettelAutocomplete={true}
                onChange={(text) => setBodyText(text)}
                onZettelSelected={(z) => {
                  // Tự động bổ sung vào danh sách liên kết nếu chưa có
                  if (!links.some((l) => l.target_zettel_uid === z.zettel_uid)) {
                    setLinks([
                      ...links,
                      {
                        source_zettel_uid: zettelUid,
                        target_zettel_uid: z.zettel_uid,
                        link_type: "EXTENDS_PAST",
                        connection_rationale: `Liên kết trực tiếp từ thân bài Zettel với khái niệm "${z.atomic_title}"`,
                      },
                    ]);
                  }
                }}
              />
            </div>

            {/* Socratic Audit & Scenario Generation Trigger */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>Kiểm tra tính trừu tượng & Tạo tình huống phản thực tế:</span>
              </div>
              <button
                type="button"
                onClick={handleSocraticAudit}
                disabled={!atomicTitle.trim() || !bodyText.trim() || isProbing}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  atomicTitle.trim() && bodyText.trim() && !isProbing
                    ? "bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                {isProbing ? "AI đang phân tích..." : "Rà Soát Socratic & Sinh 3 Kịch Bản Thẻ"}
              </button>
            </div>

            {/* Socratic Result Display */}
            {socraticResult && (
              <div className="bg-slate-950 border border-purple-800/60 rounded-xl p-4 flex flex-col gap-4 animate-in fade-in duration-150">
                {/* Abstractness Evaluation */}
                {socraticResult.abstractnessEvaluation && (
                  <div className="flex flex-col gap-1.5 pb-3 border-b border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Đánh giá tính Trừu tượng hóa (Abstraction Level):</span>
                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                          socraticResult.abstractnessEvaluation.abstractnessScore >= 0.7
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : "bg-amber-950 text-amber-400 border-amber-800"
                        }`}
                      >
                        Điểm: {Math.round(socraticResult.abstractnessEvaluation.abstractnessScore * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 italic">{socraticResult.abstractnessEvaluation.critique}</p>
                    {socraticResult.abstractnessEvaluation.suggestedRefactoringVector && (
                      <p className="text-[11px] text-purple-400">
                        👉 Hướng hoàn thiện: {socraticResult.abstractnessEvaluation.suggestedRefactoringVector}
                      </p>
                    )}
                  </div>
                )}

                {/* Scenarios Generated */}
                {socraticResult.scenarios && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
                      <span>3 Kịch Bản Nhiễu Loạn Cho Phút 18–20:</span>
                      <button
                        type="button"
                        onClick={handleApplyScenariosToCards}
                        className="text-[11px] font-mono text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer bg-purple-950/80 px-2 py-1 rounded border border-purple-800"
                      >
                        <ArrowDown className="w-3 h-3" /> Chuyển vào Studio Thẻ FSRS
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-slate-300">
                        {socraticResult.scenarios.counterfactual}
                      </div>
                      <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-slate-300">
                        {socraticResult.scenarios.interleavedContrast}
                      </div>
                      <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-slate-300">
                        {socraticResult.scenarios.farTransfer}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Phút 13-17: Động cơ liên kết hai chiều cưỡng bức */}
          <BiDirectionalLinkEngine
            currentZettelUid={zettelUid}
            links={links}
            existingZettels={existingZettels}
            onChange={setLinks}
          />

          {/* Phút 18-20: Perturbation Card Studio */}
          <PerturbationCardStudio
            zettelUid={zettelUid}
            zettelTitle={atomicTitle}
            cards={cards}
            onChange={setCards}
          />
        </div>
      </div>
    </div>
  );
}
