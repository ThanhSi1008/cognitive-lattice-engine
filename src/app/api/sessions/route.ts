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
    let { id, userId, sessionId, s1_hypothesis_text, s1_completed_at, s2_completed_at, s3_blank_recall_data, s3_completed_at } = body;

    const targetId = id || sessionId;

    let targetSessionId = targetId;
    if (!targetSessionId && userId) {
      const todayRes = await db.query(
        `SELECT id FROM learning_sessions WHERE user_id = $1 AND date = CURRENT_DATE ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      if (todayRes.rows.length > 0) {
        targetSessionId = todayRes.rows[0].id;
      }
    }

    if (!targetSessionId) {
      return NextResponse.json({ error: "Missing session id or userId" }, { status: 400 });
    }

    // Lấy thông tin hiện tại để kiểm tra
    const currentSessionRes = await db.query(
      `SELECT * FROM learning_sessions WHERE id = $1`,
      [targetSessionId]
    );
    if (currentSessionRes.rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Khởi tạo chu kỳ luyện tập mới / học tiếp bài tiếp theo
    if (body.resetCycle) {
      await db.query(
        `UPDATE learning_sessions 
         SET s1_hypothesis_text = NULL,
             s1_completed_at = NULL,
             incubation_unlock_at = NULL,
             s2_completed_at = NULL,
             s3_blank_recall_data = NULL,
             s3_completed_at = NULL
         WHERE id = $1`,
        [targetSessionId]
      );
      const updated = await db.query(`SELECT * FROM learning_sessions WHERE id = $1`, [targetSessionId]);
      return NextResponse.json({ session: updated.rows[0], message: "Reset cycle successful" });
    }

    // Cập nhật s1_hypothesis_text độc lập
    if (s1_hypothesis_text !== undefined) {
      await db.query(
        `UPDATE learning_sessions SET s1_hypothesis_text = $1 WHERE id = $2`,
        [s1_hypothesis_text, targetSessionId]
      );
    }

    // Tua nhanh khóa ủ nhận thức 4 giờ (Simulate Incubation Complete)
    if (body.simulateIncubationComplete) {
      await db.query(
        `UPDATE learning_sessions 
         SET s1_completed_at = NOW() - INTERVAL '4 hours 5 minutes',
             incubation_unlock_at = NOW() - INTERVAL '5 minutes'
         WHERE id = $1`,
        [targetSessionId]
      );
    }

    // Cập nhật s1_completed_at
    if (s1_completed_at !== undefined) {
      const s1Time = s1_completed_at ? new Date(s1_completed_at) : null;
      await db.query(
        `UPDATE learning_sessions 
         SET s1_completed_at = $1
         WHERE id = $2`,
        [s1Time, targetSessionId]
      );
    }

    // Cập nhật s2_completed_at (Trigger trg_set_incubation_unlock và Constraint chk_incubation_period sẽ kiểm tra)
    if (s2_completed_at !== undefined) {
      const s2Time = s2_completed_at ? new Date(s2_completed_at) : null;
      await db.query(
        `UPDATE learning_sessions 
         SET s2_completed_at = $1
         WHERE id = $2`,
        [s2Time, targetSessionId]
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
        [s3_blank_recall_data ? JSON.stringify(s3_blank_recall_data) : null, s3Time, targetSessionId]
      );
    }

    const updated = await db.query(`SELECT * FROM learning_sessions WHERE id = $1`, [targetSessionId]);
    return NextResponse.json({ session: updated.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
