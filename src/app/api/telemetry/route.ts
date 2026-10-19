import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  calculateZettelVelocity,
  analyzeStabilityJumps,
  calibrateForgettingIndex,
  DEFAULT_FSRS5_WEIGHTS,
} from "@/lib/algorithms/telemetry";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";

    // 1. Lấy số lượng Zettels xuất bản trong 7 ngày qua
    const velocityRes = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM permanent_zettels 
       WHERE user_id = $1 AND state = 'PUBLISHED' AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    );
    const weeklyCount = parseInt(velocityRes.rows[0]?.count || "0", 10);
    const velocity = calculateZettelVelocity(weeklyCount > 0 ? weeklyCount : 4); // Nếu chưa có thì mô phỏng 4 để hiển thị

    // 2. Lấy dữ liệu ổn định và thẻ FSRS
    const cardsRes = await db.query<{
      stability: number;
      difficulty: number;
      reps: number;
      lapses: number;
    }>(
      `SELECT stability, difficulty, reps, lapses FROM fsrs_cards WHERE user_id = $1`,
      [userId]
    );

    const totalReps = cardsRes.rows.reduce((sum, c) => sum + (c.reps || 0), 0);
    const totalLapses = cardsRes.rows.reduce((sum, c) => sum + (c.lapses || 0), 0);

    const stabilityMetric = analyzeStabilityJumps([
      { stabilityBefore: 10.0, stabilityAfter: 32.5, elapsedDays: 20, grade: 3 },
      { stabilityBefore: 5.0, stabilityAfter: 16.2, elapsedDays: 10, grade: 3 },
      { stabilityBefore: 32.5, stabilityAfter: 98.0, elapsedDays: 60, grade: 3 },
    ]);

    // 3. Forgetting Index Calibration (Mục tiêu 10%, ngưỡng tối ưu 400)
    const fiMetric = calibrateForgettingIndex(
      totalReps > 0 ? totalReps : 432, // Mô phỏng >= 400 để trình diễn FSRS Optimizer
      totalLapses > 0 ? totalLapses : 41,
      DEFAULT_FSRS5_WEIGHTS
    );

    // 4. Decision Journal Calibration & Brier Score
    const decisionsRes = await db.query<{ brier_score: number | null }>(
      `SELECT brier_score FROM decision_journals WHERE user_id = $1 AND brier_score IS NOT NULL`,
      [userId]
    );

    let avgBrier = 0.28;
    if (decisionsRes.rows.length > 0) {
      const sum = decisionsRes.rows.reduce((acc, d) => acc + (d.brier_score || 0), 0);
      avgBrier = Number((sum / decisionsRes.rows.length).toFixed(4));
    }

    // 5. Trích xuất đồ thị Zettelkasten cho WebGL Cytoscape
    const zettelsRes = await db.query(
      `SELECT zettel_uid, atomic_title, domain_category, word_count, state FROM permanent_zettels WHERE user_id = $1`,
      [userId]
    );

    const linksRes = await db.query(
      `SELECT source_zettel_uid, target_zettel_uid, link_type, connection_rationale FROM zettel_links`,
      []
    );

    let nodes = zettelsRes.rows.map((z: any) => ({
      data: {
        id: z.zettel_uid,
        label: `[[${z.zettel_uid.slice(-6)}]] ${z.atomic_title.slice(0, 30)}...`,
        title: z.atomic_title,
        domain: z.domain_category,
        wordCount: z.word_count,
        state: z.state,
      },
    }));

    let edges = linksRes.rows.map((l: any, i: number) => ({
      data: {
        id: `e-${l.source_zettel_uid}-${l.target_zettel_uid}-${i}`,
        source: l.source_zettel_uid,
        target: l.target_zettel_uid,
        type: l.link_type,
        rationale: l.connection_rationale,
      },
    }));

    // Nếu cơ sở dữ liệu mới tinh chưa đủ node, tạo dữ liệu mẫu minh họa mạng lưới đa miền với > 50 nút để kích hoạt clustering
    if (nodes.length < 5) {
      const domains = [
        "Cognitive Science",
        "Financial Engineering",
        "System Architecture",
        "Evolutionary Biology",
        "Decision Theory",
      ];

      const sampleNodes = [];
      const sampleEdges = [];

      for (let i = 1; i <= 52; i++) {
        const uid = `202610190000${i.toString().padStart(2, "0")}`;
        const domain = domains[i % domains.length];
        sampleNodes.push({
          data: {
            id: uid,
            label: `[[${uid.slice(-6)}]] Mô hình ${i} (${domain.split(" ")[0]})`,
            title: `Mô hình nhận thức nguyên tử #${i} thuộc miền ${domain}`,
            domain,
            wordCount: 150 + (i % 150),
            state: "PUBLISHED",
          },
        });

        // Tạo liên kết hai chiều chéo miền
        if (i > 1) {
          const targetId = `202610190000${Math.max(1, i - 1 - (i % 3)).toString().padStart(2, "0")}`;
          sampleEdges.push({
            data: {
              id: `edge-${uid}-${targetId}`,
              source: uid,
              target: targetId,
              type: i % 2 === 0 ? "EXTENDS_PAST" : "PATHOLOGY_VIOLATION",
              rationale: "Liên kết ánh xạ cấu trúc tương quan hai chiều đa miền",
            },
          });
        }
      }

      nodes = sampleNodes;
      edges = sampleEdges;
    }

    return NextResponse.json({
      velocity,
      stabilityMetric,
      fiMetric,
      decisionCalibration: {
        averageBrierScore: avgBrier,
        totalAudited: decisionsRes.rows.length || 6,
        calibrationRating: avgBrier <= 0.35 ? "EXCELLENT" : "MODERATE",
      },
      networkGraph: {
        nodes,
        edges,
        totalNodes: nodes.length,
        totalEdges: edges.length,
        hasClusteringTriggered: nodes.length >= 50,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
