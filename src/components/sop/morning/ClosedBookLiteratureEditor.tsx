"use client";

import React, { useState } from "react";
import { countWords } from "@/lib/validations";
import { BookOpen, Lock, ShieldAlert, CheckCircle2, Bookmark } from "lucide-react";

export interface CitationData {
  author: string;
  year: number | string;
  title: string;
  pages?: string;
  zotero_key?: string;
  doi?: string;
}

interface ClosedBookLiteratureEditorProps {
  initialCitation?: CitationData;
  onSubmit: (summary: string, citation: CitationData) => Promise<void>;
  isSubmitting?: boolean;
}

export function ClosedBookLiteratureEditor({
  initialCitation,
  onSubmit,
  isSubmitting = false,
}: ClosedBookLiteratureEditorProps) {
  const [summary, setSummary] = useState("");
  const [pasteBlockedAlert, setPasteBlockedAlert] = useState(false);
  const [citation, setCitation] = useState<CitationData>(
    initialCitation || {
      author: "",
      year: new Date().getFullYear(),
      title: "",
      pages: "",
      zotero_key: "",
      doi: "",
    }
  );

  const words = countWords(summary);
  const isWordCountValid = words >= 50 && words <= 200;
  const isCitationValid = citation.author.trim() !== "" && citation.title.trim() !== "";

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setPasteBlockedAlert(true);
    setTimeout(() => setPasteBlockedAlert(false), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWordCountValid || !isCitationValid || isSubmitting) return;
    await onSubmit(summary, citation);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Banner Đóng Sách */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
            Ghi Chú Đóng Sách (Phút 16–20) • RULE-01 & RULE-04
          </div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            Tài liệu nguồn đã đóng hoàn toàn (Closed-Book Recall)
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Tóm lược lập luận cốt lõi bằng chính ngôn từ cá nhân. Chặn lệnh dán (Paste) để ép não bộ tổng hợp và tái cấu trúc tri thức.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>Giới hạn: 50 – 200 từ</span>
        </div>
      </div>

      {/* Cảnh báo khi người dùng cố Paste */}
      {pasteBlockedAlert && (
        <div className="bg-rose-950/90 border border-rose-800 text-rose-200 px-4 py-3 rounded-lg text-xs flex items-center gap-2 animate-bounce">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>
            <strong>Lệnh Paste bị chặn (Anti-Verbatim Rule):</strong> Không sao chép nguyên văn! Hãy tự diễn giải bằng vốn từ của bạn để tạo dấu vết thần kinh sâu.
          </span>
        </div>
      )}

      {/* Editor Tóm lược */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-slate-300">
            Tóm lược diễn giải tài liệu (Paraphrased Literature Summary)
          </label>
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded border ${
              isWordCountValid
                ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                : "bg-slate-800 text-amber-400 border-slate-700"
            }`}
          >
            {words} / 50 – 200 từ
          </span>
        </div>

        <textarea
          rows={6}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onPaste={handlePaste}
          placeholder="Viết tóm lược từ trí nhớ của bạn (tối thiểu 50 từ, tối đa 200 từ)... Lệnh Paste bị vô hiệu hóa hoàn toàn trên ô này."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-100 text-sm focus:outline-none focus:border-cyan-500 transition resize-none leading-relaxed"
        />
      </div>

      {/* Metadata Trích Dẫn */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Bookmark className="w-4 h-4 text-cyan-400" />
          <span>Thông Tin Trích Dẫn Học Thuật (Source Citation)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-slate-400">Tác giả (Author) *</label>
            <input
              type="text"
              required
              value={citation.author}
              onChange={(e) => setCitation({ ...citation, author: e.target.value })}
              placeholder="Ví dụ: Daniel Kahneman"
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-slate-400">Năm xuất bản (Year) *</label>
            <input
              type="text"
              required
              value={citation.year}
              onChange={(e) => setCitation({ ...citation, year: e.target.value })}
              placeholder="2011"
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-slate-400">Tiêu đề tài liệu (Title) *</label>
            <input
              type="text"
              required
              value={citation.title}
              onChange={(e) => setCitation({ ...citation, title: e.target.value })}
              placeholder="Thinking, Fast and Slow"
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-slate-400">Trang trích dẫn (Pages)</label>
            <input
              type="text"
              value={citation.pages || ""}
              onChange={(e) => setCitation({ ...citation, pages: e.target.value })}
              placeholder="pp. 142-156"
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-slate-400">Zotero Key / DOI</label>
            <input
              type="text"
              value={citation.doi || ""}
              onChange={(e) => setCitation({ ...citation, doi: e.target.value })}
              placeholder="10.1037/0033-295X.109.1.3"
              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Nút Hoàn Tất Phiên Sáng */}
      <div className="flex justify-end items-center gap-4">
        <button
          type="submit"
          disabled={!isWordCountValid || !isCitationValid || isSubmitting}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition ${
            isWordCountValid && isCitationValid && !isSubmitting
              ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {isSubmitting ? "Đang lưu..." : "Hoàn Tất Phiên Sáng & Kích Hoạt Khóa Ủ 4 Giờ"}
        </button>
      </div>
    </form>
  );
}
