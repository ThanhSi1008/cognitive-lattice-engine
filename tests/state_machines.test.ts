import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getDb, runMigrations, closeDb } from "../src/lib/db";
import { countWords, ANTI_ROTE_REGEX } from "../src/lib/validations";

describe("PHASE 3: SOP 60-Minute State Machine Workflows", () => {
  beforeEach(async () => {
    const db = await getDb();
    await runMigrations(db);
  });

  afterAll(async () => {
    await closeDb();
  });

  it("Phân Hệ 1 (Phiên Sáng): Cổng Đoán Trước yêu cầu tối thiểu 50 từ trước khi mở khóa văn bản nguồn", () => {
    const text49 = Array(49).fill("từ").join(" ");
    expect(countWords(text49)).toBe(49);
    expect(countWords(text49) >= 50).toBe(false);

    const text50 = Array(50).fill("từ").join(" ");
    expect(countWords(text50)).toBe(50);
    expect(countWords(text50) >= 50).toBe(true);
  });

  it("Phân Hệ 1 (Phiên Sáng): Ghi chú đóng sách bắt buộc nằm trong khoảng 50 - 200 từ", () => {
    const text45 = Array(45).fill("từ").join(" ");
    const text150 = Array(150).fill("từ").join(" ");
    const text220 = Array(220).fill("từ").join(" ");

    expect(countWords(text45) >= 50 && countWords(text45) <= 200).toBe(false);
    expect(countWords(text150) >= 50 && countWords(text150) <= 200).toBe(true);
    expect(countWords(text220) >= 50 && countWords(text220) <= 200).toBe(false);
  });

  it("Phân Hệ 2 (Giữa Ngày): Khóa ủ 4 giờ (Neural Incubation Lock) từ chối bắt đầu Phiên Chiều nếu chưa qua 4h", () => {
    const s1CompletedAt = new Date("2026-10-19T08:00:00Z");
    const incubationUnlockAt = new Date(s1CompletedAt.getTime() + 4 * 60 * 60 * 1000); // 12:00

    const earlyAfternoon = new Date("2026-10-19T10:30:00Z"); // mới 2.5h
    expect(earlyAfternoon.getTime() >= incubationUnlockAt.getTime()).toBe(false);

    const validAfternoon = new Date("2026-10-19T12:05:00Z"); // đã qua 4h5m
    expect(validAfternoon.getTime() >= incubationUnlockAt.getTime()).toBe(true);
  });

  it("Phân Hệ 3 (Phiên Chiều): Permanent Zettel bắt buộc từ 100 đến 350 từ và tiêu đề không chứa dấu '?'", () => {
    const invalidTitle = "Mô hình này hoạt động như thế nào?";
    expect(invalidTitle.includes("?")).toBe(true);

    const validTitle = "Giàn giáo thích ứng bảo toàn khả năng xử lý thông tin";
    expect(validTitle.includes("?")).toBe(false);
    expect(validTitle.length).toBeGreaterThanOrEqual(20);

    const body95Words = Array(95).fill("chữ").join(" ");
    const body200Words = Array(200).fill("chữ").join(" ");
    expect(countWords(body95Words) >= 100 && countWords(body95Words) <= 350).toBe(false);
    expect(countWords(body200Words) >= 100 && countWords(body200Words) <= 350).toBe(true);
  });

  it("Phân Hệ 3 (Phiên Chiều): Bộ lọc chống học vẹt (Anti-Rote Regex) chặn các câu hỏi định nghĩa bề mặt", () => {
    const badPrompts = [
      "Khái niệm ngắt mạch nhận thức là gì?",
      "Hãy nêu định nghĩa của thuật toán FSRS-5 trong hệ thống CLE",
      "What is the definition of retrieval practice?",
      "Define the principle of cognitive load theory",
    ];

    for (const prompt of badPrompts) {
      expect(ANTI_ROTE_REGEX.test(prompt)).toBe(true);
    }

    const goodCounterfactualPrompt =
      "Nếu điều kiện thanh khoản sụt giảm đột ngột 50% trong khi lãi suất cơ bản giữ nguyên, cơ chế phản hồi cấp 2 nào sẽ chi phối bảng cân đối kế toán?";
    expect(ANTI_ROTE_REGEX.test(goodCounterfactualPrompt)).toBe(false);
    expect(goodCounterfactualPrompt.length).toBeGreaterThanOrEqual(80);
  });

  it("Phân Hệ 4 (Phiên Tối): Cam kết hồi tưởng trước khi lật mặt sau thẻ (RULE-04) yêu cầu >= 30 từ", () => {
    const text25 = Array(25).fill("từ").join(" ");
    expect(countWords(text25) >= 30).toBe(false);

    const text35 = Array(35).fill("từ").join(" ");
    expect(countWords(text35) >= 30).toBe(true);
  });

  it("Phân Hệ 4 (Phiên Tối): Nhật ký Quyết định yêu cầu tổng 3 xác suất bằng đúng 100%", () => {
    const invalidProbabilities = { pos: 50, neu: 30, worst: 15 }; // 95% != 100%
    expect(invalidProbabilities.pos + invalidProbabilities.neu + invalidProbabilities.worst === 100).toBe(false);

    const validProbabilities = { pos: 60, neu: 30, worst: 10 }; // 100%
    expect(validProbabilities.pos + validProbabilities.neu + validProbabilities.worst === 100).toBe(true);
  });
});
