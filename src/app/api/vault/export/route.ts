import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";

    // 1. Lấy toàn bộ Zettels của người dùng
    const zettelsRes = await db.query(
      `SELECT zettel_uid, atomic_title, body_text, word_count, domain_category, literature_note_id, state, created_at
       FROM permanent_zettels
       WHERE user_id = $1
       ORDER BY zettel_uid ASC`,
      [userId]
    );

    // 2. Lấy toàn bộ Zettel Links
    const linksRes = await db.query(
      `SELECT source_zettel_uid, target_zettel_uid, link_type, connection_rationale, created_at
       FROM zettel_links
       ORDER BY created_at ASC`
    );

    // 3. Lấy toàn bộ Nhật ký Quyết định
    const decisionsRes = await db.query(
      `SELECT id, user_id, problem_frame, primary_thesis, prob_positive, prob_neutral, prob_worst,
              physio_emotional_state, rejected_alternatives, second_third_order_effects,
              linked_zettel_uids, is_locked, review_30d_data, review_60d_data, review_90d_data, brier_score, created_at
       FROM decision_journals
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // 4. Lấy toàn bộ Ghi chú Tài liệu Đóng sách (Literature Notes)
    const literatureRes = await db.query(
      `SELECT id, user_id, source_citation, paraphrased_summary, critical_audit, analogical_matrix, created_at
       FROM literature_notes
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // 5. Lấy toàn bộ Thẻ Truy xuất FSRS
    const cardsRes = await db.query(
      `SELECT id, user_id, zettel_uid, card_type, front_prompt, back_structure, stability, difficulty,
              elapsed_days, scheduled_days, reps, lapses, avg_response_time_sec, state, due_date, last_review
       FROM fsrs_cards
       WHERE user_id = $1
       ORDER BY due_date ASC`,
      [userId]
    );

    // 6. Lấy Cấu hình Nhận thức Cá nhân (User Cognitive Settings)
    const settingsRes = await db.query(
      `SELECT user_id, desired_retention, fsrs_weights, active_roadmap, completed_module_ids, updated_at
       FROM user_cognitive_settings
       WHERE user_id = $1`,
      [userId]
    );

    // 7. Tạo gói Markdown tương thích Obsidian / Logseq
    const markdownFiles = zettelsRes.rows.map((z: any) => {
      const relatedLinks = linksRes.rows.filter(
        (l: any) => l.source_zettel_uid === z.zettel_uid || l.target_zettel_uid === z.zettel_uid
      );
      const linksSection = relatedLinks
        .map((l: any) => {
          const target = l.source_zettel_uid === z.zettel_uid ? l.target_zettel_uid : l.source_zettel_uid;
          return `- [[${target}]] (${l.link_type}): ${l.connection_rationale}`;
        })
        .join("\n");

      return `---
uid: "${z.zettel_uid}"
title: "${z.atomic_title.replace(/"/g, '\\"')}"
domain: "${z.domain_category}"
state: "${z.state}"
word_count: ${z.word_count}
created_at: "${z.created_at}"
---

# ${z.atomic_title}

${z.body_text}

## Liên Kết Hai Chiều (Bi-directional Links)
${linksSection || "Chưa có liên kết."}
`;
    });

    const exportBundle = {
      vaultVersion: "1.1.0",
      architecture: "Local-First Epistemic Zettelkasten",
      exportedAt: new Date().toISOString(),
      stats: {
        totalZettels: zettelsRes.rows.length,
        totalLinks: linksRes.rows.length,
        totalDecisions: decisionsRes.rows.length,
        totalLiteratureNotes: literatureRes.rows.length,
        totalCards: cardsRes.rows.length,
        hasUserSettings: settingsRes.rows.length > 0,
      },
      zettels: zettelsRes.rows,
      links: linksRes.rows,
      decisions: decisionsRes.rows,
      literatureNotes: literatureRes.rows,
      cards: cardsRes.rows,
      userSettings: settingsRes.rows[0] || null,
      markdownBundle: markdownFiles,
    };

    return NextResponse.json(exportBundle, {
      headers: {
        "Content-Disposition": `attachment; filename="cle-vault-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    console.error("[API/VAULT/EXPORT]", error);
    return NextResponse.json({ error: "Lỗi xuất hộp phiếu: " + error.message }, { status: 500 });
  }
}
