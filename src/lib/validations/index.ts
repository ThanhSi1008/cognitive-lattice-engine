import { z } from "zod";

// --- Helpers ---
export function countWords(text: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

// Anti-rote regex for FSRS cards (Mục 2.2 Phút 18-20 & State 3.3)
export const ANTI_ROTE_REGEX = /(?:^|[\s\b.,?!])(là gì|định nghĩa|khái niệm|what is|define)(?:$|[\s\b.,?!])/iu;

// --- 1. Learning Session Schemas ---
export const LearningSessionSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.date()).optional(),
  s1_hypothesis_text: z.string().nullable().optional(),
  s1_completed_at: z.coerce.date().nullable().optional(),
  incubation_unlock_at: z.coerce.date().nullable().optional(),
  s2_completed_at: z.coerce.date().nullable().optional(),
  s3_blank_recall_data: z.record(z.any()).nullable().optional(),
  s3_completed_at: z.coerce.date().nullable().optional(),
  drli_score: z.number().nonnegative().default(0.0),
}).refine(
  (data) => {
    // chk_incubation_period: s2_completed_at IS NULL OR (incubation_unlock_at IS NOT NULL AND s2_completed_at >= incubation_unlock_at)
    if (data.s2_completed_at && data.incubation_unlock_at) {
      return new Date(data.s2_completed_at).getTime() >= new Date(data.incubation_unlock_at).getTime();
    }
    if (data.s2_completed_at && !data.incubation_unlock_at) {
      return false;
    }
    return true;
  },
  {
    message: "VIOLATION: Khoảng nghỉ Chế độ Phân tán (Neural Incubation Lock) bắt buộc tối thiểu 4 giờ giữa Phiên Sáng và Phiên Chiều.",
    path: ["s2_completed_at"],
  }
);

// Pre-reading hypothesis gate validation (S1 Phút 1-3: >= 50 từ)
export const PreReadingHypothesisSchema = z.object({
  hypothesis_text: z.string().refine((text) => countWords(text) >= 50, {
    message: "VIOLATION: Dự đoán cơ chế vận hành phải đạt tối thiểu 50 từ trước khi mở khóa văn bản nguồn.",
  }),
});

// --- 2. Fleeting Notes Schemas ---
export const FleetingNoteStatusEnum = z.enum(["PENDING", "PROMOTED", "EXPIRED_PURGED"]);
export type FleetingNoteStatus = z.infer<typeof FleetingNoteStatusEnum>;

export const FleetingNoteSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  raw_content: z.string().trim().min(1, "Nội dung Fleeting Note không được để trống"),
  created_at: z.coerce.date().optional(),
  expires_at: z.coerce.date().optional(),
  status: FleetingNoteStatusEnum.default("PENDING"),
  promoted_to_zettel_id: z.string().length(14).nullable().optional(),
});

// --- 3. Literature Notes Schemas (Critical Audit Rubric) ---
export const SourceDatabaseEnum = z.enum([
  "PUBMED_MEDLINE",
  "SCOPUS",
  "WEB_OF_SCIENCE",
  "COCHRANE_CENTRAL",
  "EPISTEMONIKOS",
  "PROSPERO_REGISTERED",
  "MONOGRAPH_BOOK",
  "OTHER",
]);

export const StudyDesignEnum = z.enum([
  "RCT",
  "NON_RANDOMIZED_INTERVENTION",
  "COHORT_CASE_CONTROL",
  "QUALITATIVE",
  "SYSTEMATIC_REVIEW_META_ANALYSIS",
  "THEORETICAL_MODEL",
]);

export const RiskOfBiasToolEnum = z.enum([
  "COCHRANE_ROB_2",
  "ROBINS_I",
  "NEWCASTLE_OTTAWA_SCALE",
  "CASP_CHECKLIST",
  "AMSTAR_2_ROBIS",
  "LOGIC_CONSISTENCY_CHECK",
]);

export const CriticalAuditPayloadSchema = z.object({
  pico_frame: z.object({
    population_or_context: z.string().trim().min(1, "Bắt buộc điền Đối tượng / Bối cảnh hệ thống"),
    intervention_or_mechanism: z.string().trim().min(1, "Bắt buộc điền Cơ chế / Tác nhân can thiệp"),
    comparison_baseline: z.string().trim().min(1, "Bắt buộc điền Nhóm đối chứng / Mô hình ngây thơ Cấp độ 1"),
    outcome_measured: z.string().trim().min(1, "Bắt buộc điền Kết quả đo lường thực nghiệm"),
  }),
  source_database: SourceDatabaseEnum,
  study_design: StudyDesignEnum,
  risk_of_bias_assessment: z.object({
    tool_used: RiskOfBiasToolEnum,
    rating_or_score: z.string().trim().min(1, "Bắt buộc điền Điểm đánh giá nguy cơ sai lệch"),
    key_limitations: z.string().trim().min(1, "Bắt buộc nêu các giới hạn chính"),
  }),
  falsifiability_condition: z.string().trim().min(20, "Điều kiện thực nghiệm bác bỏ mô hình phải dài tối thiểu 20 ký tự"),
  sample_size_and_replicability: z.string().trim().min(20, "Quy mô mẫu và lịch sử tái lập phải dài tối thiểu 20 ký tự"),
  counter_evidence_or_rival_model: z.string().trim().min(20, "Nghiên cứu đối lập / Điều kiện biên thất bại phải dài tối thiểu 20 ký tự"),
});

export const AnalogicalDomainMappingSchema = z.object({
  domain_name: z.string().trim().min(1, "Tên miền không được để trống"),
  surface_features: z.string().trim().min(1, "Bắt buộc mô tả đặc điểm bề mặt"),
  first_order_naive_reaction: z.string().trim().min(1, "Bắt buộc mô tả phản ứng tuyến tính ngây thơ (Cấp độ 1)"),
  second_order_systemic_mechanism: z.string().trim().min(1, "Bắt buộc mô tả cơ chế hệ thống bậc cao (Cấp độ 2)"),
  structural_invariant_shared: z.string().trim().min(1, "Bắt buộc xác định quy luật cấu trúc bất biến chung"),
});

export const SourceCitationSchema = z.object({
  author: z.string().trim().min(1, "Bắt buộc điền tác giả"),
  year: z.union([z.number(), z.string().trim().min(1)]),
  title: z.string().trim().min(1, "Bắt buộc điền tiêu đề tài liệu"),
  pages: z.string().optional(),
  zotero_key: z.string().optional(),
  doi: z.string().optional(),
});

export const LiteratureNoteSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  source_citation: SourceCitationSchema,
  paraphrased_summary: z.string().refine(
    (text) => {
      const words = countWords(text);
      return words >= 50 && words <= 200;
    },
    {
      message: "VIOLATION: Tóm lược tài liệu đóng sách (paraphrased_summary) bắt buộc từ 50 đến 200 từ.",
    }
  ),
  critical_audit: CriticalAuditPayloadSchema,
  analogical_matrix: z.array(AnalogicalDomainMappingSchema).min(3, "VIOLATION: Bắt buộc ánh xạ khái niệm qua tối thiểu 3 miền ứng dụng khác nhau (chk_analogical_matrix_min_domains)."),
  created_at: z.coerce.date().optional(),
});

// --- 4. Permanent Zettel Schemas ---
export const ZettelStateEnum = z.enum(["DRAFT", "PUBLISHED"]);
export type ZettelState = z.infer<typeof ZettelStateEnum>;

export const PermanentZettelSchema = z.object({
  zettel_uid: z.string().regex(/^\d{14}$/, "Định dạng Zettel UID phải là YYYYMMDDHHMMSS (14 chữ số)"),
  user_id: z.string().uuid(),
  atomic_title: z.string().trim()
    .min(20, "Tiêu đề Zettel phải dài tối thiểu 20 ký tự")
    .max(250, "Tiêu đề Zettel không vượt quá 250 ký tự")
    .refine((title) => !title.includes("?"), {
      message: "Tiêu đề Zettel phải là câu mệnh đề nhân quả, không được chứa dấu chấm hỏi (?)",
    }),
  body_text: z.string(),
  word_count: z.number().int().min(100, "VIOLATION: Thân bài Zettel phải có tối thiểu 100 từ").max(350, "VIOLATION: Thân bài Zettel không vượt quá 350 từ"),
  domain_category: z.string().trim().min(1, "Danh mục miền không được để trống").max(100),
  embedding: z.array(z.number()).length(1536).nullable().optional(),
  literature_note_id: z.string().uuid().nullable().optional(),
  state: ZettelStateEnum.default("DRAFT"),
  created_at: z.coerce.date().optional(),
}).refine(
  (data) => {
    const actualWords = countWords(data.body_text);
    return actualWords === data.word_count && actualWords >= 100 && actualWords <= 350;
  },
  {
    message: "VIOLATION: word_count phải khớp với số từ thực tế của body_text (giới hạn 100-350 từ).",
    path: ["word_count"],
  }
);

// --- 5. Zettel Link Schemas ---
export const CognitiveLinkTypeEnum = z.enum([
  "EXTENDS_PAST",
  "PATHOLOGY_VIOLATION",
  "BIOLOGICAL_MECHANISM",
  "CONTRADICTS",
  "SUPPORTS",
]);
export type CognitiveLinkType = z.infer<typeof CognitiveLinkTypeEnum>;

export const ZettelLinkSchema = z.object({
  id: z.string().uuid().optional(),
  source_zettel_uid: z.string().length(14, "Mã Zettel nguồn phải có đúng 14 ký tự"),
  target_zettel_uid: z.string().length(14, "Mã Zettel đích phải có đúng 14 ký tự"),
  link_type: CognitiveLinkTypeEnum,
  connection_rationale: z.string().trim().min(30, "VIOLATION: Lời giải thích liên kết hai chiều phải dài tối thiểu 30 ký tự (chk_rationale_length)."),
  created_at: z.coerce.date().optional(),
}).refine(
  (data) => data.source_zettel_uid !== data.target_zettel_uid,
  {
    message: "VIOLATION: Không được phép tự liên kết Zettel với chính nó (chk_no_self_link).",
    path: ["target_zettel_uid"],
  }
);

// --- 6. FSRS Cards Schemas ---
export const PerturbationCardTypeEnum = z.enum([
  "COUNTERFACTUAL",
  "INTERLEAVED_CONTRAST",
  "FAR_TRANSFER",
]);
export type PerturbationCardType = z.infer<typeof PerturbationCardTypeEnum>;

export const CardStateEnum = z.enum([
  "NEW",
  "LEARNING",
  "REVIEW",
  "RELEARNING",
  "LEECH_QUARANTINE",
]);
export type CardState = z.infer<typeof CardStateEnum>;

export const FsrsCardSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  zettel_uid: z.string().length(14),
  card_type: PerturbationCardTypeEnum,
  front_prompt: z.string().trim()
    .min(80, "Thẻ truy xuất sâu phải có câu hỏi tình huống tối thiểu 80 ký tự")
    .refine((prompt) => !ANTI_ROTE_REGEX.test(prompt), {
      message: "VIOLATION (Bộ lọc chống học vẹt): Thẻ FSRS không được sử dụng câu hỏi định nghĩa bề mặt (ví dụ: 'là gì', 'định nghĩa', 'khái niệm', 'what is', 'define'). Bắt buộc dùng khung Counterfactual / Interleaved / Far-Transfer.",
    }),
  back_structure: z.string().trim().min(1, "Mặt sau của thẻ không được để trống"),
  stability: z.number().nonnegative().default(0.0),
  difficulty: z.number().min(1.0).max(10.0).default(5.0),
  elapsed_days: z.number().int().nonnegative().default(0),
  scheduled_days: z.number().int().nonnegative().default(0),
  reps: z.number().int().nonnegative().default(0),
  lapses: z.number().int().nonnegative().default(0),
  avg_response_time_sec: z.number().nonnegative().default(90.0),
  state: CardStateEnum.default("NEW"),
  due_date: z.coerce.date().default(() => new Date()),
  last_review: z.coerce.date().nullable().optional(),
}).transform((card) => {
  // Thực thi trigger auto_quarantine_leech_cards trên tầng schema:
  // IF NEW.difficulty >= 8.5 OR NEW.lapses >= 3 THEN NEW.state := 'LEECH_QUARANTINE'
  if (card.difficulty >= 8.5 || card.lapses >= 3) {
    return { ...card, state: "LEECH_QUARANTINE" as const };
  }
  return card;
});

// Prompt commit before reveal check (S3 Phút 6-15: gõ tối thiểu 30 từ cam kết)
export const CardRecallCommitSchema = z.object({
  commit_text: z.string().refine((text) => countWords(text) >= 30, {
    message: "VIOLATION (RULE-04): Bắt buộc gõ dàn ý cam kết tối thiểu 30 từ trước khi bấm lật mặt sau thẻ.",
  }),
});

// --- 7. Decision Journal Schemas ---
export const PhysioEmotionalStateSchema = z.object({
  stress_level: z.number().min(1).max(10),
  sleep_hours: z.number().min(0).max(24),
  emotional_bias: z.string().trim().min(1),
  context_notes: z.string().optional(),
});

export const RejectedAlternativeSchema = z.object({
  alternative: z.string().trim().min(1, "Mô tả phương án bị loại bỏ"),
  rationale_for_rejection: z.string().trim().min(1, "Lý do loại bỏ"),
  linked_zettel_uid: z.string().length(14).optional(),
});

export const SecondThirdOrderEffectsSchema = z.object({
  short_term_opportunity_cost: z.string().trim().min(1, "Chi phí cơ hội ngắn hạn"),
  second_order_5_weeks: z.string().trim().min(1, "Hệ quả cấp 2 (5 tuần)"),
  third_order_5_months: z.string().trim().min(1, "Hệ quả cấp 3 (5 tháng)"),
});

export const DecisionJournalSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  created_at: z.coerce.date().optional(),
  physio_emotional_state: PhysioEmotionalStateSchema,
  problem_frame: z.string().refine((text) => countWords(text) >= 40, {
    message: "VIOLATION: Định khung vấn đề (problem_frame) bắt buộc tối thiểu 40 từ.",
  }),
  rejected_alternatives: z.array(RejectedAlternativeSchema).min(2, "VIOLATION: Bắt buộc nêu tối thiểu 2 phương án đã loại bỏ (chk_min_rejected_alternatives)."),
  linked_zettel_uids: z.array(z.string().length(14)).min(1, "VIOLATION: Bắt buộc liên kết tối thiểu 1 Zettel UID (chk_min_linked_zettels)."),
  primary_thesis: z.string().trim().min(1, "Bắt buộc điền quyết định và giả thuyết chính"),
  prob_positive: z.number().int().min(0).max(100),
  prob_neutral: z.number().int().min(0).max(100),
  prob_worst: z.number().int().min(0).max(100),
  second_third_order_effects: SecondThirdOrderEffectsSchema,
  is_locked: z.boolean().default(false),
  review_30d_data: z.record(z.any()).nullable().optional(),
  review_60d_data: z.record(z.any()).nullable().optional(),
  review_90d_data: z.record(z.any()).nullable().optional(),
  brier_score: z.number().min(0).max(2).nullable().optional(),
}).refine(
  (data) => data.prob_positive + data.prob_neutral + data.prob_worst === 100,
  {
    message: "VIOLATION: Tổng 3 xác suất kịch bản (prob_positive + prob_neutral + prob_worst) phải bằng đúng 100% (chk_probability_sum_100).",
    path: ["prob_worst"],
  }
);
