import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";

    // 1. Lấy toàn bộ Zettels
    const zettelsRes = await db.query(
      `SELECT zettel_uid, atomic_title, body_text, word_count, domain_category, state, created_at
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
      `SELECT id, problem_frame, primary_thesis, prob_positive, prob_neutral, prob_worst,
              linked_zettel_uids, brier_score, created_at
       FROM decision_journals
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // 4. Tạo gói Markdown tương thích Obsidian / Logseq
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
      vaultVersion: "1.0.0",
      architecture: "Local-First Epistemic Zettelkasten",
      exportedAt: new Date().toISOString(),
      stats: {
        totalZettels: zettelsRes.rows.length,
        totalLinks: linksRes.rows.length,
        totalDecisions: decisionsRes.rows.length,
      },
      zettels: zettelsRes.rows,
      links: linksRes.rows,
      decisions: decisionsRes.rows,
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
