"use client";

import React, { useState, useEffect } from "react";
import { Lock, Timer, Brain, Coffee, Activity, Unlock, Zap } from "lucide-react";

interface NeuralIncubationLockProps {
  userId?: string;
  sessionId?: string;
  s1CompletedAt?: Date | string | null;
  incubationUnlockAt?: Date | string | null;
  onUnlocked?: () => void;
  onFastForward?: () => void;
}

export function NeuralIncubationLock({
  userId = "00000000-0000-0000-0000-000000000001",
  sessionId,
  s1CompletedAt,
  incubationUnlockAt,
  onUnlocked,
  onFastForward,
}: NeuralIncubationLockProps) {
  const [now, setNow] = useState(new Date());
  const [isFastForwarding, setIsFastForwarding] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unlockTime = incubationUnlockAt
    ? new Date(incubationUnlockAt)
    : s1CompletedAt
    ? new Date(new Date(s1CompletedAt).getTime() + 4 * 60 * 60 * 1000)
    : null;

  const msRemaining = unlockTime ? unlockTime.getTime() - now.getTime() : 0;
  const isLocked = msRemaining > 0;

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleFastForward = async () => {
    setIsFastForwarding(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionId,
          simulateIncubationComplete: true,
        }),
      });

      if (res.ok) {
        if (onFastForward) {
          onFastForward();
        }
        if (onUnlocked) {
          onUnlocked();
        }
      }
    } catch (err) {
      console.error("Lỗi tua nhanh khoảng nghỉ 4 giờ:", err);
    } finally {
      setIsFastForwarding(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-1">
            Phân Hệ 2 • Chế Độ Phân Tán (Diffuse Mode)
          </div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {isLocked ? (
              <>
                <Lock className="w-5 h-5 text-amber-400" />
                <span>Khóa Khoảng Nghỉ Sinh Học (Neural Incubation Lock - 4 Giờ)</span>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5 text-emerald-400" />
                <span>Khoảng Nghỉ Sinh Học Đã Hoàn Tất (Sẵn Sàng Cho Phiên Chiều)</span>
              </>
            )}
          </h2>
        </div>

        {unlockTime && (
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {isLocked && (
              <button
                type="button"
                onClick={handleFastForward}
                disabled={isFastForwarding}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                title="Tua nhanh thời gian ủ 4 giờ để mở khóa ngay Phiên Chiều"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>{isFastForwarding ? "Đang tua nhanh..." : "⚡ Tua Nhanh Khóa Ủ 4 Giờ (Mở Khóa Ngay)"}</span>
              </button>
            )}

            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              <Timer className={`w-5 h-5 ${isLocked ? "text-amber-400 animate-spin" : "text-emerald-400"}`} />
              <div>
                <div className="text-[10px] text-slate-500 font-mono">Đếm ngược mở khóa</div>
                <div className="font-mono text-xl font-bold text-white">
                  {isLocked ? formatCountdown(msRemaining) : "ĐÃ MỞ KHÓA"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLocked ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="text-xs font-semibold text-slate-200">Vận Động Thể Chất</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Đi bộ nhẹ nhàng, chạy bộ hoặc tập thể thao để tăng lưu lượng máu não và kích hoạt mạng liên kết mặc định (DMN).
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-2">
            <Coffee className="w-5 h-5 text-amber-400" />
            <h3 className="text-xs font-semibold text-slate-200">Ngắt Kết Nối Toàn Diện</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tránh đọc tài liệu chuyên môn hoặc lướt mạng xã hội. Để não vô thức ủ và xử lý các liên kết tiềm ẩn.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="text-xs font-semibold text-slate-200">Củng Cố Mạng Lưới Khái Niệm</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cơ chế ủ 4 giờ là điều kiện vật lý bắt buộc để chuyển hóa trí nhớ ngắn hạn sang liên kết nơ-ron bán bền vững.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-4 flex justify-between items-center text-xs text-emerald-200">
          <span>Khoảng nghỉ 4 giờ đã thỏa mãn! Bạn có thể bắt đầu Phân Hệ 3 (Xưởng Chưng Cất Nguyên Tử) bất cứ lúc nào.</span>
          {onUnlocked && (
            <button
              onClick={onUnlocked}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded transition cursor-pointer"
            >
              Vào Phiên Chiều
            </button>
          )}
        </div>
      )}
    </div>
  );
}
