import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../src/lib/db";
import { scheduleFSRSCardReview } from "../src/lib/algorithms/fsrs";
import { ANTI_ROTE_REGEX, DecisionJournalSchema } from "../src/lib/validations";
import { calculateBrierScore } from "../src/lib/algorithms/brier";

describe("PHASE 13: Evening Session, Valid UUID Seed Cards & Complete Decision Journal Suite", () => {
  let db: any;
  const testUserId = "00000000-0000-0000-0000-000000000013";
  const seedCardId1 = "11111111-1111-4111-8111-111111111101";
  const seedCardId2 = "11111111-1111-4111-8111-111111111102";

  beforeAll(async () => {
    db = await getDb();
  });

  describe("1. Khởi Tạo 2 Thẻ FSRS Hạt Giống Hợp Lệ & Quy Trình Ôn Tập FSRS Không Lỗi UUID", () => {
    it("Database có sẵn 2 thẻ FSRS hạt giống với UUID hợp lệ và không chứa từ khóa học vẹt", async () => {
      const cardsRes = await db.query(
        `SELECT id, zettel_uid, card_type, front_prompt, back_structure, stability, difficulty, state
         FROM fsrs_cards
         WHERE id IN ($1, $2)`,
        [seedCardId1, seedCardId2]
      );

      expect(cardsRes.rows.length).toBe(2);

      const card1 = cardsRes.rows.find((c: any) => c.id === seedCardId1);
      const card2 = cardsRes.rows.find((c: any) => c.id === seedCardId2);

      expect(card1).toBeDefined();
      expect(card2).toBeDefined();

      expect(card1.front_prompt.length).toBeGreaterThanOrEqual(80);
      expect(ANTI_ROTE_REGEX.test(card1.front_prompt)).toBe(false);
      expect(card1.back_structure.length).toBeGreaterThanOrEqual(10);
      expect(card1.state).toBe("REVIEW");

      expect(card2.front_prompt.length).toBeGreaterThanOrEqual(80);
      expect(ANTI_ROTE_REGEX.test(card2.front_prompt)).toBe(false);
      expect(card2.back_structure.length).toBeGreaterThanOrEqual(10);
      expect(card2.state).toBe("REVIEW");
    });

    it("Chấm điểm ôn tập FSRS thành công, tính toán bước nhảy độ ổn định (ΔS) và ghi log vào fsrs_review_logs", async () => {
      const cardRes = await db.query(`SELECT * FROM fsrs_cards WHERE id = $1`, [seedCardId1]);
      expect(cardRes.rows.length).toBe(1);
      const card = cardRes.rows[0];

      const initialStability = Number(card.stability);
      const responseTimeSec = 42;

      // Tính toán lịch ôn tập FSRS-5
      const sched = scheduleFSRSCardReview({
        currentStability: initialStability,
        currentDifficulty: Number(card.difficulty),
        elapsedDays: Number(card.elapsed_days || 2),
        reps: Number(card.reps || 2),
        lapses: Number(card.lapses || 0),
        grade: 3, // Good
        responseTimeSec,
      });

      expect(sched.card.stability).toBeGreaterThan(initialStability);
      expect(sched.stabilityJump).toBeGreaterThan(0);
      expect(sched.card.scheduled_days).toBeGreaterThanOrEqual(1);

      // Cập nhật thẻ vào DB
      await db.query(
        `UPDATE fsrs_cards
         SET stability = $1,
             difficulty = $2,
             elapsed_days = $3,
             scheduled_days = $4,
             reps = $5,
             lapses = $6,
             state = $7,
             due_date = $8,
             last_review = $9
         WHERE id = $10`,
        [
          sched.card.stability,
          sched.card.difficulty,
          sched.card.elapsed_days,
          sched.card.scheduled_days,
          sched.card.reps,
          sched.card.lapses,
          sched.card.state,
          sched.card.due_date,
          sched.card.last_review,
          seedCardId1,
        ]
      );

      // Ghi log vào fsrs_review_logs với UUID hợp lệ
      await db.query(
        `INSERT INTO fsrs_review_logs (
          user_id, card_id, grade, stability_before, stability_after,
          difficulty_before, difficulty_after, elapsed_days, response_time_sec
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          card.user_id,
          seedCardId1,
          3,
          initialStability,
          sched.card.stability,
          card.difficulty,
          sched.card.difficulty,
          card.elapsed_days || 2,
          responseTimeSec,
        ]
      );

      // Kiểm tra log được lưu vĩnh viễn
      const logCheck = await db.query(
        `SELECT * FROM fsrs_review_logs WHERE card_id = $1 ORDER BY reviewed_at DESC LIMIT 1`,
        [seedCardId1]
      );
      expect(logCheck.rows.length).toBe(1);
      expect(Number(logCheck.rows[0].stability_after)).toBe(sched.card.stability);
      expect(Number(logCheck.rows[0].stability_before)).toBe(initialStability);
    });
  });

  describe("2. Mở Khóa Toàn Bộ Dữ Liệu Nhật Ký Quyết Định & Hậu Kiểm Brier Score", () => {
    const testDecisionId = "77777777-7777-4777-8777-777777777777";

    it("Lưu thành công hồ sơ quyết định đầy đủ second_third_order_effects, rejected_alternatives và linked_zettel_uids", async () => {
      const decisionPayload = {
        id: testDecisionId,
        user_id: testUserId,
        physio_emotional_state: {
          stress_level: 2,
          sleep_hours: 8.0,
          emotional_bias: "Cân bằng & Tỉnh táo (Neutral Rational)",
          context_notes: "Sau khi hoàn tất phiên học sáng và chiều tập trung cao độ",
        },
        problem_frame:
          "Quyết định tái cấu trúc danh mục tài sản cá nhân sang chiến lược phòng thủ đa lớp. Trong bối cảnh biến động kinh tế vĩ mô và lạm phát kéo dài, việc nắm giữ tiền mặt thuần túy tạo ra sự suy giảm sức mua âm thầm nhưng chấp nhận rủi ro quá mức lại vi phạm nguyên lý biên an toàn sống còn.",
        primary_thesis:
          "Phân bổ 60% vào tài sản phòng thủ có dòng tiền thực tế và 40% vào các cơ hội tăng trưởng bất đối xứng.",
        prob_positive: 70,
        prob_neutral: 20,
        prob_worst: 10,
        second_third_order_effects: {
          short_term_opportunity_cost: "Hy sinh lợi suất đầu cơ ngắn hạn và sự thỏa mãn tâm lý tức thời.",
          second_order_5_weeks: "Tâm lý đầu tư ổn định, giải phóng dung lượng bộ nhớ làm việc cho các dự án cốt lõi.",
          third_order_5_months: "Xây dựng bảng cân đối tài chính vững chắc trước mọi cú sốc thanh khoản vĩ mô.",
        },
        rejected_alternatives: [
          {
            alternative: "Phương án 1: Tiếp tục nắm giữ 100% tiền mặt gửi tiết kiệm kỳ hạn ngắn",
            rationale_for_rejection: "Bị xói mòn bởi lạm phát thực tế và chi phí cơ hội tài sản tăng trưởng",
            linked_zettel_uid: "20261019000001",
          },
          {
            alternative: "Phương án 2: Sử dụng đòn bẩy tài chính cao để tối đa hóa lợi nhuận kỳ vọng",
            rationale_for_rejection: "Vi phạm nghiêm trọng nguyên lý biên an toàn khi xuất hiện biến động ngoại vi",
            linked_zettel_uid: "20261019000002",
          },
        ],
        linked_zettel_uids: ["20261019000001", "20261019000002"],
        is_locked: true,
      };

      // Xác thực qua Zod Schema
      const validation = DecisionJournalSchema.safeParse(decisionPayload);
      expect(validation.success).toBe(true);

      // Lưu vào database
      await db.query(
        `INSERT INTO decision_journals (
          id, user_id, physio_emotional_state, problem_frame, primary_thesis,
          prob_positive, prob_neutral, prob_worst, second_third_order_effects,
          rejected_alternatives, linked_zettel_uids, is_locked
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING`,
        [
          decisionPayload.id,
          decisionPayload.user_id,
          JSON.stringify(decisionPayload.physio_emotional_state),
          decisionPayload.problem_frame,
          decisionPayload.primary_thesis,
          decisionPayload.prob_positive,
          decisionPayload.prob_neutral,
          decisionPayload.prob_worst,
          JSON.stringify(decisionPayload.second_third_order_effects),
          JSON.stringify(decisionPayload.rejected_alternatives),
          decisionPayload.linked_zettel_uids,
          decisionPayload.is_locked,
        ]
      );

      const checkRes = await db.query(`SELECT * FROM decision_journals WHERE id = $1`, [testDecisionId]);
      expect(checkRes.rows.length).toBe(1);
      const row = checkRes.rows[0];

      expect(row.is_locked).toBe(true);
      expect(row.prob_positive + row.prob_neutral + row.prob_worst).toBe(100);

      const effects = typeof row.second_third_order_effects === "string"
        ? JSON.parse(row.second_third_order_effects)
        : row.second_third_order_effects;
      expect(effects.short_term_opportunity_cost).toContain("Hy sinh lợi suất đầu cơ");
      expect(effects.second_order_5_weeks).toContain("Tâm lý đầu tư ổn định");
      expect(effects.third_order_5_months).toContain("Xây dựng bảng cân đối");

      const rejected = typeof row.rejected_alternatives === "string"
        ? JSON.parse(row.rejected_alternatives)
        : row.rejected_alternatives;
      expect(rejected.length).toBe(2);
      expect(rejected[0].alternative).toContain("Phương án 1");
    });

    it("Thực hiện hậu kiểm mốc +30 ngày và tính điểm Brier Score đa lớp", async () => {
      // Giả sử sau 30 ngày kịch bản POSITIVE xảy ra
      // Vector xác suất ban đầu: [0.70, 0.20, 0.10]
      // Kết quả thực tế: POSITIVE -> [1.0, 0.0, 0.0]
      // BS = (0.7 - 1)^2 + (0.2 - 0)^2 + (0.1 - 0)^2 = 0.09 + 0.04 + 0.01 = 0.14
      const brierResult = calculateBrierScore(
        { prob_positive: 70, prob_neutral: 20, prob_worst: 10 },
        "POSITIVE"
      );

      expect(brierResult.brierScore).toBeCloseTo(0.14, 2);
      expect(brierResult.calibrationRating).toBe("EXCELLENT");

      // Cập nhật hậu kiểm vào quyết định bị khóa (cho phép cập nhật review_30d_data và brier_score)
      const review30d = {
        outcome: "POSITIVE",
        brier_score: brierResult.brierScore,
        reviewed_at: new Date().toISOString(),
        notes: "Danh mục vận hành đúng biên an toàn dự kiến, hấp thụ tốt biến động ngắn hạn.",
      };

      await db.query(
        `UPDATE decision_journals
         SET review_30d_data = $1,
             brier_score = $2
         WHERE id = $3`,
        [JSON.stringify(review30d), brierResult.brierScore, testDecisionId]
      );

      const checkRes = await db.query(`SELECT brier_score, review_30d_data FROM decision_journals WHERE id = $1`, [testDecisionId]);
      expect(checkRes.rows.length).toBe(1);
      expect(Number(checkRes.rows[0].brier_score)).toBeCloseTo(0.14, 2);
    });
  });
});
