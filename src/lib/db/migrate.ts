import { getDb, runMigrations, closeDb } from "./index";

async function main() {
  console.log("=== BẮT ĐẦU MIGRATION CƠ SỞ DỮ LIỆU CLE ===");
  try {
    const db = await getDb();
    console.log("Đã kết nối cơ sở dữ liệu thành công. Đang thực thi schema.sql...");
    
    await runMigrations(db);
    console.log("Đã thực thi thành công schema.sql và các Triggers:");
    console.log("  1. trg_set_incubation_unlock (learning_sessions)");
    console.log("  2. trg_enforce_zettel_links (permanent_zettels)");
    console.log("  3. trg_auto_leech_quarantine (fsrs_cards)");
    console.log("  4. trg_lock_decision_journal (decision_journals)");

    // Kiểm tra danh sách bảng
    const tablesRes = await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log("\nDanh sách các bảng đã tạo:");
    for (const row of tablesRes.rows) {
      console.log(` - ${row.table_name}`);
    }

    await closeDb();
    console.log("\n=== MIGRATION HOÀN TẤT THÀNH CÔNG ===");
    process.exit(0);
  } catch (err) {
    console.error("Lỗi khi chạy migration:", err);
    process.exit(1);
  }
}

main();
