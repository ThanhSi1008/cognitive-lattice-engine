import { NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/ai/embeddings";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body.text || "";

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Văn bản đầu vào không được để trống khi sinh embedding." },
        { status: 400 }
      );
    }

    const result = await generateEmbedding(text);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API/AI/EMBEDDINGS]", err);
    return NextResponse.json(
      { error: "Lỗi sinh vector embedding: " + err.message },
      { status: 500 }
    );
  }
}
