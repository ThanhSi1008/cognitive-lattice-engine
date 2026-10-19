import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { calculateDRLI } from "@/lib/algorithms/governor";
import { LearningSessionSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";

    // 1. Lấy phiên học hôm nay
    const sessionRes = await db.query(
      `SELECT * FROM learning_sessions WHERE user_id = $1 AND date = CURRENT_DATE`,
      [userId]
    );

    // 2. Lấy danh sách thẻ đến hạn và thống kê Leech
    const dueCardsRes = await db.query<{ id: string; avg_response_time_sec: number; state: string }>(
      `SELECT id, avg_response_time_sec, state FROM fsrs_cards 
       WHERE user_id = $1 AND due_date <= NOW()`,
      [userId]
    );

    const leechCountRes = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM fsrs_cards 
       WHERE user_id = $1 AND state = 'LEECH_QUARANTINE'`,
      [userId]
    );

    // 3. Lấy số lượng Fleeting Notes pending
    const pendingNotesRes = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM fleeting_notes 
       WHERE user_id = $1 AND status = 'PENDING'`,
      [userId]
    );

    const leechCount = parseInt(leechCountRes.rows[0]?.count || "0", 10);
    const pendingNotesCount = parseInt(pendingNotesRes.rows[0]?.count || "0", 10);

    // 4. Tính toán DRLI và trạng thái Ngắt mạch RULE-02
    const governorResult = calculateDRLI({
      dueCards: dueCardsRes.rows,
      leechQuarantineCount: leechCount,
      pendingFleetingNotesCount: pendingNotesCount,
    });

    let session = sessionRes.rows[0] || null;

    if (!session) {
      // Tự động khởi tạo phiên học cho hôm nay nếu chưa có
      const initRes = await db.query(
        `INSERT INTO learning_sessions (user_id, date, drli_score)
         VALUES ($1, CURRENT_DATE, $2)
         RETURNING *`,
        [userId, governorResult.drli]
      );
      session = initRes.rows[0];
    } else {
      // Cập nhật drli_score mới nhất
      await db.query(
        `UPDATE learning_sessions SET drli_score = $1 WHERE id = $2`,
        [governorResult.drli, session.id]
      );
      session.drli_score = governorResult.drli;
    }

    return NextResponse.json({
      session,
      governor: governorResult,
      dueCardsCount: dueCardsRes.rows.length,
      leechCount,
      pendingNotesCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { id, s1_hypothesis_text, s1_completed_at, s2_completed_at, s3_blank_recall_data, s3_completed_at } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 });
    }

    // Lấy thông tin hiện tại để kiểm tra incubation lock
    const currentSessionRes = await db.query(
      `SELECT * FROM learning_sessions WHERE id = $1`,
      [id]
    );
    if (currentSessionRes.rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const current = currentSessionRes.rows[0];

    // Cập nhật s1_completed_at
    if (s1_completed_at !== undefined) {
      const s1Time = s1_completed_at ? new Date(s1_completed_at) : null;
      await db.query(
        `UPDATE learning_sessions 
         SET s1_hypothesis_text = COALESCE($1, s1_hypothesis_text),
             s1_completed_at = $2
         WHERE id = $3`,
        [s1_hypothesis_text, s1Time, id]
      );
    }

    // Cập nhật s2_completed_at (Trigger trg_set_incubation_unlock và Constraint chk_incubation_period sẽ kiểm tra)
    if (s2_completed_at !== undefined) {
      const s2Time = s2_completed_at ? new Date(s2_completed_at) : null;
      await db.query(
        `UPDATE learning_sessions 
         SET s2_completed_at = $1
         WHERE id = $2`,
        [s2Time, id]
      );
    }

    // Cập nhật s3_completed_at & s3_blank_recall_data
    if (s3_completed_at !== undefined || s3_blank_recall_data !== undefined) {
      const s3Time = s3_completed_at ? new Date(s3_completed_at) : null;
      await db.query(
        `UPDATE learning_sessions 
         SET s3_blank_recall_data = COALESCE($1, s3_blank_recall_data),
             s3_completed_at = COALESCE($2, s3_completed_at)
         WHERE id = $3`,
        [s3_blank_recall_data ? JSON.stringify(s3_blank_recall_data) : null, s3Time, id]
      );
    }

    const updated = await db.query(`SELECT * FROM learning_sessions WHERE id = $1`, [id]);
    return NextResponse.json({ session: updated.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
