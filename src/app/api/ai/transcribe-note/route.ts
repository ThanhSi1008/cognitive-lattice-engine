import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Nội dung giọng nói không được để trống." }, { status: 400 });
    }

    const raw = text.trim();

    // Loại bỏ các từ đệm thông thường trong khẩu ngữ tiếng Việt & tiếng Anh
    const fillerPatterns = [
      /\b(ờ|à|ừm|ừ|hả|nè|nhé|nhỉ|thì là mà|kiểu như là|thì là)\b/gi,
      /\b(um|uh|like|you know|basically|actually|literally)\b/gi,
    ];

    let cleaned = raw;
    for (const pattern of fillerPatterns) {
      cleaned = cleaned.replace(pattern, " ");
    }

    // Chuẩn hóa khoảng trắng và dấu câu
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      if (!/[.!?]$/.test(cleaned)) {
        cleaned += ".";
      }
    }

    // Trích xuất luận điểm cốt lõi (key insight)
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    const keyInsight = sentences[0] || cleaned;

    return NextResponse.json({
      original: raw,
      cleanedNote: cleaned,
      keyInsight,
      wordCount: cleaned.split(/\s+/).length,
    });
  } catch (err: any) {
    console.error("[API/AI/TRANSCRIBE-NOTE]", err);
    return NextResponse.json({ error: "Lỗi chuẩn hóa giọng nói: " + err.message }, { status: 500 });
  }
}
