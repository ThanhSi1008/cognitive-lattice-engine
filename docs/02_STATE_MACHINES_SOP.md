# UI STATE MACHINES & WORKFLOW SPECIFICATION (SOP 60 PHÚT/NGÀY)

## 1. Phân Hệ 1: Không Gian Khởi Tạo & Tiếp Thu Chủ Động (Phiên Sáng – 20 Phút)
### Điều kiện tiên quyết (Pre-condition Gate - RULE-02)
- Kiểm tra `drli_score <= 1.5`, số lượng thẻ `LEECH_QUARANTINE < 3`, và số lượng `fleeting_notes` trạng thái `PENDING <= 5`. Nếu vi phạm, chuyển hướng cưỡng bức sang màn hình **System Refactoring Mode**.

### State 1.1: Cổng Đoán Trước (Pre-Reading Generation Gate | Phút 1–3)
- **Hiển thị:** Chỉ hiển thị Tiêu đề khái niệm + Bối cảnh kích hoạt + Đồng hồ đếm ngược `03:00` (180 giây).
- **Cưỡng chế giao diện:** Phần thân bài đọc bị phủ CSS `filter: blur(12px); pointer-events: none; user-select: none;`.
- **Điều kiện chuyển tiếp (Transition):** Người dùng phải gõ dự đoán cơ chế vận hành vào ô `s1_hypothesis_text` đạt tối thiểu **>= 50 từ** trước khi nút `Unlock Source Text` được bật.

### State 1.2: Trình Đọc Phân Đoạn & Tự Giải Thích Đồng Thời (Concurrent Self-Explanation Reader | Phút 4–15)
- **Cưỡng chế RULE-01:** Vô hiệu hóa menu bôi màu/highlight mặc định.
- **Chia cột:**
  - Cột trái: Văn bản nguồn được chia thành các khối luận điểm (argument blocks).
  - Cột phải (Mandatory Analysis Sidebar):
    1. **Khung Tự Giải Thích & Đối Chiếu:** Trả lời *"Tại sao nguyên lý này đúng?"* và chỉ ra điểm sai lệch/bỏ sót trong dự đoán ban đầu ở Phút 1–3.
    2. **Bộ lọc Kiểm định Phản biện (`Critical Audit Widget`):** Bắt buộc điền đủ các trường theo chuẩn `04_CRITICAL_AUDIT_RUBRIC.md` (`falsifiability`, `sample_size`, `counter_evidence`, công cụ đánh giá sai lệch).
    3. **Ma trận Ánh xạ Tương tự Đa miền (`Multi-domain Analogical Matrix`):** Bảng đối chiếu cơ chế vận hành của mô hình qua **tối thiểu 3 miền ứng dụng khác nhau** (ví dụ: Đầu tư Tài chính, Chính sách Công, Quản trị Kỹ thuật/Kiến trúc Phần mềm).

### State 1.3: Trình Chưng Cất Ghi Chú Tài Liệu Đóng Sách (Closed-Book Literature Note Editor | Phút 16–20)
- **Hành vi tự động:** Đúng phút thứ 16 (hoặc khi bấm chuyển bước), đóng sập và khóa hoàn toàn Cột trái (`Source Panel Collapsed & Locked`).
- **Quy tắc nhập liệu:**
  - Chặn sự kiện `onPaste` (`e.preventDefault()`) trên trình soạn thảo để chống sao chép nguyên văn.
  - Yêu cầu viết `paraphrased_summary` bằng ngôn từ cá nhân trong giới hạn **50 đến 200 từ**.
  - Đồng bộ metadata trích dẫn (Zotero/Mendeley API hoặc nhập tay: `author`, `year`, `title`, `pages`, `zotero_key`).
- **Kết thúc Phiên Sáng:** Lưu `literature_notes`, cập nhật `s1_completed_at = NOW()` và kích hoạt khóa `incubation_unlock_at = NOW() + 4 hours`.

---

## 2. Phân Hệ 2: Bộ Đệm Chuyển Hóa Thần Kinh Giữa Ngày (Diffuse Mode & Fleeting Notes Engine)
### State 2.1: Khóa Khoảng Nghỉ Sinh Học (Neural Incubation Lock)
- Khóa cứng nút bắt đầu Phiên Chiều đối với đơn vị kiến thức vừa học cho đến khi `NOW() >= incubation_unlock_at` (tối thiểu 4 giờ). Hiển thị đồng hồ đếm ngược khuyến khích người dùng vận động/nghỉ ngơi kích hoạt Chế độ Phân tán (Diffuse Mode).

### State 2.2: Hộp Đệm Ghi Chú Thoáng Qua Tự Hủy (TTL Fleeting Notes Inbox - PWA)
- Cho phép nhập nhanh bằng văn bản hoặc giọng nói (Web Speech API / Whisper).
- Hiển thị thanh đếm ngược 48 giờ (`expires_at - NOW()`) đổi màu từ Xanh -> Vàng (< 12h) -> Đỏ (< 3h) trên từng ghi chú.

---

## 3. Phân Hệ 3: Xưởng Chưng Cất Nguyên Tử & Mạng Lưới Zettelkasten (Phiên Chiều – 20 Phút)
### State 3.1: Xưởng Chưng Cất Nguyên Tử (Atomic Zettel Studio | Phút 1–12)
- **Giao diện chia đôi (Split-Screen):**
  - Bên trái: Hiển thị `Literature Note` buổi sáng, bảng `Analogical Matrix` và danh sách `Fleeting Notes` đang chờ xử lý.
  - Bên phải: Trình soạn thảo TipTap/ProseMirror cho `Permanent Zettel`.
- **Bộ kiểm tra cú pháp tự động (Real-time Validator):**
  1. Tự động sinh `zettel_uid` theo định dạng `YYYYMMDDHHMMSS`.
  2. `atomic_title`: Phải là một câu mệnh đề nhân quả hoàn chỉnh mang tính quy luật tổng quát (độ dài 20–250 ký tự, không chứa dấu chấm hỏi).
  3. `body_text`: Bộ đếm từ thời gian thực bắt buộc nằm trong khoảng **100 <= word_count <= 350 từ**.

### State 3.2: Động Cơ Liên Kết Hai Chiều Cưỡng Bức (Forced Bi-directional Graph Engine | Phút 13–17)
- Khi gõ `[[`, hệ thống gọi API truy vấn `pgvector` tìm 5 Zettel cũ có độ tương đồng ngữ nghĩa cao nhất để gợi ý.
- **Điều kiện xuất bản (`PUBLISHED`):** Bắt buộc tạo **tối thiểu 2 liên kết** vào bảng `zettel_links`. Mỗi liên kết phải chọn 1 trong 5 nhãn (`EXTENDS_PAST`, `PATHOLOGY_VIOLATION`, `BIOLOGICAL_MECHANISM`, `CONTRADICTS`, `SUPPORTS`) và nhập `connection_rationale` **>= 30 ký tự**.
- Ngay khi Zettel chuyển sang `PUBLISHED`, tự động cập nhật trạng thái các `Fleeting Notes` liên quan sang `PROMOTED` và xóa khỏi hộp đệm nháp.

### State 3.3: Trình Thiết Kế Thẻ Truy Xuất Nhiễu Loạn & Phản Thực Tế (Perturbation Card Studio | Phút 18–20)
- Yêu cầu tạo **từ 2 đến 3 thẻ FSRS** gắn với `zettel_uid` vừa xuất bản.
- **Bộ lọc chống học vẹt (Anti-Rote Regex Filter):** Chặn lưu thẻ nếu `front_prompt` khớp với mẫu câu hỏi định nghĩa bề mặt (Regex: `/(\blà gì\b|\bđịnh nghĩa\b|\bkhái niệm\b|\bwhat is\b|\bdefine\b)/i` hoặc độ dài `< 80 ký tự`).
- Bắt buộc chọn 1 trong 3 khung tình huống: `COUNTERFACTUAL` (Phản thực tế), `INTERLEAVED_CONTRAST` (Tương phản đan xen), hoặc `FAR_TRANSFER` (Chuyển giao xa đa miền).

---

## 4. Phân Hệ 4: Phòng Thí Nghiệm Truy Xuất Đan Xen & Nhật Ký Quyết Định (Phiên Tối – 20 Phút)
### State 4.1: Khung Vẽ Gợi Nhớ Trang Trắng (Blank-Page Recall Canvas | Phút 1–5)
- Hiển thị khung vẽ trắng Excalidraw + ô nhập văn bản tự do, ẩn hoàn toàn mọi ghi chú trong ngày (`RULE-04`).
- Người dùng vẽ lại sơ đồ nhân quả của mô hình buổi sáng từ trí nhớ. Sau khi bấm `Commit Recall`, lưu JSON vào `s3_blank_recall_data` và mở màn hình đối chiếu song song với thẻ Zettel buổi chiều.

### State 4.2: Hàng Đợi Truy Xuất Ngắt Quãng & Đan Xen (Spaced & Interleaved Retrieval Queue | Phút 6–15)
- Hiển thị lần lượt các thẻ FSRS đến hạn đã được sắp xếp bởi thuật toán `Max-Contrast Greedy Ordering`.
- **Cưỡng chế Cam kết Đầu ra (`RULE-04`):** Mặt sau của thẻ (`back_structure`) và 4 nút chấm điểm (`Again`, `Hard`, `Good`, `Easy`) bị khóa ẩn. Người dùng phải gõ dàn ý phân tích điểm tương phản (tối thiểu **>= 30 từ**) vào ô cam kết rồi bấm `Reveal Answer` mới mở khóa mặt sau và bộ nút chấm điểm.
- Hiển thị điểm gợi ý từ thuật toán `autoRating` dựa trên thời gian phản hồi thực tế để chống thiên kiến tự chấm điểm dễ dãi.

### State 4.3: Phân Hệ Nhật Ký Quyết Định (Farnam Street Decision Journal | Phút 16–20)
- Biểu mẫu 7 trường chuẩn hóa:
  1. Trạng thái sinh lý & thiên kiến cảm xúc hiện hành (`physio_emotional_state`).
  2. Định khung vấn đề (`problem_frame` >= 40 từ).
  3. Phương án đã loại bỏ (`rejected_alternatives` >= 2 phương án, bắt buộc nhúng `[[Zettel_UID]]`).
  4. Quyết định lựa chọn & giả thuyết chính (`primary_thesis`).
  5. Ba thanh trượt xác suất (`prob_positive + prob_neutral + prob_worst = 100%`).
  6. Chi phí cơ hội ngắn hạn, Hệ quả cấp 2 (5 tuần) và Hệ quả cấp 3 (5 tháng) (`second_third_order_effects`).
  7. Khi bấm `Commit & Lock Decision`, đặt `is_locked = TRUE` và đẩy 3 sự kiện vào hàng đợi BullMQ ở mốc `+30d`, `+60d`, `+90d`.
