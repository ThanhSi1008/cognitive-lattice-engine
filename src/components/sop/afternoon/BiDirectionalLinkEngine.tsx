"use client";

import React, { useState } from "react";
import { Network, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { CognitiveLinkType } from "@/lib/validations";

export interface ZettelLinkItem {
  id?: string;
  source_zettel_uid: string;
  target_zettel_uid: string;
  link_type: CognitiveLinkType;
  connection_rationale: string;
  target_title?: string;
}

interface BiDirectionalLinkEngineProps {
  currentZettelUid: string;
  links: ZettelLinkItem[];
  existingZettels: { zettel_uid: string; atomic_title: string; domain_category: string }[];
  onChange: (updatedLinks: ZettelLinkItem[]) => void;
}

export function BiDirectionalLinkEngine({
  currentZettelUid,
  links,
  existingZettels,
  onChange,
}: BiDirectionalLinkEngineProps) {
  const [selectedTarget, setSelectedTarget] = useState(existingZettels[0]?.zettel_uid || "");
  const [selectedType, setSelectedType] = useState<CognitiveLinkType>("EXTENDS_PAST");
  const [rationale, setRationale] = useState("");

  const isRationaleValid = rationale.trim().length >= 30;
  const isMinLinksSatisfied = links.length >= 2;

  const handleAddLink = () => {
    if (!selectedTarget || selectedTarget === currentZettelUid || !isRationaleValid) return;

    // Tránh trùng lặp
    if (links.some((l) => l.target_zettel_uid === selectedTarget)) {
      alert("Liên kết này đã tồn tại!");
      return;
    }

    const targetZettel = existingZettels.find((z) => z.zettel_uid === selectedTarget);

    const newLink: ZettelLinkItem = {
      source_zettel_uid: currentZettelUid,
      target_zettel_uid: selectedTarget,
      link_type: selectedType,
      connection_rationale: rationale.trim(),
      target_title: targetZettel?.atomic_title,
    };

    onChange([...links, newLink]);
    setRationale("");
  };

  const handleRemoveLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 text-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold">
          <Network className="w-5 h-5" />
          <span>Động Cơ Liên Kết Hai Chiều Cưỡng Bức (Forced Graph Engine)</span>
        </div>
        <span
          className={`text-xs font-mono px-2.5 py-0.5 rounded border flex items-center gap-1 ${
            isMinLinksSatisfied
              ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
              : "bg-rose-950/80 text-rose-400 border-rose-800"
          }`}
        >
          {isMinLinksSatisfied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {links.length} / 2 liên kết tối thiểu để PUBLISH (trg_enforce_zettel_links)
        </span>
      </div>

      <p className="text-xs text-slate-400">
        Trigger cơ sở dữ liệu sẽ chặn trạng thái PUBLISHED nếu Zettel có dưới 2 liên kết hai chiều. Mỗi liên kết bắt buộc giải thích lý do tối thiểu 30 ký tự.
      </p>

      {/* Existing Links List */}
      <div className="flex flex-col gap-2">
        {links.map((link, idx) => (
          <div
            key={idx}
            className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex justify-between items-start gap-3"
          >
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyan-400 font-bold">[[{link.target_zettel_uid}]]</span>
                <span className="px-2 py-0.2 bg-slate-900 text-slate-300 rounded border border-slate-700 text-[10px] font-mono">
                  {link.link_type}
                </span>
                {link.target_title && <span className="text-slate-300 font-medium">{link.target_title}</span>}
              </div>
              <p className="text-slate-400 mt-1 italic">&ldquo;{link.connection_rationale}&rdquo;</p>
            </div>

            <button
              onClick={() => handleRemoveLink(idx)}
              className="text-slate-600 hover:text-rose-400 transition"
              title="Xóa liên kết này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Link Form */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
        <div className="text-xs font-semibold text-slate-300">Thêm liên kết hai chiều mới:</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-slate-400">Chọn Zettel đích</label>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {existingZettels
                .filter((z) => z.zettel_uid !== currentZettelUid)
                .map((z) => (
                  <option key={z.zettel_uid} value={z.zettel_uid}>
                    [[{z.zettel_uid}]] {z.atomic_title.slice(0, 45)}... ({z.domain_category})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400">Kiểu quan hệ nhận thức</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as CognitiveLinkType)}
              className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="EXTENDS_PAST">EXTENDS_PAST (Mở rộng mô hình trong quá khứ)</option>
              <option value="PATHOLOGY_VIOLATION">PATHOLOGY_VIOLATION (Vi phạm điều kiện bệnh lý)</option>
              <option value="BIOLOGICAL_MECHANISM">BIOLOGICAL_MECHANISM (Cơ chế sinh học tương thích)</option>
              <option value="CONTRADICTS">CONTRADICTS (Mâu thuẫn / Bác bỏ)</option>
              <option value="SUPPORTS">SUPPORTS (Ủng hộ / Củng cố)</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center text-xs">
            <label className="text-slate-400">Lý do kết nối hai chiều (Connection Rationale)</label>
            <span className={`font-mono text-[10px] ${isRationaleValid ? "text-emerald-400" : "text-amber-400"}`}>
              {rationale.trim().length} / 30 ký tự tối thiểu
            </span>
          </div>
          <input
            type="text"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Giải thích rõ cơ chế nhân quả vì sao 2 Zettel này được liên kết với nhau (tối thiểu 30 ký tự)..."
            className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          type="button"
          onClick={handleAddLink}
          disabled={!isRationaleValid || !selectedTarget}
          className="self-end flex items-center gap-1 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded text-xs transition disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Gắn Liên Kết
        </button>
      </div>
    </div>
  );
}
