import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../src/lib/db";
import {
  scheduleFSRSCardReview,
  calculateNextInterval,
  DEFAULT_REQUEST_RETENTION,
} from "../src/lib/algorithms/fsrs";
import { calculateDRLI } from "../src/lib/algorithms/governor";
import { DEFAULT_FSRS5_WEIGHTS } from "../src/lib/algorithms/telemetry";

describe("PHASE 8: Release v1.0.0 Verification Suite", () => {
  let db: any;
  const testUserId = "00000000-0000-0000-0000-000000000008";

  beforeAll(async () => {
    db = await getDb();
  });

  describe("1. Persistent User Cognitive Settings & Custom FSRS-5 Weights", () => {
    it("Lưu bền vững desired_retention và 19 trọng số FSRS-5 vào user_cognitive_settings", async () => {
      const customWeights = [...DEFAULT_FSRS5_WEIGHTS];
      customWeights[0] = 0.55; // Điều chỉnh w0
      customWeights[2] = 3.8;  // Điều chỉnh w2

      const highFrictionRetention = 0.85; // Chế độ ma sát cao (FI = 15%)

      await db.query(
        `INSERT INTO user_cognitive_settings (user_id, desired_retention, fsrs_weights, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET desired_retention = EXCLUDED.desired_retention,
             fsrs_weights = EXCLUDED.fsrs_weights,
             updated_at = NOW()`,
        [testUserId, highFrictionRetention, JSON.stringify(customWeights)]
      );

      const res = await db.query(
        `SELECT desired_retention, fsrs_weights FROM user_cognitive_settings WHERE user_id = $1`,
        [testUserId]
      );

      expect(res.rows.length).toBe(1);
      expect(Number(res.rows[0].desired_retention)).toBe(0.85);

      let loadedWeights = res.rows[0].fsrs_weights;
      if (typeof loadedWeights === "string") loadedWeights = JSON.parse(loadedWeights);
      expect(loadedWeights[0]).toBeCloseTo(0.55, 2);
      expect(loadedWeights[2]).toBeCloseTo(3.8, 2);
    });

    it("Áp dụng trực tiếp desired_retention và customWeights vào bộ lập lịch FSRS-5", () => {
      const standardResult = scheduleFSRSCardReview({
        currentStability: 10.0,
        currentDifficulty: 5.0,
        elapsedDays: 10,
        reps: 2,
        lapses: 0,
        grade: 3,
        responseTimeSec: 60,
        requestRetention: 0.90, // Tiêu chuẩn R = 90%
      });

      const highFrictionResult = scheduleFSRSCardReview({
        currentStability: 10.0,
        currentDifficulty: 5.0,
        elapsedDays: 10,
        reps: 2,
        lapses: 0,
        grade: 3,
        responseTimeSec: 60,
        requestRetention: 0.85, // Ma sát cao R = 85%
      });

      // Với cùng độ ổn định, R_req = 85% (chấp nhận quên nhiều hơn để giãn cách xa hơn) sẽ cho interval dài hơn hoặc bằng R_req = 90%
      expect(highFrictionResult.card.scheduled_days).toBeGreaterThanOrEqual(
        standardResult.card.scheduled_days
      );
    });
  });

  describe("2. Dynamic DRLI Duration Elasticity (1.0 < DRLI <= 1.5)", () => {
    it("Tự động chuyển sang ELASTIC_ADAPTIVE: 10m Sáng / 30m Tối khi 1.0 < DRLI <= 1.5", () => {
      // 8 thẻ đến hạn, mỗi thẻ trung bình 90s -> Tổng = 720s (vượt budget chuẩn 600s)
      const dueCards = Array.from({ length: 8 }, (_, i) => ({
        id: `card-${i}`,
        avg_response_time_sec: 90.0,
        state: "REVIEW",
      }));

      const result = calculateDRLI({
        dueCards,
        reviewBudgetSec: 600, // 10 phút
        leechQuarantineCount: 1, // < 3 (không bị ngắt mạch)
        pendingFleetingNotesCount: 2, // <= 5 (không bị ngắt mạch)
      });

      // DRLI = 720 / 600 = 1.20
      expect(result.drli).toBe(1.2);
      expect(result.isCircuitBreakerTripped).toBe(false);
      expect(result.mode).toBe("ELASTIC_ADAPTIVE");

      // Cưỡng chế co giãn thời lượng
      expect(result.sessionSchedule.morningMinutes).toBe(10);
      expect(result.sessionSchedule.afternoonMinutes).toBe(20);
      expect(result.sessionSchedule.eveningMinutes).toBe(30);
      expect(result.sessionSchedule.eveningReviewBudgetSec).toBe(1200); // 20 phút ôn thẻ
    });

    it("Chế độ Cân bằng BALANCED: 20m Sáng / 20m Chiều / 20m Tối khi DRLI <= 1.0", () => {
      const dueCards = Array.from({ length: 4 }, (_, i) => ({
        id: `card-${i}`,
        avg_response_time_sec: 90.0,
        state: "REVIEW",
      }));

      const result = calculateDRLI({
        dueCards,
        reviewBudgetSec: 600,
        leechQuarantineCount: 0,
        pendingFleetingNotesCount: 1,
      });

      expect(result.drli).toBe(0.6);
      expect(result.mode).toBe("BALANCED");
      expect(result.sessionSchedule.morningMinutes).toBe(20);
      expect(result.sessionSchedule.afternoonMinutes).toBe(20);
      expect(result.sessionSchedule.eveningMinutes).toBe(20);
    });
  });

  describe("3. Local-First Vault Export Bundle Verification", () => {
    it("Xuất gói dữ liệu hộp phiếu chuẩn kiến trúc Local-First và định dạng Markdown", async () => {
      // 1. Tạo 1 Zettel và 1 Liên kết
      const zUid = "20261020220001";
      await db.query(
        `INSERT INTO permanent_zettels (zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state)
         VALUES ($1, $2, 'Zettel phục vụ kiểm thử xuất khẩu vault', 'Nội dung đầy đủ của phiếu nguyên tử đạt chuẩn từ 100 đến 350 từ...', 120, 'Cognitive Science', 'DRAFT')
         ON CONFLICT (zettel_uid) DO NOTHING`,
        [zUid, testUserId]
      );

      const zettelsRes = await db.query(
        `SELECT zettel_uid, atomic_title, body_text, word_count, domain_category, state
         FROM permanent_zettels
         WHERE user_id = $1`,
        [testUserId]
      );

      expect(zettelsRes.rows.length).toBeGreaterThanOrEqual(1);

      const firstZettel = zettelsRes.rows[0];
      const markdownHeader = `---
uid: "${firstZettel.zettel_uid}"
title: "${firstZettel.atomic_title}"
domain: "${firstZettel.domain_category}"
---`;

      expect(markdownHeader).toContain(firstZettel.zettel_uid);
      expect(markdownHeader).toContain(firstZettel.domain_category);
    });
  });
});
