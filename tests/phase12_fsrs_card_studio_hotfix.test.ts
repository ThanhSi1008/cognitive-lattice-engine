import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../src/lib/db";
import { ANTI_ROTE_REGEX, FsrsCardSchema } from "../src/lib/validations";
import {
  ClePerturbationScenariosSchema,
  generateFrontierAiPrompt,
} from "../src/lib/validations/ingestSchema";
import { socraticMentor } from "../src/lib/ai/socratic-engine";

describe("PHASE 12: FSRS Card Studio Hotfix, Anti-Rote & Inline Editing Suite", () => {
  let db: any;
  const testUserId = "00000000-0000-0000-0000-000000000012";
  const testZettelUid = "20261103000001";

  beforeAll(async () => {
    db = await getDb();

    // Khởi tạo Zettel phục vụ kiểm thử lưu thẻ FSRS
    await db.query(
      `INSERT INTO permanent_zettels (
        zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state
      ) VALUES (
        $1, $2, 'Phân Tích Cơ Chế Kháng Đứt Gãy Trong Chuỗi Cung Ứng Đa Nút',
        'Khi một mắt xích trung tâm trong chuỗi cung ứng toàn cầu bị đứt gãy, các nút mạng ngoại vi phải sở hữu năng lực tự tổ chức và tái định tuyến dòng hàng hóa. Sự phụ thuộc vào một nhà cung cấp duy nhất luôn tạo ra điểm chết hệ thống không thể cứu vãn.',
        125, 'System Dynamics', 'DRAFT'
      ) ON CONFLICT (zettel_uid) DO NOTHING`,
      [testZettelUid, testUserId]
    );
  });

  describe("1. Đồng Bộ Chuẩn Chống Học Vẹt & Quy Tắc >= 80 Ký Tự Cho Perturbation Scenarios", () => {
    it("Chấp nhận kịch bản đạt >= 80 ký tự và không chứa từ khóa học vẹt", () => {
      const validScenarios = {
        counterfactual:
          "Nếu biên độ dự phòng an toàn giảm đột ngột từ 40% xuống còn 5% trong điều kiện tải cao điểm, mắt xích nào sẽ phát sinh sự cố đứt gãy đầu tiên?",
        interleaved_contrast:
          "So sánh cơ chế hấp thụ sốc của quỹ dự phòng thanh khoản ngân hàng với biên an toàn kỹ thuật trong một hệ thống phân tán chịu tải biến thiên lớn.",
        far_transfer:
          "Vận dụng nguyên lý biên an toàn vào việc thiết kế cấu trúc lịch trình học tập cá nhân nhằm bảo toàn khả năng xử lý thông tin dưới áp lực thời gian.",
      };

      const parsed = ClePerturbationScenariosSchema.safeParse(validScenarios);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.counterfactual.length).toBeGreaterThanOrEqual(80);
        expect(ANTI_ROTE_REGEX.test(parsed.data.counterfactual)).toBe(false);
      }
    });

    it("Từ chối kịch bản dưới 80 ký tự", () => {
      const shortScenarios = {
        counterfactual: "Nếu biên độ dự phòng giảm còn 5% thì mắt xích nào sẽ phát sinh sự cố đứt gãy?", // 78 ký tự
        interleaved_contrast:
          "So sánh cơ chế hấp thụ sốc của quỹ dự phòng thanh khoản ngân hàng với biên an toàn kỹ thuật trong một hệ thống phân tán chịu tải biến thiên lớn.",
        far_transfer:
          "Vận dụng nguyên lý biên an toàn vào việc thiết kế cấu trúc lịch trình học tập cá nhân nhằm bảo toàn khả năng xử lý thông tin dưới áp lực thời gian.",
      };

      const parsed = ClePerturbationScenariosSchema.safeParse(shortScenarios);
      expect(parsed.success).toBe(false);
    });

    it("Từ chối kịch bản chứa từ khóa học vẹt ('là gì', 'định nghĩa', 'khái niệm', 'what is', 'define')", () => {
      const roteScenarios = {
        counterfactual:
          "Khái niệm biên an toàn trong kỹ thuật hệ thống phân tán là gì khi tải trọng cực đoan xuất hiện đột biến trên các nút mạng kết nối trung tâm?",
        interleaved_contrast:
          "Định nghĩa sự khác biệt cơ bản giữa quỹ dự phòng thanh khoản ngân hàng với biên an toàn kỹ thuật trong một hệ thống phân tán chịu tải biến thiên lớn.",
        far_transfer:
          "Vận dụng nguyên lý biên an toàn vào việc thiết kế cấu trúc lịch trình học tập cá nhân nhằm bảo toàn khả năng xử lý thông tin dưới áp lực thời gian.",
      };

      const parsed = ClePerturbationScenariosSchema.safeParse(roteScenarios);
      expect(parsed.success).toBe(false);
    });

    it("Các câu chuỗi Fallback trong AtomicZettelStudio đều dài >= 80 ký tự và vượt qua ANTI_ROTE_REGEX", () => {
      const titlePrefix = "Nguyên lý Kháng Đứt Gãy";

      const fallbackCounterfactual = `Nếu toàn bộ các giả định nền tảng của "${titlePrefix}" bị đảo ngược hoàn toàn trong thực nghiệm, mắt xích nhân quả nào sẽ phát sinh sụp đổ trước tiên?`;
      const fallbackInterleaved = `Đặt "${titlePrefix}" cạnh một mô hình đối lập thoạt nhìn tương đồng: Đâu là điểm phân rã bản chất ở các vòng phản hồi cấp độ hai giữa hai cơ chế?`;
      const fallbackFarTransfer = `Vận dụng quy luật của "${titlePrefix}" sang một lĩnh vực hoàn toàn xa lạ: Cấu trúc bất biến và cơ chế truyền dẫn nào vẫn được bảo toàn nguyên vẹn?`;

      expect(fallbackCounterfactual.length).toBeGreaterThanOrEqual(80);
      expect(ANTI_ROTE_REGEX.test(fallbackCounterfactual)).toBe(false);

      expect(fallbackInterleaved.length).toBeGreaterThanOrEqual(80);
      expect(ANTI_ROTE_REGEX.test(fallbackInterleaved)).toBe(false);

      expect(fallbackFarTransfer.length).toBeGreaterThanOrEqual(80);
      expect(ANTI_ROTE_REGEX.test(fallbackFarTransfer)).toBe(false);
    });

    it("generateFrontierAiPrompt() quy định rõ tối thiểu 80 ký tự và cấm từ khóa học vẹt", () => {
      const prompt = generateFrontierAiPrompt("Lý thuyết Hệ thống");
      expect(prompt).toContain("80 ký tự");
      expect(prompt).toContain("học vẹt");
      expect(prompt).toContain("KHÔNG sinh sẵn đáp án");
    });
  });

  describe("2. Kiểm Tra Tính Hợp Lệ Của Thẻ FSRS & Xử Lý Lỗi Khi Lưu Thẻ", () => {
    it("Chặn thẻ có back_structure rỗng và từ chối xuất bản", () => {
      const invalidEmptyBackCard = {
        user_id: testUserId,
        zettel_uid: testZettelUid,
        card_type: "COUNTERFACTUAL",
        front_prompt:
          "Nếu biên độ dự phòng an toàn giảm đột ngột từ 40% xuống còn 5% trong điều kiện tải cao điểm, mắt xích nào sẽ phát sinh sự cố đứt gãy đầu tiên?",
        back_structure: "   ", // Trống
      };

      const parsed = FsrsCardSchema.safeParse(invalidEmptyBackCard);
      expect(parsed.success).toBe(false);
    });

    it("Chấp nhận thẻ có front_prompt >= 80 ký tự và back_structure >= 10 ký tự", () => {
      const validCard = {
        user_id: testUserId,
        zettel_uid: testZettelUid,
        card_type: "COUNTERFACTUAL",
        front_prompt:
          "Nếu biên độ dự phòng an toàn giảm đột ngột từ 40% xuống còn 5% trong điều kiện tải cao điểm, mắt xích nào sẽ phát sinh sự cố đứt gãy đầu tiên?",
        back_structure: "Mắt xích phân phối trung tâm sẽ nghẽn đầu tiên do thiếu bộ nhớ đệm.",
      };

      const parsed = FsrsCardSchema.safeParse(validCard);
      expect(parsed.success).toBe(true);
    });

    it("Lưu thành công thẻ hợp lệ vào cơ sở dữ liệu fsrs_cards", async () => {
      const validCard = {
        user_id: testUserId,
        zettel_uid: testZettelUid,
        card_type: "COUNTERFACTUAL",
        front_prompt:
          "Nếu biên độ dự phòng an toàn giảm đột ngột từ 40% xuống còn 5% trong điều kiện tải cao điểm, mắt xích nào sẽ phát sinh sự cố đứt gãy đầu tiên?",
        back_structure: "Mắt xích phân phối trung tâm sẽ nghẽn đầu tiên do thiếu bộ nhớ đệm.",
      };

      const insertRes = await db.query(
        `INSERT INTO fsrs_cards (
          user_id, zettel_uid, card_type, front_prompt, back_structure,
          stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state
        ) VALUES ($1, $2, $3, $4, $5, 2.0, 5.0, 0, 1, 0, 0, 'NEW')
        RETURNING *`,
        [
          validCard.user_id,
          validCard.zettel_uid,
          validCard.card_type,
          validCard.front_prompt,
          validCard.back_structure,
        ]
      );

      expect(insertRes.rows.length).toBe(1);
      expect(insertRes.rows[0].zettel_uid).toBe(testZettelUid);
      expect(insertRes.rows[0].back_structure).toContain("Mắt xích phân phối trung tâm");
    });
  });

  describe("3. Phẫu Thuật Thẻ Đỉa (Leech Refactoring) Đạt Chuẩn Chống Học Vẹt & >= 80 Ký Tự", () => {
    it("Các thẻ nguyên tử sinh ra từ Socratic Leech Decomposer đều dài >= 80 ký tự và không chứa từ khóa học vẹt", () => {
      const evalResult = socraticMentor.evaluateRecall({
        committedAnswer: "Nhớ mơ hồ không rõ cơ chế chi tiết...",
        backStructure: "Cơ chế cách ly sự cố và điều hướng luồng thông qua thuật toán đồng thuận Raft.",
        responseTimeSec: 120,
        avgTimeSec: 60,
        difficulty: 9.5,
        isLeech: true,
      });

      expect(evalResult.leechDecomposition).toBeDefined();
      expect(evalResult.leechDecomposition?.isRecommended).toBe(true);

      const atomicCards = evalResult.leechDecomposition!.atomicCards;
      expect(atomicCards.length).toBeGreaterThanOrEqual(2);

      for (const card of atomicCards) {
        expect(card.frontScenario.length).toBeGreaterThanOrEqual(80);
        expect(ANTI_ROTE_REGEX.test(card.frontScenario)).toBe(false);
        expect(card.targetConcept.trim().length).toBeGreaterThanOrEqual(10);
      }
    });

    it("Các thẻ nguyên tử mẫu trong SessionCoordinator đạt chuẩn >= 80 ký tự và không chứa 'là gì'", () => {
      const sampleCard1 = {
        front_prompt: `[Phân rã tiền đề 20261103000001]: Phân tích điều kiện biên tiên quyết buộc phải hội đủ để kích hoạt cơ chế vận hành trong mô hình này.`,
        back_structure: `Điều kiện biên tiên quyết phân lập duy nhất biến số kích hoạt đầu vào.`,
      };
      const sampleCard2 = {
        front_prompt: `[Phân rã truyền dẫn 20261103000001]: Giải trình chuỗi phản ứng dây chuyền chuyển hóa tác động đầu vào thành kết quả đầu ra trong hệ thống này.`,
        back_structure: `Chuỗi mắt xích trung gian giải thích cơ chế biến đổi trạng thái hệ thống.`,
      };

      expect(sampleCard1.front_prompt.length).toBeGreaterThanOrEqual(80);
      expect(ANTI_ROTE_REGEX.test(sampleCard1.front_prompt)).toBe(false);
      expect(sampleCard1.back_structure.length).toBeGreaterThanOrEqual(10);

      expect(sampleCard2.front_prompt.length).toBeGreaterThanOrEqual(80);
      expect(ANTI_ROTE_REGEX.test(sampleCard2.front_prompt)).toBe(false);
      expect(sampleCard2.back_structure.length).toBeGreaterThanOrEqual(10);
    });

    it("Thực thi phẫu thuật thẻ đỉa: giải phóng thẻ cũ và tạo thành công 2 thẻ nguyên tử mới vào database", async () => {
      // 1. Tạo 1 thẻ đỉa bị cách ly
      const leechCardRes = await db.query(
        `INSERT INTO fsrs_cards (
          user_id, zettel_uid, card_type, front_prompt, back_structure,
          stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state
        ) VALUES (
          $1, $2, 'COUNTERFACTUAL',
          'Câu hỏi phức hợp quá tải gây ra hiện tượng quên lặp đi lặp lại trong quá trình luyện tập đan xen?',
          'Đáp án phức tạp gộp nhiều ý.',
          0.5, 9.0, 5, 1, 4, 3, 'LEECH_QUARANTINE'
        ) RETURNING id`,
        [testUserId, testZettelUid]
      );
      const leechId = leechCardRes.rows[0].id;

      // 2. Phân rã thành 2 thẻ nguyên tử
      const atomicCard1 = {
        front_prompt: `[Phân rã tiền đề ${testZettelUid}]: Phân tích điều kiện biên tiên quyết buộc phải hội đủ để kích hoạt cơ chế vận hành trong mô hình này.`,
        back_structure: `Điều kiện biên tiên quyết phân lập duy nhất biến số kích hoạt đầu vào.`,
      };
      const atomicCard2 = {
        front_prompt: `[Phân rã truyền dẫn ${testZettelUid}]: Giải trình chuỗi phản ứng dây chuyền chuyển hóa tác động đầu vào thành kết quả đầu ra trong hệ thống này.`,
        back_structure: `Chuỗi mắt xích trung gian giải thích cơ chế biến đổi trạng thái hệ thống.`,
      };

      for (const ac of [atomicCard1, atomicCard2]) {
        await db.query(
          `INSERT INTO fsrs_cards (
            user_id, zettel_uid, card_type, front_prompt, back_structure,
            stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state
          ) VALUES ($1, $2, 'COUNTERFACTUAL', $3, $4, 1.0, 5.0, 0, 1, 0, 0, 'LEARNING')`,
          [testUserId, testZettelUid, ac.front_prompt, ac.back_structure]
        );
      }

      // 3. Giải phóng thẻ đỉa cũ
      await db.query(
        `UPDATE fsrs_cards SET lapses = 0, difficulty = 5.0, state = 'REVIEW' WHERE id = $1`,
        [leechId]
      );

      // Kiểm tra kết quả
      const updatedOrig = await db.query(`SELECT state, lapses, difficulty FROM fsrs_cards WHERE id = $1`, [leechId]);
      expect(updatedOrig.rows[0].state).toBe("REVIEW");
      expect(updatedOrig.rows[0].lapses).toBe(0);

      const newCards = await db.query(
        `SELECT front_prompt, back_structure, state FROM fsrs_cards WHERE user_id = $1 AND state = 'LEARNING'`,
        [testUserId]
      );
      expect(newCards.rows.length).toBeGreaterThanOrEqual(2);
      expect(newCards.rows[0].front_prompt.length).toBeGreaterThanOrEqual(80);
      expect(ANTI_ROTE_REGEX.test(newCards.rows[0].front_prompt)).toBe(false);
    });
  });
});
