"use client";

import React, { useState, useEffect } from "react";
import { PreReadingGate } from "./PreReadingGate";
import { ConcurrentReader } from "./ConcurrentReader";
import { ClosedBookLiteratureEditor, CitationData } from "./ClosedBookLiteratureEditor";
import { CriticalAuditData } from "./CriticalAuditWidget";
import { AnalogicalDomainItem } from "./AnalogicalMatrixWidget";
import {
  AlertOctagon,
  CheckCircle2,
  BookOpen,
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  Search,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Bot,
  Zap,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import {
  buildAcademicSearchQueries,
  fetchDoiMetadata,
  AcademicSearchQueries,
} from "@/lib/algorithms/academicSearch";
import {
  generateFrontierAiPrompt,
  parseExternalAiResponse,
  CleExternalAiPayload,
  CleIngestModule,
} from "@/lib/validations/ingestSchema";

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
  const [ingestMode, setIngestMode] = useState<"FRONTIER_AI" | "PRESET" | "CUSTOM" | "SEARCH_BUILDER">("FRONTIER_AI");
  const [selectedPresetId, setSelectedPresetId] = useState("HOWARD_MARKS_SECOND_ORDER");
  const [customTitle, setCustomTitle] = useState("");
  const [customAuthor, setCustomAuthor] = useState("");
  const [customYear, setCustomYear] = useState<number | string>(new Date().getFullYear());
  const [customText, setCustomText] = useState("");
  const [customDoi, setCustomDoi] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [isResolvingDoi, setIsResolvingDoi] = useState(false);

  // State Frontier AI Bridge (Gemini 4 Argon High Thinking)
  const [frontierTopic, setFrontierTopic] = useState("Tự do tài chính & Quy tắc rút vốn an toàn 4%");
  const [frontierMode, setFrontierMode] = useState<"roadmap_5day" | "single_lesson">("roadmap_5day");
  const [frontierCopied, setFrontierCopied] = useState(false);
  const [frontierRawInput, setFrontierRawInput] = useState("");
  const [frontierParseError, setFrontierParseError] = useState<string | null>(null);
  const [importedRoadmap, setImportedRoadmap] = useState<CleExternalAiPayload | null>(null);
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>([]);

  // Khôi phục roadmap và tiến độ hoàn thành từ localStorage & backend telemetry
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cle_active_roadmap");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.roadmap?.length > 0) {
          setImportedRoadmap(parsed);
        }
      }
      const storedCompleted = localStorage.getItem("cle_completed_module_ids");
      if (storedCompleted) {
        setCompletedModuleIds(JSON.parse(storedCompleted));
      }
    } catch {}

    // Đồng bộ từ Backend API /api/telemetry
    fetch(`/api/telemetry?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.userCognitiveSettings?.completedModuleIds?.length > 0) {
          setCompletedModuleIds((prev) =>
            Array.from(new Set([...prev, ...data.userCognitiveSettings.completedModuleIds]))
          );
        }
        if (data.userCognitiveSettings?.activeRoadmap) {
          setImportedRoadmap((prev) => prev || data.userCognitiveSettings.activeRoadmap);
        }
      })
      .catch(() => {});
  }, [userId]);

  // State Trình tạo truy vấn học thuật PICO
  const [picoTopic, setPicoTopic] = useState("");
  const [picoIntervention, setPicoIntervention] = useState("");
  const [picoComparison, setPicoComparison] = useState("");
  const [picoOutcome, setPicoOutcome] = useState("");
  const [generatedQueries, setGeneratedQueries] = useState<AcademicSearchQueries | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyQuery = (key: string, queryStr: string) => {
    navigator.clipboard.writeText(queryStr);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyFrontierPrompt = () => {
    const promptText = generateFrontierAiPrompt(frontierTopic, frontierMode);
    navigator.clipboard.writeText(promptText);
    setFrontierCopied(true);
    setTimeout(() => setFrontierCopied(false), 2500);
  };

  const handleParseFrontierResponse = () => {
    setFrontierParseError(null);
    if (!frontierRawInput.trim()) {
      setFrontierParseError("Vui lòng dán câu trả lời từ Gemini 4 Argon High Thinking trước khi phân tích.");
      return;
    }

    const res = parseExternalAiResponse(frontierRawInput);
    if (!res.success || !res.data) {
      setFrontierParseError(res.error || "Không thể phân tích dữ liệu JSON.");
      return;
    }

    setImportedRoadmap(res.data);
    try {
      localStorage.setItem("cle_active_roadmap", JSON.stringify(res.data));
    } catch {}
  };

  const handleSelectRoadmapModule = (module: CleIngestModule) => {
    setActiveConcept({
      title: module.title,
      context: `${module.citation.author} (${module.citation.year}) • ${importedRoadmap?.domain || "Frontier Cognitive Domain"}`,
      activationContext: module.activation_context,
      domain: importedRoadmap?.domain || "Financial Engineering",
      moduleId: module.module_id,
      sourceBlocks: module.source_blocks,
      citation: {
        author: module.citation.author,
        year: typeof module.citation.year === "string" ? parseInt(module.citation.year, 10) || 2026 : module.citation.year,
        title: module.citation.title,
        doi: module.citation.doi || `doi:frontier.${module.module_id.toLowerCase()}`,
      },
      criticalAuditScaffold: module.critical_audit_scaffold,
      analogicalMatrixScaffold: module.analogical_matrix_scaffold,
    });

    if (module.perturbation_scenarios) {
      try {
        localStorage.setItem("cle_last_studied_scenarios", JSON.stringify(module.perturbation_scenarios));
      } catch {}
    }

    setStep("GATE_1_1");
  };

  const handleBuildQueries = (e: React.FormEvent) => {
    e.preventDefault();
    const q = buildAcademicSearchQueries({
      population: picoTopic,
      intervention: picoIntervention,
      comparison: picoComparison,
      outcome: picoOutcome,
    });
    setGeneratedQueries(q);
  };

  const handleLookupDoi = async () => {
    if (!customDoi.trim() || isResolvingDoi) return;
    setIsResolvingDoi(true);
    try {
      const meta = await fetchDoiMetadata(customDoi.trim());
      setCustomTitle(meta.title);
      setCustomAuthor(meta.author);
      setCustomYear(meta.year);
    } catch (err: any) {
      alert("Lỗi tra cứu DOI: " + err.message);
    } finally {
      setIsResolvingDoi(false);
    }
  };

  const [activeConcept, setActiveConcept] = useState<{
    title: string;
    context: string;
    activationContext?: string;
    domain?: string;
    moduleId?: string;
    sourceBlocks: string[];
    citation?: CitationData;
    criticalAuditScaffold?: any;
    analogicalMatrixScaffold?: any;
  }>({
    title: "Tư Duy Cấp Độ Hai và Phân Tích Hệ Quả Ngoại Vi Trong Môi Trường Phức Hợp",
    context: "Howard Marks (2011) • Behavioral Economics & Risk Architecture",
    activationContext: "Tại sao việc chỉ suy nghĩ theo phản xạ cấp độ một lại dẫn đến các quyết định sai lầm trầm trọng trong hệ thống phức hợp?",
    domain: "Behavioral Economics",
    moduleId: "PRESET_MOD_01",
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

  // Xử lý nạp tài liệu từ API Preset / Custom
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
        criticalAuditScaffold: data.criticalAuditDefaults
          ? {
              study_design: data.criticalAuditDefaults.study_design,
              falsifiability_condition: data.criticalAuditDefaults.falsifiability,
              sample_size_and_replicability: data.criticalAuditDefaults.sample_size,
              counter_evidence_or_rival_model: data.criticalAuditDefaults.counter_evidence,
            }
          : undefined,
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
      if (ingestMode === "FRONTIER_AI") {
        setFrontierRawInput(content);
      } else {
        setCustomText(content);
        if (!customTitle) {
          setCustomTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
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

          <div className="flex flex-wrap bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono gap-1">
            <button
              type="button"
              onClick={() => setIngestMode("FRONTIER_AI")}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 ${
                ingestMode === "FRONTIER_AI"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>🚀 Gemini 4 Argon Bridge</span>
            </button>
            <button
              type="button"
              onClick={() => setIngestMode("PRESET")}
              className={`px-3 py-1.5 rounded transition ${
                ingestMode === "PRESET" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Thư Viện Mẫu
            </button>
            <button
              type="button"
              onClick={() => setIngestMode("CUSTOM")}
              className={`px-3 py-1.5 rounded transition ${
                ingestMode === "CUSTOM" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Tự Nạp / DOI
            </button>
            <button
              type="button"
              onClick={() => setIngestMode("SEARCH_BUILDER")}
              className={`px-3 py-1.5 rounded transition ${
                ingestMode === "SEARCH_BUILDER" ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              PRISMA / PICO Search
            </button>
          </div>
        </div>

        {/* 1. TAB FRONTIER AI BRIDGE (GEMINI 4 ARGON HIGH THINKING) */}
        {ingestMode === "FRONTIER_AI" && (
          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-cyan-950/40 via-blue-950/20 to-slate-900 border border-cyan-800/50 p-4 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs font-mono">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Cơ Chế Tải Bớt Nhận Thức Hiệu Quả (Productive Cognitive Offloading)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sinh Prompt chuẩn hóa để hỏi <strong>Gemini 4 Argon High Thinking</strong> trên web, sau đó dán kết quả JSON vào CLE.
                Dữ liệu bài học sẽ được nạp thẳng vào <strong>Cổng Đoán Trước (Đang bị mờ 12px)</strong>, bảo toàn 100% <em>Hiệu Ứng Tự Sinh (Generation Effect)</em> mà không bị lộ nội dung trước khi tư duy!
              </p>
            </div>

            {/* BƯỚC A: TẠO PROMPT CHUẨN */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-cyan-400 font-mono flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">A</span>
                  Tạo Prompt Chuẩn Cho Gemini 4 Argon High Thinking
                </span>
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="frontier_mode"
                      checked={frontierMode === "roadmap_5day"}
                      onChange={() => setFrontierMode("roadmap_5day")}
                      className="accent-cyan-500"
                    />
                    <span>Lộ trình 5 ngày</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="frontier_mode"
                      checked={frontierMode === "single_lesson"}
                      onChange={() => setFrontierMode("single_lesson")}
                      className="accent-cyan-500"
                    />
                    <span>1 Bài chuyên sâu</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                <div className="flex-1">
                  <input
                    type="text"
                    value={frontierTopic}
                    onChange={(e) => setFrontierTopic(e.target.value)}
                    placeholder="Nhập chủ đề muốn học (Ví dụ: Tự do tài chính & Quy tắc rút vốn an toàn 4%, Lý thuyết trò chơi...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyFrontierPrompt}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-lg shadow-cyan-500/20"
                >
                  {frontierCopied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                  <span>{frontierCopied ? "Đã Sao Chép Prompt!" : "📋 Sao Chép Prompt Cho Gemini 4 Argon"}</span>
                </button>
              </div>
            </div>

            {/* BƯỚC B: DÁN KẾT QUẢ VÀ NẠP LỘ TRÌNH */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">B</span>
                  Dán Kết Quả JSON/Markdown Từ Gemini 4 Argon
                </span>
                <label className="cursor-pointer text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-[11px]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải tệp .json / .md</span>
                  <input type="file" accept=".json,.md,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <textarea
                rows={4}
                value={frontierRawInput}
                onChange={(e) => setFrontierRawInput(e.target.value)}
                placeholder="Dán toàn bộ câu trả lời của Gemini 4 Argon High Thinking vào đây (hỗ trợ cả khối ```json ... ``` hoặc JSON thuần)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed font-mono"
              />

              {frontierParseError && (
                <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{frontierParseError}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseFrontierResponse}
                  disabled={!frontierRawInput.trim()}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ Phân Tích & Nạp Lộ Trình Vào CLE</span>
                </button>
              </div>
            </div>

            {/* DANH SÁCH BÀI HỌC TRONG LỘ TRÌNH (BẢO TOÀN RULE-04: KHÔNG HIỂN THỊ SOURCE_BLOCKS) */}
            {importedRoadmap && importedRoadmap.roadmap && importedRoadmap.roadmap.length > 0 && (
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div>
                    <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                      Lộ Trình Đã Nhập: {importedRoadmap.domain}
                    </div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span>{importedRoadmap.topic_name}</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-cyan-950 border border-cyan-800 text-cyan-300 text-[11px] font-mono rounded">
                      {importedRoadmap.roadmap.length} Bài Học Nguyên Tử
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 text-[11px] font-mono rounded flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>RULE-04 Active</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {importedRoadmap.roadmap.map((mod, idx) => {
                    const isCompleted = completedModuleIds.includes(mod.module_id) || completedModuleIds.includes(mod.title);
                    return (
                      <div
                        key={mod.module_id || idx}
                        className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                          isCompleted
                            ? "bg-emerald-950/20 border-emerald-800/80"
                            : "bg-slate-950/70 border-slate-800 hover:border-cyan-500/50"
                        }`}
                      >
                        <div className="flex flex-col gap-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-mono text-[10px] font-bold rounded">
                              DAY {mod.day || idx + 1}
                            </span>
                            {isCompleted && (
                              <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-mono text-[10px] font-bold rounded flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>✓ Đã học</span>
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-slate-400">
                              {mod.citation.author} ({mod.citation.year}) • {mod.citation.title}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                            {mod.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                            &quot;{mod.activation_context}&quot;
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectRoadmapModule(mod)}
                          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-md ${
                            isCompleted
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                              : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/10"
                          }`}
                        >
                          <span>{isCompleted ? "Ôn Lại Bài Này" : "Học Bài Này (Vào Cổng Đoán Trước)"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. TAB THƯ VIỆN MẪU */}
        {ingestMode === "PRESET" && (
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
        )}

        {/* 3. TAB TỰ NẠP / DOI */}
        {ingestMode === "CUSTOM" && (
          <div className="flex flex-col gap-4">
            {/* Tra cứu nhanh theo mã DOI */}
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row gap-2.5 items-center">
              <div className="flex-1 w-full">
                <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
                  Tra Cứu Tự Động Theo Mã DOI (Crossref Registry)
                </div>
                <input
                  type="text"
                  value={customDoi}
                  onChange={(e) => setCustomDoi(e.target.value)}
                  placeholder="Nhập DOI (ví dụ: 10.1037/0033-295X.109.1.3 hoặc https://doi.org/...)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={handleLookupDoi}
                disabled={!customDoi.trim() || isResolvingDoi}
                className="w-full sm:w-auto px-4 py-2 mt-auto bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                {isResolvingDoi ? "Đang tra cứu..." : "Điền Tự Động"}
              </button>
            </div>

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

        {/* 4. TAB TRỢ LÝ TRUY VẤN PRISMA / PICO */}
        {ingestMode === "SEARCH_BUILDER" && (
          <div className="flex flex-col gap-4">
            <div className="bg-purple-950/30 border border-purple-800/60 p-4 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Trợ Lý Truy Vấn Tổng Quan Hệ Thống (PRISMA / PICO Query Builder)</span>
              </div>
              <p className="text-xs text-slate-300">
                Tự động tạo chuỗi truy vấn chuẩn hóa cho 4 hệ thống cơ sở dữ liệu học thuật quốc tế: PubMed (MeSH), Scopus (TITLE-ABS-KEY), Web of Science (TS=), và PROSPERO / Cochrane Registry.
              </p>
            </div>

            <form onSubmit={handleBuildQueries} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Đối tượng nghiên cứu (Population / Domain) *</label>
                <input
                  type="text"
                  required
                  value={picoTopic}
                  onChange={(e) => setPicoTopic(e.target.value)}
                  placeholder="Ví dụ: Spaced Repetition in Higher Education"
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Can thiệp / Cơ chế (Intervention)</label>
                <input
                  type="text"
                  value={picoIntervention}
                  onChange={(e) => setPicoIntervention(e.target.value)}
                  placeholder="Ví dụ: Desirable Difficulties OR Interleaving"
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Đối chứng (Comparison)</label>
                <input
                  type="text"
                  value={picoComparison}
                  onChange={(e) => setPicoComparison(e.target.value)}
                  placeholder="Ví dụ: Massed Practice OR Blocked Study"
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Kết cục mong đợi (Outcome)</label>
                <input
                  type="text"
                  value={picoOutcome}
                  onChange={(e) => setPicoOutcome(e.target.value)}
                  placeholder="Ví dụ: Long-Term Retention OR Far Transfer"
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-5 py-2.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Sinh Cú Pháp Truy Vấn Cho 4 Cơ Sở Dữ Liệu</span>
                </button>
              </div>
            </form>

            {generatedQueries && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {/* PubMed */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 font-mono">
                    <span>1. PubMed (MeSH + Title/Abstract)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyQuery("pubmed", generatedQueries.pubMed)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedKey === "pubmed" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "pubmed" ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                    {generatedQueries.pubMed}
                  </pre>
                </div>

                {/* Scopus */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-400 font-mono">
                    <span>2. Scopus (TITLE-ABS-KEY)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyQuery("scopus", generatedQueries.scopus)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedKey === "scopus" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "scopus" ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                    {generatedQueries.scopus}
                  </pre>
                </div>

                {/* Web of Science */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 font-mono">
                    <span>3. Web of Science (TS= Topic Search)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyQuery("wos", generatedQueries.webOfScience)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedKey === "wos" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "wos" ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                    {generatedQueries.webOfScience}
                  </pre>
                </div>

                {/* PROSPERO / Cochrane */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 font-mono">
                    <span>4. PROSPERO & Cochrane Registry</span>
                    <button
                      type="button"
                      onClick={() => handleCopyQuery("prospero", generatedQueries.prosperoCochrane)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedKey === "prospero" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "prospero" ? "Đã chép" : "Sao chép"}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                    {generatedQueries.prosperoCochrane}
                  </pre>
                </div>
              </div>
            )}
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
        activationContext={activeConcept.activationContext}
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
        initialCriticalAudit={activeConcept.criticalAuditScaffold}
        initialAnalogicalMatrix={activeConcept.analogicalMatrixScaffold}
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
          source_citation: {
            ...citation,
            domain: activeConcept.domain,
          },
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

        // Cập nhật module hoàn thành vào completedModuleIds
        if (activeConcept.moduleId) {
          const nextCompleted = Array.from(new Set([...completedModuleIds, activeConcept.moduleId]));
          setCompletedModuleIds(nextCompleted);
          try {
            localStorage.setItem("cle_completed_module_ids", JSON.stringify(nextCompleted));
            await fetch("/api/telemetry", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                completedModuleIds: nextCompleted,
                activeRoadmap: importedRoadmap,
              }),
            });
          } catch (e) {
            console.error("Lỗi đồng bộ completedModuleIds:", e);
          }
        }

        // Lưu domain vào localStorage để Phiên Chiều (AtomicZettelStudio) tự động điền sẵn
        if (activeConcept.domain) {
          try {
            localStorage.setItem("cle_last_studied_domain", activeConcept.domain);
          } catch {}
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
