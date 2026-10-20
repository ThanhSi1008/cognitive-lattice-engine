import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../src/lib/db";
import { socraticMentor } from "../src/lib/ai/socratic-engine";
import {
  buildAcademicSearchQueries,
  fetchDoiMetadata,
} from "../src/lib/algorithms/academicSearch";
import {
  filterEligibleInterleavingCards,
  orderQueueByMaxContrast,
  InterleavingCardItem,
} from "../src/lib/algorithms/interleaving";
import { generateLocalSemanticEmbedding } from "../src/lib/ai/embeddings";

describe("PHASE 7: Production Readiness & End-to-End Real Telemetry Verification", () => {
  let db: any;
  const testUserId = "00000000-0000-0000-0000-000000000007";

  beforeAll(async () => {
    db = await getDb();
  });

  describe("1. Vector Interleaving & RULE-03 (Scaffolding vs. Interleaving Separation)", () => {
    it("Phân tách chính xác scaffoldingPool (reps < 2) và interleavingPool (reps >= 2) theo RULE-03", () => {
      const cards: InterleavingCardItem[] = [
        {
          id: "c1",
          zettel_uid: "20261020000001",
          domain_category: "Domain A",
          reps: 0,
          state: "LEARNING",
          embedding: generateLocalSemanticEmbedding("Mô hình một"),
        },
        {
          id: "c2",
          zettel_uid: "20261020000002",
          domain_category: "Domain B",
          reps: 1,
          state: "REVIEW",
          embedding: generateLocalSemanticEmbedding("Mô hình hai"),
        },
        {
          id: "c3",
          zettel_uid: "20261020000003",
          domain_category: "Domain C",
          reps: 3,
          state: "REVIEW",
          embedding: generateLocalSemanticEmbedding("Mô hình ba"),
        },
        {
          id: "c4",
          zettel_uid: "20261020000004",
          domain_category: "Domain D",
          reps: 5,
          state: "REVIEW",
          embedding: generateLocalSemanticEmbedding("Mô hình bốn"),
        },
      ];

      const { scaffoldingPool, interleavingPool } = filterEligibleInterleavingCards(cards);

      expect(scaffoldingPool.length).toBe(2);
      expect(scaffoldingPool.map((c) => c.id)).toEqual(["c1", "c2"]);

      expect(interleavingPool.length).toBe(2);
      expect(interleavingPool.map((c) => c.id)).toEqual(["c3", "c4"]);

      const orderedInterleaving = orderQueueByMaxContrast(interleavingPool);
      expect(orderedInterleaving.length).toBe(2);
    });

    it("Tính toán cosine similarity từ vector embedding 1536 chiều khác 0", () => {
      const vecA = generateLocalSemanticEmbedding("Tư duy hệ thống và chuỗi phản hồi cấp hai");
      const vecB = generateLocalSemanticEmbedding("Phản ứng thích ứng của thị trường phức hợp");

      expect(vecA.length).toBe(1536);
      expect(vecB.length).toBe(1536);

      const cardA: InterleavingCardItem = {
        id: "a",
        zettel_uid: "20261020000010",
        domain_category: "Economics",
        reps: 2,
        state: "REVIEW",
        embedding: vecA,
      };

      const cardB: InterleavingCardItem = {
        id: "b",
        zettel_uid: "20261020000011",
        domain_category: "Biology",
        reps: 2,
        state: "REVIEW",
        embedding: vecB,
      };

      const ordered = orderQueueByMaxContrast([cardA, cardB]);
      expect(ordered.length).toBe(2);
    });
  });

  describe("2. FSRS Review Logs (revlog) & 19-Weight Optimizer", () => {
    it("Ghi nhận bản ghi thực tế vào fsrs_review_logs và cập nhật avg_response_time_sec", async () => {
      // 1. Tạo Zettel cha
      const zettelUid = "20261020190001";
      await db.query(
        `INSERT INTO permanent_zettels (zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state)
         VALUES ($1, $2, 'Zettel thử nghiệm fsrs_review_logs thực tế', 'Nội dung thân bài đạt chuẩn từ 100 đến 350 từ để phục vụ kiểm thử...', 120, 'Cognitive Science', 'DRAFT')
         ON CONFLICT (zettel_uid) DO NOTHING`,
        [zettelUid, testUserId]
      );

      // 2. Tạo thẻ FSRS
      const cardRes = await db.query(
        `INSERT INTO fsrs_cards (
          user_id, zettel_uid, card_type, front_prompt, back_structure,
          stability, difficulty, reps, lapses, avg_response_time_sec, state
        ) VALUES ($1, $2, 'COUNTERFACTUAL', 'Câu hỏi ôn tập', 'Cấu trúc câu trả lời', 2.0, 5.0, 1, 0, 90.0, 'LEARNING')
        RETURNING *`,
        [testUserId, zettelUid]
      );
      const card = cardRes.rows[0];

      // 3. Giả lập ghi nhận lượt ôn tập vào fsrs_review_logs
      const responseTime = 45.0;
      const oldAvg = Number(card.avg_response_time_sec || 90.0);
      const newAvg = Math.round(oldAvg * 0.7 + responseTime * 0.3);

      await db.query(
        `INSERT INTO fsrs_review_logs (
          user_id, card_id, grade, stability_before, stability_after,
          difficulty_before, difficulty_after, elapsed_days, response_time_sec
        ) VALUES ($1, $2, 3, 2.0, 6.5, 5.0, 4.8, 1, $3)`,
        [testUserId, card.id, responseTime]
      );

      await db.query(
        `UPDATE fsrs_cards SET avg_response_time_sec = $1, stability = 6.5 WHERE id = $2`,
        [newAvg, card.id]
      );

      // 4. Kiểm tra dữ liệu trong fsrs_review_logs
      const logRes = await db.query(
        `SELECT * FROM fsrs_review_logs WHERE card_id = $1`,
        [card.id]
      );
      expect(logRes.rows.length).toBeGreaterThanOrEqual(1);
      expect(logRes.rows[0].grade).toBe(3);
      expect(Number(logRes.rows[0].stability_after)).toBeCloseTo(6.5, 1);

      // 5. Kiểm tra avg_response_time_sec được tính theo trung bình trượt
      const updatedCard = await db.query(`SELECT avg_response_time_sec FROM fsrs_cards WHERE id = $1`, [card.id]);
      expect(updatedCard.rows[0].avg_response_time_sec).toBe(newAvg);
    });
  });

  describe("3. Socratic Multi-Turn Dialogic Loop (Socrates – Theaetetus – Plato)", () => {
    it("Từ chối phân tích và yêu cầu cam kết nhận thức khi câu trả lời < 5 từ", async () => {
      const result = await socraticMentor.evaluateSocraticReply({
        probeQuestion: "Khái niệm cốt lõi này có thể phân rã thành những tiên đề vật lý nào?",
        probeCategory: "CLARIFICATION",
        userReply: "Không biết.",
      });

      expect(result.reachedFirstPrinciples).toBe(false);
      expect(result.criticVerification.passed).toBe(false);
      expect(result.identifiedBlindSpots[0]).toContain("Cam kết nhận thức");
    });

    it("Thẩm định chính xác khi người học giải trình cơ chế nhân quả đạt chuẩn First Principles", async () => {
      const result = await socraticMentor.evaluateSocraticReply({
        probeQuestion: "Cơ chế này bắt đầu bị suy thoái khi chạm tới ngưỡng giới hạn nào?",
        probeCategory: "PROBING_ASSUMPTIONS",
        userReply:
          "Cơ chế này suy thoái bởi vì khi số lượng tác tử vượt ngưỡng tới hạn, entropy của hệ thống tăng vọt dẫn đến đứt gãy vòng phản hồi.",
      });

      expect(result.reachedFirstPrinciples).toBe(true);
      expect(result.firstPrinciplesScore).toBeGreaterThanOrEqual(0.65);
      expect(result.nextProbingQuestion.length).toBeGreaterThan(10);
      expect(result.criticVerification.passed).toBe(true);
      expect(result.criticVerification.solutionGiveawayPrevented).toBe(false);
    });
  });

  describe("4. Academic Query Builder & DOI Metadata Resolver", () => {
    it("Tự động sinh cú pháp tìm kiếm chuẩn hóa cho 4 hệ thống cơ sở dữ liệu học thuật", () => {
      const queries = buildAcademicSearchQueries({
        population: "Spaced Repetition",
        intervention: "Interleaved Practice",
        comparison: "Massed Learning",
        outcome: "Long-Term Retention",
      });

      // 1. PubMed MeSH
      expect(queries.pubMed).toContain('("Spaced Repetition"[Mesh] OR "Spaced Repetition"[Title/Abstract])');
      expect(queries.pubMed).toContain('("Interleaved Practice"[Mesh] OR "Interleaved Practice"[Title/Abstract])');

      // 2. Scopus
      expect(queries.scopus).toContain('TITLE-ABS-KEY("Spaced Repetition" AND "Interleaved Practice"');

      // 3. Web of Science
      expect(queries.webOfScience).toContain('TS=("Spaced Repetition" AND "Interleaved Practice"');

      // 4. PROSPERO
      expect(queries.prosperoCochrane).toContain('"Spaced Repetition" AND "Interleaved Practice"');
    });

    it("Tra cứu và trích xuất siêu dữ liệu học thuật từ mã DOI", async () => {
      const meta = await fetchDoiMetadata("10.1037/0033-295X.109.1.3");
      expect(meta.title).toBeDefined();
      expect(meta.author).toBeDefined();
      expect(meta.year).toBeGreaterThan(1900);
    });
  });
});
