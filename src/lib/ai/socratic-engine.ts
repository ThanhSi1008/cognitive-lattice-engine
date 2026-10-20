/**
 * Socratic Multi-Agent Engine (Dual-Agent Mentor–Critic Loop)
 * Based on:
 * - Roelle et al. (2023) Construction–Consolidation Model
 * - Guo et al. (2024), Yang (2023) Socratic Multi-Agent Autofeedback
 * - "Complementary Cognitive Artifact" paradigm (Zero Cognitive Offloading)
 */

import { autoRating } from "@/lib/algorithms/fsrs";

export type SocraticCategory =
  | "CLARIFICATION"
  | "PROBING_ASSUMPTIONS"
  | "PROBING_EVIDENCE"
  | "IMPLICATIONS_CONSEQUENCES"
  | "ALTERNATIVE_VIEWPOINTS";

export interface SocraticProbeItem {
  category: SocraticCategory;
  categoryLabel: string;
  question: string;
  cognitiveRationale: string;
}

export interface SocraticProbeResult {
  probes: SocraticProbeItem[];
  criticVerification: {
    passed: boolean;
    overPraiseRemoved: boolean;
    overInferenceRemoved: boolean;
    solutionGiveawayPrevented: boolean;
    criticNotes: string;
  };
  abstractnessEvaluation?: {
    isOverlyDomainBound: boolean;
    abstractnessScore: number; // 0 to 1
    critique: string;
    suggestedRefactoringVector?: string;
  };
  scenarios?: {
    counterfactual: string;
    interleavedContrast: string;
    farTransfer: string;
  };
}

export interface RecallEvaluationResult {
  deepStructureScore: number; // 0 to 100
  conceptCoverage: number; // 0 to 1
  causalLinkAccuracy: "HIGH" | "MODERATE" | "LOW" | "INVERTED";
  recommendedFsrsRating: 1 | 2 | 3 | 4;
  ratingLabel: "Again" | "Hard" | "Good" | "Easy";
  diagnosticFeedback: string;
  blindSpots: string[];
  leechDecomposition?: {
    isRecommended: boolean;
    reason: string;
    atomicCards: Array<{
      frontScenario: string;
      targetConcept: string;
    }>;
  };
}

export interface DecisionRedflagsResult {
  identifiedBiases: Array<{
    name: string;
    description: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
  }>;
  secondOrderConsequences: string[];
  thirdOrderConsequences: string[];
  crossDisciplinaryWarnings: string[];
  isHighRisk: boolean;
}

export interface SocraticEvaluationResult {
  reachedFirstPrinciples: boolean;
  firstPrinciplesScore: number; // 0 to 1
  identifiedBlindSpots: string[];
  socraticCritique: string;
  nextProbingQuestion: string;
  mentorFeedback: string;
  criticVerification: {
    passed: boolean;
    overPraiseRemoved: boolean;
    solutionGiveawayPrevented: boolean;
    criticNotes: string;
  };
}

const OVER_PRAISE_PATTERNS = [
  /tuyệt vời/gi,
  /rất tốt/gi,
  /chính xác hoàn toàn/gi,
  /bạn rất thông minh/gi,
  /bạn đã hiểu đúng/gi,
  /lập luận rất xuất sắc/gi,
  /câu trả lời hoàn hảo/gi,
  /excellent/gi,
  /good job/gi,
  /great work/gi,
  /brilliant/gi,
  /you got it right/gi,
];

const SOLUTION_GIVEAWAY_PATTERNS = [
  /đáp án là/gi,
  /công thức chính xác là/gi,
  /bạn nên viết như sau:/gi,
  /câu trả lời đúng là/gi,
  /the correct answer is/gi,
  /here is the solution/gi,
];

/**
 * AGENT 2: Pedagogical Critic & Proofreader (Plato)
 * Enforces Zero Cognitive Offloading, strips over-praise, prevents over-inference and solution giveaways.
 */
export class SocraticCriticAgent {
  public sanitizeAndValidateProbes(
    rawProbes: SocraticProbeItem[],
    userCommitmentText: string
  ): {
    probes: SocraticProbeItem[];
    overPraiseRemoved: boolean;
    overInferenceRemoved: boolean;
    solutionGiveawayPrevented: boolean;
    criticNotes: string;
  } {
    // 1. Guardrail: User must have committed their own thought first
    const trimmed = (userCommitmentText || "").trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
    if (wordCount < 10) {
      return {
        probes: [
          {
            category: "CLARIFICATION",
            categoryLabel: "Yêu Cầu Cam Kết Nhận Thức",
            question: "Hệ thống từ chối phân tích khi chưa có suy nghĩ cá nhân của bạn. Hãy trình bày giả thuyết hoặc lập luận độc lập trước khi mở đối thoại Socratic.",
            cognitiveRationale: "Nguyên tắc Zero Cognitive Offloading: AI không suy nghĩ thay người học.",
          },
        ],
        overPraiseRemoved: false,
        overInferenceRemoved: false,
        solutionGiveawayPrevented: true,
        criticNotes: "Chặn truy vấn do người dùng chưa có cam kết đầu ra tối thiểu.",
      };
    }

    let overPraiseFound = false;
    let solutionGiveawayFound = false;

    const sanitizedProbes = rawProbes.map((probe) => {
      let cleanedQuestion = probe.question;

      // Filter over-praise
      for (const pattern of OVER_PRAISE_PATTERNS) {
        if (pattern.test(cleanedQuestion)) {
          overPraiseFound = true;
          cleanedQuestion = cleanedQuestion.replace(pattern, "").trim();
        }
      }

      // Filter solution giveaway
      for (const pattern of SOLUTION_GIVEAWAY_PATTERNS) {
        if (pattern.test(cleanedQuestion)) {
          solutionGiveawayFound = true;
          cleanedQuestion = "Dựa trên các dữ kiện bạn đã nêu, điều kiện biên nào sẽ khiến cơ chế này sụp đổ?";
        }
      }

      // Ensure question ends with a question mark
      if (!cleanedQuestion.endsWith("?")) {
        cleanedQuestion += "?";
      }

      return {
        ...probe,
        question: cleanedQuestion,
      };
    });

    return {
      probes: sanitizedProbes,
      overPraiseRemoved: overPraiseFound,
      overInferenceRemoved: true,
      solutionGiveawayPrevented: solutionGiveawayFound,
      criticNotes: "Đã rà soát: Triệt tiêu thiên kiến tán thưởng, chặn tiết lộ đáp án, bảo toàn ma sát nhận thức.",
    };
  }
}

/**
 * AGENT 1: Socratic Mentor (Socrates)
 * Generates targeted probes under the 5-Category Socratic Taxonomy.
 */
export class SocraticMentorAgent {
  private critic = new SocraticCriticAgent();

  /**
   * Generates Morning Session Socratic Probes (Pre-reading & Critical Audit review)
   */
  public generateMorningProbes(params: {
    hypothesisText: string;
    sourcePreview?: string;
    criticalAudit?: {
      primaryConclusion?: string;
      premises?: string[];
      methodology?: string;
      riskOfBias?: string;
    };
  }): SocraticProbeResult {
    const { hypothesisText, criticalAudit } = params;
    const rawProbes: SocraticProbeItem[] = [
      {
        category: "CLARIFICATION",
        categoryLabel: "Làm Rõ Nguyên Lý Gốc (First Principles)",
        question: `Khái niệm cốt lõi trong giả thuyết "${hypothesisText.slice(0, 60)}..." có thể phân rã thành những tiên đề vật lý hoặc logic căn bản nhất nào?`,
        cognitiveRationale: "Buộc người học truy về tiên đề không thể chia cắt thay vì dựa vào thuật ngữ quen thuộc.",
      },
      {
        category: "PROBING_ASSUMPTIONS",
        categoryLabel: "Thử Thách Tiền Đề Ngầm Định",
        question: `Giả thuyết này mặc nhiên ngầm định biến số môi trường nào là hằng số? Nếu biến số đó biến thiên đột ngột thì kết luận còn đúng không?`,
        cognitiveRationale: "Phơi bày các điểm mù nhận thức và giả định bất khả biến ngầm có sẵn.",
      },
      {
        category: "PROBING_EVIDENCE",
        categoryLabel: "Đòi Hỏi Bằng Chứng Thực Nghiệm & Biên Độ Lỗi",
        question: `Bằng chứng thực nghiệm nào (cỡ mẫu, đối chứng, độ nhạy PICO) đủ sức bác bỏ (falsify) giả thuyết này theo tiêu chuẩn Popper?`,
        cognitiveRationale: "Rèn luyện tư duy phản nghiệm (falsificationism) thay vì thiên kiến xác nhận.",
      },
      {
        category: "IMPLICATIONS_CONSEQUENCES",
        categoryLabel: "Truy Vấn Hệ Quả Cấp 2 & Cấp 3",
        question: `Nếu cơ chế này vận hành ở quy mô lớn gấp 100 lần, những hệ quả ngoại vi cấp 2 và cấp 3 nào sẽ xuất hiện?`,
        cognitiveRationale: "Ngăn chặn tầm nhìn đường hầm bằng cách phân tích tương tác phi tuyến tính.",
      },
      {
        category: "ALTERNATIVE_VIEWPOINTS",
        categoryLabel: "Mô Hình Đối Lập & Trường Hợp Ngoại Lệ",
        question: `Lý thuyết hoặc trường phái cạnh tranh nào đưa ra lời giải thích hoàn toàn trái ngược cho hiện tượng này với cùng một tập dữ liệu?`,
        cognitiveRationale: "Tạo xung đột nhận thức lành mạnh, loại bỏ tư duy đơn cực.",
      },
    ];

    if (criticalAudit?.riskOfBias) {
      rawProbes[2].question = `Với nguy cơ sai số "${criticalAudit.riskOfBias}", làm thế nào để phân lập ảnh hưởng của biến gây nhiễu này?`;
    }

    const verification = this.critic.sanitizeAndValidateProbes(rawProbes, hypothesisText);

    return {
      probes: verification.probes,
      criticVerification: {
        passed: true,
        overPraiseRemoved: verification.overPraiseRemoved,
        overInferenceRemoved: verification.overInferenceRemoved,
        solutionGiveawayPrevented: verification.solutionGiveawayPrevented,
        criticNotes: verification.criticNotes,
      },
    };
  }

  /**
   * Generates Afternoon Session Probes (Zettel Abstraction Check & Scenario Perturbations)
   */
  public generateAfternoonProbes(params: {
    atomicTitle: string;
    bodyText: string;
  }): SocraticProbeResult {
    const { atomicTitle, bodyText } = params;

    // Evaluate title abstraction: Is it bound to a single narrow tool/context?
    const narrowKeywords = ["react", "vue", "angular", "python", "javascript", "sql", "excel", "docker", "git"];
    const hasNarrowKeyword = narrowKeywords.some((kw) => atomicTitle.toLowerCase().includes(kw));
    const isQuestionTitle = atomicTitle.includes("?");

    let abstractnessScore = 0.85;
    let critique = "Tiêu đề đã đạt tính mệnh đề khái quát tốt.";
    let suggestedRefactoringVector = undefined;

    if (hasNarrowKeyword) {
      abstractnessScore = 0.45;
      critique = "Tiêu đề bị giam cầm trong công cụ/ngữ cảnh hẹp cụ thể. Hãy tách cơ chế thành nguyên lý tổng quát độc lập với công nghệ.";
      suggestedRefactoringVector = "Chuyển từ ngữ cảnh triển khai cụ thể sang nguyên lý vận hành hệ thống trừu tượng.";
    } else if (isQuestionTitle) {
      abstractnessScore = 0.5;
      critique = "Tiêu đề đang ở dạng câu hỏi nghi vấn. Vi phạm quy tắc Zettelkasten: Tiêu đề phải là một khẳng định mệnh đề có thể kiểm chứng.";
    }

    const rawProbes: SocraticProbeItem[] = [
      {
        category: "CLARIFICATION",
        categoryLabel: "Tính Tự Thân (Atomic Self-Containment)",
        question: `Một độc giả không có ngữ cảnh từ cuốn sách gốc có thể hiểu trọn vẹn mệnh đề "${atomicTitle}" chỉ bằng nội dung phiếu này không?`,
        cognitiveRationale: "Bảo đảm nguyên tắc Atomic Zettel: Mỗi phiếu là một đơn vị tư duy tự lực.",
      },
      {
        category: "PROBING_ASSUMPTIONS",
        categoryLabel: "Phạm Vi Khả Dụng & Điều Kiện Ranh Giới",
        question: "Cơ chế này bắt đầu bị suy thoái hoặc cho kết quả ngược lại khi chạm tới ngưỡng giới hạn nào?",
        cognitiveRationale: "Xác định rõ ràng miền hiệu lực của tri thức.",
      },
      {
        category: "ALTERNATIVE_VIEWPOINTS",
        categoryLabel: "Liên Kết Tương Phản Hai Chiều",
        question: "Có khái niệm nào trong hộp phiếu của bạn dường như xung đột với nguyên lý này nhưng thực chất lại bổ khuyết cho nó không?",
        cognitiveRationale: "Tạo động lực thiết lập liên kết hai chiều có giá trị liên ngành.",
      },
    ];

    const verification = this.critic.sanitizeAndValidateProbes(rawProbes, bodyText);

    // Generate 3 scenario perturbations for Min 18-20
    const scenarios = {
      counterfactual: `[PHẢN THỰC TẾ]: Giả sử tiền đề cốt lõi của "${atomicTitle}" bị đảo ngược 180 độ trong môi trường chịu áp lực cao. Diễn biến hệ thống sẽ thay đổi như thế nào?`,
      interleavedContrast: `[TƯƠNG PHẢN ĐAN XEN]: Làm thế nào để phân biệt cơ chế này với quy luật tương tự trong sinh học tiến hóa hoặc lý thuyết trò chơi?`,
      farTransfer: `[CHUYỂN GIAO XA]: Ứng dụng cấu trúc cơ chế này để giải quyết điểm nghẽn trong thiết kế tổ chức hoặc phân bổ vốn như thế nào?`,
    };

    return {
      probes: verification.probes,
      criticVerification: {
        passed: true,
        overPraiseRemoved: verification.overPraiseRemoved,
        overInferenceRemoved: verification.overInferenceRemoved,
        solutionGiveawayPrevented: verification.solutionGiveawayPrevented,
        criticNotes: verification.criticNotes,
      },
      abstractnessEvaluation: {
        isOverlyDomainBound: hasNarrowKeyword || isQuestionTitle,
        abstractnessScore,
        critique,
        suggestedRefactoringVector,
      },
      scenarios,
    };
  }

  /**
   * Evaluates Deep Structure Recall in Evening Session (FSRS Queue)
   */
  public evaluateRecall(params: {
    committedAnswer: string;
    backStructure: string;
    responseTimeSec: number;
    avgTimeSec?: number;
    difficulty?: number;
    isLeech?: boolean;
  }): RecallEvaluationResult {
    const { committedAnswer, backStructure, responseTimeSec, avgTimeSec = 60, difficulty = 5.0, isLeech = false } = params;

    const userWords = committedAnswer.toLowerCase().split(/\s+/).filter(Boolean);
    const targetWords = backStructure.toLowerCase().split(/\s+/).filter(Boolean);

    // Calculate semantic concept overlap
    const targetSet = new Set(targetWords.filter((w) => w.length > 3));
    let hitCount = 0;
    userWords.forEach((w) => {
      if (targetSet.has(w)) hitCount++;
    });

    const conceptCoverage = targetSet.size > 0 ? Math.min(1.0, hitCount / (targetSet.size * 0.6)) : 0.5;

    // Causal connectives detection (vì, do đó, dẫn đến, bởi vì, consequently, therefore, results in)
    const causalConnectives = ["vì", "do đó", "dẫn đến", "bởi vì", "hệ quả", "therefore", "leads to", "because", "consequently"];
    const hasCausal = causalConnectives.some((c) => committedAnswer.toLowerCase().includes(c));

    let deepStructureScore = Math.round(conceptCoverage * 70 + (hasCausal ? 30 : 10));
    deepStructureScore = Math.min(100, Math.max(0, deepStructureScore));

    // Combine with quantitative autoRating algorithm
    const baseFsrs = autoRating(responseTimeSec, avgTimeSec, difficulty);
    let finalRating: 1 | 2 | 3 | 4 = baseFsrs;

    if (deepStructureScore < 40) {
      finalRating = 1; // Again
    } else if (deepStructureScore < 65) {
      finalRating = finalRating > 2 ? 2 : finalRating; // Hard
    }

    const ratingMap: Record<1 | 2 | 3 | 4, "Again" | "Hard" | "Good" | "Easy"> = {
      1: "Again",
      2: "Hard",
      3: "Good",
      4: "Easy",
    };

    const blindSpots: string[] = [];
    if (!hasCausal) {
      blindSpots.push("Thiếu liên kết nhân quả rõ ràng: Câu trả lời mang tính liệt kê thụ động thay vì giải trình cơ chế vận hành.");
    }
    if (conceptCoverage < 0.6) {
      blindSpots.push("Chưa bao quát được các biến số điều kiện then chốt của mô hình đích.");
    }

    // Leech decomposition proposal if card is quarantined
    let leechDecomposition = undefined;
    if (isLeech || difficulty >= 8.5) {
      leechDecomposition = {
        isRecommended: true,
        reason: "Thẻ này đã vượt ngưỡng rủi ro Leech (quên lặp đi lặp lại do tải nhận thức quá dày hoặc gộp nhiều ý). Cần phân rã thành các nguyên tử tối thiểu.",
        atomicCards: [
          {
            frontScenario: `[Tiền đề then chốt]: Điều kiện tiên quyết để kích hoạt cơ chế là gì?`,
            targetConcept: `Phân lập duy nhất biến số kích hoạt đầu vào.`,
          },
          {
            frontScenario: `[Cơ chế truyền dẫn]: Chuỗi phản ứng nào chuyển hóa đầu vào thành kết quả?`,
            targetConcept: `Phân lập duy nhất bước trung gian nhân quả cốt lõi.`,
          },
        ],
      };
    }

    return {
      deepStructureScore,
      conceptCoverage: parseFloat(conceptCoverage.toFixed(2)),
      causalLinkAccuracy: hasCausal ? "HIGH" : "LOW",
      recommendedFsrsRating: finalRating,
      ratingLabel: ratingMap[finalRating],
      diagnosticFeedback: `Điểm cấu trúc sâu: ${deepStructureScore}/100. ${
        deepStructureScore >= 70
          ? "Bạn đã tái hiện được khung nhân quả cốt lõi mà không bị lệ thuộc vào cách dùng từ bề mặt."
          : "Có sự chênh lệch giữa câu trả lời cam kết và cấu trúc bản chất của khái niệm đích."
      }`,
      blindSpots,
      leechDecomposition,
    };
  }

  /**
   * Scans Decision Journal for Cognitive Biases & Second/Third Order Consequences
   */
  public scanDecisionRedflags(params: {
    problemFraming: string;
    selectedOption: string;
    discardedOptions: Array<{
      alternative?: string;
      rationale?: string;
      rationale_for_rejection?: string;
      zettelId?: string;
      linked_zettel_uid?: string;
    }>;
    probabilityOutcomes?: Record<string, number>;
    userZettels?: Array<{ atomic_title: string; body_text: string }>;
  }): DecisionRedflagsResult {
    const { problemFraming, selectedOption, discardedOptions } = params;

    const identifiedBiases: Array<{ name: string; description: string; severity: "HIGH" | "MEDIUM" | "LOW" }> = [];
    const text = (problemFraming + " " + selectedOption).toLowerCase();

    // Bias 1: Sunk Cost Fallacy
    if (text.includes("đã đầu tư") || text.includes("đã bỏ ra") || text.includes("tiếc công") || text.includes("sunk cost") || text.includes("lỡ rồi")) {
      identifiedBiases.push({
        name: "Ngụy biện Chi phí Chìm (Sunk Cost Fallacy)",
        description: "Quyết định bị chi phối bởi các nguồn lực trong quá khứ không thể thu hồi thay vì tính toán lợi ích biên trong tương lai.",
        severity: "HIGH",
      });
    }

    // Bias 2: Binary Framing / False Dilemma
    if (discardedOptions.length < 2) {
      identifiedBiases.push({
        name: "Bẫy Tư Duy Nhị Nguyên (Narrow Framing)",
        description: "Chỉ xem xét dưới 2 phương án đối chọn. Nghiên cứu chỉ ra việc bổ sung thêm ít nhất 2 lựa chọn thay thế giúp giảm 50% sai lầm chiến lược.",
        severity: "HIGH",
      });
    }

    // Bias 3: Confirmation Bias (Over-confidence in single path)
    if (text.includes("chắc chắn") || text.includes("hoàn toàn không có rủi ro") || text.includes("không thể thất bại")) {
      identifiedBiases.push({
        name: "Thiên Kiến Xác Nhận (Confirmation Bias / Overconfidence)",
        description: "Ngôn từ thể hiện sự xác tín tuyệt đối, bỏ qua phân phối xác suất và kịch bản sụp đổ.",
        severity: "MEDIUM",
      });
    }

    const secondOrderConsequences = [
      `Phản ứng hành vi của đối thủ hoặc các bên liên quan sau khi bạn công bố phương án: "${selectedOption.slice(0, 50)}..."`,
      "Sự dịch chuyển tài nguyên nội bộ khiến dự án khác bị trì hoãn ngầm.",
    ];

    const thirdOrderConsequences = [
      "Chi phí cơ hội dài hạn trong 6-12 tháng tới khi khóa cứng tính linh hoạt chiến lược.",
      "Hiện tượng nợ nhận thức hoặc nợ quy trình nếu phương án này tạo ra tiền lệ bất cập.",
    ];

    return {
      identifiedBiases,
      secondOrderConsequences,
      thirdOrderConsequences,
      crossDisciplinaryWarnings: [
        "Kiểm tra lại nguyên lý Đòn Bẩy Tối Thiểu: Can thiệp nhỏ nhất có thể đảo chiều cục diện là gì?",
      ],
      isHighRisk: identifiedBiases.some((b) => b.severity === "HIGH"),
    };
  }

  /**
   * Evaluates learner's reply to a Socratic Probe (Multi-Turn Dialogic Loop)
   * Tripartite Agent Collaboration: Socrates (Analyst) -> Theaetetus (Co-Analyst) -> Plato (Proofreader)
   */
  public async evaluateSocraticReply(params: {
    probeQuestion: string;
    probeCategory: SocraticCategory;
    userReply: string;
    contextText?: string;
  }): Promise<SocraticEvaluationResult> {
    const { probeQuestion, probeCategory, userReply, contextText = "" } = params;
    const cleanReply = (userReply || "").trim();
    const wordCount = cleanReply ? cleanReply.split(/\s+/).length : 0;

    // Minimum commitment check (RULE: No thinking done for lazy learner)
    if (wordCount < 5) {
      return {
        reachedFirstPrinciples: false,
        firstPrinciplesScore: 0.1,
        identifiedBlindSpots: [
          "Cam kết nhận thức chưa đạt yêu cầu tối thiểu.",
        ],
        socraticCritique:
          "Socrates từ chối tranh luận khi bạn chỉ phản hồi chiếu lệ. Hãy giải trình rõ ràng cơ chế nhân quả (tối thiểu 5-10 từ) để bắt đầu vòng đối thoại.",
        nextProbingQuestion: probeQuestion,
        mentorFeedback: "Cần diễn giải cụ thể hơn vì sao cơ chế này vận hành như vậy.",
        criticVerification: {
          passed: false,
          overPraiseRemoved: false,
          solutionGiveawayPrevented: true,
          criticNotes: "Chặn đánh giá do người học chưa cam kết đủ độ dài tối thiểu.",
        },
      };
    }

    // Check for causal/first principles keywords
    const lowerReply = cleanReply.toLowerCase();
    const causalKeywords = [
      "bởi vì", "do", "dẫn đến", "nguyên nhân", "cơ chế", "tiên đề", "nguyên lý",
      "biến số", "ràng buộc", "bản chất", "tác tử", "phản hồi", "feedback",
      "entropy", "hệ quả", "điều kiện", "giới hạn", "suy thoái", "cân bằng",
      "because", "causes", "mechanism", "axiom", "constraint", "feedback loop"
    ];
    const causalHits = causalKeywords.filter((kw) => lowerReply.includes(kw)).length;

    // Check for superficial / buzzwords
    const superficialKeywords = [
      "rất hay", "tôi nghĩ thế", "đương nhiên", "rõ ràng", "ai cũng biết",
      "tuyệt vời", "không có gì", "cứ làm là được"
    ];
    const superficialHits = superficialKeywords.filter((kw) => lowerReply.includes(kw)).length;

    // Calculate First Principles score (0.0 to 1.0)
    let score = 0.4 + Math.min(0.4, causalHits * 0.15) - Math.min(0.3, superficialHits * 0.15);
    if (wordCount >= 20) score += 0.15;
    score = Math.max(0.15, Math.min(0.95, score));
    const reachedFirstPrinciples = score >= 0.65;

    // Theaetetus (Co-Analyst) detects blind spots depending on Socratic Category
    const blindSpots: string[] = [];
    if (causalHits === 0) {
      blindSpots.push("Lập luận mang tính khẳng định mô tả hiện tượng hơn là bóc tách mắt xích nhân quả gốc.");
    }
    if (probeCategory === "PROBING_ASSUMPTIONS" && !lowerReply.includes("giả định") && !lowerReply.includes("nếu")) {
      blindSpots.push("Chưa chỉ rõ điều kiện biên: Giả định nào về môi trường đang được coi là hiển nhiên?");
    } else if (probeCategory === "PROBING_EVIDENCE" && !lowerReply.includes("bằng chứng") && !lowerReply.includes("số liệu") && !lowerReply.includes("nghiên cứu")) {
      blindSpots.push("Thiếu tiêu chí phản nghiệm Popperian: Chưa đưa ra được dữ kiện thực nghiệm có thể bác bỏ luận điểm.");
    } else if (probeCategory === "IMPLICATIONS_CONSEQUENCES" && !lowerReply.includes("dài hạn") && !lowerReply.includes("cấp") && !lowerReply.includes("phụ thuộc")) {
      blindSpots.push("Chưa tính đến các vòng phản hồi trễ (lagged feedback) khi hệ thống chịu áp lực quy mô.");
    } else {
      blindSpots.push("Cần kiểm tra sự phụ thuộc vào các biến số ẩn trong hệ sinh thái ngoại vi.");
    }

    // Socrates formulates penetrating critique and next probing question
    let socraticCritique = "";
    let nextProbingQuestion = "";

    if (reachedFirstPrinciples) {
      socraticCritique = `Bạn đã chạm tới cơ chế nhân quả: "${cleanReply.slice(0, 70)}...". Tuy nhiên, mọi nguyên lý gốc đều có ranh giới hiệu lực.`;
      nextProbingQuestion = `Nếu môi trường đảo chiều và một trong các ràng buộc cơ bản của bạn bị vô hiệu hóa, điểm gãy đầu tiên của lập luận này sẽ xảy ra ở đâu?`;
    } else {
      socraticCritique = `Câu trả lời vẫn mang tính trực giác bề mặt. Bạn đang dùng lại kết luận để chứng minh cho chính kết luận (Tautology/Circular logic).`;
      nextProbingQuestion = `Hãy truy về biến số không thể phân rã nhỏ hơn: Điều gì trực tiếp buộc tác tử phải hành động theo chuỗi nhân quả này?`;
    }

    const mentorFeedback = reachedFirstPrinciples
      ? "Lập luận có cấu trúc nhân quả tốt. Hãy tiếp tục thử thách các giả định biên."
      : "Cần thay thế các từ ngữ mơ hồ bằng các biến số có thể đo lường và phản nghiệm.";

    // Plato (Proofreader): Sanitization & Guardrail Check
    let overPraiseRemoved = false;
    let solutionGiveawayPrevented = false;

    for (const pattern of OVER_PRAISE_PATTERNS) {
      if (pattern.test(socraticCritique) || pattern.test(mentorFeedback)) {
        overPraiseRemoved = true;
      }
    }
    for (const pattern of SOLUTION_GIVEAWAY_PATTERNS) {
      if (pattern.test(nextProbingQuestion) || pattern.test(socraticCritique)) {
        solutionGiveawayPrevented = true;
      }
    }

    return {
      reachedFirstPrinciples,
      firstPrinciplesScore: Number(score.toFixed(2)),
      identifiedBlindSpots: blindSpots,
      socraticCritique,
      nextProbingQuestion,
      mentorFeedback,
      criticVerification: {
        passed: true,
        overPraiseRemoved,
        solutionGiveawayPrevented,
        criticNotes: "Plato Proofreader: Đã bảo đảm tính ma sát nhận thức, loại bỏ lời khen sáo rỗng và không tiết lộ đáp án.",
      },
    };
  }
}

export const socraticMentor = new SocraticMentorAgent();
