"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Clock, Zap, CheckCircle2, AlertTriangle, Mic, MicOff, Sparkles } from "lucide-react";

export interface FleetingNoteItem {
  id: string;
  raw_content: string;
  created_at: string;
  expires_at: string;
  status: "PENDING" | "PROMOTED" | "EXPIRED_PURGED";
  promoted_to_zettel_id?: string | null;
}

interface FleetingNotesInboxProps {
  userId?: string;
  notes: FleetingNoteItem[];
  onAddNote: (content: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onPurgeExpired: () => Promise<void>;
}

export function FleetingNotesInbox({
  userId = "00000000-0000-0000-0000-000000000001",
  notes,
  onAddNote,
  onDeleteNote,
  onPurgeExpired,
}: FleetingNotesInboxProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isListening, setIsListening] = useState(false);
  const [isCleaningVoice, setIsCleaningVoice] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleVoiceRecording = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Trình duyệt hiện tại chưa hỗ trợ Web Speech API. Bạn có thể nhập ghi chú bằng bàn phím.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "vi-VN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setContent(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech start error:", err);
      setIsListening(false);
    }
  };

  const handleCleanVoiceNote = async () => {
    if (!content.trim() || isCleaningVoice) return;
    setIsCleaningVoice(true);
    try {
      const res = await fetch("/api/ai/transcribe-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      if (res.ok) {
        const data = await res.json();
        setContent(data.cleanedNote);
      }
    } catch (err) {
      console.error("Clean voice note error:", err);
    } finally {
      setIsCleaningVoice(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddNote(content.trim());
      setContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTTLInfo = (expiresAtStr: string) => {
    const expiresAt = new Date(expiresAtStr);
    const msRemaining = expiresAt.getTime() - currentTime.getTime();

    if (msRemaining <= 0) {
      return { label: "HẾT HẠN (Sắp bị xóa)", color: "text-rose-500 bg-rose-950/80 border-rose-800" };
    }

    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 3) {
      return {
        label: `${hours}h ${mins}m còn lại`,
        color: "text-rose-400 bg-rose-950/60 border-rose-800 animate-pulse",
      };
    }
    if (hours < 12) {
      return {
        label: `${hours}h ${mins}m còn lại`,
        color: "text-amber-400 bg-amber-950/60 border-amber-800",
      };
    }
    return {
      label: `${hours}h ${mins}m còn lại`,
      color: "text-emerald-400 bg-emerald-950/60 border-emerald-800",
    };
  };

  const pendingCount = notes.filter((n) => n.status === "PENDING").length;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
            Hộp Đệm Thoáng Qua (TTL Fleeting Notes Inbox)
          </div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span>Ghi Chú Nhanh Tự Hủy 48 Giờ (Chống Ngụy Biện Tích Trữ)</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-mono px-3 py-1 rounded-full border ${
              pendingCount > 5
                ? "bg-rose-950 text-rose-400 border-rose-800 animate-bounce"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            {pendingCount} / 5 ghi chú chờ (RULE-02)
          </span>

          <button
            onClick={onPurgeExpired}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition border border-slate-700"
          >
            Quét & Xóa Thẻ Hết Hạn
          </button>
        </div>
      </div>

      {pendingCount > 5 && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>
            <strong>Cảnh báo RULE-02:</strong> Bạn đang tồn đọng {pendingCount} Fleeting Notes (&gt; 5 thẻ). Điều này sẽ kích hoạt Ngắt Mạch Nợ Nhận Thức vào sáng mai nếu không được chuyển hóa thành Zettel hoặc xóa bỏ!
          </span>
        </div>
      )}

      {/* Input Box with Voice Support */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isListening ? "Đang lắng nghe giọng nói của bạn (Web Speech API)..." : "Chụp nhanh một ý tưởng nảy sinh giữa ngày..."}
            className={`w-full bg-slate-950 border ${isListening ? "border-rose-500 animate-pulse ring-1 ring-rose-500" : "border-slate-800"} rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 pr-10`}
          />
          {content.trim() && (
            <button
              type="button"
              onClick={handleCleanVoiceNote}
              disabled={isCleaningVoice}
              title="Lọc từ đệm & chuẩn hóa câu chữ bằng AI"
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-cyan-400 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 ${isCleaningVoice ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              isListening
                ? "bg-rose-950 text-rose-300 border-rose-700 animate-pulse"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700"
            }`}
            title={isListening ? "Dừng ghi âm giọng nói" : "Ghi âm ý tưởng (Web Speech API)"}
          >
            {isListening ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-cyan-400" />}
            <span>{isListening ? "Đang nghe..." : "Ghi Âm"}</span>
          </button>

          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lưu Nhanh</span>
          </button>
        </div>
      </form>

      {/* Notes List */}
      <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 font-mono">
            Hộp đệm trống. Không có ghi chú thoáng qua nào.
          </div>
        ) : (
          notes.map((note) => {
            const ttl = getTTLInfo(note.expires_at);
            return (
              <div
                key={note.id}
                className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-lg p-3.5 flex justify-between items-center gap-3 transition"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm text-slate-200 truncate">{note.raw_content}</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <span>Tạo lúc: {new Date(note.created_at).toLocaleTimeString()}</span>
                    {note.status === "PROMOTED" && (
                      <span className="text-cyan-400 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Đã thành Zettel [[{note.promoted_to_zettel_id}]]
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${ttl.color}`}
                  >
                    <Clock className="w-3 h-3" />
                    {ttl.label}
                  </span>

                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="text-slate-600 hover:text-rose-400 transition"
                    title="Xóa ghi chú này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
