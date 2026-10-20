import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { FsrsCardSchema } from "@/lib/validations";
import { scheduleFSRSCardReview } from "@/lib/algorithms/fsrs";
import {
  orderQueueByMaxContrast,
  filterEligibleInterleavingCards,
  InterleavingCardItem,
} from "@/lib/algorithms/interleaving";
import { Grade } from "ts-fsrs";

function parseVectorEmbedding(raw: any): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.map(Number);
  if (typeof raw === "string") {
    try {
      const clean = raw.trim();
      if (clean.startsWith("[") && clean.endsWith("]")) {
        return clean
          .slice(1, -1)
          .split(",")
          .map((s) => parseFloat(s.trim()))
          .filter((n) => !isNaN(n));
      }
      return JSON.parse(clean);
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";
    const dueOnly = searchParams.get("dueOnly") === "true";

    let query = `
      SELECT c.*, z.domain_category, z.atomic_title, z.embedding 
      FROM fsrs_cards c
      JOIN permanent_zettels z ON c.zettel_uid = z.zettel_uid
      WHERE c.user_id = $1
    `;
    if (dueOnly) {
      query += ` AND c.due_date <= NOW()`;
    }
    query += ` ORDER BY c.due_date ASC`;

    const res = await db.query(query, [userId]);

    // Chuẩn hóa sang định dạng InterleavingCardItem và bóc tách vector embedding 1536 chiều
    const rawCards: InterleavingCardItem[] = res.rows.map((row: any) => ({
      id: row.id,
      zettel_uid: row.zettel_uid,
      domain_category: row.domain_category || "General",
      embedding: parseVectorEmbedding(row.embedding),
      reps: row.reps,
      state: row.state,
      elapsed_days: row.elapsed_days,
      scheduled_days: row.scheduled_days,
      front_prompt: row.front_prompt,
      back_structure: row.back_structure,
      difficulty: row.difficulty,
    }));

    // Thực thi nghiêm ngặt RULE-03 (Scaffolding vs. Interleaving):
    // reps < 2 hoặc state !== 'REVIEW' -> scaffoldingPool (đơn miền)
    // reps >= 2 và state === 'REVIEW' -> interleavingPool (trộn tương phản cực đại)
    const { scaffoldingPool, interleavingPool } = filterEligibleInterleavingCards(rawCards);
    const orderedInterleavedCards = orderQueueByMaxContrast(interleavingPool);

    const orderedQueue: InterleavingCardItem[] = [
      ...scaffoldingPool.map((c) => ({ ...c, poolType: "SCAFFOLDING" as const })),
      ...orderedInterleavedCards.map((c) => ({ ...c, poolType: "INTERLEAVING" as const })),
    ];

    return NextResponse.json({
      cards: res.rows,
      orderedQueue,
      stats: {
        totalCards: rawCards.length,
        scaffoldingCount: scaffoldingPool.length,
        interleavingCount: interleavingPool.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const parsed = FsrsCardSchema.parse(body);

    const res = await db.query(
      `INSERT INTO fsrs_cards (
        user_id, zettel_uid, card_type, front_prompt, back_structure,
        stability, difficulty, elapsed_days, scheduled_days, reps, lapses,
        avg_response_time_sec, state, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        parsed.user_id,
        parsed.zettel_uid,
        parsed.card_type,
        parsed.front_prompt,
        parsed.back_structure,
        parsed.stability,
        parsed.difficulty,
        parsed.elapsed_days,
        parsed.scheduled_days,
        parsed.reps,
        parsed.lapses,
        parsed.avg_response_time_sec,
        parsed.state,
        parsed.due_date,
      ]
    );

    return NextResponse.json({ card: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  // Thực hiện ôn tập thẻ (Review submission với FSRS-5)
  try {
    const db = await getDb();
    const body = await request.json();
    const { cardId, grade, responseTimeSec } = body;

    if (!cardId || !grade || responseTimeSec === undefined) {
      return NextResponse.json({ error: "Missing review payload parameters" }, { status: 400 });
    }

    const cardRes = await db.query(`SELECT * FROM fsrs_cards WHERE id = $1`, [cardId]);
    if (cardRes.rows.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const card = cardRes.rows[0];

    // Cập nhật tốc độ phản hồi trung bình (moving average)
    const oldAvgTime = Number(card.avg_response_time_sec || 90.0);
    const newAvgTime = Math.round(oldAvgTime * 0.7 + Number(responseTimeSec) * 0.3);

    const result = scheduleFSRSCardReview({
      currentStability: card.stability,
      currentDifficulty: card.difficulty,
      elapsedDays: card.elapsed_days || 0,
      reps: card.reps,
      lapses: card.lapses,
      grade: grade as Grade,
      responseTimeSec: Number(responseTimeSec),
      avgResponseTimeSec: newAvgTime,
    });

    // Cập nhật thẻ vào cơ sở dữ liệu
    await db.query(
      `UPDATE fsrs_cards
       SET stability = $1,
           difficulty = $2,
           elapsed_days = $3,
           scheduled_days = $4,
           reps = $5,
           lapses = $6,
           state = $7,
           due_date = $8,
           last_review = $9,
           avg_response_time_sec = $10
       WHERE id = $11`,
      [
        result.card.stability,
        result.card.difficulty,
        result.card.elapsed_days,
        result.card.scheduled_days,
        result.card.reps,
        result.card.lapses,
        result.card.state,
        result.card.due_date,
        result.card.last_review,
        newAvgTime,
        cardId,
      ]
    );

    // Ghi nhận vào bảng lịch sử fsrs_review_logs để phục vụ FSRS Optimizer & Telemetry thực tế
    await db.query(
      `INSERT INTO fsrs_review_logs (
        user_id, card_id, grade, stability_before, stability_after,
        difficulty_before, difficulty_after, elapsed_days, response_time_sec
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        card.user_id,
        cardId,
        grade,
        card.stability,
        result.card.stability,
        card.difficulty,
        result.card.difficulty,
        card.elapsed_days || 0,
        Number(responseTimeSec),
      ]
    );

    return NextResponse.json({
      updatedCard: { ...card, ...result.card, avg_response_time_sec: newAvgTime },
      schedulingResult: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
