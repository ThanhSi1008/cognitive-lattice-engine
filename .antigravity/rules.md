# SYSTEM SPECIFICATION: COGNITIVE LATTICE ENGINE (CLE)
## 1. Kiến Trúc & Công Nghệ Bắt Buộc (Mandatory Tech Stack)
- **Kiến trúc:** Local-First (IndexedDB / RxDB / PGlite) kết hợp Cloud Sync, đảm bảo độ trễ giao diện < 16ms (60fps) khi duyệt đồ thị Zettelkasten và lật thẻ FSRS.
- **Frontend:** Next.js 15+ (App Router, React 19, TypeScript), TailwindCSS, Zustand/TanStack Query.
- **Trình soạn thảo cấu trúc:** TipTap / ProseMirror (kiểm soát đếm từ, chặn Paste, kiểm tra cú pháp liên kết `[[Zettel_UID]]`).
- **Đồ thị mạng lưới tư duy:** Cytoscape.js (WebGL renderer) hỗ trợ hiển thị và phân cụm ngữ nghĩa > 10.000 nút Zettel.
- **Khung vẽ gợi nhớ trang trắng:** Excalidraw (`@excalidraw/excalidraw`).
- **Động cơ Lặp lại Ngắt quãng:** `ts-fsrs` (FSRS-5) và `fsrs-browser` (WebAssembly optimizer chạy trực tiếp trên trình duyệt).
- **Backend & Database:** PostgreSQL 16 + tiện ích mở rộng `pgvector` (lưu trữ vector ngữ nghĩa 1536 chiều).
- **Hàng đợi & CronJobs:** Redis + BullMQ (xử lý Hard TTL 48h cho Fleeting Notes và lịch kiểm toán 30-60-90 ngày cho Decision Journals).

## 2. Bốn Quy Tắc Trạng Thái Bất Biến (Invariant System Rules)
Mọi PR, Component giao diện và API Route do AI Agent viết BẮT BUỘC phải thực thi 4 quy tắc sau:

1. **RULE-01 — Zero-Highlighting Policy (Cấm Tô sáng Thụ động):**
   - CẤM tạo tính năng bôi màu văn bản (highlight) hoặc lưu bookmark một chạm trên trình đọc.
   - Mọi đoạn trích muốn lưu bắt buộc phải mở modal/sidebar yêu cầu người dùng tự giải thích cơ chế nhân quả và điền bảng kiểm định phản biện.

2. **RULE-02 — Cognitive Debt Circuit Breaker (Ngắt mạch Nợ Nhận thức 5%/95%):**
   - Trước khi mở Phiên Sáng, Backend phải tính chỉ số `DRLI` (Daily Review Load Index) và đếm số `fleeting_notes` quá hạn/sắp hết hạn.
   - Khóa cứng cổng nạp kiến thức mới ở Phiên Sáng nếu:
     a) `DRLI > 1.5` (số thời gian ôn tập thẻ FSRS đến hạn vượt 150% hạn mức 10 phút tối), HOẶC
     b) Có `>= 3` thẻ đang ở trạng thái `LEECH_QUARANTINE`, HOẶC
     c) Có `> 5` bản ghi `fleeting_notes` ở trạng thái `PENDING` chưa xử lý.

3. **RULE-03 — Adaptive Scaffolding Protocol (Giàn giáo Thích ứng):**
   - Thẻ FSRS mới tạo (`reps < 2` hoặc `state != 'REVIEW'`) phải được ôn tập ở chế độ đơn miền (Single-Domain Scaffolding) để đóng gói khái niệm cơ bản vững chắc trước khi được đưa vào thuật toán trộn đan xen đa miền (`Max-Contrast Greedy Interleaving Pool`).

4. **RULE-04 — Commit-Before-Reveal Gate (Cam kết Trước khi Tiết lộ):**
   - Ở Cổng Đoán Trước (Phiên Sáng), Gợi nhớ Trang trắng (Phiên Tối) và Lật thẻ FSRS (Phiên Tối): Tuyệt đối ẩn văn bản gốc / mặt sau của thẻ cho đến khi người dùng nhập đủ độ dài cam kết tối thiểu và bấm nút Submit.
