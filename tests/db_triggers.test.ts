import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getDb, runMigrations, closeDb } from "../src/lib/db";

describe("PostgreSQL Schema & Triggers Verification", () => {
  beforeEach(async () => {
    const db = await getDb();
    await runMigrations(db);
  });

  afterAll(async () => {
    await closeDb();
  });

  it("Trigger 1: trg_set_incubation_unlock tự động cộng 4 giờ vào incubation_unlock_at khi hoàn thành S1", async () => {
    const db = await getDb();
    const userId = "00000000-0000-0000-0000-000000000001";
    const s1CompletedAt = new Date("2026-10-19T08:00:00Z");

    await db.query(
      `INSERT INTO learning_sessions (user_id, date, s1_hypothesis_text, s1_completed_at)
       VALUES ($1, CURRENT_DATE, $2, $3)
       ON CONFLICT (user_id, date) DO UPDATE 
       SET s1_completed_at = $3`,
      [userId, "Dự đoán cơ chế vận hành hệ thống...", s1CompletedAt.toISOString()]
    );

    const res = await db.query<{ incubation_unlock_at: string }>(
      `SELECT incubation_unlock_at FROM learning_sessions WHERE user_id = $1 AND date = CURRENT_DATE`,
      [userId]
    );

    expect(res.rows.length).toBe(1);
    const unlockTime = new Date(res.rows[0].incubation_unlock_at);
    const expectedUnlockTime = new Date(s1CompletedAt.getTime() + 4 * 60 * 60 * 1000);
    expect(unlockTime.getTime()).toBe(expectedUnlockTime.getTime());
  });

  it("Trigger 2: trg_enforce_zettel_links chặn PUBLISHED nếu có dưới 2 liên kết hai chiều", async () => {
    const db = await getDb();
    const userId = "00000000-0000-0000-0000-000000000001";
    const zettelUid = "20261019120000";

    // 1. Tạo Zettel ở trạng thái DRAFT
    await db.query(
      `INSERT INTO permanent_zettels (zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state)
       VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')
       ON CONFLICT (zettel_uid) DO NOTHING`,
      [
        zettelUid,
        userId,
        "Định luật lợi nhuận biên giảm dần trong tối ưu hóa nhận thức",
        "Nội dung thân bài Zettel nguyên tử dài hơn 100 từ để thỏa mãn ràng buộc toàn vẹn cơ sở dữ liệu...",
        120,
        "Cognitive Science",
      ]
    );

    // 2. Cố gắng cập nhật sang PUBLISHED khi chưa có đủ 2 links -> Bắt buộc ném lỗi
    await expect(
      db.query(`UPDATE permanent_zettels SET state = 'PUBLISHED' WHERE zettel_uid = $1`, [zettelUid])
    ).rejects.toThrow(/VIOLATION: Zettel .* phải có tối thiểu 2 liên kết hai chiều/);

    // 3. Tạo 2 zettels khác và thêm 2 links
    const target1 = "20261019120001";
    const target2 = "20261019120002";
    await db.query(
      `INSERT INTO permanent_zettels (zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, state)
       VALUES ($1, $2, 'Target 1 atomic title proposition sample', 'Body text 1...', 110, 'General', 'DRAFT'),
              ($3, $2, 'Target 2 atomic title proposition sample', 'Body text 2...', 115, 'General', 'DRAFT')
       ON CONFLICT (zettel_uid) DO NOTHING`,
      [target1, userId, target2]
    );

    await db.query(
      `INSERT INTO zettel_links (source_zettel_uid, target_zettel_uid, link_type, connection_rationale)
       VALUES ($1, $2, 'EXTENDS_PAST', 'Mở rộng cơ chế phân bổ nhận thức từ mô hình cũ với độ dài lớn hơn ba mươi ký tự'),
              ($1, $3, 'SUPPORTS', 'Minh chứng thực nghiệm ủng hộ giả thuyết ban đầu với độ dài lớn hơn ba mươi ký tự')
       ON CONFLICT DO NOTHING`,
      [zettelUid, target1, target2]
    );

    // 4. Giờ có 2 links, cập nhật sang PUBLISHED phải thành công!
    await db.query(`UPDATE permanent_zettels SET state = 'PUBLISHED' WHERE zettel_uid = $1`, [zettelUid]);
    const updated = await db.query<{ state: string }>(
      `SELECT state FROM permanent_zettels WHERE zettel_uid = $1`,
      [zettelUid]
    );
    expect(updated.rows[0].state).toBe("PUBLISHED");
  });

  it("Trigger 3: trg_auto_leech_quarantine tự động chuyển sang LEECH_QUARANTINE khi difficulty >= 8.5 hoặc lapses >= 3", async () => {
    const db = await getDb();
    const userId = "00000000-0000-0000-0000-000000000001";
    const zettelUid = "20261019120000";

    // 1. Tạo card bình thường difficulty = 5.0, lapses = 0 -> state = NEW
    const insertRes = await db.query<{ id: string; state: string }>(
      `INSERT INTO fsrs_cards (user_id, zettel_uid, card_type, front_prompt, back_structure, difficulty, lapses, state)
       VALUES ($1, $2, 'COUNTERFACTUAL', 'Tình huống phản thực tế giả định...', 'Đáp án...', 5.0, 0, 'NEW')
       RETURNING id, state`,
      [userId, zettelUid]
    );
    const cardId = insertRes.rows[0].id;
    expect(insertRes.rows[0].state).toBe("NEW");

    // 2. Cập nhật lapses = 3 -> Trigger kích hoạt đổi state = LEECH_QUARANTINE
    await db.query(`UPDATE fsrs_cards SET lapses = 3 WHERE id = $1`, [cardId]);
    const checkLapses = await db.query<{ state: string }>(
      `SELECT state FROM fsrs_cards WHERE id = $1`,
      [cardId]
    );
    expect(checkLapses.rows[0].state).toBe("LEECH_QUARANTINE");

    // 3. Tạo card mới với difficulty = 8.8 -> Ngay lập tức đổi state = LEECH_QUARANTINE
    const directLeech = await db.query<{ state: string }>(
      `INSERT INTO fsrs_cards (user_id, zettel_uid, card_type, front_prompt, back_structure, difficulty, lapses, state)
       VALUES ($1, $2, 'FAR_TRANSFER', 'Tình huống chuyển giao xa...', 'Đáp án...', 8.8, 0, 'NEW')
       RETURNING state`,
      [userId, zettelUid]
    );
    expect(directLeech.rows[0].state).toBe("LEECH_QUARANTINE");
  });

  it("Trigger 4: trg_lock_decision_journal chống sửa đổi bản ghi đã khóa (is_locked = TRUE)", async () => {
    const db = await getDb();
    const userId = "00000000-0000-0000-0000-000000000001";

    const insertRes = await db.query<{ id: string }>(
      `INSERT INTO decision_journals (
        user_id, physio_emotional_state, problem_frame, rejected_alternatives,
        linked_zettel_uids, primary_thesis, prob_positive, prob_neutral, prob_worst,
        second_third_order_effects, is_locked
      ) VALUES (
        $1,
        '{"stress_level": 3, "sleep_hours": 8, "emotional_bias": "None"}',
        'Định khung vấn đề bài toán đầu tư công nghệ...',
        '[{"alt": "A", "why": "X"}, {"alt": "B", "why": "Y"}]',
        ARRAY['20261019120000'],
        'Giả thuyết cốt lõi...',
        50, 30, 20,
        '{"opp_cost": "Short", "sec_order": "5w", "third_order": "5m"}',
        TRUE
      ) RETURNING id`,
      [userId]
    );
    const journalId = insertRes.rows[0].id;

    // Cố tình sửa đổi problem_frame hoặc xác suất khi đã khóa -> Phải ném ngoại lệ IMMUTABLE_RECORD_ERROR
    await expect(
      db.query(`UPDATE decision_journals SET prob_positive = 70 WHERE id = $1`, [journalId])
    ).rejects.toThrow(/IMMUTABLE_RECORD_ERROR/);

    // Nhưng được phép cập nhật dữ liệu hậu kiểm và brier_score!
    await db.query(
      `UPDATE decision_journals 
       SET review_30d_data = '{"outcome": "POSITIVE", "notes": "Hậu kiểm 30 ngày"}',
           brier_score = 0.25
       WHERE id = $1`,
      [journalId]
    );

    const verified = await db.query<{ brier_score: number }>(
      `SELECT brier_score FROM decision_journals WHERE id = $1`,
      [journalId]
    );
    expect(verified.rows[0].brier_score).toBe(0.25);
  });
});
