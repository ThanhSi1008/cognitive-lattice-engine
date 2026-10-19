"use client";

import React, { useState, useEffect } from "react";
import { AtomicZettelVelocityCard } from "./AtomicZettelVelocityCard";
import { MemoryStabilityJumpCard } from "./MemoryStabilityJumpCard";
import { ForgettingIndexCalibrationCard } from "./ForgettingIndexCalibrationCard";
import { DecisionCalibrationMatrixCard } from "./DecisionCalibrationMatrixCard";
import { Activity, RefreshCw } from "lucide-react";

export function CognitiveTelemetryDashboard() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/telemetry");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Lỗi tải telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  if (loading && !data) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center text-xs font-mono text-slate-500">
        Đang đồng bộ Điện Tâm Đồ Nhận Thức (Cognitive Telemetry)...
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-0.5">
            Mục 2.5 • Hệ Thống Đo Lường Nhận Thức Chuyên Sâu
          </div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Bảng Điều Khiển Điện Tâm Đồ Nhận Thức (Cognitive Telemetry Dashboard)</span>
          </h2>
        </div>

        <button
          onClick={fetchTelemetry}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition border border-slate-700 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          <span>Cập nhật</span>
        </button>
      </div>

      {/* Grid 4 Thước đo cốt lõi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {data?.velocity && <AtomicZettelVelocityCard velocity={data.velocity} />}
        {data?.stabilityMetric && <MemoryStabilityJumpCard stability={data.stabilityMetric} />}
        {data?.fiMetric && <ForgettingIndexCalibrationCard fi={data.fiMetric} />}
        {data?.decisionCalibration && (
          <DecisionCalibrationMatrixCard decisionCalibration={data.decisionCalibration} />
        )}
      </div>
    </div>
  );
}
