import { NextResponse } from "next/server";
import { socraticMentor } from "@/lib/ai/socratic-engine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { committedAnswer, backStructure, responseTimeSec, avgTimeSec, difficulty, isLeech } = body;

    if (!committedAnswer || !backStructure) {
      return NextResponse.json(
        { error: "Cần cung cấp committedAnswer và backStructure để đối chiếu cấu trúc sâu." },
        { status: 400 }
      );
    }

    const trimmed = committedAnswer.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 30) {
      return NextResponse.json(
        { error: "Vi phạm RULE-04: Câu trả lời cam kết phải đạt tối thiểu 30 từ trước khi chấm điểm cấu trúc sâu." },
        { status: 400 }
      );
    }

    const result = socraticMentor.evaluateRecall({
      committedAnswer,
      backStructure,
      responseTimeSec: responseTimeSec || 45,
      avgTimeSec: avgTimeSec || 60,
      difficulty: difficulty || 5.0,
      isLeech: !!isLeech,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API/AI/EVALUATE-RECALL]", err);
    return NextResponse.json(
      { error: "Lỗi đối chiếu cấu trúc sâu: " + err.message },
      { status: 500 }
    );
  }
}
