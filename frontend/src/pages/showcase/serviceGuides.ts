/**
 * Nội dung 3 trang chi tiết nhóm dịch vụ chủ lực (/services/:slug) — sửa chữ ở đây, không cần đụng giao diện.
 *
 * `category` phải trùng TÊN danh mục trong Admin → Danh mục dịch vụ: danh sách dịch vụ con, giá "Từ"
 * lấy thật từ API theo danh mục này.
 */
export type ServiceGuide = {
  slug: string;
  category: string;
  tagline: string;
  /** Ảnh banner (đường dẫn trong /public). */
  image: string;
  /** Đoạn mở đầu bài viết. */
  intro: string[];
  /** Khi nào nên làm. */
  when: string[];
  /** Gara làm gì trong nhóm dịch vụ này. */
  includes: string[];
  /** Lưu ý thêm (cuối bài). */
  tip: string;
};

export const SERVICE_GUIDES: ServiceGuide[] = [
  {
    slug: 'bao-duong-dinh-ky',
    category: 'Bảo dưỡng định kỳ',
    tagline: 'Xe bền, vận hành êm mỗi ngày',
    image: '/images/garage/oil-change.webp',
    intro: [
      'Bảo dưỡng định kỳ là thay dầu, thay lọc và kiểm tra các bộ phận hao mòn theo số km hoặc thời gian sử dụng. Đây là cách rẻ nhất để giữ xe vận hành êm, tiết kiệm nhiên liệu và phát hiện sớm hư hỏng trước khi chúng thành chi phí lớn.',
      'Dầu động cơ xuống cấp dần theo quãng đường và nhiệt độ; lọc gió, lọc dầu bám bẩn làm động cơ phải làm việc nặng hơn. Thay đúng hạn giúp động cơ được bôi trơn tốt và bền hơn.',
    ],
    when: [
      'Mỗi 5.000 – 10.000 km hoặc 6 tháng (tùy loại dầu và khuyến cáo của hãng xe), điều kiện nào đến trước.',
      'Sớm hơn nếu xe thường đi phố kẹt xe, đường bụi bẩn hoặc chở nặng.',
      'Trước chuyến đi xa, hoặc khi đèn báo bảo dưỡng trên taplo bật sáng.',
    ],
    includes: [
      'Thay dầu động cơ và lọc dầu đúng loại cho xe.',
      'Kiểm tra / thay lọc gió động cơ, lọc gió điều hòa.',
      'Kiểm tra nước làm mát, dầu phanh, ắc quy, áp suất và độ mòn lốp.',
      'Báo lại tình trạng xe sau khi làm — hạng mục phát sinh chỉ làm khi bạn đồng ý.',
    ],
    tip: 'Mang theo sổ bảo dưỡng (nếu có) hoặc cho cố vấn biết số km hiện tại để gara đề xuất đúng hạng mục, không làm thừa.',
  },
  {
    slug: 'gam-phanh',
    category: 'Gầm - Phanh',
    tagline: 'Lái xe an toàn, tự tin',
    image: '/images/garage/brakes.webp',
    intro: [
      'Hệ thống phanh và gầm quyết định khả năng dừng xe và độ ổn định khi chạy. Má phanh, đĩa phanh và dầu phanh hao mòn dần theo quãng đường, nên cần được kiểm tra định kỳ thay vì đợi đến khi có tiếng kêu.',
      'Phát hiện sớm má phanh mòn giúp tránh làm xước, hỏng đĩa phanh — khi đó chi phí sửa sẽ cao hơn nhiều.',
    ],
    when: [
      'Kiểm tra phanh khoảng mỗi 10.000 km, hoặc mỗi lần bảo dưỡng định kỳ.',
      'Má phanh thường cần thay trong khoảng 30.000 – 50.000 km, tùy cách lái và cung đường.',
      'Dầu phanh nên thay khoảng 2 năm/lần vì hút ẩm theo thời gian.',
    ],
    includes: [
      'Đo độ dày má phanh, kiểm tra bề mặt đĩa phanh.',
      'Kiểm tra mức và chất lượng dầu phanh, rò rỉ đường ống.',
      'Vệ sinh, bôi trơn cơ cấu phanh.',
      'Chỉ thay phụ tùng khi bạn đã duyệt báo giá.',
    ],
    tip: 'Khi có dấu hiệu bất thường ở phanh, hạn chế chạy tốc độ cao và đặt lịch kiểm tra sớm — phanh là hạng mục an toàn quan trọng nhất.',
  },
  {
    slug: 'dien-dien-lanh',
    category: 'Điện - Điện lạnh',
    tagline: 'Mát sâu, điện ổn định',
    image: '/images/garage/air-conditioning.webp',
    intro: [
      'Điều hòa và hệ thống điện ảnh hưởng trực tiếp tới sự thoải mái và độ tin cậy khi khởi động xe. Thời tiết nóng ẩm khiến dàn lạnh nhanh bám bẩn, gas hao hụt dần, còn ắc quy yếu đi theo thời gian.',
      'Kiểm tra định kỳ giúp phát hiện sớm rò rỉ gas, quạt, máy nén hay ắc quy yếu — tránh cảnh xe không mát giữa trưa hè hoặc không đề được nổ máy.',
    ],
    when: [
      'Kiểm tra điều hòa trước mùa nóng, hoặc khoảng mỗi năm một lần.',
      'Vệ sinh dàn lạnh khoảng 1 – 2 năm/lần, sớm hơn nếu xe hay đi đường bụi.',
      'Kiểm tra ắc quy khi xe đề khó, đèn yếu, hoặc ắc quy đã dùng trên 2 năm.',
    ],
    includes: [
      'Đo áp suất gas, nhiệt độ gió tại cửa gió.',
      'Kiểm tra rò rỉ, quạt dàn nóng, máy nén.',
      'Kiểm tra ắc quy, máy phát, hệ thống đèn và điện trên xe.',
      'Báo giá trước khi nạp gas hoặc thay linh kiện.',
    ],
    tip: 'Đừng tự nạp gas khi chưa tìm ra chỗ rò rỉ — gas sẽ lại hết sau một thời gian ngắn. Để kỹ thuật viên kiểm tra trước sẽ tiết kiệm hơn.',
  },
];

export const findGuide = (slug: string | undefined) => SERVICE_GUIDES.find(guide => guide.slug === slug) ?? null;
/** Trang chi tiết của một danh mục (theo tên), null nếu danh mục chưa có trang riêng. */
export const guideSlugOf = (category: string | null | undefined) =>
  SERVICE_GUIDES.find(guide => guide.category.normalize('NFC').trim().toLowerCase() === (category ?? '').normalize('NFC').trim().toLowerCase())?.slug ?? null;
