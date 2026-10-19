import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { LiteratureNoteSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    // Kiểm tra tính hợp lệ bằng Zod Schema (Critical Audit + Analogical Matrix >= 3 domains)
    const parsed = LiteratureNoteSchema.parse(body);

    const res = await db.query(
      `INSERT INTO literature_notes (
        user_id, source_citation, paraphrased_summary, critical_audit, analogical_matrix
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        parsed.user_id,
        JSON.stringify(parsed.source_citation),
        parsed.paraphrased_summary,
        JSON.stringify(parsed.critical_audit),
        JSON.stringify(parsed.analogical_matrix),
      ]
    );

    return NextResponse.json({ note: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";
    const noteId = searchParams.get("id");

    if (noteId) {
      const res = await db.query(`SELECT * FROM literature_notes WHERE id = $1`, [noteId]);
      return NextResponse.json({ note: res.rows[0] || null });
    }

    const res = await db.query(
      `SELECT * FROM literature_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );
    return NextResponse.json({ notes: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
