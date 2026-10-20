import { NextRequest, NextResponse } from "next/server";
import { PRESET_MENTAL_MODELS } from "@/lib/constants/presetMentalModels";
import { parseExternalAiResponse } from "@/lib/validations/ingestSchema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode,
      presetId,
      customTitle,
      customAuthor,
      customYear,
      customText,
      customDomain,
      externalAiRawText,
      moduleIndex,
      selectedModule,
    } = body;

    // 1. Chế độ nạp từ Frontier AI (Gemini 4 Argon High Thinking)
    if (mode === "EXTERNAL_AI") {
      if (selectedModule) {
        // Nạp trực tiếp một module đã chọn từ roadmap
        return NextResponse.json({
          title: selectedModule.title,
          author: selectedModule.citation.author,
          year: selectedModule.citation.year,
          domain: selectedModule.domain || body.domain || "Cognitive Science",
          fullText: (selectedModule.source_blocks || []).join("\n\n"),
          sourceBlocks: selectedModule.source_blocks || [],
          suggestedPrimaryClaim: selectedModule.activation_context,
          criticalAuditScaffold: selectedModule.critical_audit_scaffold,
          analogicalMatrixScaffold: selectedModule.analogical_matrix_scaffold,
          citation: selectedModule.citation,
        });
      }

      if (!externalAiRawText || !externalAiRawText.trim()) {
        return NextResponse.json(
          { error: "Vui lòng dán nội dung trả lời từ Gemini 4 Argon." },
          { status: 400 }
        );
      }

      const parseResult = parseExternalAiResponse(externalAiRawText);
      if (!parseResult.success || !parseResult.data) {
        return NextResponse.json({ error: parseResult.error }, { status: 422 });
      }

      const payload = parseResult.data;
      const targetIdx = typeof moduleIndex === "number" ? moduleIndex : 0;
      const activeMod = payload.roadmap[targetIdx] || payload.roadmap[0];

      return NextResponse.json({
        success: true,
        payload,
        activeModule: {
          title: activeMod.title,
          author: activeMod.citation.author,
          year: activeMod.citation.year,
          domain: payload.domain,
          fullText: (activeMod.source_blocks || []).join("\n\n"),
          sourceBlocks: activeMod.source_blocks || [],
          suggestedPrimaryClaim: activeMod.activation_context,
          criticalAuditScaffold: activeMod.critical_audit_scaffold,
          analogicalMatrixScaffold: activeMod.analogical_matrix_scaffold,
          citation: activeMod.citation,
        },
      });
    }

    // 2. Chế độ Thư viện Mẫu (Preset)
    if (mode === "PRESET") {
      const model = PRESET_MENTAL_MODELS[presetId || "HOWARD_MARKS_SECOND_ORDER"];
      if (!model) {
        return NextResponse.json({ error: "Không tìm thấy mô hình tư duy mẫu." }, { status: 404 });
      }
      return NextResponse.json({
        title: model.title,
        author: model.author,
        year: model.year,
        domain: model.domain,
        fullText: model.fullText,
        sourceBlocks: model.sourceBlocks,
        suggestedPrimaryClaim: model.suggestedPrimaryClaim,
        criticalAuditDefaults: model.criticalAuditDefaults,
        citation: {
          author: model.author,
          year: model.year,
          title: model.title,
          doi: `10.1000/cle.${model.id.toLowerCase()}`,
        },
      });
    }

    // 3. Chế độ Tự Nạp Văn Bản Học Thuật (Custom / DOI)
    if (mode === "CUSTOM") {
      if (!customText || !customText.trim()) {
        return NextResponse.json({ error: "Nội dung tài liệu học thuật không được để trống." }, { status: 400 });
      }

      const text = customText.trim();
      const rawParagraphs = text.split(/\n\s*\n/).map((p: string) => p.trim()).filter(Boolean);

      // Nhóm thành 2 đến 5 khối luận điểm
      const sourceBlocks: string[] = [];
      if (rawParagraphs.length <= 4) {
        sourceBlocks.push(...rawParagraphs);
      } else {
        const chunkSize = Math.ceil(rawParagraphs.length / 4);
        for (let i = 0; i < rawParagraphs.length; i += chunkSize) {
          sourceBlocks.push(rawParagraphs.slice(i, i + chunkSize).join("\n\n"));
        }
      }

      const title = customTitle?.trim() || "Tài liệu học thuật cá nhân";
      const author = customAuthor?.trim() || "Tác giả độc lập";
      const year = customYear || new Date().getFullYear();
      const domain = customDomain?.trim() || "General Cognitive Domain";

      return NextResponse.json({
        title,
        author,
        year,
        domain,
        fullText: text,
        sourceBlocks: sourceBlocks.slice(0, 5),
        suggestedPrimaryClaim: `Luận điểm chính của văn bản: ${title}`,
        criticalAuditDefaults: {
          study_design: "Tài liệu học thuật tự chọn",
          falsifiability: "Điều kiện biên phản nghiệm của luận đề trong văn bản",
          sample_size: "Dữ liệu thực nghiệm hoặc lập luận suy diễn",
          risk_of_bias_tool: "CASP / Cochrane RoB 2",
          risk_of_bias_rating: "MODERATE",
          counter_evidence: "Các góc nhìn phản bác tiềm ẩn từ trường phái đối lập",
        },
        citation: {
          author,
          year,
          title,
          doi: "custom.upload.doc",
        },
      });
    }

    return NextResponse.json(
      { error: "Chế độ nạp tài liệu không hợp lệ. Chấp nhận: EXTERNAL_AI, PRESET hoặc CUSTOM." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[API/AI/INGEST-SOURCE]", err);
    return NextResponse.json({ error: "Lỗi nạp và phân đoạn tài liệu: " + err.message }, { status: 500 });
  }
}
