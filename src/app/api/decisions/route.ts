import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DecisionJournalSchema } from "@/lib/validations";
import { calculateBrierScore, DecisionOutcome } from "@/lib/algorithms/brier";
import { scheduleDecisionAudits } from "@/lib/workers/decisionAuditSchedulerWorker";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";
    const id = searchParams.get("id");

    if (id) {
      const res = await db.query(`SELECT * FROM decision_journals WHERE id = $1`, [id]);
      return NextResponse.json({ decision: res.rows[0] || null });
    }

    const res = await db.query(
      `SELECT * FROM decision_journals WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({ decisions: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const parsed = DecisionJournalSchema.parse(body);

    const res = await db.query(
      `INSERT INTO decision_journals (
        user_id, physio_emotional_state, problem_frame, rejected_alternatives,
        linked_zettel_uids, primary_thesis, prob_positive, prob_neutral, prob_worst,
        second_third_order_effects, is_locked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        parsed.user_id,
        JSON.stringify(parsed.physio_emotional_state),
        parsed.problem_frame,
        JSON.stringify(parsed.rejected_alternatives),
        parsed.linked_zettel_uids,
        parsed.primary_thesis,
        parsed.prob_positive,
        parsed.prob_neutral,
        parsed.prob_worst,
        JSON.stringify(parsed.second_third_order_effects),
        parsed.is_locked,
      ]
    );

    const newJournal = res.rows[0];

    // Nếu đã khóa ngay (hoặc khi bấm Commit & Lock), lập lịch hậu kiểm 30/60/90 ngày
    if (parsed.is_locked) {
      try {
        await scheduleDecisionAudits(newJournal.id, parsed.user_id);
      } catch (err: any) {
        console.warn("Lưu ý: Redis/BullMQ không khả dụng trong môi trường hiện tại, lập lịch hậu kiểm đã ghi nhận:", err.message);
      }
    }

    return NextResponse.json({ decision: newJournal }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  // Thực hiện hậu kiểm và tính điểm Brier
  try {
    const db = await getDb();
    const body = await request.json();
    const { id, milestone, outcome, reviewNotes } = body;

    if (!id || !milestone || !outcome) {
      return NextResponse.json({ error: "Missing audit parameters" }, { status: 400 });
    }

    const currentRes = await db.query(`SELECT * FROM decision_journals WHERE id = $1`, [id]);
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ error: "Decision journal not found" }, { status: 404 });
    }

    const journal = currentRes.rows[0];

    const brierResult = calculateBrierScore(
      {
        prob_positive: journal.prob_positive,
        prob_neutral: journal.prob_neutral,
        prob_worst: journal.prob_worst,
      },
      outcome as DecisionOutcome
    );

    const auditData = {
      outcome,
      brierResult,
      reviewNotes,
      auditedAt: new Date().toISOString(),
    };

    let fieldName = "review_30d_data";
    if (milestone === "60d") fieldName = "review_60d_data";
    if (milestone === "90d") fieldName = "review_90d_data";

    // Trigger trg_lock_decision_journal cho phép cập nhật review_*d_data và brier_score
    await db.query(
      `UPDATE decision_journals 
       SET ${fieldName} = $1, brier_score = $2 
       WHERE id = $3`,
      [JSON.stringify(auditData), brierResult.brierScore, id]
    );

    return NextResponse.json({
      success: true,
      brierResult,
      auditData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
