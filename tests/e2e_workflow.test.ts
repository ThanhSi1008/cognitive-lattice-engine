import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../src/lib/db";
import { PRESET_MENTAL_MODELS } from "../src/lib/constants/presetMentalModels";
import { calculateBrierScore } from "../src/lib/algorithms/brier";

describe("PHASE 6: End-to-End SOP 60-Minute Business Workflow & Data Integrity", () => {
  const userId = "00000000-0000-0000-0000-000000000001";
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("1. Morning Cycle: Source Ingestion & Incubation Unlock Trigger", () => {
    it("Trình nạp tài liệu bóc tách đúng các khối luận điểm và khung PICO", () => {
      const model = PRESET_MENTAL_MODELS["HOWARD_MARKS_SECOND_ORDER"];
      expect(model).toBeDefined();
      expect(model.sourceBlocks.length).toBeGreaterThanOrEqual(3);
      expect(model.suggestedPrimaryClaim).toContain("Tư duy cấp độ hai");
      expect(model.criticalAuditDefaults.risk_of_bias_rating).toBe("LOW");
    });

    it("Lưu s1_hypothesis_text và kích hoạt Trigger trg_set_incubation_unlock đúng +4 giờ", async () => {
      // 1. Tạo session mới
      const sRes = await db.query(
        `INSERT INTO learning_sessions (user_id, date, drli_score)
         VALUES ($1, CURRENT_DATE, 0.4)
         RETURNING *`,
        [userId]
      );
      const sessionId = sRes.rows[0].id;

      // 2. Lưu giả thuyết cam kết trước khi mở khóa
      const hypText = "Tôi dự đoán cơ chế cấp độ hai yêu cầu tính toán phản ứng của các tác tử khác trong mạng lưới.";
      await db.query(
        `UPDATE learning_sessions SET s1_hypothesis_text = $1 WHERE id = $2`,
        [hypText, sessionId]
      );

      // 3. Hoàn thành Phiên Sáng -> Trigger trg_set_incubation_unlock phải tự cộng 4 giờ
      const s1Time = new Date("2026-10-20T08:00:00Z");
      await db.query(
        `UPDATE learning_sessions SET s1_completed_at = $1 WHERE id = $2`,
        [s1Time, sessionId]
      );

      const checkRes = await db.query(`SELECT * FROM learning_sessions WHERE id = $1`, [sessionId]);
      const updated = checkRes.rows[0];

      expect(updated.s1_hypothesis_text).toBe(hypText);
      expect(new Date(updated.s1_completed_at).toISOString()).toBe(s1Time.toISOString());

      const unlockTime = new Date(updated.incubation_unlock_at);
      const diffHours = (unlockTime.getTime() - s1Time.getTime()) / (1000 * 60 * 60);
      expect(Math.round(diffHours)).toBe(4);
    });
  });

  describe("2. Afternoon Cycle: Quy trình Xuất bản Zettel Chuẩn (DRAFT -> Links -> PUBLISHED)", () => {
    const zettelUid = "20261020160000";
    const targetUid1 = "20261020160001";
    const targetUid2 = "20261020160002";

    it("Chặn INSERT trực tiếp trạng thái PUBLISHED khi chưa có tối thiểu 2 liên kết (Trigger trg_enforce_zettel_links)", async () => {
      let threwError = false;
      try {
        await db.query(
          `INSERT INTO permanent_zettels (
            zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state
          ) VALUES ($1, $2, $3, $4, $5, $6, 'PUBLISHED')`,
          [
            "20261020999999",
            userId,
            "Tiêu đề nguyên tử chưa có bất kỳ liên kết hai chiều nào",
            "Nội dung thân bài nguyên tử đạt chuẩn từ 100 đến 350 từ để kiểm tra ràng buộc trigger...",
            120,
            "Cognitive Engineering",
          ]
        );
      } catch (err: any) {
        threwError = true;
        expect(err.message).toContain("VIOLATION");
      }
      expect(threwError).toBe(true);
    });

    it("Thực thi trọn vẹn quy trình: DRAFT -> Chèn 2 Links -> Nâng cấp PUBLISHED", async () => {
      // a. Tạo 2 target Zettels nháp trước
      await db.query(
        `INSERT INTO permanent_zettels (zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state)
         VALUES ($1, $3, $4, $5, 120, 'Domain A', 'DRAFT'),
                ($2, $3, $6, $5, 120, 'Domain B', 'DRAFT')
         ON CONFLICT (zettel_uid) DO NOTHING`,
        [
          targetUid1,
          targetUid2,
          userId,
          "Zettel mục tiêu liên kết số một nguyên tử",
          "Thân bài mẫu đạt độ dài chuẩn từ 100 đến 350 từ...",
          "Zettel mục tiêu liên kết số hai nguyên tử",
        ]
      );

      // b. Tạo Zettel chính ở trạng thái DRAFT
      await db.query(
        `INSERT INTO permanent_zettels (
          zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state
        ) VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')
        ON CONFLICT (zettel_uid) DO UPDATE SET state = 'DRAFT'`,
        [
          zettelUid,
          userId,
          "Quy trình phân tầng giàn giáo ngăn ngừa sụp đổ nhận thức",
          "Thân bài lập luận về cơ chế giàn giáo thích ứng trong hệ thống nhận thức phân tán...",
          125,
          "Cognitive Engineering",
        ]
      );

      // c. Chèn 2 liên kết hai chiều với rationale >= 30 ký tự
      await db.query(
        `INSERT INTO zettel_links (source_zettel_uid, target_zettel_uid, link_type, connection_rationale)
         VALUES ($1, $2, 'EXTENDS_PAST', 'Liên kết mở rộng cơ chế tiền đề trong quá khứ nhằm củng cố tính vững chắc.'),
                ($1, $3, 'SUPPORTS', 'Bổ trợ trực tiếp cho mô hình phân phối nguồn lực theo lý thuyết mạng lưới.')
         ON CONFLICT DO NOTHING`,
        [zettelUid, targetUid1, targetUid2]
      );

      // d. Cập nhật sang PUBLISHED -> Trigger xác nhận >= 2 liên kết và cho phép thành công!
      const updateRes = await db.query(
        `UPDATE permanent_zettels SET state = 'PUBLISHED' WHERE zettel_uid = $1 RETURNING *`,
        [zettelUid]
      );

      expect(updateRes.rows[0].state).toBe("PUBLISHED");
    });
  });

  describe("3. Evening Cycle: Excalidraw JSONB Storage & 1-Click Leech Refactoring", () => {
    it("Lưu cấu trúc s3_blank_recall_data (Excalidraw elements & text recall)", async () => {
      const eveningUserId = crypto.randomUUID();
      const sRes = await db.query(
        `INSERT INTO learning_sessions (user_id, date, drli_score)
         VALUES ($1, CURRENT_DATE, 0.5)
         RETURNING id`,
        [eveningUserId]
      );
      const sId = sRes.rows[0].id;

      const recallData = {
        canvasSketch: "[Excalidraw diagram with 4 elements]",
        textRecall: "Mô hình giàn giáo thích ứng yêu cầu tối thiểu 2 chu kỳ trước khi trộn đa miền.",
        excalidrawElements: [
          { type: "rectangle", x: 100, y: 150, width: 200, height: 80 },
          { type: "arrow", start: { x: 300, y: 190 }, end: { x: 450, y: 190 } },
        ],
      };

      await db.query(
        `UPDATE learning_sessions
         SET s3_blank_recall_data = $1, s3_completed_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(recallData), sId]
      );

      const check = await db.query(`SELECT * FROM learning_sessions WHERE id = $1`, [sId]);
      const session = check.rows[0];

      let storedRecall = session.s3_blank_recall_data;
      if (typeof storedRecall === "string") storedRecall = JSON.parse(storedRecall);

      expect(storedRecall.textRecall).toContain("giàn giáo thích ứng");
      expect(storedRecall.excalidrawElements.length).toBe(2);
    });

    it("Phẫu thuật thẻ đỉa (1-Click Leech Refactor): Bẻ nhỏ thẻ và giải phóng Quarantine", async () => {
      // Đảm bảo Zettel cha tồn tại
      await db.query(
        `INSERT INTO permanent_zettels (zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state)
         VALUES ('20261020160000', $1, 'Zettel cha phục vụ tách thẻ đỉa', 'Nội dung chuẩn 100 từ...', 120, 'Cognitive Science', 'DRAFT')
         ON CONFLICT (zettel_uid) DO NOTHING`,
        [userId]
      );

      // a. Tạo 1 thẻ rơi vào LEECH_QUARANTINE
      const cardRes = await db.query(
        `INSERT INTO fsrs_cards (
          user_id, zettel_uid, card_type, front_prompt, back_structure,
          stability, difficulty, lapses, state
        ) VALUES ($1, '20261020160000', 'COUNTERFACTUAL', 'Câu hỏi rườm rà gây quên nhiều lần', 'Đáp án phức tạp',
                  1.0, 9.2, 4, 'LEARNING')
        RETURNING *`,
        [userId]
      );

      // Trigger trg_auto_leech_quarantine tự động chuyển sang LEECH_QUARANTINE
      const quarantinedCard = cardRes.rows[0];
      expect(quarantinedCard.state).toBe("LEECH_QUARANTINE");

      // b. Thực hiện phẫu thuật bẻ nhỏ thành 2 thẻ nguyên tử
      const atomicCard1 = await db.query(
        `INSERT INTO fsrs_cards (user_id, zettel_uid, card_type, front_prompt, back_structure, stability, difficulty, lapses, state)
         VALUES ($1, $2, 'COUNTERFACTUAL', 'Nguyên tử 1: Tiền đề kích hoạt cơ chế là gì?', 'Biến số kích hoạt.', 1.0, 5.0, 0, 'LEARNING')
         RETURNING *`,
        [userId, quarantinedCard.zettel_uid]
      );

      const atomicCard2 = await db.query(
        `INSERT INTO fsrs_cards (user_id, zettel_uid, card_type, front_prompt, back_structure, stability, difficulty, lapses, state)
         VALUES ($1, $2, 'COUNTERFACTUAL', 'Nguyên tử 2: Chuỗi truyền dẫn nhân quả là gì?', 'Mắt xích trung gian.', 1.0, 5.0, 0, 'LEARNING')
         RETURNING *`,
        [userId, quarantinedCard.zettel_uid]
      );

      // c. Cập nhật giải phóng thẻ cũ
      await db.query(
        `UPDATE fsrs_cards SET lapses = 0, difficulty = 5.0, state = 'REVIEW' WHERE id = $1`,
        [quarantinedCard.id]
      );

      const checkOld = await db.query(`SELECT * FROM fsrs_cards WHERE id = $1`, [quarantinedCard.id]);
      expect(checkOld.rows[0].state).toBe("REVIEW");
      expect(checkOld.rows[0].lapses).toBe(0);
      expect(atomicCard1.rows[0].state).toBe("LEARNING");
      expect(atomicCard2.rows[0].state).toBe("LEARNING");
    });
  });

  describe("4. Decision Cycle: Khóa Bất Biến & Hậu Kiểm Brier Score Thực Tế", () => {
    it("Khóa bất biến chống Hindsight Bias và tính điểm Brier Score chính xác tại mốc +30 ngày", async () => {
      // 1. Tạo bản ghi nhật ký quyết định có is_locked = TRUE
      const insertRes = await db.query(
        `INSERT INTO decision_journals (
          user_id, physio_emotional_state, problem_frame, rejected_alternatives,
          linked_zettel_uids, primary_thesis, prob_positive, prob_neutral, prob_worst,
          second_third_order_effects, is_locked
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
        RETURNING *`,
        [
          userId,
          JSON.stringify({ stress_level: 4, sleep_hours: 7.5, emotional_bias: "Neutral" }),
          "Định khung vấn đề: Tối ưu hóa chu kỳ học tập hàng ngày bằng SOP 60 phút với giàn giáo thích ứng để triệt tiêu nợ nhận thức.",
          JSON.stringify([
            { alternative: "Phương án 1", rationale_for_rejection: "Lý do 1", linked_zettel_uid: "20261020160000" },
            { alternative: "Phương án 2", rationale_for_rejection: "Lý do 2", linked_zettel_uid: "20261020160001" },
          ]),
          ["20261020160000"],
          "Áp dụng triệt để mô hình FSRS-5 kết hợp Zettelkasten và ngắt mạch DRLI.",
          70, // 70% Tốt
          20, // 20% Trung tính
          10, // 10% Xấu
          JSON.stringify({
            short_term_opportunity_cost: "Thời gian 60 phút",
            second_order_5_weeks: "Tốc độ học x2",
            third_order_5_months: "Tư duy trực giác",
          }),
        ]
      );

      const decision = insertRes.rows[0];
      expect(decision.is_locked).toBe(true);

      // 2. Kiểm tra Trigger khóa bất biến: Cố tình sửa primary_thesis phải bị chặn
      let mutationBlocked = false;
      try {
        await db.query(
          `UPDATE decision_journals SET primary_thesis = 'Thay đổi luận điểm sau khi biết kết quả' WHERE id = $1`,
          [decision.id]
        );
      } catch (err: any) {
        mutationBlocked = true;
        expect(err.message).toContain("IMMUTABLE_RECORD_ERROR");
      }
      expect(mutationBlocked).toBe(true);

      // 3. Thực hiện Hậu Kiểm 30 Ngày với kết quả thực tế là POSITIVE
      const brierResult = calculateBrierScore(
        { prob_positive: 70, prob_neutral: 20, prob_worst: 10 },
        "POSITIVE"
      );

      // BS = (0.7 - 1)^2 + (0.2 - 0)^2 + (0.1 - 0)^2 = 0.09 + 0.04 + 0.01 = 0.14
      expect(brierResult.brierScore).toBeCloseTo(0.14, 4);
      expect(brierResult.calibrationRating).toBe("EXCELLENT");

      // 4. Cập nhật review_30d_data và brier_score (được Trigger cho phép)
      await db.query(
        `UPDATE decision_journals
         SET review_30d_data = $1, brier_score = $2
         WHERE id = $3`,
        [
          JSON.stringify({
            outcome: "POSITIVE",
            brierResult,
            reviewNotes: "Kết quả thực tế sau 30 ngày chứng minh tỷ lệ lưu giữ đạt 92%.",
            auditedAt: new Date().toISOString(),
          }),
          brierResult.brierScore,
          decision.id,
        ]
      );

      const checkAudit = await db.query(`SELECT * FROM decision_journals WHERE id = $1`, [decision.id]);
      expect(checkAudit.rows[0].brier_score).toBeCloseTo(0.14, 4);
    });
  });
});
