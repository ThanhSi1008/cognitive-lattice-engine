import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  calculateRetrievability,
  calculateNextInterval,
  autoRating,
  isOptimalFrictionZone,
  scheduleFSRSCardReview,
  FSRS_FACTOR,
  FSRS_DECAY,
} from "../src/lib/algorithms/fsrs";
import {
  cosineSimilarity,
  calculateContrastObjective,
  filterEligibleInterleavingCards,
  orderQueueByMaxContrast,
  InterleavingCardItem,
} from "../src/lib/algorithms/interleaving";
import {
  calculateDRLI,
  STANDARD_REVIEW_BUDGET_SEC,
} from "../src/lib/algorithms/governor";
import {
  calculateBrierScore,
} from "../src/lib/algorithms/brier";
import {
  purgeExpiredFleetingNotes,
  processAuditReminder,
} from "../src/lib/workers";
import { getDb, runMigrations, closeDb } from "../src/lib/db";

describe("PHASE 2: Core Algorithmic Engine & Workers", () => {
  beforeEach(async () => {
    const db = await getDb();
    await runMigrations(db);
  });

  afterAll(async () => {
    await closeDb();
  });

  // --- 1. FSRS-5 DSR Memory Model ---
  describe("1. FSRS-5 DSR Memory Model", () => {
    it("Đường cong quên lũy thừa: Khi t = S thì R(S, S) luôn bằng đúng 0.90 (90%)", () => {
      const stabilities = [1.0, 5.0, 10.0, 32.5, 100.0];
      for (const S of stabilities) {
        const R = calculateRetrievability(S, S);
        expect(Number(R.toFixed(4))).toBe(0.90);
      }
    });

    it("Đường cong quên: Khi t = 0 thì R = 1.0; khi t > S thì R < 0.90", () => {
      const S = 10;
      expect(calculateRetrievability(0, S)).toBe(1.0);
      expect(calculateRetrievability(5, S)).toBeGreaterThan(0.90);
      expect(calculateRetrievability(20, S)).toBeLessThan(0.90);
    });

    it("Khoảng cách tiếp theo: Khi R_req = 0.90 thì I(S, 0.90) == S", () => {
      const S = 14;
      const interval = calculateNextInterval(S, 0.90);
      expect(interval).toBe(14);
    });

    it("autoRating: gợi ý điểm chuẩn xác dựa trên thời gian phản hồi và độ khó", () => {
      // responseTime > 1.8 * avgTime -> Hard (2)
      expect(autoRating(190, 100, 5.0)).toBe(2);

      // responseTime < 0.65 * avgTime và difficulty < 6.0 -> Easy (4)
      expect(autoRating(50, 100, 4.5)).toBe(4);

      // responseTime nhanh nhưng difficulty >= 6.0 -> Good (3) để chống chủ quan
      expect(autoRating(50, 100, 7.5)).toBe(3);

      // responseTime trong ngưỡng bình thường -> Good (3)
      expect(autoRating(90, 100, 5.0)).toBe(3);
    });

    it("isOptimalFrictionZone: xác định đúng dải ma sát tối ưu [0.70, 0.85]", () => {
      expect(isOptimalFrictionZone(0.75)).toBe(true);
      expect(isOptimalFrictionZone(0.85)).toBe(true);
      expect(isOptimalFrictionZone(0.69)).toBe(false);
      expect(isOptimalFrictionZone(0.92)).toBe(false);
    });

    it("scheduleFSRSCardReview: tính độ nhảy vọt ổn định ΔS và tự cách ly Leech khi lapses >= 3", () => {
      const result = scheduleFSRSCardReview({
        currentStability: 10.0,
        currentDifficulty: 5.0,
        elapsedDays: 20, // R ≈ 0.825 nằm trong vùng ma sát [0.70, 0.85]
        reps: 2,
        lapses: 2,
        grade: 1, // Again -> lapses thành 3
        responseTimeSec: 150,
      });

      expect(result.card.lapses).toBe(3);
      expect(result.card.state).toBe("LEECH_QUARANTINE");
      expect(result.inOptimalFrictionZone).toBe(true);
    });
  });

  // --- 2. Max-Contrast Greedy Ordering ---
  describe("2. Max-Contrast Greedy Ordering (J(c_t, c))", () => {
    it("cosineSimilarity: tính toán chuẩn xác tích vô hướng chuẩn hóa", () => {
      const v1 = [1, 0, 0];
      const v2 = [1, 0, 0];
      const v3 = [0, 1, 0];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0);
      expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.0);
    });

    it("calculateContrastObjective: trả về -Infinity nếu hai thẻ cùng mental model", () => {
      const c1: InterleavingCardItem = {
        id: "1",
        zettel_uid: "20261019000001",
        domain_category: "Finance",
        reps: 3,
        state: "REVIEW",
      };
      const c2: InterleavingCardItem = {
        id: "2",
        zettel_uid: "20261019000001", // Cùng mô hình
        domain_category: "Biology",
        reps: 3,
        state: "REVIEW",
      };

      const score = calculateContrastObjective(c1, c2);
      expect(score).toBe(-Infinity);
    });

    it("filterEligibleInterleavingCards: áp dụng RULE-03 giàn giáo thích ứng (reps < 2 vào scaffolding)", () => {
      const cards: InterleavingCardItem[] = [
        { id: "1", zettel_uid: "M1", domain_category: "A", reps: 1, state: "LEARNING" },
        { id: "2", zettel_uid: "M2", domain_category: "B", reps: 3, state: "REVIEW" },
        { id: "3", zettel_uid: "M3", domain_category: "C", reps: 2, state: "REVIEW" },
      ];

      const { interleavingPool, scaffoldingPool } = filterEligibleInterleavingCards(cards);
      expect(scaffoldingPool.length).toBe(1);
      expect(scaffoldingPool[0].id).toBe("1");
      expect(interleavingPool.length).toBe(2);
    });

    it("orderQueueByMaxContrast: sắp xếp đan xen không có 2 thẻ cùng mô hình xuất hiện liền nhau", () => {
      const cards: InterleavingCardItem[] = [
        { id: "1", zettel_uid: "M_A", domain_category: "Finance", reps: 3, state: "REVIEW", elapsed_days: 10, embedding: [1, 0] },
        { id: "2", zettel_uid: "M_A", domain_category: "Finance", reps: 3, state: "REVIEW", elapsed_days: 8, embedding: [1, 0] },
        { id: "3", zettel_uid: "M_B", domain_category: "Software", reps: 3, state: "REVIEW", elapsed_days: 9, embedding: [0.8, 0.2] },
        { id: "4", zettel_uid: "M_C", domain_category: "Biology", reps: 3, state: "REVIEW", elapsed_days: 7, embedding: [0.7, 0.3] },
      ];

      const ordered = orderQueueByMaxContrast(cards);
      expect(ordered.length).toBe(4);

      for (let i = 0; i < ordered.length - 1; i++) {
        expect(ordered[i].zettel_uid).not.toBe(ordered[i + 1].zettel_uid);
      }
    });
  });

  // --- 3. Capacity Governor & Circuit Breaker (RULE-02) ---
  describe("3. Capacity Governor & Circuit Breaker (RULE-02)", () => {
    it("DRLI <= 1.0: Trạng thái Cân bằng (20m Sáng - 20m Chiều - 20m Tối)", () => {
      const dueCards = [
        { id: "c1", avg_response_time_sec: 90 },
        { id: "c2", avg_response_time_sec: 90 },
        { id: "c3", avg_response_time_sec: 90 },
      ]; // 270s / 600s = 0.45 <= 1.0

      const result = calculateDRLI({ dueCards });
      expect(result.drli).toBe(0.45);
      expect(result.mode).toBe("BALANCED");
      expect(result.isCircuitBreakerTripped).toBe(false);
      expect(result.sessionSchedule.morningMinutes).toBe(20);
      expect(result.sessionSchedule.eveningMinutes).toBe(20);
    });

    it("1.0 < DRLI <= 1.5: Trạng thái Co giãn (10m Sáng - 20m Chiều - 30m Tối)", () => {
      // 8 thẻ * 90s = 720s / 600s = 1.2
      const dueCards = Array(8).fill(null).map((_, i) => ({
        id: `c${i}`,
        avg_response_time_sec: 90,
      }));

      const result = calculateDRLI({ dueCards });
      expect(result.drli).toBe(1.2);
      expect(result.mode).toBe("ELASTIC_ADAPTIVE");
      expect(result.isCircuitBreakerTripped).toBe(false);
      expect(result.sessionSchedule.morningMinutes).toBe(10);
      expect(result.sessionSchedule.eveningMinutes).toBe(30);
    });

    it("DRLI > 1.5: Ngắt mạch Nợ Nhận thức RULE-02 (Khóa cứng Phiên Sáng 0 phút)", () => {
      // 12 thẻ * 90s = 1080s / 600s = 1.8 > 1.5
      const dueCards = Array(12).fill(null).map((_, i) => ({
        id: `c${i}`,
        avg_response_time_sec: 90,
      }));

      const result = calculateDRLI({ dueCards });
      expect(result.drli).toBe(1.8);
      expect(result.mode).toBe("SYSTEM_REFACTORING");
      expect(result.isCircuitBreakerTripped).toBe(true);
      expect(result.sessionSchedule.morningMinutes).toBe(0); // Khóa cứng!
      expect(result.sessionSchedule.eveningMinutes).toBe(60);
    });

    it("Ngắt mạch khi có >= 3 thẻ LEECH_QUARANTINE hoặc > 5 Fleeting Notes tồn đọng", () => {
      const resultWithLeech = calculateDRLI({
        dueCards: [{ id: "c1", avg_response_time_sec: 90 }],
        leechQuarantineCount: 3,
      });
      expect(resultWithLeech.isCircuitBreakerTripped).toBe(true);
      expect(resultWithLeech.mode).toBe("SYSTEM_REFACTORING");

      const resultWithNotes = calculateDRLI({
        dueCards: [{ id: "c1", avg_response_time_sec: 90 }],
        pendingFleetingNotesCount: 6, // > 5
      });
      expect(resultWithNotes.isCircuitBreakerTripped).toBe(true);
      expect(resultWithNotes.mode).toBe("SYSTEM_REFACTORING");
    });
  });

  // --- 4. Multi-class Brier Score ---
  describe("4. Multi-class Brier Score", () => {
    it("Dự báo hoàn hảo tuyệt đối: BS = 0, PERFECT", () => {
      const forecast = { prob_positive: 100, prob_neutral: 0, prob_worst: 0 };
      const res = calculateBrierScore(forecast, "POSITIVE");
      expect(res.brierScore).toBe(0.0);
      expect(res.calibrationRating).toBe("PERFECT");
    });

    it("Sai lệch hoàn toàn (Overconfidence): BS = 2.0, MISCALIBRATED", () => {
      const forecast = { prob_positive: 100, prob_neutral: 0, prob_worst: 0 };
      const res = calculateBrierScore(forecast, "WORST");
      expect(res.brierScore).toBe(2.0);
      expect(res.calibrationRating).toBe("MISCALIBRATED");
    });

    it("Dự báo hiệu chuẩn xuất sắc: BS <= 0.35, EXCELLENT", () => {
      const forecast = { prob_positive: 80, prob_neutral: 15, prob_worst: 5 };
      const res = calculateBrierScore(forecast, "POSITIVE");
      expect(res.brierScore).toBeCloseTo(0.065, 3);
      expect(res.calibrationRating).toBe("EXCELLENT");
    });
  });

  // --- 5. Workers & Queue Operations ---
  describe("5. Workers & Queue Operations", () => {
    it("purgeExpiredFleetingNotes: xóa cứng thẻ quá hạn 48h và giữ nguyên thẻ còn hạn", async () => {
      const db = await getDb();
      const userId = "00000000-0000-0000-0000-000000000001";

      // 1. Tạo 1 ghi chú quá hạn và 1 ghi chú còn hạn
      await db.query(
        `INSERT INTO fleeting_notes (user_id, raw_content, created_at, expires_at, status)
         VALUES ($1, 'Ghi chú đã quá hạn 48h', NOW() - INTERVAL '50 hours', NOW() - INTERVAL '2 hours', 'PENDING'),
                ($1, 'Ghi chú còn mới vừa tạo', NOW(), NOW() + INTERVAL '47 hours', 'PENDING')`,
        [userId]
      );

      // 2. Chạy hàm purge
      const purgeResult = await purgeExpiredFleetingNotes(db);
      expect(purgeResult.purgedCount).toBeGreaterThanOrEqual(1);

      // 3. Kiểm tra lại bảng: chỉ còn ghi chú chưa hết hạn
      const remaining = await db.query<{ raw_content: string }>(
        `SELECT raw_content FROM fleeting_notes WHERE user_id = $1 AND status = 'PENDING'`,
        [userId]
      );
      expect(remaining.rows.some((r) => r.raw_content === "Ghi chú còn mới vừa tạo")).toBe(true);
      expect(remaining.rows.some((r) => r.raw_content === "Ghi chú đã quá hạn 48h")).toBe(false);
    });

    it("processAuditReminder: thực thi thành công việc nhắc nhở hậu kiểm quyết định bị khóa", async () => {
      const db = await getDb();
      const userId = "00000000-0000-0000-0000-000000000001";

      const insertRes = await db.query<{ id: string }>(
        `INSERT INTO decision_journals (
          user_id, physio_emotional_state, problem_frame, rejected_alternatives,
          linked_zettel_uids, primary_thesis, prob_positive, prob_neutral, prob_worst,
          second_third_order_effects, is_locked
        ) VALUES (
          $1, '{"stress": 2}', 'Định khung bài toán...', '[{"a": 1}, {"b": 2}]',
          ARRAY['20261019120000'], 'Thesis', 50, 30, 20, '{"effects": 1}', TRUE
        ) RETURNING id`,
        [userId]
      );
      const journalId = insertRes.rows[0].id;

      const auditRes = await processAuditReminder(
        {
          journalId,
          userId,
          milestone: "30d",
          scheduledFor: new Date().toISOString(),
        },
        db
      );

      expect(auditRes.audited).toBe(true);
      expect(auditRes.milestone).toBe("30d");
    });
  });
});
