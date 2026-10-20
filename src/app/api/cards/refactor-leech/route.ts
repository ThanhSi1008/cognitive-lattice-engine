import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { cardId, atomicCards } = body;

    if (!cardId || !Array.isArray(atomicCards) || atomicCards.length < 2) {
      return NextResponse.json(
        { error: "Yêu cầu cardId và tối thiểu 2 atomicCards để phẫu thuật phân rã thẻ đỉa." },
        { status: 400 }
      );
    }

    // 1. Lấy thông tin thẻ đỉa hiện tại
    const originalRes = await db.query(
      `SELECT * FROM fsrs_cards WHERE id = $1`,
      [cardId]
    );

    if (originalRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy thẻ với ID đã cho." },
        { status: 404 }
      );
    }

    const orig = originalRes.rows[0];

    // 2. Tạo 2+ thẻ nguyên tử mới theo Nguyên lý Thông tin Tối thiểu
    const createdCards: any[] = [];
    for (const ac of atomicCards) {
      const cardType = ac.card_type || orig.card_type || "COUNTERFACTUAL";
      const frontPrompt = ac.front_prompt || ac.frontScenario || "Nguyên tử hóa câu hỏi";
      const backStructure = ac.back_structure || ac.targetConcept || "Cấu trúc tối thiểu";

      const insertRes = await db.query(
        `INSERT INTO fsrs_cards (
          user_id, zettel_uid, card_type, front_prompt, back_structure,
          stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state
        ) VALUES ($1, $2, $3, $4, $5, 1.0, 5.0, 0, 1, 0, 0, 'LEARNING')
        RETURNING *`,
        [orig.user_id, orig.zettel_uid, cardType, frontPrompt, backStructure]
      );
      createdCards.push(insertRes.rows[0]);
    }

    // 3. Giải phóng thẻ đỉa cũ: đặt lại lapses = 0, difficulty = 5.0, state = 'REVIEW'
    await db.query(
      `UPDATE fsrs_cards
       SET lapses = 0,
           difficulty = 5.0,
           state = 'REVIEW',
           scheduled_days = 1,
           elapsed_days = 0
       WHERE id = $1`,
      [cardId]
    );

    return NextResponse.json({
      success: true,
      releasedCardId: cardId,
      createdCount: createdCards.length,
      createdCards,
      message: "Đã phân rã thẻ đỉa thành các thẻ nguyên tử thành công và giải phóng khỏi Leech Quarantine.",
    });
  } catch (err: any) {
    console.error("[API/CARDS/REFACTOR-LEECH]", err);
    return NextResponse.json(
      { error: "Lỗi phẫu thuật thẻ đỉa: " + err.message },
      { status: 500 }
    );
  }
}
