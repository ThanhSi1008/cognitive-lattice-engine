"use client";

import React, { useState, useEffect } from "react";
import { PreReadingGate } from "./PreReadingGate";
import { ConcurrentReader } from "./ConcurrentReader";
import { ClosedBookLiteratureEditor, CitationData } from "./ClosedBookLiteratureEditor";
import { CriticalAuditData } from "./CriticalAuditWidget";
import { AnalogicalDomainItem } from "./AnalogicalMatrixWidget";
import { AlertOctagon, CheckCircle2, BookOpen, Upload, FileText, Sparkles, ArrowRight } from "lucide-react";

interface MorningSessionProps {
  userId?: string;
  isCircuitBreakerTripped?: boolean;
  circuitBreakerReasons?: string[];
  onCompleteSession: (completedAt: Date) => void;
}

export function MorningSession({
  userId = "00000000-0000-0000-0000-000000000001",
  isCircuitBreakerTripped = false,
  circuitBreakerReasons = [],
  onCompleteSession,
}: MorningSessionProps) {
  // Máy trạng thái 4 bước của Phiên Sáng
  const [step, setStep] = useState<"INGEST_1_0" | "GATE_1_1" | "READER_1_2" | "CLOSED_BOOK_1_3" | "COMPLETED">("INGEST_1_0");

  // State tài liệu nguồn
  const [ingestMode, setIngestMode] = useState<"PRESET" | "CUSTOM">("PRESET");
  const [selectedPresetId, setSelectedPresetId] = useState("HOWARD_MARKS_SECOND_ORDER");
  const [customTitle, setCustomTitle] = useState("");
  const [customAuthor, setCustomAuthor] = useState("");
  const [customText, setCustomText] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);

  const [activeConcept, setActiveConcept] = useState<{
    title: string;
    context: string;
    sourceBlocks: string[];
    citation?: CitationData;
  }>({
    title: "Tư Duy Cấp Độ Hai và Phân Tích Hệ Quả Ngoại Vi Trong Môi Trường Phức Hợp",
    context: "Howard Marks (2011) • Behavioral Economics & Risk Architecture",
    sourceBlocks: [
      `Tư duy cấp độ một đơn giản và hời hợt, chỉ nhìn vào kết quả trực tiếp đầu tiên. Tư duy cấp độ một nói: "Công ty này tốt, triển vọng tăng trưởng cao, hãy mua cổ phiếu". Tư duy cấp độ hai nói: "Công ty này tốt, nhưng tất cả mọi người trên thị trường đều đã biết nó tốt và định giá quá cao, hãy bán ra".`,
      `Tư duy cấp độ hai phức tạp và đa chiều hơn nhiều. Bạn không chỉ phải xem xét kết quả trực tiếp của hành động mà còn phải phân tích: Điều gì sẽ xảy ra tiếp theo sau khi mọi người phản ứng với hành vi của bạn? Xác suất của các kịch bản ngoại vi là bao nhiêu? Thị trường đang phản ánh sự đồng thuận sai lầm ở đâu?`,
      `Hầu hết các quyết định sai lầm trong kinh tế và quản trị hệ thống không đến từ việc không biết mục tiêu, mà đến từ việc chỉ tính toán được hệ quả cấp một mà bỏ quên các vòng phản hồi cấp hai và cấp ba làm biến dạng toàn bộ môi trường ban đầu.`,
    ],
    citation: {
      author: "Howard Marks",
      year: 2011,
      title: "The Most Important Thing: Uncommon Sense for the Thoughtful Investor",
      doi: "10.1000/cle.howard_marks",
    },
  });

  const [hypothesis, setHypothesis] = useState("");
  const [analysisData, setAnalysisData] = useState<{
    selfExplanation: string;
    criticalAudit: CriticalAuditData;
    analogicalMatrix: AnalogicalDomainItem[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xử lý nạp tài liệu từ API
  const handleLoadSource = async (presetOverride?: string) => {
    setIsIngesting(true);
    try {
      const payload =
        ingestMode === "PRESET"
          ? { mode: "PRESET", presetId: presetOverride || selectedPresetId }
          : {
              mode: "CUSTOM",
              customTitle,
              customAuthor,
              customText,
            };

      const res = await fetch("/api/ai/ingest-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi nạp tài liệu");
      }

      const data = await res.json();
      setActiveConcept({
        title: data.title,
        context: `${data.author} (${data.year}) • ${data.domain}`,
        sourceBlocks: data.sourceBlocks,
        citation: data.citation,
      });

      setStep("GATE_1_1");
    } catch (err: any) {
      alert("Lỗi nạp tài liệu: " + err.message);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCustomText(content);
      if (!customTitle) {
        setCustomTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsText(file);
  };

  // Pre-condition: Nếu Circuit Breaker bị ngắt mạch theo RULE-02, khóa cứng hoàn toàn!
  if (isCircuitBreakerTripped) {
    return (
      <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
        <AlertOctagon className="w-12 h-12 text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold text-white">NGẮT MẠCH NỢ NHẬN THỨC ĐANG KÍCH HOẠT (RULE-02)</h2>
        <p className="text-sm text-slate-300 max-w-xl">
          Cổng nạp kiến thức mới ở Phiên Sáng đã bị <strong>khóa cứng</strong> để bảo toàn 95% tri thức cũ khỏi bị xói mòn.
        </p>
        <div className="bg-slate-950/80 border border-rose-900/50 rounded-lg p-4 text-xs text-rose-300 text-left w-full max-w-md space-y-1">
          <div className="font-semibold text-rose-400 mb-1">Nguyên nhân ngắt mạch:</div>
          {circuitBreakerReasons.map((r, i) => (
            <div key={i}>• {r}</div>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          Hãy chuyển sang <strong>System Refactoring Mode</strong> (Phiên Tối) để giải quyết các thẻ FSRS quá hạn hoặc xử lý Fleeting Notes tồn đọng.
        </p>
      </div>
    );
  }

  // Bước 0: Trình nạp & Bóc tách tài liệu nguồn
  if (step === "INGEST_1_0") {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
        <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              Phân Hệ 1 • Phiên Sáng • Bước 0: Nạp Tài Liệu Nguồn
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span>Trình Nạp & Bóc Tách Tài Liệu Học Thuật (Source Ingestor)</span>
            </h2>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setIngestMode("PRESET")}
              className={`px-3 py-1.5 rounded transition ${
                ingestMode === "PRESET" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Thư Viện Mô Hình Mẫu
            </button>
            <button
              type="button"
              onClick={() => setIngestMode("CUSTOM")}
              className={`px-3 py-1.5 rounded transition ${
                ingestMode === "CUSTOM" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Tự Nạp / Tải Tệp .md, .txt
            </button>
          </div>
        </div>

        {ingestMode === "PRESET" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => {
                setSelectedPresetId("HOWARD_MARKS_SECOND_ORDER");
                handleLoadSource("HOWARD_MARKS_SECOND_ORDER");
              }}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/60 hover:bg-slate-900/80 cursor-pointer transition flex flex-col gap-2 group"
            >
              <div className="text-xs font-mono text-cyan-400 font-semibold">MÔ HÌNH 1</div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                Tư Duy Cấp Độ Hai (Howard Marks)
              </h3>
              <p className="text-xs text-slate-400 line-clamp-3">
                Phân tích phản ứng hệ quả và hành vi thích ứng của thị trường phức hợp để tránh sai lầm đồng thuận.
              </p>
              <div className="text-[11px] text-slate-500 mt-auto font-mono">Author: Howard Marks (2011)</div>
            </div>

            <div
              onClick={() => {
                setSelectedPresetId("CHESTERTONS_FENCE");
                handleLoadSource("CHESTERTONS_FENCE");
              }}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/60 hover:bg-slate-900/80 cursor-pointer transition flex flex-col gap-2 group"
            >
              <div className="text-xs font-mono text-purple-400 font-semibold">MÔ HÌNH 2</div>
              <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                Hàng Rào Của Chesterton (Chesterton&apos;s Fence)
              </h3>
              <p className="text-xs text-slate-400 line-clamp-3">
                Không bao giờ phá hủy một thể chế hoặc đoạn mã kế thừa trước khi thấu hiểu lý do người tiền nhiệm dựng nó lên.
              </p>
              <div className="text-[11px] text-slate-500 mt-auto font-mono">Author: G.K. Chesterton (1929)</div>
            </div>

            <div
              onClick={() => {
                setSelectedPresetId("COBRA_EFFECT_GOODHART");
                handleLoadSource("COBRA_EFFECT_GOODHART");
              }}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/60 hover:bg-slate-900/80 cursor-pointer transition flex flex-col gap-2 group"
            >
              <div className="text-xs font-mono text-amber-400 font-semibold">MÔ HÌNH 3</div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                Hiệu Ứng Rắn Hổ Mang & Luật Goodhart
              </h3>
              <p className="text-xs text-slate-400 line-clamp-3">
                Sự sụp đổ của chỉ số đo lường khi biến thành mục tiêu tối thượng và cơ chế bóp méo nhận thức.
              </p>
              <div className="text-[11px] text-slate-500 mt-auto font-mono">Author: Goodhart & Siebert</div>
            </div>

            <div
              onClick={() => {
                setSelectedPresetId("BJORK_DESIRABLE_DIFFICULTY");
                handleLoadSource("BJORK_DESIRABLE_DIFFICULTY");
              }}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/60 hover:bg-slate-900/80 cursor-pointer transition flex flex-col gap-2 group"
            >
              <div className="text-xs font-mono text-emerald-400 font-semibold">MÔ HÌNH 4</div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                Khó Khăn Đáng Giá & Giàn Giáo Thích Ứng (Bjork)
              </h3>
              <p className="text-xs text-slate-400 line-clamp-3">
                Ma sát nhận thức có kiểm soát thông qua luyện tập đan xen giúp tối ưu hóa khả năng lưu giữ dài hạn.
              </p>
              <div className="text-[11px] text-slate-500 mt-auto font-mono">Author: Robert A. Bjork (2011)</div>
            </div>
          </div>
        ) : (
          /* Chế độ nhập văn bản hoặc tải tệp */
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Tiêu đề bài viết / tài liệu *</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ví dụ: Cơ chế miễn dịch dịch thể và trí nhớ tế bào B..."
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-slate-400 font-medium">Tác giả / Nguồn trích dẫn</label>
                <input
                  type="text"
                  value={customAuthor}
                  onChange={(e) => setCustomAuthor(e.target.value)}
                  placeholder="Ví dụ: Janeway's Immunobiology"
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="text-slate-400 font-medium">Nội dung văn bản học thuật (Markdown hoặc Plain Text) *</label>
                <label className="cursor-pointer text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải lên tệp .md/.txt</span>
                  <input type="file" accept=".md,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              <textarea
                rows={8}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Dán toàn bộ văn bản hoặc chương sách bạn cần đọc sáng nay... Hệ thống sẽ tự động phân rã thành các khối luận điểm logic."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed font-sans"
              />
            </div>

            <button
              type="button"
              onClick={() => handleLoadSource()}
              disabled={!customText.trim() || isIngesting}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold transition ${
                customText.trim() && !isIngesting
                  ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer shadow-lg shadow-cyan-500/20"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isIngesting ? "Đang phân đoạn văn bản..." : "Bóc Tách Khối Luận Điểm & Mở Cổng Đoán Trước (180s)"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Bước 1: Cổng Đoán Trước (180s, >= 50 từ)
  if (step === "GATE_1_1") {
    return (
      <PreReadingGate
        conceptTitle={activeConcept.title}
        conceptContext={activeConcept.context}
        sourceTextSnippet={activeConcept.sourceBlocks.join(" ")}
        onUnlocked={async (hyp) => {
          setHypothesis(hyp);
          // Lưu ngay s1_hypothesis_text vào learning_sessions theo yêu cầu Phase 6
          try {
            await fetch("/api/sessions", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                s1_hypothesis_text: hyp,
              }),
            });
          } catch (e) {
            console.error("Lưu s1_hypothesis_text thất bại:", e);
          }
          setStep("READER_1_2");
        }}
      />
    );
  }

  // Bước 2: Trình đọc & Tự giải thích + Critical Audit + Ma trận tương tự
  if (step === "READER_1_2") {
    return (
      <ConcurrentReader
        conceptTitle={activeConcept.title}
        sourceTextBlocks={activeConcept.sourceBlocks}
        initialHypothesis={hypothesis}
        onProceedToClosedBook={(data) => {
          setAnalysisData(data);
          setStep("CLOSED_BOOK_1_3");
        }}
      />
    );
  }

  // Bước 3: Ghi chú Đóng Sách (Chặn Paste, 50-200 từ)
  if (step === "CLOSED_BOOK_1_3") {
    const handleClosedBookSubmit = async (summary: string, citation: CitationData) => {
      setIsSubmitting(true);
      try {
        // Lưu Literature Note qua API
        const notePayload = {
          user_id: userId,
          source_citation: citation,
          paraphrased_summary: summary,
          critical_audit: analysisData?.criticalAudit,
          analogical_matrix: analysisData?.analogicalMatrix,
        };

        const res = await fetch("/api/literature-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notePayload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Lỗi lưu ghi chú");
        }

        const completedAt = new Date();
        onCompleteSession(completedAt);
        setStep("COMPLETED");
      } catch (err: any) {
        alert("Lỗi: " + err.message);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <ClosedBookLiteratureEditor
        initialCitation={activeConcept.citation}
        onSubmit={handleClosedBookSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Hoàn tất Phiên Sáng
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
      <CheckCircle2 className="w-12 h-12 text-emerald-400" />
      <h2 className="text-xl font-bold text-white">Phiên Sáng (20 Phút) Đã Hoàn Tất Thành Công!</h2>
      <p className="text-xs text-slate-300 max-w-md">
        Khóa ủ nhận thức 4 giờ (Neural Incubation Lock) đã được kích hoạt. Não bộ sẽ tự động xử lý và củng cố các cấu trúc nhân quả trong chế độ phân tán trước khi mở khóa Phiên Chiều.
      </p>
    </div>
  );
}
