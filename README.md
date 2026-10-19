# Cognitive Lattice Engine (CLE)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-336791)](https://www.postgresql.org/)

**Cognitive Lattice Engine (CLE)** là nền tảng quản trị tri thức và rèn luyện nhận thức chuyên sâu, tích hợp quy trình thao tác chuẩn **SOP 60 phút mỗi ngày**, mô hình ghi nhớ **FSRS-5 (DSR)**, mạng lưới tri thức **Zettelkasten** đồ thị WebGL, và nhật ký quyết định với chuẩn kiểm toán **Brier Score**.

---

## 🏛 Kiến Trúc & Quy Tắc Trạng Thái Bất Biến (System Invariants)

1. **`RULE-01`: Zero-Highlighting & Tái Cấu Trúc Bắt Buộc**
   - Vô hiệu hóa tính năng bôi màu (highlighting/underlining) thụ động.
   - Bắt buộc điền phiếu kiểm định lập luận phản biện (*Critical Argument Audit Rubric*) và ma trận loại suy chéo miền (*Analogical Transfer Matrix* $\ge 3$ miền tri thức).
2. **`RULE-02`: Ngắt Mạch Nợ Nhận Thức (Cognitive Debt Circuit Breaker)**
   - Khóa cổng nạp tri thức mới khi chỉ số nợ nhận thức $\text{DRLI} > 1.5$ hoặc có $> 5$ *Fleeting Notes* quá hạn. Bắt buộc chuyển sang chế độ tái cấu trúc hệ thống (*System Refactoring Mode*).
3. **`RULE-03`: Giàn Giáo Thích Ứng & Chống Tích Hợp Vội Vã**
   - Khái niệm mới phải vượt qua tối thiểu $2$ chu kỳ truy xuất đơn miền (`reps >= 2`) trước khi được đưa vào bể trộn đan xen đa miền (*Interleaving Pool*).
4. **`RULE-04`: Cam Kết Trước Khi Tiết Lộ (Commit-Before-Reveal)**
   - Vô hiệu hóa thao tác lật thẻ tức thì. Bắt buộc gõ tối thiểu $\ge 30$ từ gợi nhớ chủ động trước khi mở đáp án.

---

## ⏱ Quy Trình Thao Tác Chuẩn 60 Phút (Daily SOP)

| Phân Hệ | Thời Gian | Tên Giai Đoạn | Cơ Chế Cốt Lõi |
|---|---|---|---|
| **Phiên 1: Sáng** | 20 Phút | *Tiếp Nhận Sâu & Đóng Sách* | Cổng Đoán Trước (180s, $\ge 50$ từ), Không highlight, Ghi chú đóng sách ($50-200$ từ, paste blocked), Khóa ủ nhận thức 4h |
| **Phiên 2: Trưa** | 5 Phút | *Hộp Đệm Thoáng Qua* | Neural Incubation Lock đếm ngược 4h, Hộp thư Fleeting Notes với Hard TTL 48h tự động xóa cứng |
| **Phiên 3: Chiều** | 20 Phút | *Xưởng Chưng Cất Nguyên Tử* | Phiếu Zettel vĩnh cửu ($100-350$ từ), Tiêu đề mệnh đề (không dấu `?`), $\ge 2$ liên kết hai chiều kèm lý giải $\ge 30$ ký tự, Perturbation Card Studio |
| **Phiên 4: Tối** | 15 Phút | *Truy Xuất Đan Xen & Nhật Ký* | Blank-Page Recall Canvas, Hàng đợi FSRS-5 trộn đan xen cực đại tương phản $J(c_t, c)$, Nhật ký quyết định 7 trường, Immutable lock, Lịch kiểm toán 30-60-90 ngày |

---

## 📊 Cognitive Telemetry Dashboard (ECG Nhận Thức)

1. **Atomic Zettel Velocity:** Đo lường nhịp độ sinh thẻ nguyên tử hàng tuần (mục tiêu $3 - 7$ Zettels/tuần).
2. **Memory Stability Telemetry:** Phản ánh bước nhảy vọt độ ổn định $\Delta S$ khi truy xuất thành công ở vùng ma sát tối ưu $R \in [70\%, 85\%]$.
3. **Forgetting Index Calibration:** Hiệu chuẩn chỉ số quên mục tiêu $FI$ và hiển thị vector 19 trọng số FSRS-5 $\mathbf{w} = (w_0, \dots, w_{18})$.
4. **Decision Calibration Matrix:** Đánh giá độ tin cậy dự báo thông qua điểm Brier đa lớp ($BS \in [0, 2]$).

---

## 🛠 Tech Stack

- **Framework:** Next.js 15+ (App Router, React 19, TypeScript)
- **Styling:** TailwindCSS
- **Database:** Dual-mode PostgreSQL 16 + `pgvector` / Local-First embedded `@electric-sql/pglite`
- **Graph Engine:** Cytoscape.js (WebGL renderer) với thuật toán CoSE phân cụm tự động khi $\ge 50$ Zettels
- **Spaced Repetition:** FSRS-5 (DSR Memory Model) & WebAssembly optimizer
- **Workers:** BullMQ + Redis / InMemory Worker Engine
- **Testing:** Vitest (59/59 unit tests)

---

## 🚀 Khởi Chạy Dự Án

### Yêu Cầu Môi Trường
- Node.js 18.18+ hoặc 20+

### Cài Đặt & Chạy Phát Triển

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev
```

Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

### Kiểm Thử Toàn Diện

```bash
npx vitest run
```
