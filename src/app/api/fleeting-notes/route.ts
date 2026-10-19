import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { FleetingNoteSchema } from "@/lib/validations";
import { purgeExpiredFleetingNotes } from "@/lib/workers/fleetingNotesTtlWorker";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";

    // Trước khi trả về, tự động chạy purge các note quá hạn 48h
    await purgeExpiredFleetingNotes(db);

    const res = await db.query(
      `SELECT * FROM fleeting_notes 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({ notes: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const parsed = FleetingNoteSchema.parse(body);

    const res = await db.query(
      `INSERT INTO fleeting_notes (user_id, raw_content, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [parsed.user_id, parsed.raw_content, parsed.status]
    );

    return NextResponse.json({ note: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("id");

    if (!noteId) {
      return NextResponse.json({ error: "Missing note id" }, { status: 400 });
    }

    await db.query(`DELETE FROM fleeting_notes WHERE id = $1`, [noteId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
