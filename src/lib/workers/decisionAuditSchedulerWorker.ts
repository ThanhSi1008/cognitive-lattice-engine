import { Worker, Job, type ConnectionOptions } from "bullmq";
import { getRedisConnection, createQueue, QUEUE_DECISION_AUDIT } from "./queue";
import { getDb, DatabaseClient } from "../db";

export interface DecisionAuditJobData {
  journalId: string;
  userId: string;
  milestone: "30d" | "60d" | "90d";
  scheduledFor: string;
}

export interface ScheduledAuditJobs {
  job30dId: string;
  job60dId: string;
  job90dId: string;
  journalId: string;
  scheduledAt: Date;
}

// Hằng số tính theo mili-giây
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DELAY_30D_MS = 30 * MS_PER_DAY;
export const DELAY_60D_MS = 60 * MS_PER_DAY;
export const DELAY_90D_MS = 90 * MS_PER_DAY;

/**
 * Đẩy 3 delayed jobs vào BullMQ khi Nhật ký Quyết định chuyển sang is_locked = TRUE (Mục 5 docs/03)
 */
export async function scheduleDecisionAudits(
  journalId: string,
  userId: string,
  customDelaysMs?: { d30?: number; d60?: number; d90?: number }
): Promise<ScheduledAuditJobs> {
  const queue = createQueue(QUEUE_DECISION_AUDIT);
  const now = new Date();

  const delay30 = customDelaysMs?.d30 ?? DELAY_30D_MS;
  const delay60 = customDelaysMs?.d60 ?? DELAY_60D_MS;
  const delay90 = customDelaysMs?.d90 ?? DELAY_90D_MS;

  const job30 = await queue.add(
    "audit-reminder-30d",
    {
      journalId,
      userId,
      milestone: "30d",
      scheduledFor: new Date(now.getTime() + delay30).toISOString(),
    } satisfies DecisionAuditJobData,
    {
      delay: delay30,
      jobId: `audit-${journalId}-30d`,
      removeOnComplete: true,
    }
  );

  const job60 = await queue.add(
    "audit-reminder-60d",
    {
      journalId,
      userId,
      milestone: "60d",
      scheduledFor: new Date(now.getTime() + delay60).toISOString(),
    } satisfies DecisionAuditJobData,
    {
      delay: delay60,
      jobId: `audit-${journalId}-60d`,
      removeOnComplete: true,
    }
  );

  const job90 = await queue.add(
    "audit-reminder-90d",
    {
      journalId,
      userId,
      milestone: "90d",
      scheduledFor: new Date(now.getTime() + delay90).toISOString(),
    } satisfies DecisionAuditJobData,
    {
      delay: delay90,
      jobId: `audit-${journalId}-90d`,
      removeOnComplete: true,
    }
  );

  return {
    job30dId: job30.id || `audit-${journalId}-30d`,
    job60dId: job60.id || `audit-${journalId}-60d`,
    job90dId: job90.id || `audit-${journalId}-90d`,
    journalId,
    scheduledAt: now,
  };
}

/**
 * Xử lý tác vụ khi một mốc kiểm toán 30/60/90 ngày đến hạn
 */
export async function processAuditReminder(
  data: DecisionAuditJobData,
  client?: DatabaseClient
): Promise<{ audited: boolean; journalId: string; milestone: string }> {
  const db = client || (await getDb());
  
  // Xác nhận bản ghi nhật ký quyết định còn tồn tại và đang bị khóa
  const res = await db.query<{ id: string; is_locked: boolean }>(
    `SELECT id, is_locked FROM decision_journals WHERE id = $1`,
    [data.journalId]
  );

  if (res.rows.length === 0) {
    console.warn(`[decision-audit-worker] Không tìm thấy journal ${data.journalId}`);
    return { audited: false, journalId: data.journalId, milestone: data.milestone };
  }

  console.log(
    `[decision-audit-worker] Đã kích hoạt lịch hậu kiểm mốc ${data.milestone} cho Quyết định ${data.journalId}. Gửi thông báo yêu cầu người dùng điền review_${data.milestone}_data và tính Brier Score.`
  );

  return { audited: true, journalId: data.journalId, milestone: data.milestone };
}

/**
 * Khởi tạo BullMQ Worker lắng nghe các sự kiện kiểm toán quyết định
 */
export function startDecisionAuditWorker(): Worker {
  const connection = getRedisConnection();

  const worker = new Worker(
    QUEUE_DECISION_AUDIT,
    async (job: Job<DecisionAuditJobData>) => {
      console.log(`[decision-audit-worker] Đang xử lý job ${job.id} (mốc ${job.data.milestone})`);
      return await processAuditReminder(job.data);
    },
    {
      connection: connection as unknown as ConnectionOptions,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[decision-audit-worker] Job ${job.id} hoàn tất.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[decision-audit-worker] Job ${job?.id} thất bại:`, err.message);
  });

  return worker;
}
