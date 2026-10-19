/**
 * 4. CÔNG THỨC TÍNH ĐIỂM BRIER ĐA PHÂN LỚP (Multi-class Brier Score - Mục 2.4 & 2.5)
 */

export type DecisionOutcome = "POSITIVE" | "NEUTRAL" | "WORST";

export interface DecisionProbabilities {
  prob_positive: number; // p_pos ∈ [0, 100]
  prob_neutral: number;  // p_neu ∈ [0, 100]
  prob_worst: number;    // p_worst ∈ [0, 100]
}

export interface BrierScoreResult {
  brierScore: number; // BS ∈ [0, 2]
  normalizedBrierScore: number; // BS_norm = BS / 2 ∈ [0, 1]
  actualOutcome: DecisionOutcome;
  predictedProbabilityForActual: number; // Xác suất gán cho kịch bản thực tế
  calibrationRating: "PERFECT" | "EXCELLENT" | "MODERATE" | "MISCALIBRATED";
  analysisSummary: string;
}

/**
 * Tính điểm Brier cho một quyết định sau hậu kiểm:
 * BS = sum_j ( (p_j / 100) - o_j )^2
 */
export function calculateBrierScore(
  forecast: DecisionProbabilities,
  outcome: DecisionOutcome
): BrierScoreResult {
  const { prob_positive, prob_neutral, prob_worst } = forecast;

  // Vector xác thực thực tế o = (o_pos, o_neu, o_worst)
  const o_pos = outcome === "POSITIVE" ? 1 : 0;
  const o_neu = outcome === "NEUTRAL" ? 1 : 0;
  const o_worst = outcome === "WORST" ? 1 : 0;

  const p_pos_dec = prob_positive / 100.0;
  const p_neu_dec = prob_neutral / 100.0;
  const p_worst_dec = prob_worst / 100.0;

  // Tính BS = (p_pos - o_pos)^2 + (p_neu - o_neu)^2 + (p_worst - o_worst)^2
  const diff_pos = Math.pow(p_pos_dec - o_pos, 2);
  const diff_neu = Math.pow(p_neu_dec - o_neu, 2);
  const diff_worst = Math.pow(p_worst_dec - o_worst, 2);

  const rawBs = diff_pos + diff_neu + diff_worst;
  const brierScore = Number(rawBs.toFixed(4));
  const normalizedBrierScore = Number((rawBs / 2.0).toFixed(4));

  const predictedForActual =
    outcome === "POSITIVE" ? prob_positive : outcome === "NEUTRAL" ? prob_neutral : prob_worst;

  // Phân loại chất lượng hiệu chuẩn xác suất (Forecasting Calibration)
  let calibrationRating: "PERFECT" | "EXCELLENT" | "MODERATE" | "MISCALIBRATED" = "MODERATE";
  let analysisSummary = "";

  if (brierScore <= 0.05) {
    calibrationRating = "PERFECT";
    analysisSummary = `Dự báo xuất sắc gần như tuyệt đối (BS = ${brierScore}). Mô hình tư duy phản ánh hoàn toàn cơ chế vận hành thực tế.`;
  } else if (brierScore <= 0.35) {
    calibrationRating = "EXCELLENT";
    analysisSummary = `Khả năng hiệu chuẩn xác suất rất tốt (BS = ${brierScore}). Xác suất gán cho kịch bản thực tế là ${predictedForActual}%.`;
  } else if (brierScore <= 0.75) {
    calibrationRating = "MODERATE";
    analysisSummary = `Mức độ sai lệch vừa phải (BS = ${brierScore}). Cần rà soát các hệ quả cấp 2 và cấp 3 đã bỏ sót.`;
  } else {
    calibrationRating = "MISCALIBRATED";
    analysisSummary = `Cảnh báo thiên kiến nhận thức / tự tin thái quá (BS = ${brierScore}). Kịch bản thực tế chỉ được dự báo ${predictedForActual}%. Cần đưa Zettel vào danh sách kiểm định lại.`;
  }

  return {
    brierScore,
    normalizedBrierScore,
    actualOutcome: outcome,
    predictedProbabilityForActual: predictedForActual,
    calibrationRating,
    analysisSummary,
  };
}
