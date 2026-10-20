# PHASE 5 SPECIFICATION: SOCRATIC MULTI-AGENT ENGINE & RICH WORKBENCH UPGRADE

## 1. Nâng Cấp Thư Viện Giao Diện Cốt Lõi (Mandatory Package Additions)
Bổ sung và tích hợp thực tế vào giao diện SOP 60 Phút các thư viện sau (theo Mục 2.4 PRD):
1. **TipTap Structured Editor (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-character-count`):**
   - Thay thế `<textarea>` thuần trong **Closed-Book Literature Note Editor** (Phiên Sáng Phút 16–20, chặn sự kiện `onPaste`) và **Atomic Zettel Studio** (Phiên Chiều Phút 1–17).
   - Tích hợp popup gợi ý tự động (`[[Zettel_UID]]` autocomplete) truy vấn từ `/api/zettels` bằng khoảng cách cosine `pgvector` ngay khi người dùng gõ ký tự `[[`.
2. **Excalidraw Canvas (`@excalidraw/excalidraw`):**
   - Tích hợp vào bước **Blank-Page Recall Canvas** (Phiên Tối Phút 1–5) để người dùng vẽ sơ đồ nhân quả trên trang trắng và lưu cấu trúc `elements` + `appState` vào cột `s3_blank_recall_data (JSONB)`.

## 2. Kiến Trúc Đa Tác Tử Socratic (Dual-Agent Mentor–Critic Loop)
Áp dụng mô hình **Construction–Consolidation** (Roelle et al., 2023) và kiến trúc **Multi-Agent Autofeedback / SocraticAI** (Guo et al., 2024; Yang, 2023; Emergent Mind, 2026):
- **Nguyên tắc "Complementary Cognitive Artifact":** AI tuyệt đối không viết hộ ghi chú hay giải hộ thẻ nhớ (`RULE-01`, `RULE-04`).
- Mọi phản hồi của AI trong quá trình học phải đi qua **Pipeline 2 Tác tử (Dual-Agent Pipeline)**:
  1. **Agent 1 — Socratic Mentor (Socrates):** Phân tích đầu ra đã cam kết của người học (`s1_hypothesis_text`, `paraphrased_summary`, `permanent_zettel`, hoặc `committed_answer`) và sinh câu hỏi truy vấn theo đúng **5 Nhóm Phân loại Socratic (5-Category Socratic Taxonomy)**:
     - `CLARIFICATION`: Làm rõ khái niệm theo nguyên lý gốc (First Principles / Feynman).
     - `PROBING_ASSUMPTIONS`: Thử thách các tiền đề ngầm định.
     - `PROBING_EVIDENCE`: Yêu cầu bằng chứng thực nghiệm (PICO, cỡ mẫu, Risk of Bias).
     - `IMPLICATIONS_CONSEQUENCES`: Truy vấn hệ quả cấp 2 và cấp 3.
     - `ALTERNATIVE_VIEWPOINTS`: Đưa ra mô hình đối lập hoặc điều kiện biên làm sai lệch mô hình.
  2. **Agent 2 — Pedagogical Critic & Proofreader (Plato):** Kiểm duyệt đầu ra của Agent 1 trước khi trả về UI:
     - Loại bỏ hiện tượng khen ngợi sáo rỗng (`over-praise`) và suy luận hộ (`over-inference`).
     - Chặn mọi câu trả lời làm lộ đáp án trực tiếp (Solution Giveaway Guardrail).

## 3. Các API Endpoints Cần Triển Khai Trong `src/app/api/ai/`
1. **`POST /api/ai/embeddings`:** Sinh vector nhúng 1536 chiều thực tế từ nội dung `atomic_title + body_text` của Zettel (hỗ trợ API LLM cấu hình qua `.env` kèm cơ chế Deterministic TF-IDF/Hash Semantic Fallback 1536 chiều khi chạy offline với PGlite).
2. **`POST /api/ai/socratic-probe`:** Thực thi vòng lặp Dual-Agent (Socratic Mentor + Critic Proofreader) cho:
   - Phiên Sáng (sau khi người dùng mở khóa Cổng Đoán Trước và điền Critical Audit).
   - Phiên Chiều (kiểm tra tính Trừu tượng hóa Tỉnh thức của Zettel và sinh 3 đề bài tình huống `COUNTERFACTUAL`, `INTERLEAVED_CONTRAST`, `FAR_TRANSFER`).
3. **`POST /api/ai/evaluate-recall`:** Chấm điểm đối chiếu cấu trúc sâu cho Phiên Tối:
   - Đối chiếu sơ đồ/văn bản gợi nhớ trang trắng (`s3_blank_recall_data`) với Zettel buổi chiều.
   - Đối chiếu câu trả lời cam kết (`>= 30 từ`) ở hàng đợi FSRS với `back_structure`, kết hợp hàm `autoRating()` để đề xuất mức điểm FSRS (1: Again, 2: Hard, 3: Good, 4: Easy) khách quan và gợi ý bẻ nhỏ thẻ nếu rơi vào `LEECH_QUARANTINE`.
4. **`POST /api/ai/decision-redflags`:** Quét mạng lưới `permanent_zettels` của người dùng để cảnh báo các thiên kiến nhận thức hoặc hệ quả cấp 2/3 bị bỏ sót trong Nhật ký Quyết định trước khi khóa bất biến (`is_locked = TRUE`).
