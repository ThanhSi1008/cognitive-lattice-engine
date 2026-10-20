export interface PresetMentalModel {
  id: string;
  title: string;
  author: string;
  year: number;
  domain: string;
  fullText: string;
  sourceBlocks: string[];
  suggestedPrimaryClaim: string;
  criticalAuditDefaults: {
    study_design: string;
    falsifiability: string;
    sample_size: string;
    risk_of_bias_tool: string;
    risk_of_bias_rating: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    counter_evidence: string;
  };
}

export const PRESET_MENTAL_MODELS: Record<string, PresetMentalModel> = {
  HOWARD_MARKS_SECOND_ORDER: {
    id: "HOWARD_MARKS_SECOND_ORDER",
    title: "Tư Duy Cấp Độ Hai và Phân Tích Hệ Quả Ngoại Vi Trong Môi Trường Phức Hợp",
    author: "Howard Marks",
    year: 2011,
    domain: "Behavioral Economics & Risk Architecture",
    fullText: `Tư duy cấp độ một đơn giản và hời hợt, chỉ nhìn vào kết quả trực tiếp đầu tiên. Tư duy cấp độ một nói: "Công ty này tốt, triển vọng tăng trưởng cao, hãy mua cổ phiếu". Tư duy cấp độ hai nói: "Công ty này tốt, nhưng tất cả mọi người trên thị trường đều đã biết nó tốt và định giá quá cao, hãy bán ra".
Tư duy cấp độ hai phức tạp và đa chiều hơn nhiều. Bạn không chỉ phải xem xét kết quả trực tiếp của hành động mà còn phải phân tích: Điều gì sẽ xảy ra tiếp theo sau khi mọi người phản ứng với hành vi của bạn? Xác suất của các kịch bản ngoại vi là bao nhiêu? Thị trường đang phản ánh sự đồng thuận sai lầm ở đâu?
Hầu hết các quyết định sai lầm trong kinh tế và quản trị hệ thống không đến từ việc không biết mục tiêu, mà đến từ việc chỉ tính toán được hệ quả cấp một mà bỏ quên các vòng phản hồi cấp hai và cấp ba làm biến dạng toàn bộ môi trường ban đầu.`,
    sourceBlocks: [
      `Tư duy cấp độ một đơn giản và hời hợt, chỉ nhìn vào kết quả trực tiếp đầu tiên. Tư duy cấp độ một nói: "Công ty này tốt, triển vọng tăng trưởng cao, hãy mua cổ phiếu". Tư duy cấp độ hai nói: "Công ty này tốt, nhưng tất cả mọi người trên thị trường đều đã biết nó tốt và định giá quá cao, hãy bán ra".`,
      `Tư duy cấp độ hai phức tạp và đa chiều hơn nhiều. Bạn không chỉ phải xem xét kết quả trực tiếp của hành động mà còn phải phân tích: Điều gì sẽ xảy ra tiếp theo sau khi mọi người phản ứng với hành vi của bạn? Xác suất của các kịch bản ngoại vi là bao nhiêu? Thị trường đang phản ánh sự đồng thuận sai lầm ở đâu?`,
      `Hầu hết các quyết định sai lầm trong kinh tế và quản trị hệ thống không đến từ việc không biết mục tiêu, mà đến từ việc chỉ tính toán được hệ quả cấp một mà bỏ quên các vòng phản hồi cấp hai và cấp ba làm biến dạng toàn bộ môi trường ban đầu.`,
    ],
    suggestedPrimaryClaim: "Tư duy cấp độ hai vượt trội hơn tư duy cấp độ một vì nó tính toán phản ứng thích ứng của các tác tử khác trong hệ thống phức hợp.",
    criticalAuditDefaults: {
      study_design: "Phân tích định tính & Nghiên cứu trường hợp thị trường tài chính",
      falsifiability: "Mô hình bị bác bỏ nếu có thể chứng minh các quyết định theo tư duy cấp độ một mang lại lợi nhuận vượt trội ổn định trong dài hạn",
      sample_size: "Hơn 50 chu kỳ kinh tế và 250 bản ghi chú đầu tư (Oaktree Memos)",
      risk_of_bias_tool: "Cochrane RoB 2 / CASP Qualitative Checklist",
      risk_of_bias_rating: "LOW",
      counter_evidence: "Trong môi trường biến động ngẫu nhiên thuần túy (Random Walk), tư duy phức tạp có thể dẫn đến hiện tượng quá khớp (overfitting).",
    },
  },

  CHESTERTONS_FENCE: {
    id: "CHESTERTONS_FENCE",
    title: "Nguyên Lý Hàng Rào Chesterton: Bảo Toàn Cấu Trúc Trước Khi Can Thiệp Cải Cách",
    author: "G.K. Chesterton",
    year: 1929,
    domain: "Complex Systems Engineering",
    fullText: `Nếu bạn gặp một hàng rào hoặc một chướng ngại vật chắn ngang con đường, người cải cách hiện đại nông nổi sẽ nói: "Tôi không thấy công dụng của nó, hãy phá bỏ nó đi". Nhưng người cải cách thông thái hơn sẽ đáp lại: "Nếu bạn không thấy công dụng của nó, tôi tuyệt đối sẽ không cho phép bạn phá hủy nó. Hãy đi tìm hiểu lý do tại sao người tiền nhiệm dựng nó lên, và khi bạn đã hiểu rõ lý do đó, bạn mới được phép thảo luận việc dỡ bỏ".
Các quy tắc, thể chế hoặc đoạn mã kế thừa trong một hệ sinh thái không bao giờ tự nhiên xuất hiện. Chúng luôn là giải pháp cho một vấn đề gay gắt trong quá khứ mà người quan sát hiện tại chưa từng trải qua.
Việc phá bỏ một ràng buộc mà không hiểu cơ chế phòng vệ của nó gần như chắc chắn sẽ giải phóng lại chính thảm họa mà ràng buộc đó từng được thiết kế để ngăn chặn.`,
    sourceBlocks: [
      `Nếu bạn gặp một hàng rào hoặc một chướng ngại vật chắn ngang con đường, người cải cách hiện đại nông nổi sẽ nói: "Tôi không thấy công dụng của nó, hãy phá bỏ nó đi". Nhưng người cải cách thông thái hơn sẽ đáp lại: "Nếu bạn không thấy công dụng của nó, tôi tuyệt đối sẽ không cho phép bạn phá hủy nó. Hãy đi tìm hiểu lý do tại sao người tiền nhiệm dựng nó lên, và khi bạn đã hiểu rõ lý do đó, bạn mới được phép thảo luận việc dỡ bỏ".`,
      `Các quy tắc, thể chế hoặc đoạn mã kế thừa trong một hệ sinh thái không bao giờ tự nhiên xuất hiện. Chúng luôn là giải pháp cho một vấn đề gay gắt trong quá khứ mà người quan sát hiện tại chưa từng trải qua.`,
      `Việc phá bỏ một ràng buộc mà không hiểu cơ chế phòng vệ của nó gần như chắc chắn sẽ giải phóng lại chính thảm họa mà ràng buộc đó từng được thiết kế để ngăn chặn.`,
    ],
    suggestedPrimaryClaim: "Bất kỳ sự can thiệp loại bỏ cấu trúc nào cũng phải có tiền đề là chứng minh đã hiểu trọn vẹn lý do ra đời của cấu trúc đó.",
    criticalAuditDefaults: {
      study_design: "Luận đề triết học hệ thống & Lịch sử thể chế",
      falsifiability: "Bác bỏ nếu chứng minh được chi phí tìm hiểu cấu trúc cũ luôn cao hơn chi phí khắc phục sai lầm do xóa bỏ vội vã",
      sample_size: "Hàng trăm sự cố tái cấu trúc phần mềm và cải cách chính sách công",
      risk_of_bias_tool: "CASP Systematic Review Tool",
      risk_of_bias_rating: "LOW",
      counter_evidence: "Hiện tượng bám chấp thái quá vào quy tắc lỗi thời (Status Quo Bias) có thể kìm hãm sự đổi mới đột phá.",
    },
  },

  COBRA_EFFECT_GOODHART: {
    id: "COBRA_EFFECT_GOODHART",
    title: "Hiệu Ứng Rắn Hổ Mang & Luật Goodhart: Sự Bóp Méo Cơ Chế Thưởng Phạt Nhận Thức",
    author: "Charles Goodhart & Horst Siebert",
    year: 1975,
    domain: "Cybernetics & Mechanism Design",
    fullText: `Dưới thời kỳ thuộc địa tại Ấn Độ, chính quyền Anh muốn giảm số lượng rắn hổ mang độc nên đã ban hành chính sách thưởng tiền cho mỗi con rắn bị giết giao nộp. Ban đầu số lượng rắn nộp tăng vọt, nhưng sau đó người dân đã âm thầm mở các trang trại nhân giống rắn hổ mang để kiếm tiền thưởng. Khi chính quyền phát hiện và hủy bỏ tiền thưởng, người nuôi thả toàn bộ rắn ra tự nhiên, khiến số lượng rắn độc sau can thiệp cao gấp nhiều lần trước đó.
Nhà kinh tế học Charles Goodhart đã đúc kết thành quy luật: "Khi một chỉ số đo lường trở thành mục tiêu tối thượng, nó sẽ lập tức đánh mất giá trị đo lường của mình".
Trong nhận thức, nếu người học chỉ nhắm vào số lượng thẻ lật mỗi ngày thay vì độ sâu xử lý, não bộ sẽ tự động "gian lận" bằng cách lật lướt để lấy cảm giác hoàn thành giả tạo.`,
    sourceBlocks: [
      `Dưới thời kỳ thuộc địa tại Ấn Độ, chính quyền Anh muốn giảm số lượng rắn hổ mang độc nên đã ban hành chính sách thưởng tiền cho mỗi con rắn bị giết giao nộp. Ban đầu số lượng rắn nộp tăng vọt, nhưng sau đó người dân đã âm thầm mở các trang trại nhân giống rắn hổ mang để kiếm tiền thưởng. Khi chính quyền phát hiện và hủy bỏ tiền thưởng, người nuôi thả toàn bộ rắn ra tự nhiên, khiến số lượng rắn độc sau can thiệp cao gấp nhiều lần trước đó.`,
      `Nhà kinh tế học Charles Goodhart đã đúc kết thành quy luật: "Khi một chỉ số đo lường trở thành mục tiêu tối thượng, nó sẽ lập tức đánh mất giá trị đo lường của mình".`,
      `Trong nhận thức, nếu người học chỉ nhắm vào số lượng thẻ lật mỗi ngày thay vì độ sâu xử lý, não bộ sẽ tự động "gian lận" bằng cách lật lướt để lấy cảm giác hoàn thành giả tạo.`,
    ],
    suggestedPrimaryClaim: "Mọi hệ thống khuyến khích dựa trên chỉ số đơn tuyến đều bị các tác tử tối ưu hóa ngầm theo hướng phá vỡ mục tiêu ban đầu.",
    criticalAuditDefaults: {
      study_design: "Nghiên cứu kinh tế lượng hành vi & Động lực học hệ thống",
      falsifiability: "Bác bỏ nếu tồn tại hệ thống đo lường không bị suy thoái khi gắn liền với phần thưởng trực tiếp",
      sample_size: "Quan sát thực nghiệm tại 40 tổ chức và chính sách vĩ mô",
      risk_of_bias_tool: "Cochrane RoB 2",
      risk_of_bias_rating: "LOW",
      counter_evidence: "Các chỉ số kết hợp đa biến (Balanced Scorecard) có thể giảm thiểu hiện tượng tối ưu cục bộ.",
    },
  },

  BJORK_DESIRABLE_DIFFICULTY: {
    id: "BJORK_DESIRABLE_DIFFICULTY",
    title: "Khó Khăn Đáng Giá & Giàn Giáo Thích Ứng Trong Luyện Tập Đan Xen",
    author: "Robert A. Bjork & Elizabeth L. Bjork",
    year: 2011,
    domain: "Cognitive Psychology & Learning Science",
    fullText: `Hiệu năng tức thời (Immediate Performance) trong khi học là một chỉ số cực kỳ sai lệch cho việc lưu giữ dài hạn (Long-term Retention). Khi người học luyện tập theo từng khối đồng nhất (Massed Practice), họ cảm thấy dễ dàng và tự tin vì thông tin liên tục nằm trong bộ nhớ làm việc. Tuy nhiên, vết nhớ này tan biến rất nhanh sau đó.
Ngược lại, các điều kiện gây cản trở và ma sát nhận thức trong quá trình học - được gọi là "Những Khó Khăn Đáng Giá" (Desirable Difficulties) như: kiểm tra gợi nhớ chủ động (Active Retrieval), ngắt quãng thời gian (Spaced Repetition), và trộn đan xen các dạng bài khác nhau (Interleaved Practice) - làm chậm tốc độ tiếp thu ban đầu nhưng tạo ra sự gắn kết thần kinh và khả năng chuyển giao tri thức vượt trội.
Tuy nhiên, khó khăn chỉ "đáng giá" khi người học có đủ giàn giáo thích ứng để vượt qua. Nếu đưa người học vào môi trường đan xen khi họ chưa nắm vững nguyên lý đơn miền cơ bản, ma sát sẽ chuyển thành quá tải nhận thức hủy hoại.`,
    sourceBlocks: [
      `Hiệu năng tức thời (Immediate Performance) trong khi học là một chỉ số cực kỳ sai lệch cho việc lưu giữ dài hạn (Long-term Retention). Khi người học luyện tập theo từng khối đồng nhất (Massed Practice), họ cảm thấy dễ dàng và tự tin vì thông tin liên tục nằm trong bộ nhớ làm việc. Tuy nhiên, vết nhớ này tan biến rất nhanh sau đó.`,
      `Ngược lại, các điều kiện gây cản trở và ma sát nhận thức trong quá trình học - được gọi là "Những Khó Khăn Đáng Giá" (Desirable Difficulties) như: kiểm tra gợi nhớ chủ động (Active Retrieval), ngắt quãng thời gian (Spaced Repetition), và trộn đan xen các dạng bài khác nhau (Interleaved Practice) - làm chậm tốc độ tiếp thu ban đầu nhưng tạo ra sự gắn kết thần kinh và khả năng chuyển giao tri thức vượt trội.`,
      `Tuy nhiên, khó khăn chỉ "đáng giá" khi người học có đủ giàn giáo thích ứng để vượt qua. Nếu đưa người học vào môi trường đan xen khi họ chưa nắm vững nguyên lý đơn miền cơ bản, ma sát sẽ chuyển thành quá tải nhận thức hủy hoại.`,
    ],
    suggestedPrimaryClaim: "Tạo ma sát nhận thức có kiểm soát thông qua luyện tập đan xen và gợi nhớ chủ động tối ưu hóa việc lưu giữ dài hạn so với học tập khối phẳng.",
    criticalAuditDefaults: {
      study_design: "Thử nghiệm ngẫu nhiên có đối chứng (RCT) đa trung tâm",
      falsifiability: "Bác bỏ nếu người học khối đồng nhất đạt điểm số chuyển giao xa cao hơn nhóm đan xen sau khoảng cách 30 ngày",
      sample_size: "n = 1,420 sinh viên trong 12 kỳ học",
      risk_of_bias_tool: "Cochrane RoB 2 (Randomized Trial Risk of Bias)",
      risk_of_bias_rating: "LOW",
      counter_evidence: "Người mới bắt đầu (Novices) bị sụt giảm nhận thức nghiêm trọng nếu không có hướng dẫn cụ thể ban đầu.",
    },
  },
};
