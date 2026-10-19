import { describe, it, expect } from "vitest";
import {
  countWords,
  ANTI_ROTE_REGEX,
  LearningSessionSchema,
  PreReadingHypothesisSchema,
  FleetingNoteSchema,
  LiteratureNoteSchema,
  PermanentZettelSchema,
  ZettelLinkSchema,
  FsrsCardSchema,
  CardRecallCommitSchema,
  DecisionJournalSchema,
} from "../src/lib/validations";

describe("CLE Zod Schemas & Invariant Validations", () => {
  // --- 1. Learning Session & Pre-Reading Gate ---
  describe("Learning Session & Pre-Reading Gate", () => {
    it("chấp nhận dự đoán đạt >= 50 từ ở Cổng Đoán Trước", () => {
      const validText = Array(50).fill("từ").join(" ");
      const res = PreReadingHypothesisSchema.safeParse({ hypothesis_text: validText });
      expect(res.success).toBe(true);
    });

    it("từ chối dự đoán dưới 50 từ ở Cổng Đoán Trước", () => {
      const shortText = Array(49).fill("từ").join(" ");
      const res = PreReadingHypothesisSchema.safeParse({ hypothesis_text: shortText });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("50 từ");
      }
    });

    it("chặn Phiên Chiều (s2_completed_at) nếu chưa đủ 4 giờ ủ Chế độ Phân tán", () => {
      const s1 = new Date("2026-10-19T08:00:00Z");
      const unlock = new Date("2026-10-19T12:00:00Z"); // +4h
      const s2Early = new Date("2026-10-19T10:00:00Z"); // mới 2h

      const res = LearningSessionSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        s1_completed_at: s1,
        incubation_unlock_at: unlock,
        s2_completed_at: s2Early,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("Neural Incubation Lock");
      }
    });

    it("cho phép Phiên Chiều khi đã qua đủ >= 4 giờ ủ", () => {
      const s1 = new Date("2026-10-19T08:00:00Z");
      const unlock = new Date("2026-10-19T12:00:00Z");
      const s2Valid = new Date("2026-10-19T13:00:00Z"); // 5h

      const res = LearningSessionSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        s1_completed_at: s1,
        incubation_unlock_at: unlock,
        s2_completed_at: s2Valid,
      });

      expect(res.success).toBe(true);
    });
  });

  // --- 2. Fleeting Notes ---
  describe("Fleeting Notes", () => {
    it("từ chối Fleeting Note có nội dung rỗng", () => {
      const res = FleetingNoteSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        raw_content: "   ",
      });
      expect(res.success).toBe(false);
    });

    it("chấp nhận Fleeting Note hợp lệ với status PENDING", () => {
      const res = FleetingNoteSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        raw_content: "Ý tưởng thoáng qua về cơ chế học tập đa miền",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.status).toBe("PENDING");
      }
    });
  });

  // --- 3. Literature Notes & Critical Audit Rubric ---
  describe("Literature Notes & Critical Audit Rubric", () => {
    const validAudit = {
      pico_frame: {
        population_or_context: "Người học người lớn tự điều chỉnh",
        intervention_or_mechanism: "Đan xen đa miền và lặp lại ngắt quãng",
        comparison_baseline: "Học tập dồn cục theo khối đơn miền",
        outcome_measured: "Tỷ lệ lưu giữ dài hạn và khả năng giải quyết vấn đề mới",
      },
      source_database: "PUBMED_MEDLINE" as const,
      study_design: "RCT" as const,
      risk_of_bias_assessment: {
        tool_used: "COCHRANE_ROB_2" as const,
        rating_or_score: "Low Risk",
        key_limitations: "Không thể làm mù hoàn toàn người tham gia do tính chất can thiệp hành vi",
      },
      falsifiability_condition: "Nếu việc đan xen làm giảm hiệu suất dài hạn trong bài test chuyển giao sau ba mươi ngày",
      sample_size_and_replicability: "Cỡ mẫu N = 1200 qua ba lần tái lập độc lập tại hai trường đại học khác nhau",
      counter_evidence_or_rival_model: "Nghiên cứu của tác giả X chỉ ra đan xen gây quá tải nhận thức ở người mới bắt đầu",
    };

    const validAnalogicalMatrix = [
      {
        domain_name: "Đầu tư Tài chính",
        surface_features: "Cổ phiếu, trái phiếu, thanh khoản thị trường",
        first_order_naive_reaction: "Đu đỉnh khi giá tăng mạnh và hoảng loạn bán tháo",
        second_order_systemic_mechanism: "Chu kỳ phản hồi tâm lý thị trường và định giá nội tại",
        structural_invariant_shared: "Phản hồi phi tuyến tính và cân bằng động",
      },
      {
        domain_name: "Chính sách Công",
        surface_features: "Thuế, trợ cấp, quy định hành chính",
        first_order_naive_reaction: "Áp giá trần để kiểm soát lạm phát trước mắt",
        second_order_systemic_mechanism: "Xuất hiện chợ đen và suy giảm sản lượng sản xuất",
        structural_invariant_shared: "Phản hồi phi tuyến tính và cân bằng động",
      },
      {
        domain_name: "Kiến trúc Phần mềm",
        surface_features: "Microservices, caching, queue, message broker",
        first_order_naive_reaction: "Thêm cache vào mọi service để tăng tốc độ",
        second_order_systemic_mechanism: "Mất tính nhất quán dữ liệu và stale cache cascade",
        structural_invariant_shared: "Phản hồi phi tuyến tính và cân bằng động",
      },
    ];

    it("chấp nhận Literature Note với summary 50-200 từ và analogical_matrix >= 3 miền", () => {
      const summary55Words = Array(55).fill("từ").join(" ");
      const res = LiteratureNoteSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        source_citation: {
          author: "Kornell & Bjork",
          year: 2008,
          title: "Learning concepts and categories: Is spacing the enemy of induction?",
        },
        paraphrased_summary: summary55Words,
        critical_audit: validAudit,
        analogical_matrix: validAnalogicalMatrix,
      });
      expect(res.success).toBe(true);
    });

    it("từ chối Literature Note có ít hơn 3 miền trong analogical_matrix", () => {
      const summary55Words = Array(55).fill("từ").join(" ");
      const res = LiteratureNoteSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        source_citation: { author: "Test", year: 2024, title: "Test Title" },
        paraphrased_summary: summary55Words,
        critical_audit: validAudit,
        analogical_matrix: validAnalogicalMatrix.slice(0, 2), // chỉ có 2 miền
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("tối thiểu 3 miền");
      }
    });

    it("từ chối Literature Note có summary ngoài khoảng 50-200 từ", () => {
      const shortSummary = Array(30).fill("từ").join(" ");
      const res = LiteratureNoteSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        source_citation: { author: "Test", year: 2024, title: "Test Title" },
        paraphrased_summary: shortSummary,
        critical_audit: validAudit,
        analogical_matrix: validAnalogicalMatrix,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("50 đến 200 từ");
      }
    });
  });

  // --- 4. Permanent Zettels ---
  describe("Permanent Zettels", () => {
    it("chấp nhận Zettel có độ dài 100-350 từ và tiêu đề mệnh đề hợp lệ", () => {
      const words = Array(150).fill("chữ").join(" ");
      const res = PermanentZettelSchema.safeParse({
        zettel_uid: "20261019153000",
        user_id: "00000000-0000-0000-0000-000000000001",
        atomic_title: "Ngắt mạch nợ nhận thức bảo toàn khả năng xử lý thông tin",
        body_text: words,
        word_count: 150,
        domain_category: "Cognitive Engineering",
      });
      expect(res.success).toBe(true);
    });

    it("từ chối Zettel có tiêu đề chứa dấu chấm hỏi (?)", () => {
      const words = Array(120).fill("chữ").join(" ");
      const res = PermanentZettelSchema.safeParse({
        zettel_uid: "20261019153000",
        user_id: "00000000-0000-0000-0000-000000000001",
        atomic_title: "Liệu ngắt mạch nợ nhận thức có tăng hiệu năng học?",
        body_text: words,
        word_count: 120,
        domain_category: "Cognitive Engineering",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("không được chứa dấu chấm hỏi");
      }
    });

    it("từ chối Zettel có số từ < 100 hoặc > 350", () => {
      const wordsUnder100 = Array(80).fill("chữ").join(" ");
      const res = PermanentZettelSchema.safeParse({
        zettel_uid: "20261019153000",
        user_id: "00000000-0000-0000-0000-000000000001",
        atomic_title: "Ngắt mạch nợ nhận thức bảo toàn khả năng xử lý thông tin",
        body_text: wordsUnder100,
        word_count: 80,
        domain_category: "Cognitive Engineering",
      });
      expect(res.success).toBe(false);
    });
  });

  // --- 5. Zettel Links ---
  describe("Zettel Links", () => {
    it("chấp nhận link hai chiều với connection_rationale >= 30 ký tự", () => {
      const res = ZettelLinkSchema.safeParse({
        source_zettel_uid: "20261019153000",
        target_zettel_uid: "20261019153001",
        link_type: "EXTENDS_PAST",
        connection_rationale: "Liên kết này mở rộng nguyên lý từ mô hình cũ với độ dài lớn hơn ba mươi ký tự",
      });
      expect(res.success).toBe(true);
    });

    it("từ chối tự liên kết (self-link)", () => {
      const res = ZettelLinkSchema.safeParse({
        source_zettel_uid: "20261019153000",
        target_zettel_uid: "20261019153000", // cùng UID
        link_type: "EXTENDS_PAST",
        connection_rationale: "Liên kết này mở rộng nguyên lý từ mô hình cũ với độ dài lớn hơn ba mươi ký tự",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("tự liên kết");
      }
    });

    it("từ chối connection_rationale < 30 ký tự", () => {
      const res = ZettelLinkSchema.safeParse({
        source_zettel_uid: "20261019153000",
        target_zettel_uid: "20261019153001",
        link_type: "EXTENDS_PAST",
        connection_rationale: "Quá ngắn",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("tối thiểu 30 ký tự");
      }
    });
  });

  // --- 6. FSRS Perturbation Cards ---
  describe("FSRS Perturbation Cards", () => {
    it("chặn câu hỏi định nghĩa bề mặt (Anti-Rote Regex: là gì, định nghĩa, khái niệm, what is)", () => {
      const badPrompt = "Khái niệm ngắt mạch nhận thức là gì và định nghĩa trong hệ thống CLE như thế nào?";
      expect(ANTI_ROTE_REGEX.test(badPrompt)).toBe(true);

      const res = FsrsCardSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        zettel_uid: "20261019153000",
        card_type: "COUNTERFACTUAL",
        front_prompt: badPrompt + " Câu hỏi này được kéo dài để trên tám mươi ký tự kiểm tra bộ lọc.",
        back_structure: "Cơ chế đáp án...",
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("Bộ lọc chống học vẹt");
      }
    });

    it("chấp nhận thẻ tình huống phản thực tế / tương phản đan xen", () => {
      const validPrompt = "Trong tình huống thị trường sụt giảm 40% thanh khoản đột ngột, nếu ngân hàng trung ương bơm tiền nhưng niềm tin tiêu dùng chạm đáy, cơ chế nào sẽ ngăn chặn sự phục hồi?";
      expect(ANTI_ROTE_REGEX.test(validPrompt)).toBe(false);

      const res = FsrsCardSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        zettel_uid: "20261019153000",
        card_type: "COUNTERFACTUAL",
        front_prompt: validPrompt,
        back_structure: "Bẫy thanh khoản và hiện tượng nghịch lý tiết kiệm...",
      });
      expect(res.success).toBe(true);
    });

    it("tự động chuyển sang LEECH_QUARANTINE nếu difficulty >= 8.5 hoặc lapses >= 3", () => {
      const validPrompt = "Trong tình huống thị trường sụt giảm 40% thanh khoản đột ngột, nếu ngân hàng trung ương bơm tiền nhưng niềm tin tiêu dùng chạm đáy, cơ chế nào sẽ ngăn chặn sự phục hồi?";
      const res = FsrsCardSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        zettel_uid: "20261019153000",
        card_type: "COUNTERFACTUAL",
        front_prompt: validPrompt,
        back_structure: "Bẫy thanh khoản...",
        difficulty: 8.7, // >= 8.5
        lapses: 1,
        state: "NEW",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.state).toBe("LEECH_QUARANTINE");
      }
    });
  });

  // --- 7. Decision Journal ---
  describe("Decision Journal", () => {
    it("chấp nhận Decision Journal có tổng 3 xác suất bằng 100% và problem_frame >= 40 từ", () => {
      const problemFrame42Words = Array(42).fill("từ").join(" ");
      const res = DecisionJournalSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        physio_emotional_state: {
          stress_level: 4,
          sleep_hours: 7.5,
          emotional_bias: "Overconfidence do chuỗi thắng gần đây",
        },
        problem_frame: problemFrame42Words,
        rejected_alternatives: [
          { alternative: "Duy trì kiến trúc monolithic", rationale_for_rejection: "Tắc nghẽn deploy" },
          { alternative: "Chuyển thẳng sang serverless", rationale_for_rejection: "Chi phí không lường trước" },
        ],
        linked_zettel_uids: ["20261019153000"],
        primary_thesis: "Tách modular monolith theo bounded context",
        prob_positive: 60,
        prob_neutral: 30,
        prob_worst: 10, // 60 + 30 + 10 = 100%
        second_third_order_effects: {
          short_term_opportunity_cost: "Thời gian refactor 2 tuần",
          second_order_5_weeks: "Tốc độ ship tính năng mới tăng 50%",
          third_order_5_months: "Onboarding kỹ sư mới dễ dàng hơn",
        },
      });
      expect(res.success).toBe(true);
    });

    it("từ chối nếu tổng 3 xác suất khác 100%", () => {
      const problemFrame42Words = Array(42).fill("từ").join(" ");
      const res = DecisionJournalSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        physio_emotional_state: {
          stress_level: 4,
          sleep_hours: 7.5,
          emotional_bias: "None",
        },
        problem_frame: problemFrame42Words,
        rejected_alternatives: [
          { alternative: "Alt 1", rationale_for_rejection: "Why 1" },
          { alternative: "Alt 2", rationale_for_rejection: "Why 2" },
        ],
        linked_zettel_uids: ["20261019153000"],
        primary_thesis: "Thesis",
        prob_positive: 50,
        prob_neutral: 30,
        prob_worst: 15, // 50 + 30 + 15 = 95 != 100
        second_third_order_effects: {
          short_term_opportunity_cost: "Cost",
          second_order_5_weeks: "2nd",
          third_order_5_months: "3rd",
        },
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("100%");
      }
    });

    it("từ chối nếu có dưới 2 phương án bị loại bỏ", () => {
      const problemFrame42Words = Array(42).fill("từ").join(" ");
      const res = DecisionJournalSchema.safeParse({
        user_id: "00000000-0000-0000-0000-000000000001",
        physio_emotional_state: { stress_level: 4, sleep_hours: 7.5, emotional_bias: "None" },
        problem_frame: problemFrame42Words,
        rejected_alternatives: [
          { alternative: "Chỉ có một phương án", rationale_for_rejection: "Lý do" },
        ],
        linked_zettel_uids: ["20261019153000"],
        primary_thesis: "Thesis",
        prob_positive: 50,
        prob_neutral: 30,
        prob_worst: 20,
        second_third_order_effects: {
          short_term_opportunity_cost: "Cost",
          second_order_5_weeks: "2nd",
          third_order_5_months: "3rd",
        },
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("tối thiểu 2 phương án");
      }
    });
  });
});
