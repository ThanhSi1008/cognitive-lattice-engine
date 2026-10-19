import { describe, it, expect } from "vitest";
import {
  calculateZettelVelocity,
  analyzeStabilityJumps,
  calibrateForgettingIndex,
  DEFAULT_FSRS5_WEIGHTS,
} from "../src/lib/algorithms/telemetry";

describe("PHASE 4: Cognitive Telemetry & Calibration", () => {
  describe("1. Atomic Zettel Velocity", () => {
    it("phân loại đúng OPTIMAL khi tốc độ nằm trong dải [3, 7] Zettels/tuần", () => {
      const v4 = calculateZettelVelocity(4);
      expect(v4.status).toBe("OPTIMAL");
      expect(v4.weeklyCount).toBe(4);

      const v7 = calculateZettelVelocity(7);
      expect(v7.status).toBe("OPTIMAL");
    });

    it("phân loại đúng UNDER_PACING khi tốc độ < 3 Zettels/tuần", () => {
      const v2 = calculateZettelVelocity(2);
      expect(v2.status).toBe("UNDER_PACING");
      expect(v2.statusMessage).toContain("Dưới mục tiêu");
    });

    it("cảnh báo COLLECTOR_FALLACY_RISK khi tốc độ vượt quá 7 Zettels/tuần", () => {
      const v9 = calculateZettelVelocity(9);
      expect(v9.status).toBe("COLLECTOR_FALLACY_RISK");
      expect(v9.statusMessage).toContain("Ngụy biện Tích trữ");
    });
  });

  describe("2. Memory Stability Jump Telemetry", () => {
    it("tính toán độ nhảy vọt ổn định trung bình ΔS và tỷ lệ trong vùng ma sát tối ưu", () => {
      const reviews = [
        { stabilityBefore: 10.0, stabilityAfter: 32.5, elapsedDays: 20, grade: 3 }, // delta = 22.5
        { stabilityBefore: 5.0, stabilityAfter: 15.0, elapsedDays: 10, grade: 3 },  // delta = 10.0
      ];

      const result = analyzeStabilityJumps(reviews);
      expect(result.averageDeltaS).toBe(16.3); // (22.5 + 10) / 2 = 16.25 ≈ 16.3
      expect(result.sampleCount).toBe(2);
      expect(result.lastJumpExample.fromDays).toBe(5.0);
      expect(result.lastJumpExample.toDays).toBe(15.0);
    });

    it("trả về giá trị mặc định chuẩn FSRS-5 khi chưa có dữ liệu", () => {
      const emptyResult = analyzeStabilityJumps([]);
      expect(emptyResult.averageDeltaS).toBe(22.5);
      expect(emptyResult.lastJumpExample.toDays).toBe(32.5);
    });
  });

  describe("3. Forgetting Index Calibration & Optimizer", () => {
    it("đánh giá đúng dải mục tiêu FI ∈ [8%, 12%] (Retention 90%)", () => {
      // 40 lapses / 400 revlogs = 10% (0.10) -> Trong dải mục tiêu
      const calibrated = calibrateForgettingIndex(400, 40);
      expect(calibrated.targetFI).toBe(0.10);
      expect(calibrated.targetRetention).toBe(0.90);
      expect(calibrated.currentFI).toBe(0.10);
      expect(calibrated.isWithinTargetRange).toBe(true);
      expect(calibrated.optimizerReady).toBe(true); // >= 400
    });

    it("báo optimizerReady = false nếu revlogs < 400", () => {
      const early = calibrateForgettingIndex(250, 25);
      expect(early.optimizerReady).toBe(false);
      expect(early.optimizerThreshold).toBe(400);
    });

    it("chứa đầy đủ 19 trọng số FSRS-5 mặc định và chỉ số giảm RMSE", () => {
      const fi = calibrateForgettingIndex(500, 50);
      expect(fi.weights.length).toBe(19);
      expect(fi.rmseReduction.sm2Rmse).toBe(0.105); // 10.5%
      expect(fi.rmseReduction.fsrs5Rmse).toBe(0.028); // 2.8%
    });
  });
});
