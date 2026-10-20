import { NextResponse } from "next/server";
import { socraticMentor } from "@/lib/ai/socratic-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phase, input } = body;

    if (!phase || !input) {
      return NextResponse.json(
        { error: "Yêu cầu cung cấp phase ('MORNING' hoặc 'AFTERNOON') và input đối tượng." },
        { status: 400 }
      );
    }

    if (phase === "MORNING") {
      const { hypothesisText, sourcePreview, criticalAudit } = input;
      if (!hypothesisText || hypothesisText.trim().length === 0) {
        return NextResponse.json(
          { error: "Nguyên tắc Zero Cognitive Offloading: Phải cung cấp giả thuyết cam kết trước khi kích hoạt câu hỏi Socratic." },
          { status: 400 }
        );
      }
      const result = socraticMentor.generateMorningProbes({
        hypothesisText,
        sourcePreview,
        criticalAudit,
      });
      return NextResponse.json(result);
    }

    if (phase === "AFTERNOON") {
      const { atomicTitle, bodyText } = input;
      if (!atomicTitle || !bodyText) {
        return NextResponse.json(
          { error: "Cần cung cấp tiêu đề mệnh đề và thân bài của Zettel để phân tích Socratic." },
          { status: 400 }
        );
      }
      const result = socraticMentor.generateAfternoonProbes({
        atomicTitle,
        bodyText,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Phase không hợp lệ. Chỉ chấp nhận MORNING hoặc AFTERNOON." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[API/AI/SOCRATIC-PROBE]", err);
    return NextResponse.json(
      { error: "Lỗi thực thi Socratic Mentor–Critic Loop: " + err.message },
      { status: 500 }
    );
  }
}
