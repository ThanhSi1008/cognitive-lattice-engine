import { Worker, Job, type ConnectionOptions } from "bullmq";
import { getDb, DatabaseClient } from "../db";
import { getRedisConnection, QUEUE_FLEETING_NOTES_TTL } from "./queue";

export interface PurgeResult {
  purgedCount: number;
  purgedNoteIds: string[];
  executedAt: Date;
}

/**
 * Hàm lõi thực thi dọn dẹp và xóa cứng Fleeting Notes quá hạn 48 giờ (Mục 5 docs/03)
 * DELETE FROM fleeting_notes WHERE status = 'PENDING' AND expires_at <= NOW();
 */
export async function purgeExpiredFleetingNotes(client?: DatabaseClient): Promise<PurgeResult> {
  const db = client || (await getDb());
  const now = new Date();

  const res = await db.query<{ id: string }>(
    `DELETE FROM fleeting_notes 
     WHERE status = 'PENDING' AND expires_at <= NOW() 
     RETURNING id`
  );

  const purgedNoteIds = res.rows.map((r) => r.id);
  const purgedCount = purgedNoteIds.length;

  if (purgedCount > 0) {
    console.log(`[fleeting-notes-ttl-worker] Đã xóa cứng ${purgedCount} Fleeting Notes quá hạn 48h để triệt tiêu Ngụy biện Tích trữ.`);
  }

  return {
    purgedCount,
    purgedNoteIds,
    executedAt: now,
  };
}

/**
 * Khởi tạo BullMQ Worker chạy định kỳ xử lý tác vụ TTL Fleeting Notes
 */
export function startFleetingNotesTtlWorker(): Worker {
  const connection = getRedisConnection();

  const worker = new Worker(
    QUEUE_FLEETING_NOTES_TTL,
    async (job: Job) => {
      console.log(`[fleeting-notes-ttl-worker] Bắt đầu job ${job.id} (${job.name})`);
      const result = await purgeExpiredFleetingNotes();
      return result;
    },
    {
      connection: connection as unknown as ConnectionOptions,
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[fleeting-notes-ttl-worker] Job ${job.id} hoàn thành thành công.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[fleeting-notes-ttl-worker] Job ${job?.id} thất bại:`, err.message);
  });

  return worker;
}
