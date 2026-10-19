"use client";

import React, { useState } from "react";
import { PreReadingGate } from "./PreReadingGate";
import { ConcurrentReader } from "./ConcurrentReader";
import { ClosedBookLiteratureEditor, CitationData } from "./ClosedBookLiteratureEditor";
import { CriticalAuditData } from "./CriticalAuditWidget";
import { AnalogicalDomainItem } from "./AnalogicalMatrixWidget";
import { AlertOctagon, CheckCircle2 } from "lucide-react";

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
  // Máy trạng thái 3 bước của Phiên Sáng
  const [step, setStep] = useState<"GATE_1_1" | "READER_1_2" | "CLOSED_BOOK_1_3" | "COMPLETED">("GATE_1_1");
  const [hypothesis, setHypothesis] = useState("");
  const [analysisData, setAnalysisData] = useState<{
    selfExplanation: string;
    criticalAudit: CriticalAuditData;
    analogicalMatrix: AnalogicalDomainItem[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mẫu dữ liệu mô hình khái niệm cho phiên sáng
  const sampleConcept = {
    title: "Cơ Chế Bù Trừ Nhận Thức & Giàn Giáo Thích Ứng Trong Luyện Tập Đan Xen",
    context: "Lý thuyết Tải Nhận Thức (Sweller) & Nguyên lý Khó khăn Hữu ích (Bjork & Bjork, 2011)",
    sourceBlocks: [
      "Khi người học chuyển đổi giữa các miền bài toán khác nhau (Interleaving Practice), não bộ bị buộc phải liên tục tải lại các sơ đồ phân loại (categorization schemas) vào bộ nhớ làm việc. Điều này ban đầu gây ra sự sụt giảm hiệu năng rõ rệt ở pha tiếp thu (Acquisition Phase).",
      "Tuy nhiên, sự ma sát này kích hoạt cơ chế trừu tượng hóa mức độ sâu (Deep Abstraction). Thay vì ghi nhớ bề mặt của một lớp bài toán, mạng nơ-ron học cách trích xuất các quy luật bất biến cấu trúc (structural invariants) xuyên qua các miền ngữ cảnh khác nhau.",
      "Để ngăn chặn hiện tượng quá tải nhận thức cực đoan ở người mới bắt đầu, giao thức Giàn giáo Thích ứng (Adaptive Scaffolding) đòi hỏi khái niệm phải trải qua tối thiểu 2 chu kỳ đóng gói cơ bản trước khi đưa vào bể trộn đan xen tự do.",
    ],
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

  // Bước 1: Cổng Đoán Trước (180s, >= 50 từ)
  if (step === "GATE_1_1") {
    return (
      <PreReadingGate
        conceptTitle={sampleConcept.title}
        conceptContext={sampleConcept.context}
        sourceTextSnippet={sampleConcept.sourceBlocks.join(" ")}
        onUnlocked={(hyp) => {
          setHypothesis(hyp);
          setStep("READER_1_2");
        }}
      />
    );
  }

  // Bước 2: Trình đọc & Tự giải thích + Critical Audit + Ma trận tương tự
  if (step === "READER_1_2") {
    return (
      <ConcurrentReader
        conceptTitle={sampleConcept.title}
        sourceTextBlocks={sampleConcept.sourceBlocks}
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
        onSubmit={handleClosedBookSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Hoàn tất Phiên Sáng
  return (
    <div className="bg-emerald-950/30 border border-emerald-800 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
      <CheckCircle2 className="w-12 h-12 text-emerald-400" />
      <h2 className="text-xl font-bold text-white">Hoàn Tất Phiên Sáng Thành Công!</h2>
      <p className="text-sm text-slate-300 max-w-lg">
        Ghi chú đóng sách và ma trận tương tự đã được lưu trữ an toàn. Hệ thống đã kích hoạt{" "}
        <strong className="text-amber-400">Khóa Khoảng Nghỉ Sinh Học (Neural Incubation Lock - 4 Giờ)</strong>.
      </p>
      <div className="text-xs text-slate-400 font-mono bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
        Hãy vận động hoặc nghỉ ngơi để Chế độ Phân tán (Diffuse Mode) củng cố mạng lưới liên kết trước Phiên Chiều.
      </div>
    </div>
  );
}
