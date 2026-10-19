/**
 * 2. THUẬT TOÁN TRỘN ĐAN XEN TƯƠNG PHẢN CỰC ĐẠI (Max-Contrast Greedy Ordering - Mục 2.3.2)
 */

export interface InterleavingCardItem {
  id: string;
  zettel_uid: string; // m(c): Nhãn mô hình tư duy gốc
  domain_category: string; // d(c): Miền ứng dụng
  embedding?: number[] | null; // v_c: Vector nhúng ngữ nghĩa (1536 chiều)
  reps: number;
  state: string;
  elapsed_days?: number;
  scheduled_days?: number;
  front_prompt?: string;
  back_structure?: string;
}

export const ALPHA_DOMAIN_WEIGHT = 0.4;
export const BETA_SEMANTIC_WEIGHT = 0.6;

/**
 * Tính cosine similarity giữa hai vector
 * cos(v1, v2) = (v1 . v2) / (|v1| * |v2|)
 */
export function cosineSimilarity(v1?: number[] | null, v2?: number[] | null): number {
  if (!v1 || !v2 || v1.length === 0 || v2.length === 0 || v1.length !== v2.length) {
    return 0.0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }

  if (norm1 === 0 || norm2 === 0) return 0.0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Hàm Mục tiêu Tương phản J(c_t, c):
 * J(c_t, c) = I_model(c_t, c) + [ alpha * I(d(c) != d(c_t)) + beta * cos(v_c_t, v_c) ]
 * - I_model(c_t, c) = -Infinity nếu m(c) == m(c_t) (chống hai thẻ cùng mô hình xuất hiện liên tiếp)
 * - I(d(c) != d(c_t)) = 1 nếu khác miền, 0 nếu cùng miền
 * - cos(v_c_t, v_c) = độ tương đồng ngữ nghĩa
 */
export function calculateContrastObjective(
  currentCard: InterleavingCardItem,
  candidateCard: InterleavingCardItem,
  alpha: number = ALPHA_DOMAIN_WEIGHT,
  beta: number = BETA_SEMANTIC_WEIGHT
): number {
  // Cấm 2 thẻ cùng mô hình tư duy xuất hiện liên tiếp
  if (candidateCard.zettel_uid === currentCard.zettel_uid) {
    return -Infinity;
  }

  // Khác biệt miền ứng dụng
  const domainIndicator = candidateCard.domain_category !== currentCard.domain_category ? 1.0 : 0.0;

  // Tương đồng ngữ nghĩa (để tạo bối cảnh tương phản cao giữa các mô hình có liên hệ ngầm)
  const semanticSimilarity = cosineSimilarity(currentCard.embedding, candidateCard.embedding);

  return alpha * domainIndicator + beta * semanticSimilarity;
}

/**
 * Bộ lọc Giàn giáo Thích ứng (Adaptive Scaffolding Filter - RULE-03):
 * Thẻ mới tạo (reps < 2 hoặc state != 'REVIEW') phải được ôn tập ở chế độ đơn miền,
 * chỉ những thẻ đạt reps >= 2 mới được đưa vào bể trộn đan xen đa miền.
 */
export function filterEligibleInterleavingCards(cards: InterleavingCardItem[]): {
  interleavingPool: InterleavingCardItem[];
  scaffoldingPool: InterleavingCardItem[];
} {
  const interleavingPool: InterleavingCardItem[] = [];
  const scaffoldingPool: InterleavingCardItem[] = [];

  for (const card of cards) {
    if (card.reps >= 2 && card.state === "REVIEW") {
      interleavingPool.push(card);
    } else {
      scaffoldingPool.push(card);
    }
  }

  return { interleavingPool, scaffoldingPool };
}

/**
 * Thuật toán sắp xếp toàn bộ hàng đợi bằng Greedy Max-Contrast Ordering:
 * Lần lượt chọn thẻ c_(t+1) từ tập còn lại sao cho tối đa hóa J(c_t, c).
 */
export function orderQueueByMaxContrast(
  queue: InterleavingCardItem[],
  alpha: number = ALPHA_DOMAIN_WEIGHT,
  beta: number = BETA_SEMANTIC_WEIGHT
): InterleavingCardItem[] {
  if (queue.length <= 1) return [...queue];

  const remaining = [...queue];
  const ordered: InterleavingCardItem[] = [];

  // Thẻ đầu tiên: lấy thẻ có scheduled_days lớn nhất hoặc elapsed_days lớn nhất (ưu tiên thẻ đến hạn lâu nhất)
  remaining.sort((a, b) => (b.elapsed_days || 0) - (a.elapsed_days || 0));
  const firstCard = remaining.shift()!;
  ordered.push(firstCard);

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];

    let bestScore = -Infinity;
    let bestIndex = -1;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const score = calculateContrastObjective(current, candidate, alpha, beta);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    // Nếu tất cả các thẻ còn lại đều cùng mô hình với current (bestScore === -Infinity),
    // Fallback: chọn thẻ có thời gian trôi qua xa nhất hoặc index 0
    if (bestIndex === -1 || bestScore === -Infinity) {
      bestIndex = 0;
    }

    const [nextCard] = remaining.splice(bestIndex, 1);
    ordered.push(nextCard);
  }

  return ordered;
}
