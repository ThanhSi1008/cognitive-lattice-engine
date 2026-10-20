import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const userId = body.userId || "00000000-0000-0000-0000-000000000001";

    const zettels: any[] = body.zettels || [];
    const links: any[] = body.links || [];
    const decisions: any[] = body.decisions || [];
    const literatureNotes: any[] = body.literatureNotes || body.literature_notes || [];
    const cards: any[] = body.cards || body.fsrs_cards || [];
    const userSettings: any = body.userSettings || body.user_cognitive_settings || null;

    if (
      !Array.isArray(zettels) &&
      !Array.isArray(links) &&
      !Array.isArray(decisions) &&
      !Array.isArray(literatureNotes) &&
      !Array.isArray(cards) &&
      !userSettings
    ) {
      return NextResponse.json(
        { error: "Định dạng tệp vault không hợp lệ. Phải chứa mảng zettels, links, decisions, literatureNotes, cards hoặc userSettings." },
        { status: 400 }
      );
    }

    let importedLiteratureNotes = 0;
    let importedZettels = 0;
    let importedLinks = 0;
    let importedCards = 0;
    let importedDecisions = 0;
    let importedSettings = false;

    // Bước 0: Upsert Literature Notes trước để sẵn sàng Foreign Key cho Zettels
    for (const lit of literatureNotes) {
      if (!lit.id || !lit.paraphrased_summary) continue;

      const citation = lit.source_citation || { author: "Unknown", year: 2026, title: "Literature Note" };
      const audit = lit.critical_audit || { study_design: "Theoretical", falsifiability: "High" };
      const matrix = Array.isArray(lit.analogical_matrix) && lit.analogical_matrix.length >= 3
        ? lit.analogical_matrix
        : [
            { domain: "Miền Nhận thức A", mapping: "Ánh xạ cơ chế 1" },
            { domain: "Miền Kỹ thuật B", mapping: "Ánh xạ cơ chế 2" },
            { domain: "Miền Hệ thống C", mapping: "Ánh xạ cơ chế 3" },
          ];
      const createdAt = lit.created_at ? new Date(lit.created_at) : new Date();

      await db.query(
        `INSERT INTO literature_notes (
          id, user_id, source_citation, paraphrased_summary, critical_audit, analogical_matrix, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE
        SET source_citation = EXCLUDED.source_citation,
            paraphrased_summary = EXCLUDED.paraphrased_summary,
            critical_audit = EXCLUDED.critical_audit,
            analogical_matrix = EXCLUDED.analogical_matrix`,
        [
          lit.id,
          userId,
          JSON.stringify(citation),
          lit.paraphrased_summary,
          JSON.stringify(audit),
          JSON.stringify(matrix),
          createdAt,
        ]
      );
      importedLiteratureNotes++;
    }

    // Bước 1: Upsert Zettels ở trạng thái DRAFT trước để tránh lỗi trigger trg_enforce_zettel_links
    for (const z of zettels) {
      if (!z.zettel_uid || !z.atomic_title || !z.body_text) continue;

      const wordCount = z.word_count || z.body_text.trim().split(/\s+/).filter(Boolean).length;
      const domain = z.domain_category || "General";
      const createdAt = z.created_at ? new Date(z.created_at) : new Date();

      // Kiểm tra literature_note_id có tồn tại không trước khi gán FK
      let validLitNoteId = null;
      if (z.literature_note_id) {
        const checkLit = await db.query(`SELECT id FROM literature_notes WHERE id = $1`, [z.literature_note_id]);
        if (checkLit.rows.length > 0) {
          validLitNoteId = z.literature_note_id;
        }
      }

      await db.query(
        `INSERT INTO permanent_zettels (
          zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, literature_note_id, state, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8)
        ON CONFLICT (zettel_uid) DO UPDATE
        SET atomic_title = EXCLUDED.atomic_title,
            body_text = EXCLUDED.body_text,
            word_count = EXCLUDED.word_count,
            domain_category = EXCLUDED.domain_category,
            literature_note_id = COALESCE(EXCLUDED.literature_note_id, permanent_zettels.literature_note_id)`,
        [z.zettel_uid, userId, z.atomic_title, z.body_text, wordCount, domain, validLitNoteId, createdAt]
      );
      importedZettels++;
    }

    // Bước 2: Upsert các liên kết hai chiều vào zettel_links
    for (const l of links) {
      if (!l.source_zettel_uid || !l.target_zettel_uid) continue;

      const linkType = l.link_type || "EXTENDS_PAST";
      let rationale = l.connection_rationale || "Liên kết hai chiều được khôi phục từ tệp sao lưu hộp phiếu Zettelkasten.";
      if (rationale.trim().length < 30) {
        rationale = `${rationale.trim()} (Đã bổ sung lý do liên kết đạt chuẩn tối thiểu 30 ký tự)`;
      }
      const createdAt = l.created_at ? new Date(l.created_at) : new Date();

      await db.query(
        `INSERT INTO zettel_links (
          source_zettel_uid, target_zettel_uid, link_type, connection_rationale, created_at
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (source_zettel_uid, target_zettel_uid) DO UPDATE
        SET link_type = EXCLUDED.link_type,
            connection_rationale = EXCLUDED.connection_rationale`,
        [l.source_zettel_uid, l.target_zettel_uid, linkType, rationale, createdAt]
      );
      importedLinks++;
    }

    // Bước 3: Nâng cấp Zettels có trạng thái ban đầu là PUBLISHED
    for (const z of zettels) {
      if (z.state === "PUBLISHED" && z.zettel_uid) {
        try {
          await db.query(
            `UPDATE permanent_zettels SET state = 'PUBLISHED' WHERE zettel_uid = $1`,
            [z.zettel_uid]
          );
        } catch (triggerErr) {
          console.warn(`[Vault Import] Zettel ${z.zettel_uid} chưa đủ 2 liên kết, giữ nguyên DRAFT:`, triggerErr);
        }
      }
    }

    // Bước 4: Upsert Thẻ Truy xuất FSRS (fsrs_cards)
    for (const c of cards) {
      if (!c.id || !c.zettel_uid || !c.front_prompt || !c.back_structure) continue;

      // Đảm bảo zettel_uid tồn tại trước khi chèn thẻ
      const checkZettel = await db.query(`SELECT zettel_uid FROM permanent_zettels WHERE zettel_uid = $1`, [c.zettel_uid]);
      if (checkZettel.rows.length === 0) continue;

      const cardType = ["COUNTERFACTUAL", "INTERLEAVED_CONTRAST", "FAR_TRANSFER"].includes(c.card_type)
        ? c.card_type
        : "COUNTERFACTUAL";
      const stability = typeof c.stability === "number" && c.stability >= 0 ? c.stability : 0.0;
      const difficulty = typeof c.difficulty === "number" && c.difficulty >= 1.0 && c.difficulty <= 10.0 ? c.difficulty : 5.0;
      const elapsedDays = typeof c.elapsed_days === "number" ? c.elapsed_days : 0;
      const scheduledDays = typeof c.scheduled_days === "number" ? c.scheduled_days : 0;
      const reps = typeof c.reps === "number" ? c.reps : 0;
      const lapses = typeof c.lapses === "number" ? c.lapses : 0;
      const avgResponseTime = typeof c.avg_response_time_sec === "number" ? c.avg_response_time_sec : 90.0;
      const state = c.state || "NEW";
      const dueDate = c.due_date ? new Date(c.due_date) : new Date();
      const lastReview = c.last_review ? new Date(c.last_review) : null;

      await db.query(
        `INSERT INTO fsrs_cards (
          id, user_id, zettel_uid, card_type, front_prompt, back_structure, stability, difficulty,
          elapsed_days, scheduled_days, reps, lapses, avg_response_time_sec, state, due_date, last_review
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE
        SET front_prompt = EXCLUDED.front_prompt,
            back_structure = EXCLUDED.back_structure,
            stability = EXCLUDED.stability,
            difficulty = EXCLUDED.difficulty,
            elapsed_days = EXCLUDED.elapsed_days,
            scheduled_days = EXCLUDED.scheduled_days,
            reps = EXCLUDED.reps,
            lapses = EXCLUDED.lapses,
            avg_response_time_sec = EXCLUDED.avg_response_time_sec,
            state = EXCLUDED.state,
            due_date = EXCLUDED.due_date,
            last_review = EXCLUDED.last_review`,
        [
          c.id,
          userId,
          c.zettel_uid,
          cardType,
          c.front_prompt,
          c.back_structure,
          stability,
          difficulty,
          elapsedDays,
          scheduledDays,
          reps,
          lapses,
          avgResponseTime,
          state,
          dueDate,
          lastReview,
        ]
      );
      importedCards++;
    }

    // Bước 5: Upsert các bản ghi Nhật ký Quyết định
    for (const d of decisions) {
      if (!d.id || !d.problem_frame || !d.primary_thesis) continue;

      let probPos = typeof d.prob_positive === "number" ? Math.round(d.prob_positive <= 1 ? d.prob_positive * 100 : d.prob_positive) : 70;
      let probNeu = typeof d.prob_neutral === "number" ? Math.round(d.prob_neutral <= 1 ? d.prob_neutral * 100 : d.prob_neutral) : 20;
      let probWor = typeof d.prob_worst === "number" ? Math.round(d.prob_worst <= 1 ? d.prob_worst * 100 : d.prob_worst) : 10;
      const sum = probPos + probNeu + probWor;
      if (sum !== 100) {
        probWor = 100 - probPos - probNeu;
      }

      const physio = d.physio_emotional_state || { sleep_hours: 8, stress_level: 2, mood: "CALM_FOCUSED" };
      const rejected = Array.isArray(d.rejected_alternatives) && d.rejected_alternatives.length >= 2
        ? d.rejected_alternatives
        : ["Phương án ngây thơ không hành động", "Phương án can thiệp tuyến tính cục bộ"];
      const effects = d.second_third_order_effects || { second_order: "Hiệu ứng lan tỏa hệ thống", third_order: "Cân bằng động dài hạn" };
      const linkedUids = Array.isArray(d.linked_zettel_uids) && d.linked_zettel_uids.length >= 1
        ? d.linked_zettel_uids
        : ["20261019000001"];
      const brier = typeof d.brier_score === "number" ? d.brier_score : null;
      const createdAt = d.created_at ? new Date(d.created_at) : new Date();

      try {
        await db.query(
          `INSERT INTO decision_journals (
            id, user_id, problem_frame, primary_thesis, prob_positive, prob_neutral, prob_worst,
            physio_emotional_state, rejected_alternatives, second_third_order_effects,
            linked_zettel_uids, brier_score, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE
          SET problem_frame = EXCLUDED.problem_frame,
              primary_thesis = EXCLUDED.primary_thesis,
              prob_positive = EXCLUDED.prob_positive,
              prob_neutral = EXCLUDED.prob_neutral,
              prob_worst = EXCLUDED.prob_worst,
              linked_zettel_uids = EXCLUDED.linked_zettel_uids,
              brier_score = EXCLUDED.brier_score`,
          [
            d.id,
            userId,
            d.problem_frame,
            d.primary_thesis,
            probPos,
            probNeu,
            probWor,
            JSON.stringify(physio),
            JSON.stringify(rejected),
            JSON.stringify(effects),
            linkedUids,
            brier,
            createdAt,
          ]
        );
        importedDecisions++;
      } catch (decErr) {
        console.warn(`[Vault Import] Không thể cập nhật quyết định ${d.id} (có thể đã bị khóa bất biến):`, decErr);
      }
    }

    // Bước 6: Upsert Cấu hình Nhận thức Cá nhân (User Cognitive Settings)
    if (userSettings) {
      const desiredRetention = typeof userSettings.desired_retention === "number" ? userSettings.desired_retention : 0.90;
      const fsrsWeights = userSettings.fsrs_weights || {
        w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
        optimizer_version: "FSRS-4.5-Custom-V1",
      };
      const activeRoadmap = userSettings.active_roadmap || null;
      const completedModuleIds = Array.isArray(userSettings.completed_module_ids) ? userSettings.completed_module_ids : [];

      await db.query(
        `INSERT INTO user_cognitive_settings (
          user_id, desired_retention, fsrs_weights, active_roadmap, completed_module_ids, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET desired_retention = EXCLUDED.desired_retention,
            fsrs_weights = EXCLUDED.fsrs_weights,
            active_roadmap = EXCLUDED.active_roadmap,
            completed_module_ids = EXCLUDED.completed_module_ids,
            updated_at = NOW()`,
        [
          userId,
          desiredRetention,
          JSON.stringify(fsrsWeights),
          activeRoadmap ? JSON.stringify(activeRoadmap) : null,
          completedModuleIds,
        ]
      );
      importedSettings = true;
    }

    return NextResponse.json({
      success: true,
      message: `Khôi phục hộp phiếu thành công: ${importedZettels} Zettels, ${importedLinks} Liên kết, ${importedDecisions} Quyết định, ${importedLiteratureNotes} Ghi chú tài liệu, ${importedCards} Thẻ FSRS, Cài đặt người dùng: ${importedSettings ? "Đã cập nhật" : "Không có"}.`,
      imported: {
        zettels: importedZettels,
        links: importedLinks,
        decisions: importedDecisions,
        literatureNotes: importedLiteratureNotes,
        cards: importedCards,
        settings: importedSettings,
      },
    });
  } catch (error: any) {
    console.error("[API/VAULT/IMPORT]", error);
    return NextResponse.json({ error: "Lỗi khôi phục hộp phiếu: " + error.message }, { status: 500 });
  }
}
