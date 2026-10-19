import { Queue, Worker, QueueEvents, type ConnectionOptions } from "bullmq";
import Redis from "ioredis";

// Queue names
export const QUEUE_FLEETING_NOTES_TTL = "fleeting-notes-ttl-queue";
export const QUEUE_DECISION_AUDIT = "decision-audit-queue";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let sharedRedisConnection: Redis | null = null;
let isRedisAvailable = false;

export function getRedisConnection(): Redis {
  if (sharedRedisConnection) return sharedRedisConnection;

  sharedRedisConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 3) {
        // Tránh loop spam nếu Redis chưa chạy cục bộ
        return null;
      }
      return Math.min(times * 100, 1000);
    },
  });

  sharedRedisConnection.on("connect", () => {
    isRedisAvailable = true;
  });

  sharedRedisConnection.on("error", (err) => {
    isRedisAvailable = false;
  });

  return sharedRedisConnection;
}

export function checkRedisAvailable(): boolean {
  return isRedisAvailable;
}

export function createQueue(name: string): Queue {
  const connection = getRedisConnection();
  return new Queue(name, {
    connection: connection as unknown as ConnectionOptions,
  });
}
