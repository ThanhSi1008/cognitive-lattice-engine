import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { PermanentZettelSchema, ZettelLinkSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";
    const uid = searchParams.get("uid");

    if (uid) {
      const zettelRes = await db.query(`SELECT * FROM permanent_zettels WHERE zettel_uid = $1`, [uid]);
      const linksRes = await db.query(
        `SELECT * FROM zettel_links WHERE source_zettel_uid = $1 OR target_zettel_uid = $1`,
        [uid]
      );
      return NextResponse.json({
        zettel: zettelRes.rows[0] || null,
        links: linksRes.rows,
      });
    }

    const zettelsRes = await db.query(
      `SELECT * FROM permanent_zettels WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const linksRes = await db.query(
      `SELECT * FROM zettel_links WHERE source_zettel_uid IN (SELECT zettel_uid FROM permanent_zettels WHERE user_id = $1)`,
      [userId]
    );

    return NextResponse.json({
      zettels: zettelsRes.rows,
      links: linksRes.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();

    const parsed = PermanentZettelSchema.parse(body);

    const res = await db.query(
      `INSERT INTO permanent_zettels (
        zettel_uid, user_id, atomic_title, body_text, word_count, domain_category, literature_note_id, state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (zettel_uid) DO UPDATE
      SET atomic_title = EXCLUDED.atomic_title,
          body_text = EXCLUDED.body_text,
          word_count = EXCLUDED.word_count,
          domain_category = EXCLUDED.domain_category,
          state = EXCLUDED.state
      RETURNING *`,
      [
        parsed.zettel_uid,
        parsed.user_id,
        parsed.atomic_title,
        parsed.body_text,
        parsed.word_count,
        parsed.domain_category,
        parsed.literature_note_id || null,
        parsed.state,
      ]
    );

    return NextResponse.json({ zettel: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  // Tạo hoặc cập nhật liên kết hai chiều zettel_links
  try {
    const db = await getDb();
    const body = await request.json();

    const parsed = ZettelLinkSchema.parse(body);

    const res = await db.query(
      `INSERT INTO zettel_links (
        source_zettel_uid, target_zettel_uid, link_type, connection_rationale
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (source_zettel_uid, target_zettel_uid) DO UPDATE
      SET link_type = EXCLUDED.link_type,
          connection_rationale = EXCLUDED.connection_rationale
      RETURNING *`,
      [
        parsed.source_zettel_uid,
        parsed.target_zettel_uid,
        parsed.link_type,
        parsed.connection_rationale,
      ]
    );

    // Tự động chuyển các fleeting notes liên quan sang PROMOTED nếu có
    await db.query(
      `UPDATE fleeting_notes 
       SET status = 'PROMOTED', promoted_to_zettel_id = $1 
       WHERE status = 'PENDING' AND promoted_to_zettel_id IS NULL`,
      [parsed.source_zettel_uid]
    );

    return NextResponse.json({ link: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
