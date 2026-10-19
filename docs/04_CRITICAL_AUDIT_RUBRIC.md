# CRITICAL AUDIT WIDGET & EVIDENCE SYNTHESIS SPECIFICATION
Tài liệu này quy định cấu trúc dữ liệu và logic kiểm tra cho `Critical Audit Widget` và `Analogical Matrix` trong bảng `literature_notes` (Phiên Sáng Phút 4–15).

## 1. JSON Schema Bắt Buộc Cho Trường `critical_audit`
Mỗi khi người học nạp một tài liệu học thuật hoặc mô hình tư duy mới, hệ thống yêu cầu điền biểu mẫu `Critical Audit Widget` tuân thủ chuẩn kiểm định bằng chứng khoa học (PICO, Cochrane RoB 2, Newcastle-Ottawa Scale, CASP, AMSTAR 2 và PRISMA 2020):

```typescript
export interface CriticalAuditPayload {
  // 1. Định khung PICO / Câu hỏi nghiên cứu gốc
  pico_frame: {
    population_or_context: string; // Đối tượng hoặc bối cảnh hệ thống
    intervention_or_mechanism: string; // Cơ chế / Tác nhân can thiệp
    comparison_baseline: string; // Nhóm đối chứng / Mô hình ngây thơ (Cấp độ 1)
    outcome_measured: string; // Kết quả đo lường thực nghiệm
  };
  // 2. Nguồn cơ sở dữ liệu & Thiết kế nghiên cứu
  source_database: 'PUBMED_MEDLINE' | 'SCOPUS' | 'WEB_OF_SCIENCE' | 'COCHRANE_CENTRAL' | 'EPISTEMONIKOS' | 'PROSPERO_REGISTERED' | 'MONOGRAPH_BOOK' | 'OTHER';
  study_design: 'RCT' | 'NON_RANDOMIZED_INTERVENTION' | 'COHORT_CASE_CONTROL' | 'QUALITATIVE' | 'SYSTEMATIC_REVIEW_META_ANALYSIS' | 'THEORETICAL_MODEL';
  // 3. Công cụ đánh giá nguy cơ sai lệch tương ứng với thiết kế nghiên cứu
  risk_of_bias_assessment: {
    tool_used: 'COCHRANE_ROB_2' | 'ROBINS_I' | 'NEWCASTLE_OTTAWA_SCALE' | 'CASP_CHECKLIST' | 'AMSTAR_2_ROBIS' | 'LOGIC_CONSISTENCY_CHECK';
    rating_or_score: string; // Ví dụ: 'Low Risk', '7/9 Stars NOS', 'High Quality AMSTAR-2'
    key_limitations: string; // Sai lệch chọn mẫu, nhiễu, hoặc thiếu hụt dữ liệu
  };
  // 4. Ba thông số phản biện bắt buộc của CLE (Tối thiểu 20 ký tự mỗi trường)
  falsifiability_condition: string; // Điều kiện thực nghiệm nào nếu xảy ra sẽ bác bỏ mô hình này?
  sample_size_and_replicability: string; // Quy mô mẫu (N) và lịch sử tái lập (tránh bẫy 'Jam Study')
  counter_evidence_or_rival_model: string; // Nghiên cứu đối lập hoặc điều kiện biên nơi mô hình thất bại
}
```

## 2. JSON Schema Bắt Buộc Cho Trường `analogical_matrix`

Áp dụng lý thuyết Ánh xạ Cấu trúc (Structure-Mapping Theory) của Dedre Gentner (2002): buộc người học đối chiếu cấu trúc quan hệ nhân quả qua **tối thiểu 3 miền ứng dụng khác nhau**:

```typescript
export interface AnalogicalDomainMapping {
  domain_name: string; // Ví dụ: 'Đầu tư Tài chính', 'Chính sách Công', 'Kiến trúc Phần mềm'
  surface_features: string; // Các chi tiết bề mặt đặc thù của miền đó
  first_order_naive_reaction: string; // Phản ứng tuyến tính ngây thơ (Tư duy Cấp độ 1)
  second_order_systemic_mechanism: string; // Cơ chế thích ứng bậc cao / Phản hồi hệ thống (Tư duy Cấp độ 2)
  structural_invariant_shared: string; // Quy luật cấu trúc bất biến chung giữa các miền
}

// Validation: analogical_matrix phải là mảng AnalogicalDomainMapping[] có length >= 3.
```
