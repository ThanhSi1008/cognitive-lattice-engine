"use client";

import React, { useState } from "react";
import { countWords } from "@/lib/validations";
import { TipTapEditor } from "@/components/editor/TipTapEditor";
import { SocraticProbeResult, SocraticEvaluationResult } from "@/lib/ai/socratic-engine";
import { BookOpen, Lock, ShieldAlert, CheckCircle2, Bookmark, Sparkles, HelpCircle, MessageSquare, Send, AlertTriangle } from "lucide-react";

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

  const [socraticResult, setSocraticResult] = useState<SocraticProbeResult | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [activeReplyIndex, setActiveReplyIndex] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [evaluatingReply, setEvaluatingReply] = useState(false);
  const [probeEvaluations, setProbeEvaluations] = useState<Record<number, SocraticEvaluationResult>>({});

  const words = countWords(summary);
  const isWordCountValid = words >= 50 && words <= 200;
  const isCitationValid = citation.author.trim() !== "" && citation.title.trim() !== "";

  const handleTriggerSocraticProbe = async () => {
    if (!isWordCountValid || isProbing) return;
    setIsProbing(true);
    try {
      const res = await fetch("/api/ai/socratic-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "MORNING",
          input: {
            hypothesisText: summary,
            criticalAudit: {
              primaryConclusion: citation.title,
            },
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSocraticResult(data);
      }
    } catch (err) {
      console.error("Socratic probe error:", err);
    } finally {
      setIsProbing(false);
    }
  };

  const handleSendReply = async (index: number, probe: any) => {
    if (!replyText.trim() || evaluatingReply) return;
    setEvaluatingReply(true);
    try {
      const res = await fetch("/api/ai/socratic-probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "EVALUATE_REPLY",
          input: {
            probeQuestion: probe.question,
            probeCategory: probe.category,
            userReply: replyText.trim(),
            contextText: summary,
          },
        }),
      });
      if (res.ok) {
        const data: SocraticEvaluationResult = await res.json();
        setProbeEvaluations((prev) => ({ ...prev, [index]: data }));
        setReplyText("");
      }
    } catch (err) {
      console.error("Reply evaluation error:", err);
    } finally {
      setEvaluatingReply(false);
    }
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
            Tóm lược lập luận cốt lõi bằng chính ngôn từ cá nhân qua trình soạn thảo cấu trúc TipTap. Chặn lệnh dán (Paste) để ép não bộ tổng hợp và tái cấu trúc tri thức.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>Giới hạn: 50 – 200 từ</span>
        </div>
      </div>

      {/* Editor Tóm lược TipTap */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-slate-300">
            Tóm lược diễn giải tài liệu (TipTap Structured Editor • Paste Disabled)
          </label>
        </div>

        <TipTapEditor
          content={summary}
          placeholder="Viết tóm lược từ trí nhớ của bạn (tối thiểu 50 từ, tối đa 200 từ)... Lệnh Paste bị vô hiệu hóa hoàn toàn trên ô này theo RULE-01."
          minWords={50}
          maxWords={200}
          blockPaste={true}
          onChange={(text) => setSummary(text)}
          onPasteBlocked={() => setPasteBlockedAlert(true)}
        />
      </div>

      {/* Socratic Mentor–Critic Action & Panel */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Đối Thoại Socratic (Mentor–Critic Loop • Complementary AI)</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerSocraticProbe}
            disabled={!isWordCountValid || isProbing}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              isWordCountValid && !isProbing
                ? "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            {isProbing ? "Mentor đang phân tích..." : "Thử Thách Lập Luận Socratic"}
          </button>
        </div>

        {socraticResult && (
          <div className="bg-slate-950 border border-purple-900/50 rounded-lg p-4 flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-2">
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Critic Guardrail: {socraticResult.criticVerification.criticNotes}
              </span>
              <span>5-Category Socratic Taxonomy</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {socraticResult.probes.map((probe, i) => {
                const evalData = probeEvaluations[i];
                const isReplying = activeReplyIndex === i;

                return (
                  <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-mono font-bold text-cyan-400">
                        [{probe.category}] {probe.categoryLabel}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveReplyIndex(isReplying ? null : i)}
                        className="text-[11px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {isReplying ? "Đóng phản hồi" : "Trả lời Socrates"}
                      </button>
                    </div>

                    <div className="text-xs text-slate-200 font-medium">{probe.question}</div>
                    <div className="text-[10px] text-slate-500 italic">
                      Mục tiêu nhận thức: {probe.cognitiveRationale}
                    </div>

                    {/* Interactive Multi-turn Reply Box */}
                    {isReplying && (
                      <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-2 animate-in fade-in duration-150">
                        <textarea
                          rows={2}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Nhập luận điểm phản biện hoặc phân tích nguyên lý gốc của bạn (tối thiểu 5-10 từ)..."
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSendReply(i, probe)}
                            disabled={!replyText.trim() || evaluatingReply}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 rounded font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" />
                            {evaluatingReply ? "Plato đang thẩm định..." : "Gửi Phản Hồi Cho Socrates"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Socrates & Plato Multi-Agent Evaluation Output */}
                    {evalData && (
                      <div className="mt-2 p-3 bg-purple-950/40 border border-purple-800/80 rounded-lg flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-purple-300 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Thẩm định Socratic (Analyst–Proofreader):
                          </span>
                          <span
                            className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                              evalData.reachedFirstPrinciples
                                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                                : "bg-amber-950 text-amber-400 border-amber-800"
                            }`}
                          >
                            {evalData.reachedFirstPrinciples ? "Đạt Nguyên Lý Gốc" : "Chưa Đạt Nguyên Lý Gốc"} (
                            {Math.round(evalData.firstPrinciplesScore * 100)}%)
                          </span>
                        </div>

                        <p className="text-slate-300 italic">{evalData.socraticCritique}</p>

                        {evalData.identifiedBlindSpots.length > 0 && (
                          <div className="text-[11px] text-amber-300 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                            <span>Điểm mù: {evalData.identifiedBlindSpots.join("; ")}</span>
                          </div>
                        )}

                        <div className="bg-slate-950/80 p-2 rounded border border-purple-900/50 mt-1">
                          <span className="text-[10px] font-mono text-cyan-400 block mb-0.5 font-bold">
                            Câu hỏi xoáy sâu tiếp theo của Socrates:
                          </span>
                          <span className="text-xs text-slate-100 font-medium">
                            {evalData.nextProbingQuestion}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
