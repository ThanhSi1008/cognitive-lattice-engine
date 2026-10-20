import { NextResponse } from "next/server";
import { socraticMentor } from "@/lib/ai/socratic-engine";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { problemFraming, selectedOption, discardedOptions, probabilityOutcomes } = body;

    if (!problemFraming || !selectedOption) {
      return NextResponse.json(
        { error: "Cần cung cấp định khung vấn đề (problemFraming) và phương án lựa chọn (selectedOption)." },
        { status: 400 }
      );
    }

    // Retrieve user's existing permanent Zettels from DB to cross-reference
    let userZettels: Array<{ atomic_title: string; body_text: string }> = [];
    try {
      const db = await getDb();
      const res = await db.query<{ atomic_title: string; body_text: string }>(
        "SELECT atomic_title, body_text FROM permanent_zettels WHERE review_status = 'PUBLISHED' ORDER BY created_at DESC LIMIT 20"
      );
      userZettels = res.rows;
    } catch (err) {
      console.warn("[API/AI/DECISION-REDFLAGS] DB query fallback:", err);
    }

    const result = socraticMentor.scanDecisionRedflags({
      problemFraming,
      selectedOption,
      discardedOptions: discardedOptions || [],
      probabilityOutcomes,
      userZettels,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API/AI/DECISION-REDFLAGS]", err);
    return NextResponse.json(
      { error: "Lỗi quét thiên kiến quyết định: " + err.message },
      { status: 500 }
    );
  }
}
