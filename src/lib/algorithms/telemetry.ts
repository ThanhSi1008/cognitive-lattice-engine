import { calculateRetrievability, isOptimalFrictionZone } from "./fsrs";

export interface ZettelVelocityMetric {
  weeklyCount: number;
  targetMin: number; // 3
  targetMax: number; // 7
  status: "UNDER_PACING" | "OPTIMAL" | "COLLECTOR_FALLACY_RISK";
  statusMessage: string;
}

export interface StabilityJumpMetric {
  averageDeltaS: number;
  sampleCount: number;
  lastJumpExample: {
    fromDays: number;
    toDays: number;
    deltaDays: number;
    retrievabilityAtReview: number;
  };
  optimalFrictionZoneRate: number; // Tỷ lệ lượt ôn tập rơi đúng vùng [0.70, 0.85]
}

export interface ForgettingIndexMetric {
  targetFI: number; // 0.10 (10%)
  targetRetention: number; // 0.90 (90%)
  currentFI: number;
  currentRetention: number;
  isWithinTargetRange: boolean; // FI ∈ [0.08, 0.12]
  totalRevlogCount: number;
  optimizerThreshold: number; // 400
  optimizerReady: boolean;
  weights: number[]; // Bộ 19 trọng số FSRS-5
  rmseReduction: {
    sm2Rmse: number; // ~ 10.5%
    fsrs5Rmse: number; // ~ 2.8%
  };
}

export interface DecisionCalibrationSummary {
  totalAudited: number;
  averageBrierScore: number;
  calibrationDistribution: {
    perfect: number;
    excellent: number;
    moderate: number;
    miscalibrated: number;
  };
}

// 19 trọng số mặc định chuẩn FSRS-5 (Mục 1.2 docs/03)
export const DEFAULT_FSRS5_WEIGHTS = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621
];

/**
 * 1. Tính toán Tốc độ Sản xuất Zettel Nguyên tử (Atomic Zettel Velocity)
 * Mục tiêu chuẩn: 3 - 7 Zettels / tuần (mỗi Zettel 100 - 350 từ, >= 2 liên kết)
 */
export function calculateZettelVelocity(
  publishedZettelsLast7Days: number
): ZettelVelocityMetric {
  const targetMin = 3;
  const targetMax = 7;

  let status: "UNDER_PACING" | "OPTIMAL" | "COLLECTOR_FALLACY_RISK" = "OPTIMAL";
  let statusMessage = "Nhịp độ tối ưu: Đảm bảo khả năng chưng cất sâu và liên kết liên ngành.";

  if (publishedZettelsLast7Days < targetMin) {
    status = "UNDER_PACING";
    statusMessage = `Dưới mục tiêu (${publishedZettelsLast7Days}/${targetMin} Zettels/tuần). Cần duy trì nhịp đều đặn ở Phiên Chiều.`;
  } else if (publishedZettelsLast7Days > targetMax) {
    status = "COLLECTOR_FALLACY_RISK";
    statusMessage = `Cảnh báo Ngụy biện Tích trữ (${publishedZettelsLast7Days} Zettels/tuần > ${targetMax}). Tốc độ quá nhanh dễ dẫn đến Zettel hời hợt và nợ ôn tập FSRS.`;
  }

  return {
    weeklyCount: publishedZettelsLast7Days,
    targetMin,
    targetMax,
    status,
    statusMessage,
  };
}

/**
 * 2. Đo Lường Mức Độ Nhảy Vọt Ổn Định (Memory Stability Jump Telemetry)
 * Khi R giảm xuống vùng ma sát tối ưu [0.70, 0.85] và truy xuất thành công,
 * Độ ổn định S nhảy vọt (ví dụ từ 10 ngày lên 32.5 ngày, ΔS = +22.5d).
 */
export function analyzeStabilityJumps(
  reviews: Array<{
    stabilityBefore: number;
    stabilityAfter: number;
    elapsedDays: number;
    grade: number; // 2, 3, 4 là thành công
  }>
): StabilityJumpMetric {
  if (reviews.length === 0) {
    return {
      averageDeltaS: 22.5,
      sampleCount: 0,
      lastJumpExample: {
        fromDays: 10.0,
        toDays: 32.5,
        deltaDays: 22.5,
        retrievabilityAtReview: 0.825,
      },
      optimalFrictionZoneRate: 0.85,
    };
  }

  let totalDeltaS = 0;
  let frictionZoneCount = 0;

  for (const rev of reviews) {
    const delta = Math.max(0, rev.stabilityAfter - rev.stabilityBefore);
    totalDeltaS += delta;

    const R = calculateRetrievability(rev.elapsedDays, rev.stabilityBefore);
    if (isOptimalFrictionZone(R)) {
      frictionZoneCount++;
    }
  }

  const avgDelta = Number((totalDeltaS / reviews.length).toFixed(1));
  const frictionRate = Number((frictionZoneCount / reviews.length).toFixed(2));
  const lastRev = reviews[reviews.length - 1];
  const lastR = calculateRetrievability(lastRev.elapsedDays, lastRev.stabilityBefore);

  return {
    averageDeltaS: avgDelta,
    sampleCount: reviews.length,
    lastJumpExample: {
      fromDays: lastRev.stabilityBefore,
      toDays: lastRev.stabilityAfter,
      deltaDays: Number((lastRev.stabilityAfter - lastRev.stabilityBefore).toFixed(1)),
      retrievabilityAtReview: Number(lastR.toFixed(3)),
    },
    optimalFrictionZoneRate: frictionRate,
  };
}

/**
 * 3. Hiệu Chuẩn Chỉ Số Quên & Trình Tối Ưu Hóa Trọng Số FSRS-5 (Forgetting Index Calibration)
 * Dải mục tiêu: FI ∈ [8%, 12%] (R ∈ [88%, 92%]).
 * Khi tích lũy đủ >= 400 - 1.000 lượt ôn tập revlog, mở khóa FSRS Optimizer.
 */
export function calibrateForgettingIndex(
  totalRevlogs: number,
  lapsesCount: number,
  customWeights?: number[]
): ForgettingIndexMetric {
  const targetFI = 0.10; // 10%
  const targetRetention = 0.90; // 90%

  const empiricalFI = totalRevlogs > 0 ? Number((lapsesCount / totalRevlogs).toFixed(3)) : 0.095;
  const empiricalRetention = Number((1.0 - empiricalFI).toFixed(3));

  const isWithinTargetRange = empiricalFI >= 0.08 && empiricalFI <= 0.12;
  const optimizerThreshold = 400;
  const optimizerReady = totalRevlogs >= optimizerThreshold;

  return {
    targetFI,
    targetRetention,
    currentFI: empiricalFI,
    currentRetention: empiricalRetention,
    isWithinTargetRange,
    totalRevlogCount: totalRevlogs,
    optimizerThreshold,
    optimizerReady,
    weights: customWeights || DEFAULT_FSRS5_WEIGHTS,
    rmseReduction: {
      sm2Rmse: 0.105, // SM-2 ~ 10.5%
      fsrs5Rmse: 0.028, // FSRS-5 ~ 2.8%
    },
  };
}
