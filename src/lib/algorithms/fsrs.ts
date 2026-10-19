import {
  fsrs,
  Rating,
  type Grade,
  type Card as TsFsrsCard,
  type RecordLogItem,
  default_request_retention,
} from "ts-fsrs";

// Hằng số FSRS-5 theo đặc tả Mục 1.1 & 1.2
export const FSRS_DECAY = -0.5;
// FACTOR = 0.9^(1 / DECAY) - 1 = (0.9^-2) - 1 = 1 / 0.81 - 1 = 19 / 81 ≈ 0.23456790123
export const FSRS_FACTOR = Math.pow(0.9, 1 / FSRS_DECAY) - 1; // 19 / 81
export const DEFAULT_REQUEST_RETENTION = 0.90; // R_req = 90% (FI = 10%)

/**
 * 1.1. Phương trình Đường cong Quên Lũy thừa (Power-Law Forgetting Curve)
 * R(t, S) = (1 + FACTOR * (t / S))^DECAY
 * Khi t = S, R(S, S) = (1 + (19/81) * 1)^(-0.5) = (100/81)^(-0.5) = 9/10 = 0.90 (90%)
 */
export function calculateRetrievability(t: number, S: number): number {
  if (S <= 0) return 0;
  if (t <= 0) return 1.0;
  const R = Math.pow(1 + FSRS_FACTOR * (t / S), FSRS_DECAY);
  return Math.max(0, Math.min(1.0, R));
}

/**
 * 1.2. Khoảng cách Ôn tập Tiếp theo (Next Interval Calculation)
 * I(S, R_req) = max(1, round( (S / FACTOR) * (R_req^(1 / DECAY) - 1) ))
 */
export function calculateNextInterval(S: number, R_req: number = DEFAULT_REQUEST_RETENTION): number {
  if (S <= 0) return 1;
  const clampedRetention = Math.max(0.70, Math.min(0.97, R_req));
  const interval = (S / FSRS_FACTOR) * (Math.pow(clampedRetention, 1 / FSRS_DECAY) - 1);
  return Math.max(1, Math.round(interval));
}

/**
 * 1.4. Hàm Gợi ý Điểm Đánh giá Tự động (autoRating)
 * Đối chiếu thời gian phản hồi thực tế (giây) với thời gian trung bình và độ khó
 * để chống thiên kiến tự chấm điểm dễ dãi (Mục 1.4)
 */
export function autoRating(
  responseTimeSec: number,
  avgTimeSec: number = 90.0,
  difficulty: number = 5.0
): 1 | 2 | 3 | 4 {
  const effectiveAvg = Math.max(avgTimeSec, 30);
  const ratio = responseTimeSec / effectiveAvg;

  if (ratio > 1.8) {
    return 2; // Hard (Quá lâu / Vất vả)
  }
  if (ratio < 0.65 && difficulty < 6.0) {
    return 4; // Easy (Nhanh & Dễ)
  }
  return 3; // Good (Trong ngưỡng tiêu chuẩn)
}

/**
 * Kiểm tra xem thẻ có đang nằm trong Vùng Ma sát Nhận thức Tối ưu (Optimal Friction Zone)
 * R ∈ [0.70, 0.85] (70% - 85%) hay không (Mục 2.5 Memory Telemetry).
 * Khi người học truy xuất thành công trong vùng này, độ ổn định S sẽ nhảy vọt (ΔS).
 */
export function isOptimalFrictionZone(R: number): boolean {
  return R >= 0.70 && R <= 0.85;
}

export interface FSRSSchedulingResult {
  card: {
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: "NEW" | "LEARNING" | "REVIEW" | "RELEARNING" | "LEECH_QUARANTINE";
    due_date: Date;
    last_review: Date;
  };
  retrievabilityBeforeReview: number;
  stabilityJump: number; // ΔS = S'_r - S
  inOptimalFrictionZone: boolean;
  suggestedRating: 1 | 2 | 3 | 4;
}

/**
 * Thực thi một lượt ôn tập thẻ FSRS-5, tính toán cập nhật DSR và trạng thái Leech Quarantine
 */
export function scheduleFSRSCardReview(params: {
  currentStability: number;
  currentDifficulty: number;
  elapsedDays: number;
  reps: number;
  lapses: number;
  grade: Grade; // 1 | 2 | 3 | 4
  responseTimeSec: number;
  avgResponseTimeSec?: number;
  reviewDate?: Date;
  requestRetention?: number;
}): FSRSSchedulingResult {
  const {
    currentStability,
    currentDifficulty,
    elapsedDays,
    reps,
    lapses,
    grade,
    responseTimeSec,
    avgResponseTimeSec = 90.0,
    reviewDate = new Date(),
    requestRetention = DEFAULT_REQUEST_RETENTION,
  } = params;

  // Tính khả năng truy xuất R ngay trước thời điểm ôn tập
  const R_before = calculateRetrievability(elapsedDays, currentStability);
  const inFriction = isOptimalFrictionZone(R_before);
  const suggested = autoRating(responseTimeSec, avgResponseTimeSec, currentDifficulty);

  const f = fsrs({
    request_retention: requestRetention,
    maximum_interval: 36500,
  });

  const now = reviewDate;
  // Khởi tạo thẻ dạng ts-fsrs
  const tsCard: TsFsrsCard = {
    due: now,
    stability: currentStability,
    difficulty: currentDifficulty,
    elapsed_days: elapsedDays,
    scheduled_days: elapsedDays,
    reps: reps,
    lapses: lapses,
    learning_steps: 0,
    state: reps === 0 ? 0 : 2, // 0: New, 2: Review
    last_review: new Date(now.getTime() - elapsedDays * 24 * 60 * 60 * 1000),
  };

  const scheduleRecord: RecordLogItem = f.repeat(tsCard, now)[grade];
  const nextCard = scheduleRecord.card;

  const nextStability = Number(nextCard.stability.toFixed(4));
  let nextDifficulty = Number(nextCard.difficulty.toFixed(2));
  nextDifficulty = Math.max(1.0, Math.min(10.0, nextDifficulty));

  const newReps = reps + 1;
  const newLapses = grade === Rating.Again ? lapses + 1 : lapses;
  const stabilityJump = Number((nextStability - currentStability).toFixed(4));

  // Kiểm tra điều kiện tự động cách ly Leech:
  // IF difficulty >= 8.5 OR lapses >= 3 THEN state := 'LEECH_QUARANTINE'
  let state: "NEW" | "LEARNING" | "REVIEW" | "RELEARNING" | "LEECH_QUARANTINE" = "REVIEW";
  if (nextDifficulty >= 8.5 || newLapses >= 3) {
    state = "LEECH_QUARANTINE";
  }

  const scheduledIntervalDays = calculateNextInterval(nextStability, requestRetention);
  const nextDueDate = new Date(now.getTime() + scheduledIntervalDays * 24 * 60 * 60 * 1000);

  return {
    card: {
      stability: nextStability,
      difficulty: nextDifficulty,
      elapsed_days: 0,
      scheduled_days: scheduledIntervalDays,
      reps: newReps,
      lapses: newLapses,
      state,
      due_date: nextDueDate,
      last_review: now,
    },
    retrievabilityBeforeReview: Number(R_before.toFixed(4)),
    stabilityJump,
    inOptimalFrictionZone: inFriction,
    suggestedRating: suggested,
  };
}
