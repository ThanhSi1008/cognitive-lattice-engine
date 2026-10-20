import { describe, it, expect } from "vitest";
import {
  SocraticMentorAgent,
  SocraticCriticAgent,
  socraticMentor,
} from "../src/lib/ai/socratic-engine";
import {
  generateEmbedding,
  generateLocalSemanticEmbedding,
  cosineSimilarity,
} from "../src/lib/ai/embeddings";

describe("PHASE 5: Socratic Multi-Agent Engine & Cognitive Artifact Guardrails", () => {
  describe("1. Zero Cognitive Offloading & Critic Guardrails (Plato)", () => {
    const critic = new SocraticCriticAgent();

    it("Chặn truy vấn Socratic khi người học chưa có cam kết đầu ra (Zero Cognitive Offloading)", () => {
      const rawProbes = [
        {
          category: "CLARIFICATION" as const,
          categoryLabel: "Làm rõ",
          question: "Khái niệm này hoạt động thế nào?",
          cognitiveRationale: "Test",
        },
      ];

      // Khi người dùng chỉ nhập văn bản rỗng hoặc dưới 10 từ
      const result = critic.sanitizeAndValidateProbes(rawProbes, "Chưa biết gì");

      expect(result.solutionGiveawayPrevented).toBe(true);
      expect(result.probes[0].question).toContain("Hệ thống từ chối phân tích");
      expect(result.probes[0].cognitiveRationale).toContain("Zero Cognitive Offloading");
    });

    it("Loại bỏ hoàn toàn thiên kiến khen ngợi sáo rỗng (Over-Praise Elimination)", () => {
      const rawProbes = [
        {
          category: "PROBING_ASSUMPTIONS" as const,
          categoryLabel: "Thử thách giả định",
          question: "Tuyệt vời! Bạn đã hiểu đúng. Vậy điều kiện biên nào sẽ khiến cơ chế này sụp đổ?",
          cognitiveRationale: "Kiểm tra giả định",
        },
      ];

      const commitment = "Bộ đệm nhận thức giúp duy trì khả năng truy xuất dài hạn bằng cách phân tán thời gian học.";
      const result = critic.sanitizeAndValidateProbes(rawProbes, commitment);

      expect(result.overPraiseRemoved).toBe(true);
      expect(result.probes[0].question.toLowerCase()).not.toContain("tuyệt vời");
      expect(result.probes[0].question.toLowerCase()).not.toContain("bạn đã hiểu đúng");
      expect(result.probes[0].question).toContain("điều kiện biên nào sẽ khiến cơ chế này sụp đổ?");
    });

    it("Ngăn chặn tiết lộ sẵn đáp án trực tiếp (Solution Giveaway Guardrail)", () => {
      const rawProbes = [
        {
          category: "CLARIFICATION" as const,
          categoryLabel: "Làm rõ",
          question: "Đáp án là công thức R = (1 + 19 * t / S)^(-0.5) bạn nên ghi nhớ",
          cognitiveRationale: "Kiểm tra đáp án",
        },
      ];

      const commitment = "Tôi nghĩ đường cong trí nhớ giảm dần theo hàm số mũ nhưng chưa rõ công thức.";
      const result = critic.sanitizeAndValidateProbes(rawProbes, commitment);

      expect(result.solutionGiveawayPrevented).toBe(true);
      expect(result.probes[0].question).not.toContain("Đáp án là");
      expect(result.probes[0].question).toContain("điều kiện biên nào");
    });
  });

  describe("2. Mentor Agent: 5-Category Socratic Taxonomy", () => {
    it("Phiên Sáng: Sinh đủ 5 nhóm câu hỏi Socratic cho giả thuyết hợp lệ", () => {
      const hypothesis = "Việc học tập đan xen làm tăng độ ổn định trí nhớ thông qua sự phân biệt tương phản giữa các miền tri thức.";
      const result = socraticMentor.generateMorningProbes({
        hypothesisText: hypothesis,
        criticalAudit: {
          primaryConclusion: "Học đan xen vượt trội hơn học khối",
          riskOfBias: "Cỡ mẫu nhỏ và thiếu nhóm đối chứng ngẫu nhiên",
        },
      });

      expect(result.probes.length).toBe(5);
      const categories = result.probes.map((p) => p.category);
      expect(categories).toContain("CLARIFICATION");
      expect(categories).toContain("PROBING_ASSUMPTIONS");
      expect(categories).toContain("PROBING_EVIDENCE");
      expect(categories).toContain("IMPLICATIONS_CONSEQUENCES");
      expect(categories).toContain("ALTERNATIVE_VIEWPOINTS");

      // Kiểm tra câu hỏi bằng chứng tích hợp nguy cơ sai số
      const evidenceProbe = result.probes.find((p) => p.category === "PROBING_EVIDENCE");
      expect(evidenceProbe?.question).toContain("Cỡ mẫu nhỏ");
    });

    it("Phiên Chiều: Đánh giá độ trừu tượng của tiêu đề và cảnh báo ngữ cảnh hẹp", () => {
      // Tiêu đề hẹp dính công nghệ
      const narrowRes = socraticMentor.generateAfternoonProbes({
        atomicTitle: "Cách sử dụng hook React useEffect để gọi API",
        bodyText: "Trong ứng dụng web ta dùng useEffect để đồng bộ trạng thái khi component render lần đầu và cập nhật giao diện...",
      });
      expect(narrowRes.abstractnessEvaluation?.isOverlyDomainBound).toBe(true);
      expect(narrowRes.abstractnessEvaluation?.abstractnessScore).toBeLessThan(0.7);

      // Tiêu đề trừu tượng hóa chuẩn Zettelkasten
      const abstractRes = socraticMentor.generateAfternoonProbes({
        atomicTitle: "Đồng bộ hóa trạng thái bất đồng bộ dưới tác động của luồng biến thiên liên tục",
        bodyText: "Khi các biến số môi trường thay đổi liên tục, hệ thống cần cơ chế phân lập chu kỳ hiệu ứng phụ nhằm bảo toàn tính toàn vẹn trạng thái...",
      });
      expect(abstractRes.abstractnessEvaluation?.isOverlyDomainBound).toBe(false);
      expect(abstractRes.abstractnessEvaluation?.abstractnessScore).toBeGreaterThanOrEqual(0.7);
    });

    it("Phiên Chiều: Tự động sinh 3 kịch bản nhiễu loạn (Phản thực tế, Đan xen, Chuyển giao xa)", () => {
      const res = socraticMentor.generateAfternoonProbes({
        atomicTitle: "Giàn giáo thích ứng giảm tải nhận thức ngoại lai",
        bodyText: "Giàn giáo phân tầng giúp người học tập trung vào giải quyết vấn đề cốt lõi mà không bị áp đảo bởi các chi tiết vận hành chưa cần thiết.",
      });

      expect(res.scenarios).toBeDefined();
      expect(res.scenarios?.counterfactual).toContain("[PHẢN THỰC TẾ]");
      expect(res.scenarios?.interleavedContrast).toContain("[TƯƠNG PHẢN ĐAN XEN]");
      expect(res.scenarios?.farTransfer).toContain("[CHUYỂN GIAO XA]");
    });
  });

  describe("3. 1536-Dimensional Semantic Vector Embeddings", () => {
    it("Sinh vector 1536 chiều với độ dài chuẩn hóa L2 = 1.0", async () => {
      const res = await generateEmbedding("Động cơ nhận thức phân tầng và mạng lưới Zettelkasten");

      expect(res.dimensions).toBe(1536);
      expect(res.embedding.length).toBe(1536);

      // Kiểm tra chuẩn hóa L2: sum(v_i^2) ~ 1.0
      const normSq = res.embedding.reduce((acc, v) => acc + v * v, 0);
      expect(Math.abs(normSq - 1.0)).toBeLessThan(0.001);
    });

    it("Đo lường độ tương đồng cosine: Văn bản cùng chủ đề có tương đồng cao hơn chủ đề khác biệt", () => {
      const v1 = generateLocalSemanticEmbedding("Mô hình ghi nhớ ngắt quãng FSRS và độ ổn định trí nhớ");
      const v2 = generateLocalSemanticEmbedding("Độ ổn định trí nhớ và chu kỳ ôn tập ngắt quãng FSRS");
      const v3 = generateLocalSemanticEmbedding("Kỹ thuật nướng bánh mì và nhiệt độ lò nướng bánh ngọt");

      const simSimilar = cosineSimilarity(v1, v2);
      const simDissimilar = cosineSimilarity(v1, v3);

      expect(simSimilar).toBeGreaterThan(0.60);
      expect(simSimilar).toBeGreaterThan(simDissimilar);
    });
  });

  describe("4. Đánh giá Cấu Trúc Sâu & Bẻ Nhỏ Thẻ Đỉa (Leech Decomposer)", () => {
    it("Chấm điểm câu trả lời cam kết và đề xuất mức điểm FSRS khách quan", () => {
      const result = socraticMentor.evaluateRecall({
        committedAnswer:
          "Học đan xen giúp người học tăng khả năng phân biệt cơ chế vì nó kích hoạt vùng so sánh tương phản, do đó giảm sự nhầm lẫn giữa các mô hình tương đồng.",
        backStructure: "Cơ chế so sánh tương phản phân biệt giữa các mô hình và củng cố độ ổn định nhận thức.",
        responseTimeSec: 40,
        avgTimeSec: 60,
        difficulty: 4.5,
      });

      expect(result.deepStructureScore).toBeGreaterThanOrEqual(60);
      expect(result.causalLinkAccuracy).toBe("HIGH");
      expect([2, 3, 4]).toContain(result.recommendedFsrsRating);
    });

    it("Tự động kích hoạt Leech Decomposer khi thẻ rơi vào ngưỡng Leech Quarantine", () => {
      const result = socraticMentor.evaluateRecall({
        committedAnswer: "Tôi nhớ mang máng là có liên quan đến việc sắp xếp lại các bước nhưng quên mất quy luật nhân quả cụ thể.",
        backStructure: "Ba tiên đề bắt buộc của hệ thống phân tán gồm: Nhất quán, Sẵn sàng và Chịu lỗi phân vùng.",
        responseTimeSec: 95,
        avgTimeSec: 60,
        difficulty: 9.0,
        isLeech: true,
      });

      expect(result.deepStructureScore).toBeLessThan(50);
      expect(result.recommendedFsrsRating).toBe(1); // Again
      expect(result.leechDecomposition).toBeDefined();
      expect(result.leechDecomposition?.isRecommended).toBe(true);
      expect(result.leechDecomposition?.atomicCards.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("5. Rà Soát Thiên Kiến Quyết Định (Decision Redflags Scanner)", () => {
    it("Phát hiện Ngụy biện Chi phí Chìm và Bẫy Tư duy Nhị nguyên", () => {
      const result = socraticMentor.scanDecisionRedflags({
        problemFraming: "Dự án đã đầu tư 500 triệu và tiếc công sức cả năm qua nên phải tiếp tục mở rộng quy mô thị trường.",
        selectedOption: "Tiếp tục đổ thêm ngân sách và chắc chắn sẽ thành công không thể thất bại.",
        discardedOptions: [
          { alternative: "Dừng lại", rationale: "Không muốn thừa nhận thất bại" },
        ],
      });

      const biasNames = result.identifiedBiases.map((b) => b.name);
      expect(biasNames.some((n) => n.includes("Chi phí Chìm"))).toBe(true);
      expect(biasNames.some((n) => n.includes("Nhị Nguyên"))).toBe(true);
      expect(biasNames.some((n) => n.includes("Xác Nhận"))).toBe(true);
      expect(result.isHighRisk).toBe(true);
      expect(result.secondOrderConsequences.length).toBeGreaterThan(0);
      expect(result.thirdOrderConsequences.length).toBeGreaterThan(0);
    });
  });
});
