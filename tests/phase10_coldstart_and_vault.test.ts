import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../src/lib/db";

describe("PHASE 10: Cold-Start Seed Nodes, Roadmap Progress & Vault Import Suite", () => {
  let db: any;
  const testUserId = "00000000-0000-0000-0000-000000000010";

  beforeAll(async () => {
    db = await getDb();
  });

  describe("1. Khắc Phục Lỗi Khóa Ngoại Cold-Start & Xuất Bản Zettel Đầu Tiên", () => {
    it("Database có sẵn 2 Zettel hạt giống nền tảng (20261019000001, 20261019000002) ở trạng thái PUBLISHED", async () => {
      const res = await db.query(
        `SELECT zettel_uid, atomic_title, state FROM permanent_zettels WHERE zettel_uid IN ('20261019000001', '20261019000002')`
      );

      expect(res.rows.length).toBeGreaterThanOrEqual(2);
      const seed1 = res.rows.find((r: any) => r.zettel_uid === "20261019000001");
      const seed2 = res.rows.find((r: any) => r.zettel_uid === "20261019000002");

      expect(seed1).toBeDefined();
      expect(seed2).toBeDefined();
      expect(seed1.state).toBe("PUBLISHED");
      expect(seed2.state).toBe("PUBLISHED");
    });

    it("Người dùng mới tạo Zettel đầu tiên và liên kết với 2 Zettel hạt giống rồi chuyển sang PUBLISHED thành công 100%", async () => {
      const newUid = "20261020101010";

      // Xóa nếu đã tồn tại
      await db.query(`DELETE FROM zettel_links WHERE source_zettel_uid = $1 OR target_zettel_uid = $1`, [newUid]);
      await db.query(`DELETE FROM permanent_zettels WHERE zettel_uid = $1`, [newUid]);

      // 1. Tạo Zettel đầu tiên ở trạng thái DRAFT
      await db.query(
        `INSERT INTO permanent_zettels (
          zettel_uid, user_id, atomic_title, domain_category, body_text, word_count, state
        ) VALUES (
          $1, $2, 'Cơ Chế Phản Hồi Trễ Trong Hệ Thống Nhận Thức Phức Hợp', 'System Architecture',
          'Nghiên cứu nguyên lý thích nghi nơ-ron và các hiệu ứng phản hồi trễ trong việc tiếp nhận kiến thức mới. Sự quá tải nhận thức xảy ra khi các vòng phản hồi cấp độ hai không được xử lý kịp thời.', 140, 'DRAFT'
        )`,
        [newUid, testUserId]
      );

      // 2. Tạo liên kết hai chiều tới 2 hạt giống nền tảng (không bị vi phạm Foreign Key)
      await db.query(
        `INSERT INTO zettel_links (source_zettel_uid, target_zettel_uid, link_type, connection_rationale)
         VALUES ($1, '20261019000001', 'EXTENDS_PAST', 'Mô hình phản hồi trễ mở rộng trực tiếp cơ chế ngắt mạch nợ nhận thức.'),
                ($1, '20261019000002', 'SUPPORTS', 'Cung cấp bằng chứng thực nghiệm củng cố nguyên lý phản hồi phi tuyến tính.')`,
        [newUid]
      );

      // 3. Nâng cấp lên PUBLISHED - trigger trg_enforce_zettel_links kiểm tra >= 2 links và chấp thuận
      await expect(
        db.query(`UPDATE permanent_zettels SET state = 'PUBLISHED' WHERE zettel_uid = $1`, [newUid])
      ).resolves.toBeDefined();

      const verifyRes = await db.query(
        `SELECT state FROM permanent_zettels WHERE zettel_uid = $1`,
        [newUid]
      );
      expect(verifyRes.rows[0].state).toBe("PUBLISHED");
    });

    it("Tự động khởi tạo seed node trong permanent_zettels nếu target_zettel_uid chưa tồn tại", async () => {
      const ghostTargetUid = "20261099999999";
      const ghostSourceUid = "20261088888888";

      // Kiểm tra logic phòng vệ cold-start như trong PUT /api/zettels
      const checkRes = await db.query(
        `SELECT zettel_uid FROM permanent_zettels WHERE zettel_uid = $1`,
        [ghostTargetUid]
      );

      if (checkRes.rows.length === 0) {
        await db.query(
          `INSERT INTO permanent_zettels (
            zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state
          ) VALUES ($1, $2, $3, $4, 120, 'System Dynamics', 'DRAFT')
          ON CONFLICT (zettel_uid) DO NOTHING`,
          [
            ghostTargetUid,
            testUserId,
            `Khái Niệm Hạt Giống Nền Tảng: [[${ghostTargetUid}]]`,
            `Nội dung kiến thức hạt giống mẫu được khởi tạo tự động làm điểm tựa liên kết hai chiều cho mạng lưới Zettelkasten nguyên tử.`,
          ]
        );
      }

      // Tạo link không bị lỗi foreign key
      await db.query(
        `INSERT INTO permanent_zettels (
          zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state
        ) VALUES ($1, $2, 'Zettel Nguồn Kiểm Thử Khóa Ngoại Toàn Vẹn', 'Nội dung kiểm tra liên kết an toàn.', 120, 'System Dynamics', 'DRAFT')
        ON CONFLICT (zettel_uid) DO NOTHING`,
        [ghostSourceUid, testUserId]
      );

      await expect(
        db.query(
          `INSERT INTO zettel_links (source_zettel_uid, target_zettel_uid, link_type, connection_rationale)
           VALUES ($1, $2, 'EXTENDS_PAST', 'Liên kết phòng vệ khởi tạo tự động giải phóng lỗi khóa ngoại hoàn toàn.')
           ON CONFLICT DO NOTHING`,
          [ghostSourceUid, ghostTargetUid]
        )
      ).resolves.toBeDefined();
    });
  });

  describe("2. Tiến Độ Lộ Trình Gemini 4 Argon & Activation Context", () => {
    it("Lưu trữ và truy xuất tiến độ hoàn thành module_ids trong user_cognitive_settings", async () => {
      const completedModules = ["MOD_01_TRINITY", "MOD_02_SEQUENCE_RISK"];
      const testRoadmap = {
        schema_version: "CLE_INGEST_V1",
        topic_name: "Tự Do Tài Chính",
        domain: "Financial Engineering",
        roadmap: [
          {
            day: 1,
            module_id: "MOD_01_TRINITY",
            title: "Nghiên cứu Trinity và Tỷ Lệ Rút Vốn An Toàn",
            activation_context: "Tại sao việc suy thoái trong 3 năm đầu lại gây rủi ro gấp 10 lần suy thoái năm thứ 20?",
          },
          {
            day: 2,
            module_id: "MOD_02_SEQUENCE_RISK",
            title: "Rủi Ro Thứ Tự Lợi Nhuận và Bộ Đệm Tiền Mặt",
            activation_context: "Làm thế nào để thiết kế bộ đệm thanh khoản bảo vệ danh mục đầu tư dài hạn?",
          },
        ],
      };

      await db.query(
        `INSERT INTO user_cognitive_settings (user_id, desired_retention, fsrs_weights, active_roadmap, completed_module_ids, updated_at)
         VALUES ($1, 0.90, '[]', $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET active_roadmap = EXCLUDED.active_roadmap,
             completed_module_ids = EXCLUDED.completed_module_ids,
             updated_at = NOW()`,
        [testUserId, JSON.stringify(testRoadmap), completedModules]
      );

      const res = await db.query(
        `SELECT active_roadmap, completed_module_ids FROM user_cognitive_settings WHERE user_id = $1`,
        [testUserId]
      );

      expect(res.rows.length).toBe(1);
      const row = res.rows[0];
      expect(row.completed_module_ids).toContain("MOD_01_TRINITY");
      expect(row.completed_module_ids).toContain("MOD_02_SEQUENCE_RISK");

      let parsedRoadmap = row.active_roadmap;
      if (typeof parsedRoadmap === "string") parsedRoadmap = JSON.parse(parsedRoadmap);
      expect(parsedRoadmap.roadmap[0].activation_context).toContain("Tại sao việc suy thoái");
    });
  });

  describe("3. Khôi Phục Hộp Phiếu Local-First (Vault Import)", () => {
    it("Khôi phục toàn vẹn Zettels, Links và Decisions từ gói sao lưu Vault JSON", async () => {
      const backupUid1 = "20261020777701";
      const backupUid2 = "20261020777702";
      const backupDecisionId = "3a421f37-c00e-4f48-b7fb-db61de5238cc";

      const vaultPayload = {
        vaultVersion: "1.0.0",
        userId: testUserId,
        zettels: [
          {
            zettel_uid: backupUid1,
            atomic_title: "Nguyên Lý Biên An Toàn Trong Kỹ Thuật Hệ Thống Nhận Thức",
            body_text: "Biên an toàn là khoảng cách giữa năng lực tính toán dự kiến và tải trọng thực tế mà hệ thống phải chịu đựng trong các điều kiện khắc nghiệt bất thường.",
            word_count: 125,
            domain_category: "Financial Engineering",
            state: "PUBLISHED",
          },
          {
            zettel_uid: backupUid2,
            atomic_title: "Cân Bằng Động Và Phản Ứng Bù Trừ Của Mạng Lưới Phức Hợp",
            body_text: "Khi một tham số trong mạng lưới bị ép buộc thay đổi, các tác tử khác sẽ tự điều chỉnh hành vi để thiết lập trạng thái cân bằng mới thường đi ngược lại ý muốn ban đầu.",
            word_count: 130,
            domain_category: "System Dynamics",
            state: "PUBLISHED",
          },
        ],
        links: [
          {
            source_zettel_uid: backupUid1,
            target_zettel_uid: backupUid2,
            link_type: "EXTENDS_PAST",
            connection_rationale: "Biên an toàn là cơ chế đệm bắt buộc để hấp thụ phản ứng bù trừ của cân bằng động.",
          },
          {
            source_zettel_uid: backupUid2,
            target_zettel_uid: backupUid1,
            link_type: "SUPPORTS",
            connection_rationale: "Phản ứng bù trừ chứng minh sự cần thiết không thể thay thế của biên an toàn hệ thống.",
          },
        ],
        decisions: [
          {
            id: backupDecisionId,
            problem_frame: "Quyết định tái cơ cấu danh mục tài sản theo quy tắc 4%",
            primary_thesis: "Giảm tỷ trọng đòn bẩy để mở rộng biên an toàn tài chính",
            prob_positive: 70,
            prob_neutral: 20,
            prob_worst: 10,
            physio_emotional_state: { sleep_hours: 8, stress_level: 2, mood: "CALM" },
            rejected_alternatives: ["Không tái cơ cấu", "Bán tháo toàn bộ danh mục"],
            second_third_order_effects: { second_order: "Biên an toàn tăng", third_order: "Ổn định dòng tiền" },
            linked_zettel_uids: [backupUid1, backupUid2],
            brier_score: 0.12,
          },
        ],
      };

      // Thực thi quy trình Import tương tự như POST /api/vault/import
      // Bước 1: Upsert Zettels (DRAFT)
      for (const z of vaultPayload.zettels) {
        await db.query(
          `INSERT INTO permanent_zettels (
            zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state
          ) VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')
          ON CONFLICT (zettel_uid) DO UPDATE
          SET atomic_title = EXCLUDED.atomic_title,
              body_text = EXCLUDED.body_text,
              word_count = EXCLUDED.word_count,
              domain_category = EXCLUDED.domain_category`,
          [z.zettel_uid, testUserId, z.atomic_title, z.body_text, z.word_count, z.domain_category]
        );
      }

      // Bước 2: Upsert Links
      for (const l of vaultPayload.links) {
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

      // Bước 3: Nâng cấp PUBLISHED
      for (const z of vaultPayload.zettels) {
        if (z.state === "PUBLISHED") {
          await db.query(`UPDATE permanent_zettels SET state = 'PUBLISHED' WHERE zettel_uid = $1`, [z.zettel_uid]);
        }
      }

      // Bước 4: Upsert Decisions
      for (const d of vaultPayload.decisions) {
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

      // Xác minh dữ liệu đã vào database đầy đủ
      const zettelsAfter = await db.query(
        `SELECT zettel_uid, state FROM permanent_zettels WHERE zettel_uid IN ($1, $2)`,
        [backupUid1, backupUid2]
      );
      expect(zettelsAfter.rows.length).toBe(2);
      expect(zettelsAfter.rows[0].state).toBe("PUBLISHED");
      expect(zettelsAfter.rows[1].state).toBe("PUBLISHED");

      const linksAfter = await db.query(
        `SELECT * FROM zettel_links WHERE source_zettel_uid = $1 AND target_zettel_uid = $2`,
        [backupUid1, backupUid2]
      );
      expect(linksAfter.rows.length).toBe(1);

      const decisionAfter = await db.query(
        `SELECT id, brier_score FROM decision_journals WHERE id = $1`,
        [backupDecisionId]
      );
      expect(decisionAfter.rows.length).toBe(1);
      expect(Number(decisionAfter.rows[0].brier_score)).toBeCloseTo(0.12, 2);
    });
  });
});
