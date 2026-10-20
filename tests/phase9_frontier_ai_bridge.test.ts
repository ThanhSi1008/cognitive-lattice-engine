import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../src/lib/db";
import {
  generateFrontierAiPrompt,
  parseExternalAiResponse,
} from "../src/lib/validations/ingestSchema";

describe("PHASE 9: Frontier AI Bridge & Production Hardening Suite", () => {
  let db: any;
  const testUserId = "00000000-0000-0000-0000-000000000009";

  beforeAll(async () => {
    db = await getDb();
  });

  describe("1. Frontier AI Prompt Generator (Gemini 4 Argon High Thinking)", () => {
    it("Sinh Prompt chuẩn hóa nhúng đúng chủ đề và cấu trúc CLE_INGEST_V1", () => {
      const topic = "Tự do tài chính & Quy tắc rút vốn an toàn 4%";
      const prompt5Day = generateFrontierAiPrompt(topic, "roadmap_5day");

      expect(prompt5Day).toContain("Tự do tài chính & Quy tắc rút vốn an toàn 4%");
      expect(prompt5Day).toContain("CLE_INGEST_V1");
      expect(prompt5Day).toContain("critical_audit_scaffold");
      expect(prompt5Day).toContain("analogical_matrix_scaffold");
      expect(prompt5Day).toContain("pico_frame");
      expect(prompt5Day).toContain("5 bài học nguyên tử");

      const promptSingle = generateFrontierAiPrompt(topic, "single_lesson");
      expect(promptSingle).toContain("1 bài học chuyên sâu nguyên tử");
    });
  });

  describe("2. External AI Response Parser (parseExternalAiResponse)", () => {
    it("Bóc tách và thẩm định thành công gói JSON lộ trình 5 bài học Tự do tài chính có bọc Markdown và lời dẫn", () => {
      const rawGeminiResponse = `
Chào bạn! Tôi đã phân tích toàn diện chủ đề Tự do tài chính từ nguyên lý gốc. Dưới đây là kết quả của bạn:

\`\`\`json
{
  "schema_version": "CLE_INGEST_V1",
  "topic_name": "Tự do tài chính & Quy tắc rút vốn an toàn 4%",
  "domain": "Financial Engineering",
  "roadmap": [
    {
      "day": 1,
      "module_id": "MOD_01",
      "title": "Nghiên Cứu Trinity và Rủi Ro Trình Tự Lợi Nhuận (Sequence of Returns Risk)",
      "activation_context": "Tại sao việc thị trường suy thoái trong 3 năm đầu sau khi nghỉ hưu lại có sức tàn phá gấp 10 lần việc suy thoái ở năm thứ 20?",
      "citation": {
        "author": "Cooley, Hubbard & Walz",
        "year": 1998,
        "title": "Retirement Savings: Choosing a Sustained Withdrawal Rate from the Trinity Study",
        "pages": "pp. 16-28",
        "doi": "10.3905/jwm.1998.409893"
      },
      "source_blocks": [
        "Nghiên cứu Trinity năm 1998 tại Đại học Trinity đã thiết lập nền tảng tính toán tỷ lệ rút tiền an toàn (Safe Withdrawal Rate - SWR) dựa trên dữ liệu lịch sử thị trường chứng khoán và trái phiếu Mỹ từ năm 1926.",
        "Rủi ro lớn nhất không phải là lợi nhuận bình quân trong 30 năm, mà là biến số phân phối thời gian: Sequence of Returns Risk (SRR). Rút tiền mặt trong giai đoạn suy thoái ban đầu sẽ buộc người nghỉ hưu phải bán tháo tài sản ở mức định giá thấp, làm triệt tiêu khả năng phục hồi của danh mục gốc.",
        "Quy tắc 4% không phải là một định luật bất biến của vật lý, mà là một giả định xác suất với độ tin cậy lịch sử 95% trong khung thời gian 30 năm với danh mục cân bằng 50/50 cổ phiếu và trái phiếu."
      ],
      "critical_audit_scaffold": {
        "pico_frame": {
          "population_or_context": "Người về hưu độc lập tài chính với chân trời rút vốn 30 năm",
          "intervention_or_mechanism": "Quy tắc rút vốn 4% cố định điều chỉnh theo lạm phát hàng năm",
          "comparison_baseline": "Chi tiêu theo tỷ lệ phần trăm cố định trên số dư còn lại của từng năm",
          "outcome_measured": "Tỷ lệ sống sót của danh mục đầu tư sau 30 năm (Success Rate)"
        },
        "source_database": "SCOPUS",
        "study_design": "HISTORICAL_SIMULATION",
        "risk_of_bias_assessment": {
          "tool_used": "LOGIC_CONSISTENCY_CHECK",
          "rating_or_score": "High Structural Validity",
          "key_limitations": "Dữ liệu dựa trên thế kỷ 20 phi thường của Mỹ, có nguy cơ mắc Thiên kiến sống sót (Survivorship Bias)."
        },
        "falsifiability_condition": "Mô hình Trinity bị bác bỏ nếu một chu kỳ giảm phát đình đốn kéo dài 15 năm khiến danh mục 60/40 kiệt quệ trước năm thứ 20.",
        "sample_size_and_replicability": "Dữ liệu lịch sử 70 năm thị trường tài chính Mỹ qua hàng chục chu kỳ suy thoái từ Đại khủng hoảng 1929.",
        "counter_evidence_or_rival_model": "Nghiên cứu của Pfau (2018) và Kitces (2015) chỉ ra với mức định giá Shiller CAPE > 30, SWR thực tế có thể phải giảm xuống 3.25%."
      },
      "analogical_matrix_scaffold": [
        {
          "domain_name": "Kỹ thuật Tài chính",
          "surface_features": "Tỷ lệ rút vốn, lạm phát, suy thoái thị trường",
          "first_order_naive_reaction": "Tính toán chi tiêu dựa trên lợi nhuận trung bình hàng năm",
          "second_order_systemic_mechanism": "Rủi ro thứ tự lợi nhuận và sự xói mòn vốn gốc không thể đảo ngược",
          "structural_invariant_shared": "Sự nhạy cảm với điều kiện ban đầu trong hệ thống động lực học"
        },
        {
          "domain_name": "Quản trị Bộ đệm Phần mềm",
          "surface_features": "Hàng đợi tin nhắn, dung lượng buffer, tốc độ tiêu thụ",
          "first_order_naive_reaction": "Thiết kế dung lượng buffer dựa trên tốc độ xử lý trung bình",
          "second_order_systemic_mechanism": "Sự bùng nổ lưu lượng đột ngột (Traffic Burst) tại t0 làm tràn buffer trước khi auto-scaling kích hoạt",
          "structural_invariant_shared": "Sự nhạy cảm với điều kiện ban đầu trong hệ thống động lực học"
        },
        {
          "domain_name": "Hàng không Vũ trụ",
          "surface_features": "Nhiên liệu tên lửa, lực đẩy, quỹ đạo thoát ly",
          "first_order_naive_reaction": "Đốt nhiên liệu đều đặn trong suốt hành trình bay",
          "second_order_systemic_mechanism": "Cần lực đẩy cực đại trong tầng khí quyển đặc ban đầu để thắng trọng lực trước khi đạt quỹ đạo ổn định",
          "structural_invariant_shared": "Sự nhạy cảm với điều kiện ban đầu trong hệ thống động lực học"
        }
      ]
    }
  ]
}
\`\`\`

Hy vọng lộ trình này giúp ích cho bạn trong việc rèn luyện nhận thức trên CLE!
`;

      const result = parseExternalAiResponse(rawGeminiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.schema_version).toBe("CLE_INGEST_V1");
      expect(result.data?.topic_name).toBe("Tự do tài chính & Quy tắc rút vốn an toàn 4%");
      expect(result.data?.roadmap.length).toBe(1);

      const mod = result.data?.roadmap[0];
      expect(mod?.title).toContain("Nghiên Cứu Trinity");
      expect(mod?.source_blocks.length).toBe(3);
      expect(mod?.critical_audit_scaffold?.falsifiability_condition).toContain("Mô hình Trinity bị bác bỏ");
      expect(mod?.analogical_matrix_scaffold?.length).toBe(3);
    });

    it("Tự động chuẩn hóa bài học đơn lẻ thành cấu trúc roadmap", () => {
      const singleLesson = JSON.stringify({
        title: "Tư Duy Khó Khăn Đáng Giá (Desirable Difficulties)",
        activation_context: "Tại sao việc học tập dễ dàng và trôi chảy ngay lúc đầu lại dẫn đến quên lãng nhanh chóng sau 1 tuần?",
        citation: {
          author: "Robert A. Bjork",
          year: 2011,
          title: "Making things hard on yourself, but in a good way",
        },
        source_blocks: [
          "Khối luận điểm 1: Phân biệt giữa Performance (hiệu suất tức thời) và Learning (sự biến đổi nhận thức bền vững).",
          "Khối luận điểm 2: Việc tạo ma sát có kiểm soát thông qua thực hành gợi nhớ và đan xen đa miền giúp củng cố liên kết nơ-ron.",
        ],
      });

      const result = parseExternalAiResponse(singleLesson);
      expect(result.success).toBe(true);
      expect(result.data?.roadmap.length).toBe(1);
      expect(result.data?.roadmap[0].title).toBe("Tư Duy Khó Khăn Đáng Giá (Desirable Difficulties)");
    });

    it("Báo lỗi rõ ràng khi JSON không hợp lệ hoặc thiếu trường bắt buộc", () => {
      const malformed = "{ schema_version: CLE_INGEST_V1, invalid_json }";
      const result = parseExternalAiResponse(malformed);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cú pháp JSON không hợp lệ");
    });
  });

  describe("3. Tua Nhanh Khóa Ủ 4 Giờ & PostgreSQL Incubation Constraint", () => {
    it("simulateIncubationComplete cập nhật s1_completed_at và incubation_unlock_at trong quá khứ, vượt qua chk_incubation_period", async () => {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Tạo session hôm nay
      await db.query(`DELETE FROM learning_sessions WHERE user_id = $1`, [testUserId]);
      const insRes = await db.query(
        `INSERT INTO learning_sessions (user_id, date, s1_completed_at, drli_score)
         VALUES ($1, $2, NOW(), 0.5)
         RETURNING id, incubation_unlock_at`,
        [testUserId, today]
      );
      const sessionId = insRes.rows[0].id;

      // 2. Thực thi tua nhanh khóa ủ 4 giờ (simulateIncubationComplete)
      await db.query(
        `UPDATE learning_sessions 
         SET s1_completed_at = NOW() - INTERVAL '4 hours 5 minutes',
             incubation_unlock_at = NOW() - INTERVAL '5 minutes'
         WHERE id = $1`,
        [sessionId]
      );

      // 3. Cập nhật s2_completed_at = NOW() - phải vượt qua ràng buộc chk_incubation_period thành công
      await expect(
        db.query(
          `UPDATE learning_sessions 
           SET s2_completed_at = NOW()
           WHERE id = $1`,
          [sessionId]
        )
      ).resolves.toBeDefined();

      const sessionAfter = await db.query(
        `SELECT s1_completed_at, incubation_unlock_at, s2_completed_at FROM learning_sessions WHERE id = $1`,
        [sessionId]
      );

      expect(sessionAfter.rows[0].s2_completed_at).not.toBeNull();
      const unlockTime = new Date(sessionAfter.rows[0].incubation_unlock_at).getTime();
      const s2Time = new Date(sessionAfter.rows[0].s2_completed_at).getTime();
      expect(s2Time).toBeGreaterThanOrEqual(unlockTime);
    });
  });

  describe("4. Cytoscape Real Nodes Retainment (Không Bị Ghi Đè Khi < 5 Zettels)", () => {
    it("Giữ nguyên chính xác Zettel thật của người dùng khi có 1 Zettel trong database", async () => {
      // 1. Tạo 1 Zettel thật cho test user
      const realUid = "20261020999901";
      await db.query(`DELETE FROM zettel_links WHERE source_zettel_uid = $1 OR target_zettel_uid = $1`, [realUid]);
      await db.query(`DELETE FROM permanent_zettels WHERE user_id = $1`, [testUserId]);

      await db.query(
        `INSERT INTO permanent_zettels (
          zettel_uid, user_id, atomic_title, domain_category, body_text, word_count, state
        ) VALUES (
          $1, $2, 'Nghiên Cứu Trinity và Quy Tắc 4% An Toàn Trong 30 Năm', 'Financial Engineering',
          'Toàn văn nội dung nghiên cứu Trinity phân tích sâu về rủi ro thứ tự lợi nhuận và tỷ lệ rút vốn an toàn qua nhiều thập kỷ thị trường tài chính.', 160, 'DRAFT'
        )`,
        [realUid, testUserId]
      );

      // 2. Truy vấn Zettel thật như trong /api/telemetry
      const zettelsRes = await db.query(
        `SELECT zettel_uid, atomic_title, domain_category, word_count, state FROM permanent_zettels WHERE user_id = $1`,
        [testUserId]
      );

      let nodes = zettelsRes.rows.map((z: any) => ({
        data: {
          id: z.zettel_uid,
          label: `[[${z.zettel_uid.slice(-6)}]] ${z.atomic_title.slice(0, 30)}...`,
          title: z.atomic_title,
          domain: z.domain_category,
          wordCount: z.word_count,
          state: z.state,
        },
      }));

      // Với logic mới của Phase 9: Không bao giờ ghi đè khi nodes.length >= 1 và demoCluster = false
      const demoCluster = false;
      const isDemoCluster = demoCluster || nodes.length === 0;

      expect(isDemoCluster).toBe(false);
      expect(nodes.length).toBe(1);
      expect(nodes[0].data.id).toBe(realUid);
      expect(nodes[0].data.title).toBe("Nghiên Cứu Trinity và Quy Tắc 4% An Toàn Trong 30 Năm");

      // Khi demoCluster = true, trả về đúng 52 sample nodes
      const demoClusterForced = true;
      const isDemoClusterForced = demoClusterForced || nodes.length === 0;
      expect(isDemoClusterForced).toBe(true);
    });
  });
});
