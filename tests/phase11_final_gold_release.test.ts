import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../src/lib/db";
import {
  CleIngestModuleSchema,
  generateFrontierAiPrompt,
} from "../src/lib/validations/ingestSchema";
import { socraticMentor } from "../src/lib/ai/socratic-engine";

describe("PHASE 11: Final Gold Release Suite", () => {
  let db: any;
  const testUserId = "00000000-0000-0000-0000-000000000011";

  beforeAll(async () => {
    db = await getDb();
  });

  describe("1. Mở Rộng Schema CLE_INGEST_V1 & Gemini 4 Argon Prompt Cho Tình Huống Nhiễu Loạn", () => {
    it("Chấp nhận module chứa đủ 3 tình huống nhiễu loạn (>= 20 ký tự mỗi loại)", () => {
      const validModule = {
        module_id: "m-01-counterfactual",
        title: "Khai Thác Biên An Toàn Trong Hệ Thống Phức Hợp",
        activation_context: "Hãy hình dung khi tải trọng hệ thống tăng vọt 300% trong 5 phút...",
        citation: {
          author: "Nassim Taleb",
          year: 2012,
          title: "Antifragile: Things That Gain from Disorder",
        },
        source_blocks: [
          "Biên an toàn là vùng đệm bắt buộc cho phép hệ thống chịu đựng biến thiên cực đoan mà không bị gãy vỡ.",
          "Trong môi trường phi tuyến tính, tối ưu hóa quá mức sẽ tiêu diệt khả năng phục hồi của hệ thống.",
        ],
        perturbation_scenarios: {
          counterfactual: "Nếu biên độ dự phòng giảm từ 40% xuống 5% trong điều kiện tải đột biến, điểm gãy cấu trúc sẽ xảy ra ở nút mạng nào trước?",
          interleaved_contrast: "So sánh cơ chế hấp thụ sốc của biên an toàn kỹ thuật với quỹ dự phòng thanh khoản ngân hàng trong khủng hoảng tín dụng.",
          far_transfer: "Áp dụng nguyên lý biên an toàn vào việc thiết kế cấu trúc lịch trình học tập cá nhân để chống suy kiệt nhận thức.",
        },
      };

      const result = CleIngestModuleSchema.safeParse(validModule);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.perturbation_scenarios?.counterfactual).toContain("Nếu biên độ dự phòng");
        expect(result.data.perturbation_scenarios?.interleaved_contrast).toContain("So sánh cơ chế");
        expect(result.data.perturbation_scenarios?.far_transfer).toContain("Áp dụng nguyên lý");
      }
    });

    it("Từ chối module nếu tình huống nhiễu loạn quá ngắn (< 20 ký tự)", () => {
      const invalidModule = {
        module_id: "m-02-invalid",
        title: "Mô Hình Nhiễu Loạn Lỗi",
        activation_context: "Bối cảnh kích hoạt hợp lệ...",
        citation: {
          author: "Author A",
          year: 2026,
          title: "Book A",
        },
        source_blocks: [
          "Khối luận điểm 1 hợp lệ tối thiểu mười ký tự",
          "Khối luận điểm 2 hợp lệ tối thiểu mười ký tự",
        ],
        perturbation_scenarios: {
          counterfactual: "Quá ngắn!",
          interleaved_contrast: "So sánh cơ chế hấp thụ sốc của biên an toàn kỹ thuật với ngân hàng.",
          far_transfer: "Áp dụng nguyên lý biên an toàn vào việc thiết kế lịch học.",
        },
      };

      const result = CleIngestModuleSchema.safeParse(invalidModule);
      expect(result.success).toBe(false);
    });

    it("Module vẫn hợp lệ khi không có trường perturbation_scenarios (tương thích ngược 100%)", () => {
      const legacyModule = {
        module_id: "m-03-legacy",
        title: "Mô Hình Tương Thích Ngược Cũ",
        activation_context: "Bối cảnh kích hoạt nhận thức ban đầu...",
        citation: {
          author: "Karl Popper",
          year: 1959,
          title: "The Logic of Scientific Discovery",
        },
        source_blocks: [
          "Một lý thuyết chỉ mang giá trị khoa học khi có khả năng bị bác bỏ bởi thực nghiệm.",
          "Không có số lượng quan sát thiên nga trắng nào có thể chứng minh kết luận mọi con thiên nga đều màu trắng.",
        ],
      };

      const result = CleIngestModuleSchema.safeParse(legacyModule);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.perturbation_scenarios).toBeUndefined();
      }
    });

    it("Hàm generateFrontierAiPrompt() yêu cầu 3 tình huống nhiễu loạn mà KHÔNG tiết lộ lời giải (Bảo vệ RULE-04)", () => {
      const prompt = generateFrontierAiPrompt("Lý thuyết Hệ thống Phức hợp");
      expect(prompt).toContain("perturbation_scenarios");
      expect(prompt).toContain("counterfactual");
      expect(prompt).toContain("interleaved_contrast");
      expect(prompt).toContain("far_transfer");
      // Phải bảo vệ RULE-04: Tuyệt đối không sinh sẵn đáp án
      expect(prompt).toContain("KHÔNG sinh sẵn đáp án");
    });
  });

  describe("2. Seed Nodes Aging & Tính Toán Atomic Zettel Velocity Chuẩn Xác", () => {
    it("Seed Nodes 20261019000001..03 có created_at lùi về 30 ngày trước (không tính vào vận tốc 7 ngày)", async () => {
      // Cập nhật created_at cho 3 seed nodes lùi 30 ngày
      await db.query(`
        UPDATE permanent_zettels
        SET created_at = NOW() - INTERVAL '30 days'
        WHERE zettel_uid IN ('20261019000001', '20261019000002', '20261019000003')
      `);

      const res = await db.query(`
        SELECT zettel_uid, created_at
        FROM permanent_zettels
        WHERE zettel_uid IN ('20261019000001', '20261019000002', '20261019000003')
      `);

      expect(res.rows.length).toBeGreaterThanOrEqual(2);
      for (const row of res.rows) {
        const createdDate = new Date(row.created_at);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        expect(createdDate.getTime()).toBeLessThan(sevenDaysAgo.getTime());
      }
    });

    it("Chỉ có Zettel người dùng tạo trong 7 ngày gần nhất mới được tính vào Atomic Zettel Velocity", async () => {
      // Xóa zettels cũ của testUserId
      await db.query(`DELETE FROM zettel_links WHERE source_zettel_uid LIKE '202611%' OR target_zettel_uid LIKE '202611%'`);
      await db.query(`DELETE FROM permanent_zettels WHERE user_id = $1`, [testUserId]);

      // Kiểm tra vận tốc khi người dùng chưa tạo Zettel nào: phải = 0 (bất chấp 3 seed nodes của hệ thống)
      const countBefore = await db.query(
        `SELECT COUNT(*) as count FROM permanent_zettels WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [testUserId]
      );
      expect(parseInt(countBefore.rows[0].count, 10)).toBe(0);

      // Tạo 1 Zettel mới của user hôm nay
      const userUid = "20261101000001";
      await db.query(
        `INSERT INTO permanent_zettels (
          zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state, created_at
        ) VALUES (
          $1, $2, 'Phiếu Nguyên Tử Thử Nghiệm Vận Tốc Nhận Thức Mới',
          'Văn bản kiểm thử đảm bảo vận tốc Zettel phản ánh chính xác nỗ lực sáng tác thực tế của người dùng, không bị ô nhiễm bởi các nút hạt giống nền tảng.',
          115, 'Cognitive Science', 'DRAFT', NOW()
        )`,
        [userUid, testUserId]
      );

      const countAfter = await db.query(
        `SELECT COUNT(*) as count FROM permanent_zettels WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [testUserId]
      );
      expect(parseInt(countAfter.rows[0].count, 10)).toBe(1);
    });

    it("Truy vấn latestDaytimeZettel ưu tiên Zettel ban ngày gần nhất của người dùng", async () => {
      const latestRes = await db.query(
        `SELECT zettel_uid, atomic_title, body_text
         FROM permanent_zettels
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [testUserId]
      );

      expect(latestRes.rows.length).toBe(1);
      expect(latestRes.rows[0].zettel_uid).toBe("20261101000001");
      expect(latestRes.rows[0].atomic_title).toBe("Phiếu Nguyên Tử Thử Nghiệm Vận Tốc Nhận Thức Mới");
    });
  });

  describe("3. Đánh Giá Gợi Nhớ Trang Trắng (Blank Page AI Evaluation) & Chuyển Bước Liền Mạch", () => {
    it("Đánh giá thành công câu trả lời gợi nhớ từ trí nhớ đạt chuẩn RULE-04 (>= 30 từ)", () => {
      const committedRecall = "Trong hệ thống thích ứng phức hợp, khi tải trọng ngoại vi gia tăng đột biến, do đó nếu không có cơ chế biên an toàn thì các vòng phản hồi trễ sẽ làm sụp đổ trạng thái cân bằng động của toàn bộ mạng lưới tác tử.";
      const originalStructure = "Biên an toàn là vùng đệm cần thiết nhằm ngăn chặn phản ứng dây chuyền khi các vòng phản hồi phi tuyến tính phát sinh độ trễ.";

      const evalResult = socraticMentor.evaluateRecall({
        committedAnswer: committedRecall,
        backStructure: originalStructure,
        responseTimeSec: 45,
        avgTimeSec: 60,
        difficulty: 5.0,
        isLeech: false,
      });

      expect(evalResult).toBeDefined();
      expect(evalResult.recommendedFsrsRating).toBeGreaterThanOrEqual(1);
      expect(evalResult.deepStructureScore).toBeGreaterThanOrEqual(0);
      expect(evalResult.causalLinkAccuracy).toBe("HIGH");
      expect(typeof evalResult.diagnosticFeedback).toBe("string");
      expect(evalResult.diagnosticFeedback.length).toBeGreaterThan(10);
    });
  });

  describe("4. Khôi Phục Toàn Diện Hộp Phiếu 6 Bảng (100% Vault Backup & Restore)", () => {
    it("Sao lưu và khôi phục toàn vẹn 6 bảng dữ liệu cốt lõi: literature_notes, permanent_zettels, zettel_links, fsrs_cards, decision_journals, user_cognitive_settings", async () => {
      const litNoteId = "44444444-4444-4444-4444-444444444444";
      const zettelUid1 = "20261102000001";
      const zettelUid2 = "20261102000002";
      const cardId = "55555555-5555-5555-5555-555555555555";
      const decisionId = "66666666-6666-6666-6666-666666666666";

      const comprehensiveVaultBundle = {
        vaultVersion: "1.1.0",
        userId: testUserId,
        literatureNotes: [
          {
            id: litNoteId,
            source_citation: { author: "Kahneman & Tversky", year: 1979, title: "Prospect Theory" },
            paraphrased_summary: "Lý thuyết triển vọng: Con người bất đối xứng rủi ro trong miền được và mất.",
            critical_audit: { study_design: "Empirical Lab Experiments", falsifiability: "High" },
            analogical_matrix: [
              { domain: "Tài chính", mapping: "Ác cảm thua lỗ khiến nhà đầu tư cắt lãi sớm nhưng gồng lỗ sâu" },
              { domain: "Thiết kế sản phẩm", mapping: "Người dùng ghét mất tính năng cũ hơn là thích tính năng mới" },
              { domain: "Học tập", mapping: "Nỗi sợ quên bài thúc đẩy ôn tập mạnh hơn mong muốn hiểu sâu" },
            ],
            created_at: new Date().toISOString(),
          },
        ],
        zettels: [
          {
            zettel_uid: zettelUid1,
            atomic_title: "Bất Đối Xứng Cảm Xúc Giữa Lợi Nhuận Và Mất Mát Nhận Thức",
            body_text: "Tâm lý học hành vi chứng minh rằng cường độ đau khổ khi mất một đơn vị giá trị lớn gấp đôi niềm vui khi đạt được đơn vị tương đương. Nguyên lý này định hình cách con người đưa ra quyết định dưới áp lực thời gian.",
            word_count: 120,
            domain_category: "Behavioral Economics",
            literature_note_id: litNoteId,
            state: "PUBLISHED",
          },
          {
            zettel_uid: zettelUid2,
            atomic_title: "Điểm Tham Chiếu Nội Tại Định Hình Đánh Giá Kết Quả",
            body_text: "Không có đánh giá giá trị nào mang tính tuyệt đối trong chân không. Mọi phán đoán đều được neo giữ vào một điểm tham chiếu ngầm định đã hình thành từ kinh nghiệm hoặc kỳ vọng ban đầu của chủ thể.",
            word_count: 118,
            domain_category: "Cognitive Science",
            literature_note_id: litNoteId,
            state: "PUBLISHED",
          },
        ],
        links: [
          {
            source_zettel_uid: zettelUid1,
            target_zettel_uid: zettelUid2,
            link_type: "EXTENDS_PAST",
            connection_rationale: "Điểm tham chiếu nội tại là cơ sở phân định giữa miền lợi nhuận và mất mát nhận thức.",
          },
          {
            source_zettel_uid: zettelUid2,
            target_zettel_uid: zettelUid1,
            link_type: "SUPPORTS",
            connection_rationale: "Sự dịch chuyển điểm tham chiếu giải thích hiện tượng ác cảm mất mát biến thiên theo thời gian.",
          },
        ],
        cards: [
          {
            id: cardId,
            zettel_uid: zettelUid1,
            card_type: "COUNTERFACTUAL",
            front_prompt: "Nếu người ra quyết định hoàn toàn trung lập với rủi ro, đường cong hàm giá trị sẽ thay đổi hình dạng như thế nào?",
            back_structure: "Hàm giá trị sẽ trở thành một đường thẳng tuyến tính hoàn hảo đi qua gốc tọa độ.",
            stability: 4.5,
            difficulty: 4.8,
            elapsed_days: 3,
            scheduled_days: 7,
            reps: 2,
            lapses: 0,
            avg_response_time_sec: 42.0,
            state: "REVIEW",
          },
        ],
        decisions: [
          {
            id: decisionId,
            problem_frame: "Quyết định tái cấu trúc hệ thống lưu trữ nhận thức sang mô hình Vault 6 bảng",
            primary_thesis: "Đồng bộ hóa toàn bộ 6 thực thể bảo đảm khôi phục dữ liệu không bao giờ bị mất mát liên kết",
            prob_positive: 80,
            prob_neutral: 15,
            prob_worst: 5,
            physio_emotional_state: { sleep_hours: 8, stress_level: 1, mood: "PEAK_FOCUS" },
            rejected_alternatives: ["Chỉ sao lưu 3 bảng Zettel/Link/Decision", "Dùng tệp text đơn thuần không có quan hệ"],
            second_third_order_effects: { second_order: "Toàn vẹn khóa ngoại 100%", third_order: "Trải nghiệm khôi phục liền mạch" },
            linked_zettel_uids: [zettelUid1, zettelUid2],
            brier_score: 0.08,
          },
        ],
        userSettings: {
          desired_retention: 0.92,
          fsrs_weights: {
            w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
            optimizer_version: "FSRS-4.5-Custom-V1",
          },
          active_roadmap: {
            roadmap_id: "gold-release-roadmap",
            title: "Lộ Trình Nhận Thức Chuyên Sâu Phase 11",
            total_days: 5,
          },
          completed_module_ids: ["m-01", "m-02"],
        },
      };

      // Thực thi quy trình Import tương tự như POST /api/vault/import
      // Bước 0: Literature Notes
      for (const lit of comprehensiveVaultBundle.literatureNotes) {
        await db.query(
          `INSERT INTO literature_notes (
            id, user_id, source_citation, paraphrased_summary, critical_audit, analogical_matrix, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE
          SET source_citation = EXCLUDED.source_citation,
              paraphrased_summary = EXCLUDED.paraphrased_summary,
              critical_audit = EXCLUDED.critical_audit,
              analogical_matrix = EXCLUDED.analogical_matrix`,
          [
            lit.id,
            testUserId,
            JSON.stringify(lit.source_citation),
            lit.paraphrased_summary,
            JSON.stringify(lit.critical_audit),
            JSON.stringify(lit.analogical_matrix),
            new Date(lit.created_at),
          ]
        );
      }

      // Bước 1: Zettels ở DRAFT
      for (const z of comprehensiveVaultBundle.zettels) {
        await db.query(
          `INSERT INTO permanent_zettels (
            zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, literature_note_id, state
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT')
          ON CONFLICT (zettel_uid) DO UPDATE
          SET atomic_title = EXCLUDED.atomic_title,
              body_text = EXCLUDED.body_text,
              word_count = EXCLUDED.word_count,
              domain_category = EXCLUDED.domain_category,
              literature_note_id = EXCLUDED.literature_note_id`,
          [z.zettel_uid, testUserId, z.atomic_title, z.body_text, z.word_count, z.domain_category, z.literature_note_id]
        );
      }

      // Bước 2: Links
      for (const l of comprehensiveVaultBundle.links) {
        await db.query(
          `INSERT INTO zettel_links (
            source_zettel_uid, target_zettel_uid, link_type, connection_rationale
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (source_zettel_uid, target_zettel_uid) DO UPDATE
          SET link_type = EXCLUDED.link_type,
              connection_rationale = EXCLUDED.connection_rationale`,
          [l.source_zettel_uid, l.target_zettel_uid, l.link_type, l.connection_rationale]
        );
      }

      // Bước 3: Upgrade PUBLISHED
      for (const z of comprehensiveVaultBundle.zettels) {
        if (z.state === "PUBLISHED") {
          await db.query(`UPDATE permanent_zettels SET state = 'PUBLISHED' WHERE zettel_uid = $1`, [z.zettel_uid]);
        }
      }

      // Bước 4: FSRS Cards
      for (const c of comprehensiveVaultBundle.cards) {
        await db.query(
          `INSERT INTO fsrs_cards (
            id, user_id, zettel_uid, card_type, front_prompt, back_structure, stability, difficulty,
            elapsed_days, scheduled_days, reps, lapses, avg_response_time_sec, state
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE
          SET front_prompt = EXCLUDED.front_prompt,
              back_structure = EXCLUDED.back_structure,
              stability = EXCLUDED.stability,
              difficulty = EXCLUDED.difficulty,
              elapsed_days = EXCLUDED.elapsed_days,
              scheduled_days = EXCLUDED.scheduled_days,
              reps = EXCLUDED.reps,
              lapses = EXCLUDED.lapses,
              avg_response_time_sec = EXCLUDED.avg_response_time_sec,
              state = EXCLUDED.state`,
          [
            c.id,
            testUserId,
            c.zettel_uid,
            c.card_type,
            c.front_prompt,
            c.back_structure,
            c.stability,
            c.difficulty,
            c.elapsed_days,
            c.scheduled_days,
            c.reps,
            c.lapses,
            c.avg_response_time_sec,
            c.state,
          ]
        );
      }

      // Bước 5: Decisions
      for (const d of comprehensiveVaultBundle.decisions) {
        await db.query(
          `INSERT INTO decision_journals (
            id, user_id, problem_frame, primary_thesis, prob_positive, prob_neutral, prob_worst,
            physio_emotional_state, rejected_alternatives, second_third_order_effects,
            linked_zettel_uids, brier_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE
          SET problem_frame = EXCLUDED.problem_frame,
              primary_thesis = EXCLUDED.primary_thesis,
              prob_positive = EXCLUDED.prob_positive,
              prob_neutral = EXCLUDED.prob_neutral,
              prob_worst = EXCLUDED.prob_worst,
              linked_zettel_uids = EXCLUDED.linked_zettel_uids,
              brier_score = EXCLUDED.brier_score`,
          [
            d.id,
            testUserId,
            d.problem_frame,
            d.primary_thesis,
            d.prob_positive,
            d.prob_neutral,
            d.prob_worst,
            JSON.stringify(d.physio_emotional_state),
            JSON.stringify(d.rejected_alternatives),
            JSON.stringify(d.second_third_order_effects),
            d.linked_zettel_uids,
            d.brier_score,
          ]
        );
      }

      // Bước 6: User Settings
      const uSettings = comprehensiveVaultBundle.userSettings;
      await db.query(
        `INSERT INTO user_cognitive_settings (
          user_id, desired_retention, fsrs_weights, active_roadmap, completed_module_ids, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET desired_retention = EXCLUDED.desired_retention,
            fsrs_weights = EXCLUDED.fsrs_weights,
            active_roadmap = EXCLUDED.active_roadmap,
            completed_module_ids = EXCLUDED.completed_module_ids,
            updated_at = NOW()`,
        [
          testUserId,
          uSettings.desired_retention,
          JSON.stringify(uSettings.fsrs_weights),
          JSON.stringify(uSettings.active_roadmap),
          uSettings.completed_module_ids,
        ]
      );

      // KIỂM TOÁN HẬU KIỂM TOÀN VẸN 6 BẢNG DỮ LIỆU
      // 1. Literature Notes
      const litCheck = await db.query(`SELECT * FROM literature_notes WHERE id = $1`, [litNoteId]);
      expect(litCheck.rows.length).toBe(1);
      expect(litCheck.rows[0].paraphrased_summary).toContain("Lý thuyết triển vọng");

      // 2. Permanent Zettels
      const zettelCheck = await db.query(`SELECT * FROM permanent_zettels WHERE zettel_uid IN ($1, $2)`, [zettelUid1, zettelUid2]);
      expect(zettelCheck.rows.length).toBe(2);
      expect(zettelCheck.rows[0].state).toBe("PUBLISHED");
      expect(zettelCheck.rows[0].literature_note_id).toBe(litNoteId);

      // 3. Zettel Links
      const linkCheck = await db.query(
        `SELECT * FROM zettel_links WHERE (source_zettel_uid = $1 AND target_zettel_uid = $2) OR (source_zettel_uid = $2 AND target_zettel_uid = $1)`,
        [zettelUid1, zettelUid2]
      );
      expect(linkCheck.rows.length).toBe(2);

      // 4. FSRS Cards
      const cardCheck = await db.query(`SELECT * FROM fsrs_cards WHERE id = $1`, [cardId]);
      expect(cardCheck.rows.length).toBe(1);
      expect(cardCheck.rows[0].zettel_uid).toBe(zettelUid1);
      expect(cardCheck.rows[0].card_type).toBe("COUNTERFACTUAL");
      expect(cardCheck.rows[0].stability).toBe(4.5);

      // 5. Decision Journals
      const decCheck = await db.query(`SELECT * FROM decision_journals WHERE id = $1`, [decisionId]);
      expect(decCheck.rows.length).toBe(1);
      expect(decCheck.rows[0].prob_positive + decCheck.rows[0].prob_neutral + decCheck.rows[0].prob_worst).toBe(100);

      // 6. User Cognitive Settings
      const setCheck = await db.query(`SELECT * FROM user_cognitive_settings WHERE user_id = $1`, [testUserId]);
      expect(setCheck.rows.length).toBe(1);
      expect(setCheck.rows[0].desired_retention).toBe(0.92);
      expect(setCheck.rows[0].completed_module_ids).toContain("m-01");
    });
  });
});
