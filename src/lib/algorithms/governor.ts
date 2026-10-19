/**
 * 3. BỘ ĐIỀU TỐC DUNG LƯỢNG 5% / 95% (Asymptotic Capacity Governor - Mục 2.3.3 & RULE-02)
 */

export interface DueCardMetric {
  id: string;
  avg_response_time_sec?: number;
  state?: string;
}

export interface CapacityGovernorInput {
  dueCards: DueCardMetric[];
  leechQuarantineCount?: number;
  pendingFleetingNotesCount?: number;
  reviewBudgetSec?: number; // Mặc định 600s = 10 phút
}

export type GovernorStateMode = "BALANCED" | "ELASTIC_ADAPTIVE" | "SYSTEM_REFACTORING";

export interface CapacityGovernorResult {
  drli: number;
  totalEstimatedReviewTimeSec: number;
  dueCardsCount: number;
  leechCardsCount: number;
  pendingFleetingNotesCount: number;
  mode: GovernorStateMode;
  isCircuitBreakerTripped: boolean;
  circuitBreakerReasons: string[];
  sessionSchedule: {
    morningMinutes: number; // Phiên Sáng
    afternoonMinutes: number; // Phiên Chiều
    eveningMinutes: number; // Phiên Tối
    eveningReviewBudgetSec: number; // Thời gian dành riêng cho ôn thẻ
  };
}

export const STANDARD_REVIEW_BUDGET_SEC = 600; // 10 phút
export const DEFAULT_CARD_RESPONSE_TIME_SEC = 90.0; // 90 giây/thẻ

/**
 * Tính toán chỉ số DRLI và trạng thái Ngắt mạch Nợ Nhận thức (RULE-02)
 */
export function calculateDRLI(input: CapacityGovernorInput): CapacityGovernorResult {
  const {
    dueCards,
    leechQuarantineCount,
    pendingFleetingNotesCount = 0,
    reviewBudgetSec = STANDARD_REVIEW_BUDGET_SEC,
  } = input;

  // Tính tổng thời gian dự kiến ôn tập thẻ đến hạn: sum(avg_response_time_sec)
  let totalEstimatedReviewTimeSec = 0;
  let activeLeechCount = 0;

  for (const card of dueCards) {
    totalEstimatedReviewTimeSec += card.avg_response_time_sec ?? DEFAULT_CARD_RESPONSE_TIME_SEC;
    if (card.state === "LEECH_QUARANTINE") {
      activeLeechCount++;
    }
  }

  // Nếu caller truyền leechQuarantineCount riêng thì lấy giá trị lớn nhất
  const totalLeechCount = Math.max(activeLeechCount, leechQuarantineCount ?? 0);

  // Công thức: DRLI = sum(tau) / T_review_budget
  const drli = Number((totalEstimatedReviewTimeSec / Math.max(reviewBudgetSec, 1)).toFixed(2));

  // Kiểm tra 3 điều kiện ngắt mạch RULE-02:
  // a) DRLI > 1.5
  // b) Có >= 3 thẻ đang ở trạng thái LEECH_QUARANTINE
  // c) Có > 5 bản ghi fleeting_notes ở trạng thái PENDING
  const reasons: string[] = [];
  if (drli > 1.5) {
    reasons.push(`DRLI = ${drli} vượt quá ngưỡng tối đa 1.5 (quá hạn 150% ngân sách 10 phút).`);
  }
  if (totalLeechCount >= 3) {
    reasons.push(`Có ${totalLeechCount} thẻ ở trạng thái LEECH_QUARANTINE (ngưỡng tối đa cho phép là < 3).`);
  }
  if (pendingFleetingNotesCount > 5) {
    reasons.push(`Có ${pendingFleetingNotesCount} Fleeting Notes đang tồn đọng PENDING (ngưỡng tối đa cho phép là <= 5).`);
  }

  const isCircuitBreakerTripped = reasons.length > 0;

  // Quyết định chế độ phân bổ thời gian SOP:
  if (isCircuitBreakerTripped) {
    // Ngắt mạch: Khóa cứng Phiên Sáng, chuyển sang System Refactoring Mode
    return {
      drli,
      totalEstimatedReviewTimeSec,
      dueCardsCount: dueCards.length,
      leechCardsCount: totalLeechCount,
      pendingFleetingNotesCount,
      mode: "SYSTEM_REFACTORING",
      isCircuitBreakerTripped: true,
      circuitBreakerReasons: reasons,
      sessionSchedule: {
        morningMinutes: 0, // Cổng nạp tri thức mới bị khóa cứng!
        afternoonMinutes: 0,
        eveningMinutes: 60, // Dồn toàn bộ quỹ 60 phút để sửa chữa hệ thống và dập nợ thẻ
        eveningReviewBudgetSec: 3600,
      },
    };
  }

  if (drli > 1.0) {
    // Trạng thái Thích ứng Co giãn: S1 rút xuống 10m, S3 tăng lên 30m
    return {
      drli,
      totalEstimatedReviewTimeSec,
      dueCardsCount: dueCards.length,
      leechCardsCount: totalLeechCount,
      pendingFleetingNotesCount,
      mode: "ELASTIC_ADAPTIVE",
      isCircuitBreakerTripped: false,
      circuitBreakerReasons: [],
      sessionSchedule: {
        morningMinutes: 10,
        afternoonMinutes: 20,
        eveningMinutes: 30,
        eveningReviewBudgetSec: 1200, // 20 phút ôn thẻ
      },
    };
  }

  // Trạng thái Cân bằng tiêu chuẩn (DRLI <= 1.0): 20 - 20 - 20
  return {
    drli,
    totalEstimatedReviewTimeSec,
    dueCardsCount: dueCards.length,
    leechCardsCount: totalLeechCount,
    pendingFleetingNotesCount,
    mode: "BALANCED",
    isCircuitBreakerTripped: false,
    circuitBreakerReasons: [],
    sessionSchedule: {
      morningMinutes: 20,
      afternoonMinutes: 20,
      eveningMinutes: 20,
      eveningReviewBudgetSec: 600, // 10 phút ôn thẻ
    },
  };
}
