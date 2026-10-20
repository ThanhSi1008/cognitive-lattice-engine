import { z } from "zod";

/**
 * CLE_INGEST_V1: Bộ Schema chuẩn nạp học liệu từ Frontier AI (Gemini 4 Argon High Thinking)
 * Phục vụ cơ chế Tải bớt nhận thức hiệu quả (Productive Offloading)
 * và bảo toàn Hiệu ứng Tự sinh (Generation Effect - RULE-04).
 */

export const CleCitationSchema = z.object({
  author: z.string().min(1, "Tác giả không được để trống"),
  year: z.union([z.number(), z.string()]),
  title: z.string().min(1, "Tiêu đề công trình gốc không được để trống"),
  pages: z.string().optional(),
  doi: z.string().optional(),
});

export const ClePicoFrameSchema = z.object({
  population_or_context: z.string().min(3, "Bối cảnh/Đối tượng tối thiểu 3 ký tự"),
  intervention_or_mechanism: z.string().min(3, "Cơ chế can thiệp tối thiểu 3 ký tự"),
  comparison_baseline: z.string().min(3, "Cách tiếp cận cơ bản tối thiểu 3 ký tự"),
  outcome_measured: z.string().min(3, "Kết quả đo lường tối thiểu 3 ký tự"),
});

export const CleRiskOfBiasSchema = z.object({
  tool_used: z.string().optional().default("LOGIC_CONSISTENCY_CHECK"),
  rating_or_score: z.string().optional().default("High Structural Validity"),
  key_limitations: z.string().optional().default("Giới hạn về dữ liệu lịch sử cục bộ"),
});

export const CleCriticalAuditScaffoldSchema = z.object({
  pico_frame: ClePicoFrameSchema,
  source_database: z.string().optional().default("SCOPUS"),
  study_design: z.string().optional().default("THEORETICAL_MODEL"),
  risk_of_bias_assessment: CleRiskOfBiasSchema.optional(),
  falsifiability_condition: z.string().min(10, "Điều kiện làm sai lệch tối thiểu 10 ký tự"),
  sample_size_and_replicability: z.string().min(10, "Cỡ mẫu & khả năng tái lập tối thiểu 10 ký tự"),
  counter_evidence_or_rival_model: z.string().min(10, "Mô hình đối lập tối thiểu 10 ký tự"),
});

export const CleAnalogicalDomainItemSchema = z.object({
  domain_name: z.string().min(2, "Tên miền tối thiểu 2 ký tự"),
  surface_features: z.string().min(3, "Dấu hiệu bề mặt tối thiểu 3 ký tự"),
  first_order_naive_reaction: z.string().min(3, "Phản ứng cấp 1 tối thiểu 3 ký tự"),
  second_order_systemic_mechanism: z.string().min(3, "Cơ chế cấp 2 tối thiểu 3 ký tự"),
  structural_invariant_shared: z.string().min(3, "Quy luật bất biến tối thiểu 3 ký tự"),
});

export const CleIngestModuleSchema = z.object({
  day: z.number().int().positive().optional().default(1),
  module_id: z.string().optional().default("MOD_01"),
  title: z.string().min(5, "Tiêu đề bài học phải có tối thiểu 5 ký tự"),
  activation_context: z.string().min(10, "Bối cảnh kích hoạt tư duy phải có tối thiểu 10 ký tự"),
  citation: CleCitationSchema,
  source_blocks: z.array(z.string().min(10)).min(2, "Phải có tối thiểu 2 khối luận điểm nguồn"),
  critical_audit_scaffold: CleCriticalAuditScaffoldSchema.optional(),
  analogical_matrix_scaffold: z.array(CleAnalogicalDomainItemSchema).optional(),
});

export const CleExternalAiPayloadSchema = z.object({
  schema_version: z.literal("CLE_INGEST_V1").default("CLE_INGEST_V1"),
  topic_name: z.string().min(2, "Tên chủ đề phải có tối thiểu 2 ký tự"),
  domain: z.string().optional().default("Cognitive Science"),
  roadmap: z.array(CleIngestModuleSchema).min(1, "Lộ trình phải có ít nhất 1 bài học"),
});

export type CleCitation = z.infer<typeof CleCitationSchema>;
export type ClePicoFrame = z.infer<typeof ClePicoFrameSchema>;
export type CleCriticalAuditScaffold = z.infer<typeof CleCriticalAuditScaffoldSchema>;
export type CleAnalogicalDomainItem = z.infer<typeof CleAnalogicalDomainItemSchema>;
export type CleIngestModule = z.infer<typeof CleIngestModuleSchema>;
export type CleExternalAiPayload = z.infer<typeof CleExternalAiPayloadSchema>;

export interface ParseResult {
  success: boolean;
  data?: CleExternalAiPayload;
  error?: string;
}

/**
 * Bóc tách và thẩm định khối JSON từ phản hồi thô của Frontier AI (Gemini 4 Argon High Thinking)
 * Tự động loại bỏ văn bản dẫn nhập / kết luận và xử lý markdown codeblock.
 */
export function parseExternalAiResponse(rawText: string): ParseResult {
  if (!rawText || !rawText.trim()) {
    return { success: false, error: "Văn bản nhập vào trống. Vui lòng dán câu trả lời từ Gemini 4 Argon." };
  }

  let jsonCandidate = "";

  // 1. Thử bóc tách từ markdown code block ```json ... ``` hoặc ``` ... ```
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    jsonCandidate = codeBlockMatch[1].trim();
  } else {
    // 2. Tìm khối JSON đầu tiên và cuối cùng dựa trên dấu ngoặc {}
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonCandidate = rawText.substring(firstBrace, lastBrace + 1).trim();
    } else {
      jsonCandidate = rawText.trim();
    }
  }

  let parsedObj: any;
  try {
    parsedObj = JSON.parse(jsonCandidate);
  } catch (err: any) {
    return {
      success: false,
      error: `Cú pháp JSON không hợp lệ: ${err.message}. Hãy chắc chắn rằng Gemini trả về khối mã json hợp lệ.`,
    };
  }

  // 3. Tự động chuẩn hóa nếu người dùng copy 1 bài học đơn lẻ thay vì cả lộ trình roadmap
  if (parsedObj && !parsedObj.roadmap && (parsedObj.title || parsedObj.source_blocks)) {
    parsedObj = {
      schema_version: "CLE_INGEST_V1",
      topic_name: parsedObj.title || "Bài Học Chuyên Sâu",
      domain: parsedObj.domain || "Cognitive Science",
      roadmap: [
        {
          day: parsedObj.day || 1,
          module_id: parsedObj.module_id || "MOD_01",
          title: parsedObj.title || "Bài học",
          activation_context: parsedObj.activation_context || parsedObj.title || "Kích hoạt tư duy",
          citation: parsedObj.citation || {
            author: "Tác giả",
            year: new Date().getFullYear(),
            title: parsedObj.title || "Tài liệu",
          },
          source_blocks: parsedObj.source_blocks || [],
          critical_audit_scaffold: parsedObj.critical_audit_scaffold,
          analogical_matrix_scaffold: parsedObj.analogical_matrix_scaffold,
        },
      ],
    };
  }

  // Đảm bảo schema_version mặc định
  if (parsedObj && !parsedObj.schema_version) {
    parsedObj.schema_version = "CLE_INGEST_V1";
  }

  // 4. Thẩm định qua Zod Schema
  const validation = CleExternalAiPayloadSchema.safeParse(parsedObj);
  if (!validation.success) {
    const errorMessages = validation.error.issues
      .map((issue) => `[${issue.path.join(".")}] ${issue.message}`)
      .slice(0, 5)
      .join("; ");
    return {
      success: false,
      error: `Dữ liệu không khớp Schema CLE_INGEST_V1: ${errorMessages}`,
    };
  }

  return {
    success: true,
    data: validation.data,
  };
}

/**
 * Sinh Prompt chuẩn hóa để người dùng mang sang hỏi Gemini 4 Argon High Thinking
 */
export function generateFrontierAiPrompt(
  topicName: string,
  mode: "roadmap_5day" | "single_lesson" = "roadmap_5day"
): string {
  const cleanTopic = topicName.trim() || "TỰ DO TÀI CHÍNH & QUY TẮC RÚT VỐN AN TOÀN 4%";
  const is5Day = mode === "roadmap_5day";

  return `Bạn là Chuyên gia Tổng hợp Bằng chứng Khoa học và Kiến trúc sư Mô hình Tư duy theo Nguyên lý Gốc (First Principles).
Tôi đang sử dụng hệ thống rèn luyện nhận thức **Cognitive Lattice Engine (CLE)**. Tôi muốn học sâu về chủ đề: "${cleanTopic}".

### QUY TẮC BẮT BUỘC CHO CÂU TRẢ LỜI CỦA BẠN:
1. KHÔNG viết lời chào hỏi hay giải thích dài dòng bên ngoài.
2. Phân tích chủ đề từ nguyên lý gốc (First Principles), cơ chế nhân quả cấp độ 1 và cấp độ 2, điều kiện biên làm sai lệch mô hình (Falsifiability theo Karl Popper) và bằng chứng thực nghiệm.
3. Trả về kết quả DUY NHẤT dưới dạng một khối mã \`json\` tuân thủ chính xác tuyệt đối cấu trúc Schema \`CLE_INGEST_V1\` dưới đây để tôi import trực tiếp vào trang web CLE (nhằm giữ kín nội dung bài đọc cho Cổng Đoán Trước 180 giây):

\`\`\`json
{
  "schema_version": "CLE_INGEST_V1",
  "topic_name": "${cleanTopic}",
  "domain": "Financial Engineering | Cognitive Science | System Architecture | Evolutionary Biology | Decision Theory",
  "roadmap": [
    {
      "day": 1,
      "module_id": "MOD_01",
      "title": "Tiêu đề mệnh đề nhân quả của bài học số 1",
      "activation_context": "Câu bối cảnh kích hoạt tư duy để hiển thị ở Cổng Đoán Trước 180 giây (không làm lộ đáp án)",
      "citation": {
        "author": "Tên tác giả / Nhà nghiên cứu gốc",
        "year": 1994,
        "title": "Tên công trình / Sách / Bài báo khoa học gốc",
        "pages": "pp. 10-25",
        "doi": "Mã DOI hoặc định danh nguồn"
      },
      "source_blocks": [
        "Khối luận điểm 1 (120-180 từ): Phân tích cơ chế nền tảng và tiên đề gốc của mô hình...",
        "Khối luận điểm 2 (120-180 từ): Phân tích động lực học hệ thống, phản hồi cấp độ 2 và các biến số ẩn...",
        "Khối luận điểm 3 (120-180 từ): Phân tích bằng chứng thực nghiệm, dữ liệu lịch sử và ranh giới hiệu lực...",
        "Khối luận điểm 4 (120-180 từ): Phân tích các sai lầm phổ biến (Tư duy cấp độ 1) và nguyên tắc thiết kế quyết định..."
      ],
      "critical_audit_scaffold": {
        "pico_frame": {
          "population_or_context": "Bối cảnh hệ thống hoặc đối tượng áp dụng",
          "intervention_or_mechanism": "Cơ chế hoặc quy tắc tác động chính",
          "comparison_baseline": "Cách tiếp cận ngây thơ / tuyến tính thông thường (Cấp độ 1)",
          "outcome_measured": "Kết quả đo lường dài hạn"
        },
        "source_database": "SCOPUS",
        "study_design": "THEORETICAL_MODEL",
        "risk_of_bias_assessment": {
          "tool_used": "LOGIC_CONSISTENCY_CHECK",
          "rating_or_score": "High Structural Validity",
          "key_limitations": "Giới hạn về thiên kiến sống sót hoặc dữ liệu lịch sử cục bộ"
        },
        "falsifiability_condition": "Điều kiện thực nghiệm cụ thể nào nếu xảy ra sẽ bác bỏ hoàn toàn mô hình này? (Tối thiểu 25 từ)",
        "sample_size_and_replicability": "Quy mô dữ liệu kiểm chứng và khả năng tái lập qua các chu kỳ/quốc gia khác nhau (Tối thiểu 25 từ)",
        "counter_evidence_or_rival_model": "Mô hình đối lập hoặc các nghiên cứu phản biện chỉ ra điểm gãy của lý thuyết này (Tối thiểu 25 từ)"
      },
      "analogical_matrix_scaffold": [
        {
          "domain_name": "Miền ứng dụng 1 (Gốc)",
          "surface_features": "Các dấu hiệu bề mặt trong miền 1",
          "first_order_naive_reaction": "Phản ứng tuyến tính ngây thơ cấp độ 1",
          "second_order_systemic_mechanism": "Cơ chế thích ứng hệ thống cấp độ 2",
          "structural_invariant_shared": "Quy luật cấu trúc bất biến chung xuyên qua cả 3 miền"
        },
        {
          "domain_name": "Miền ứng dụng 2 (Chuyển giao gần)",
          "surface_features": "Các dấu hiệu bề mặt trong miền 2",
          "first_order_naive_reaction": "Phản ứng tuyến tính ngây thơ cấp độ 1",
          "second_order_systemic_mechanism": "Cơ chế thích ứng hệ thống cấp độ 2",
          "structural_invariant_shared": "Quy luật cấu trúc bất biến chung xuyên qua cả 3 miền"
        },
        {
          "domain_name": "Miền ứng dụng 3 (Chuyển giao xa - Far Transfer)",
          "surface_features": "Các dấu hiệu bề mặt trong miền 3",
          "first_order_naive_reaction": "Phản ứng tuyến tính ngây thơ cấp độ 1",
          "second_order_systemic_mechanism": "Cơ chế thích ứng hệ thống cấp độ 2",
          "structural_invariant_shared": "Quy luật cấu trúc bất biến chung xuyên qua cả 3 miền"
        }
      ]
    }
  ]
}
\`\`\`

${
  is5Day
    ? "Hãy tạo trọn bộ lộ trình gồm **5 bài học nguyên tử (`roadmap` có 5 phần tử từ `day: 1` đến `day: 5`)** bao quát toàn diện chủ đề trên theo đúng chuẩn JSON Schema này."
    : "Hãy tạo **1 bài học chuyên sâu nguyên tử (`roadmap` gồm 1 phần tử `day: 1`)** phân tích thấu đáo chủ đề trên theo đúng chuẩn JSON Schema này."
}`;
}
