"use client";

import React, { useState, useEffect } from "react";
import { countWords } from "@/lib/validations";
import { BiDirectionalLinkEngine, ZettelLinkItem } from "./BiDirectionalLinkEngine";
import { PerturbationCardStudio, PerturbationCardItem } from "./PerturbationCardStudio";
import { CheckCircle2, AlertCircle, FileText, Send, Split } from "lucide-react";

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

  const wordCount = countWords(bodyText);
  const isWordCountValid = wordCount >= 100 && wordCount <= 350;

  const isTitleLengthValid = atomicTitle.trim().length >= 20 && atomicTitle.trim().length <= 250;
  const isTitlePropositional = !atomicTitle.includes("?");
  const isTitleValid = isTitleLengthValid && isTitlePropositional;

  const isLinksValid = links.length >= 2;
  const isCardsValid = cards.length >= 2 && cards.length <= 3;

  const canPublish = isWordCountValid && isTitleValid && isLinksValid && isCardsValid;

  const handlePublish = async () => {
    if (!canPublish || isPublishing) return;
    setIsPublishing(true);
    try {
      // 1. Tạo Permanent Zettel
      const zettelPayload = {
        zettel_uid: zettelUid,
        user_id: userId,
        atomic_title: atomicTitle.trim(),
        body_text: bodyText.trim(),
        word_count: wordCount,
        domain_category: domainCategory.trim(),
        literature_note_id: literatureNote?.id || null,
        state: "PUBLISHED",
      };

      const zettelRes = await fetch("/api/zettels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zettelPayload),
      });

      if (!zettelRes.ok) {
        const err = await zettelRes.json();
        throw new Error(err.error || "Lỗi xuất bản Zettel");
      }

      // 2. Lưu các liên kết hai chiều vào zettel_links
      for (const link of links) {
        await fetch("/api/zettels", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(link),
        });
      }

      // 3. Tạo các thẻ FSRS
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
            Một Zettel chỉ chứa đúng MỘT nguyên lý/luận điểm nhân quả hoàn chỉnh. Độ dài bắt buộc từ 100 đến 350 từ.
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

            {/* Body */}
            <div>
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-medium">Thân bài nguyên tử (Atomic Body Text) *</label>
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded border ${
                    isWordCountValid
                      ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                      : "bg-slate-800 text-amber-400 border-slate-700"
                  }`}
                >
                  {wordCount} / 100 – 350 từ (chk_atomic_word_count)
                </span>
              </div>
              <textarea
                rows={10}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Trình bày mạch lạc lập luận nhân quả nguyên tử của Zettel này (giới hạn nghiêm ngặt 100 đến 350 từ)..."
                className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-100 focus:outline-none focus:border-purple-500 transition resize-none leading-relaxed"
              />
            </div>
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
