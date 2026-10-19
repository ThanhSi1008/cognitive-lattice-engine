# CORE ALGORITHMS, MATHEMATICAL ENGINE & BACKGROUND WORKERS

## 1. Mô Hình Bộ Nhớ DSR & Phương Trình Thuật Toán FSRS-5 (Mục 2.3.1)
Mỗi thẻ $i$ được biểu diễn bởi vector trạng thái $\mathbf{M}_i = (D_i, S_i, R_i)$ với bộ 19 trọng số $\mathbf{w} = (w_0, w_1, \dots, w_{18})$ mặc định của `ts-fsrs` (hoặc cá nhân hóa qua `fsrs-browser` WebAssembly khi số lượng bản ghi `revlog >= 400`).

### 1.1. Phương trình Đường cong Quên Lũy thừa (Power-Law Forgetting Curve)
Khả năng truy xuất $R(t, S) \in [0, 1]$ sau $t$ ngày kể từ lần ôn cuối cùng với độ ổn định $S$:
$$R(t, S) = \left(1 + \text{FACTOR} \cdot \frac{t}{S}\right)^{\text{DECAY}}$$
Trong đó với chuẩn FSRS-4.5 / FSRS-5:
- $\text{DECAY} = -0.5$
- $\text{FACTOR} = 0.9^{\frac{1}{\text{DECAY}}} - 1 = \frac{19}{81} \approx 0.2345679$
Khi $t = S$, ta luôn có $R(S, S) = 0.90$ (xác suất nhớ lại đúng bằng 90%).

### 1.2. Khoảng cách Ôn tập Tiếp theo (Next Interval Calculation)
Với độ lưu giữ mục tiêu $R_{\text{req}} \in [0.85, 0.92]$ (mặc định $R_{\text{req}} = 0.90$, tương ứng Chỉ số Quên $FI = 1 - R_{\text{req}} = 10\%$):
$$I(S, R_{\text{req}}) = \max\left(1, \text{round}\left(\frac{S}{\text{FACTOR}} \cdot \left(R_{\text{req}}^{\frac{1}{\text{DECAY}}} - 1\right)\right)\right)$$

### 1.3. Cập nhật Trạng thái sau Lần Ôn đầu tiên & Các lần Tiếp theo
Sử dụng trực tiếp thư viện `ts-fsrs` với điểm đánh giá $G \in \{1\text{ (Again)}, 2\text{ (Hard)}, 3\text{ (Good)}, 4\text{ (Easy)}\}$:
- **Khởi tạo thẻ mới:**
  - $S_0(G) = w_{G-1}$
  - $D_0(G) = \text{clamp}(w_4 - e^{w_5 \cdot (G - 1)} + 1, 1.0, 10.0)$
- **Cập nhật Độ khó ($D'$):**
  - $\Delta D(G) = -w_6 \cdot (G - 3)$
  - $D_{\text{temp}} = D + \Delta D(G) \cdot \frac{10 - D}{9}$
  - $D' = \text{clamp}(w_7 \cdot D_0(4) + (1 - w_7) \cdot D_{\text{temp}}, 1.0, 10.0)$
- **Cập nhật Độ ổn định khi Nhớ thành công ($G \in \{2, 3, 4\}$):**
  $$S'_r(D, S, R, G) = S \cdot \left(1 + e^{w_8} \cdot (11 - D) \cdot S^{-w_9} \cdot \left(e^{w_{10}(1 - R)} - 1\right) \cdot \text{hard\_penalty} \cdot \text{easy\_bonus}\right)$$
  *(Lưu ý: Khi $R$ giảm xuống vùng $0.70 - 0.85$, thừa số $(e^{w_{10}(1-R)} - 1)$ tăng mạnh, tạo ra mức nhảy vọt Độ ổn định $\Delta S = S'_r - S$ hiển thị trên Memory Telemetry UI).*
- **Cập nhật Độ ổn định khi Quên ($G = 1$):**
  $$S'_f(D, S, R) = w_{11} \cdot D^{-w_{12}} \cdot \left((S + 1)^{w_{13}} - 1\right) \cdot e^{w_{14}(1 - R)}$$

### 1.4. Hàm Gợi ý Điểm Đánh giá Tự động (`autoRating`)
Để chống thiên kiến tự chấm điểm cao sau khi xem đáp án, hệ thống đối chiếu thời gian phản hồi thực tế `responseTime` (giây) với thời gian trung bình `avgTime` và độ khó `D`:
```typescript
export function autoRating(responseTimeSec: number, avgTimeSec: number, difficulty: number): 1 | 2 | 3 | 4 {
  const ratio = responseTimeSec / Math.max(avgTimeSec, 30);
  if (ratio > 1.8) return 2; // Hard (Quá lâu / Vất vả)
  if (ratio < 0.65 && difficulty < 6.0) return 4; // Easy (Nhanh & Dễ)
  return 3; // Good (Trong ngưỡng tiêu chuẩn)
}
```

---

## 2. Thuật Toán Trộn Đan Xen Tương Phản Cực Đại (Max-Contrast Greedy Ordering - Mục 2.3.2)

* **Đầu vào:** Tập các thẻ đến hạn ôn tập $Q_{\text{due}}$ đã vượt qua cổng giàn giáo `RULE-03` (`reps >= 2`). Mỗi thẻ $c \in Q_{\text{due}}$ có:
* Nhãn mô hình tư duy gốc: $m(c)$ (chính là `zettel_uid` hoặc cụm mô hình gốc)
* Miền ứng dụng: $d(c)$ (`domain_category` của Zettel)
* Vector nhúng ngữ nghĩa 1536 chiều: $\mathbf{v}_c \in \mathbb{R}^{1536}$


* **Hàm Mục tiêu Tương phản $J(c_t, c)$:**
Sau khi người dùng giải quyết xong thẻ $c_t$, hệ thống chọn thẻ tiếp theo $c_{t+1}$ từ tập thẻ còn lại $Q_{\text{rem}}$ sao cho tối đa hóa:

$$c_{t+1} = \arg\max_{c \in Q_{\text{rem}}} J(c_t, c)$$


$$J(c_t, c) = \mathbb{I}_{\text{model}}(c_t, c) + \left[ \alpha \cdot \mathbb{I}\big(d(c) \neq d(c_t)\big) + \beta \cdot \cos(\mathbf{v}_{c_t}, \mathbf{v}_c) \right]$$



Trong đó:
* Hàm chỉ thị mô hình $\mathbb{I}_{\text{model}}(c_t, c) = -\infty$ nếu $m(c) = m(c_t)$, và bằng $0$ nếu $m(c) \neq m(c_t)$ (đảm bảo 2 thẻ cùng mô hình tư duy không bao giờ xuất hiện liên tiếp).
* $\mathbb{I}(d(c) \neq d(c_t)) = 1$ nếu hai thẻ khác miền ứng dụng, ngược lại bằng $0$.
* $\cos(\mathbf{v}_{c_t}, \mathbf{v}_c) = \frac{\mathbf{v}_{c_t} \cdot \mathbf{v}_c}{\Vert{}\mathbf{v}_{c_t}\Vert{} \Vert{}\mathbf{v}_c\Vert{}}$ là độ tương đồng ngữ nghĩa cosine.
* Trọng số chuẩn: $\alpha = 0.4, \beta = 0.6$. (Nếu tất cả thẻ còn lại trong $Q_{\text{rem}}$ đều có cùng $m(c_t)$, hệ thống chèn một bài tập phân biệt ngắn hoặc lấy thẻ có khoảng cách thời gian xa nhất).



---

## 3. Bộ Điều Tốc Dung Lượng 5% / 95% (Asymptotic Capacity Governor - Mục 2.3.3)

* **Công thức tính Chỉ số Áp lực Ôn tập Hàng ngày ($\text{DRLI}$):**

$$\text{DRLI} = \frac{\sum_{c \in Q_{\text{due}}} \bar{\tau}(k_c)}{T_{\text{review\_budget}}}$$



Trong đó:
* $Q_{\text{due}}$ là tập thẻ đến hạn ôn tập trong ngày (`due_date <= NOW()`).
* $\bar{\tau}(k_c)$ là thời gian phản hồi trung bình của người dùng cho loại thẻ $k_c$ (`avg_response_time_sec`, mặc định khởi tạo $90\text{ giây/thẻ}$).
* $T_{\text{review\_budget}} = 600\text{ giây}$ ($10\text{ phút}$ ôn thẻ tiêu chuẩn trong Phiên Tối).


* **Quy tắc điều phối động theo ngưỡng $\text{DRLI}$:**
1. **$\text{DRLI} \le 1.0$ (Trạng thái Cân bằng):** Giữ nguyên SOP `20 phút Sáng – 20 phút Chiều – 20 phút Tối`.
2. **$1.0 < \text{DRLI} \le 1.5$ (Trạng thái Thích ứng Co giãn):** Rút ngắn Phiên Sáng xuống `10 phút` (chỉ đọc 1 đơn vị nhỏ) và cộng thêm `+10 phút` vào Phiên Tối (thành `30 phút Tối`, tức $T_{\text{review\_budget}} = 1200\text{ giây}$).
3. **$\text{DRLI} > 1.5$ HOẶC số thẻ `LEECH_QUARANTINE >= 3` (Ngắt mạch Nợ Nhận thức - RULE-02):** Khóa cứng hoàn toàn Phiên Sáng (0 phút học mới), chuyển toàn bộ quỹ thời gian sang **System Refactoring Mode** (giải quyết nợ thẻ và chia nhỏ thẻ đỉa).



---

## 4. Công Thức Tính Điểm Brier Đa Phân Lớp (Multi-class Brier Score - Mục 2.4 & 2.5)

Khi người dùng thực hiện hậu kiểm Nhật ký Quyết định ở mốc 30, 60 hoặc 90 ngày, họ xác nhận kịch bản thực tế đã xảy ra $o = (o_{\text{pos}}, o_{\text{neu}}, o_{\text{worst}}) \in \{(1,0,0), (0,1,0), (0,0,1)\}$.
Điểm chuẩn xác dự báo `brier_score` được tính theo công thức Brier bậc hai:


$$\text{BS} = \sum_{j \in \{\text{pos}, \text{neu}, \text{worst}\}} \left(\frac{p_j}{100} - o_j\right)^2$$

* Trong đó $p_{\text{pos}}, p_{\text{neu}}, p_{\text{worst}} \in [0, 100]$ là xác suất dự đoán ban đầu.
* $\text{BS} \in [0, 2]$ (hoặc chuẩn hóa chia 2 về $[0, 1]$): $\text{BS} = 0$ là dự báo hoàn hảo tuyệt đối; $\text{BS}$ càng thấp chứng tỏ mô hình tư duy áp dụng càng chính xác.

---

## 5. Đặc Tả Hàng Đợi Tác Vụ Nền (Redis / BullMQ Workers)

1. **`fleeting-notes-ttl-worker` (Chạy định kỳ mỗi 5 phút):**
* Thực thi truy vấn: `DELETE FROM fleeting_notes WHERE status = 'PENDING' AND expires_at <= NOW();` (hoặc ghi log thống kê số thẻ bị hủy rồi xóa cứng nội dung để triệt tiêu Ngụy biện Tích trữ).


2. **`decision-audit-scheduler-worker`:**
* Khi một bản ghi `decision_journals` chuyển sang `is_locked = TRUE`, tạo 3 delayed jobs trên BullMQ với delay tương ứng `30 days`, `60 days`, `90 days` để gửi Email/Web Push Notification yêu cầu người dùng vào điền `review_30d_data`, `review_60d_data`, `review_90d_data` và cập nhật `brier_score`.
