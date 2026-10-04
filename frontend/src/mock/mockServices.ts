import type { IService } from '../interfaces/IService';

/**
 * ============================================================================
 * DỮ LIỆU GIẢ CHO DANH MỤC DỊCH VỤ (Sprint 1)
 * ============================================================================
 *
 * MỤC ĐÍCH:
 *   Backend chưa có API cho bảng services, nhưng UI cần dữ liệu để chạy và
 *   demo. File này giả lập danh sách dịch vụ của một garage ô tô thật.
 *
 * DÙNG Ở ĐÂY:
 *   ServiceManagement.tsx -> useState<IService[]>(mockServices)
 *   PackageManagement.tsx -> dùng chung để tính tổng giá gói bảo dưỡng
 *
 * KHI NỐI API THẬT:
 *   Chỉ cần thay dòng khởi tạo state trong page bằng lời gọi API, ví dụ:
 *     const [services, setServices] = useState<IService[]>([]);
 *     useEffect(() => {
 *       fetch('http://127.0.0.1:8000/api/services')
 *         .then((res) => res.json())
 *         .then((data) => setServices(data.data))
 *         .catch(console.error);
 *     }, []);
 *   Toàn bộ component, bảng, modal, validate không phải sửa gì,
 *   vì interface đã khớp sẵn với bảng `services` của database.
 *
 * LƯU Ý KHI CHỌN DỮ LIỆU:
 *   - Giá thực tế của garage Việt Nam, làm tròn nghìn cho dễ đọc.
 *   - id liên tục từ 1 vì các trang tự sinh id khi thêm mới:
 *     services.reduce((max, s) => Math.max(max, s.id), 0) + 1
 *   - Cố tình có MỘT bản ghi INACTIVE (id 8) để chứng minh bộ lọc trạng thái
 *     và badge "Ngừng hoạt động" hoạt động đúng, chứ không chỉ dữ liệu toàn ACTIVE.
 */

/**
 * Danh sách 12 dịch vụ, xếp theo nhóm nghiệp vụ:
 *   Bảo dưỡng định kỳ (1, 6) · Hệ thống phanh (2, 5) · Hệ thống truyền động (3, 10)
 *   Hệ thống lái (4) · Điện - Điện tử (7) · Lốp - Bánh (8) · Điều hoà (9)
 *   Sơn - Thân vỏ (11) · Kiểm tra tổng hợp (12)
 */
export const mockServices: IService[] = [
  {
    id: 1,
    name: 'Thay dầu máy & lọc gió',
    category: 'Bảo dưỡng định kỳ',
    description:
      'Thay dầu máy mới, thay lọc gió, kiểm tra mức nước làm mát và nước rửa kính.',
    base_price: 750000,
    estimated_minutes: 45,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:00:00.000000Z',
    updated_at: '2026-09-24T09:00:00.000000Z',
  },
  {
    id: 2,
    name: 'Thay phanh trước',
    category: 'Hệ thống phanh',
    description: 'Thay má phanh và đĩa phanh trước, xử lý bề mặt.',
    base_price: 1450000,
    estimated_minutes: 90,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:05:00.000000Z',
    updated_at: '2026-09-24T09:05:00.000000Z',
  },
  {
    id: 3,
    name: 'Bảo dưỡng hộp số',
    category: 'Hệ thống truyền động',
    description: 'Thay dầu hộp số, kiểm tra rò rỉ và độ trượt bánh răng.',
    base_price: 1200000,
    estimated_minutes: 60,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:10:00.000000Z',
    updated_at: '2026-09-24T09:10:00.000000Z',
  },
  {
    id: 4,
    name: 'Cân bằng động',
    category: 'Hệ thống lái',
    description: 'Cân bằng bánh xe 4 chỗ, kiểm tra góc chéo và độ chơi vô-lăng.',
    base_price: 320000,
    estimated_minutes: 40,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:15:00.000000Z',
    updated_at: '2026-09-24T09:15:00.000000Z',
  },
  {
    id: 5,
    name: 'Thay dầu phanh',
    category: 'Hệ thống phanh',
    description: 'Thay toàn bộ dầu phanh và xử lý đường ống, đẩy hơi.',
    base_price: 380000,
    estimated_minutes: 50,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:20:00.000000Z',
    updated_at: '2026-09-24T09:20:00.000000Z',
  },
  {
    id: 6,
    name: 'Thay lọc không khí',
    category: 'Bảo dưỡng định kỳ',
    description: 'Thay lọc không khí động cơ và vệ sinh buồng nhiên liệu.',
    base_price: 280000,
    estimated_minutes: 30,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:25:00.000000Z',
    updated_at: '2026-09-24T09:25:00.000000Z',
  },
  {
    id: 7,
    name: 'Thay ắc quy',
    category: 'Điện – Điện tử',
    description: 'Thay ắc quy mới, kiểm tra tải và hệ thống nạp.',
    base_price: 2100000,
    estimated_minutes: 30,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:30:00.000000Z',
    updated_at: '2026-09-24T09:30:00.000000Z',
  },
  {
    // Cố tình để INACTIVE: dịch vụ vẫn còn trong danh mục để tra cứu lịch sử,
    // nhưng không cho khách đặt thêm. Cần ít nhất 1 bản ghi như vậy để
    // bộ lọc trạng thái và badge "Ngừng hoạt động" được kiểm chứng.
    id: 8,
    name: 'Thay lốp trước',
    category: 'Lốp – Bánh',
    description: 'Thay lốp trước 2 bên, cân bằng và kiểm tra áp suất.',
    base_price: 1900000,
    estimated_minutes: 60,
    status: 'INACTIVE',
    created_at: '2026-09-24T09:35:00.000000Z',
    updated_at: '2026-09-24T09:35:00.000000Z',
  },
  {
    id: 9,
    name: 'Sạc và vệ sinh hệ thống điều hoà',
    category: 'Điều hoà – Nội thất',
    description: 'Vệ sinh dàn lạnh, kiểm tra ga và bổ sung nạp.',
    base_price: 650000,
    estimated_minutes: 75,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:40:00.000000Z',
    updated_at: '2026-09-24T09:40:00.000000Z',
  },
  {
    // Dịch vụ lâu nhất (240 phút = 4 giờ) -> dùng để kiểm tra hàm
    // formatDuration hiển thị "4 giờ" chứ không phải "240 phút".
    id: 10,
    name: 'Xả cầu truyền động',
    category: 'Hệ thống truyền động',
    description: 'Xả cầu trục chính, thay dầu và kiểm tra độ chơi răng cấu.',
    base_price: 4200000,
    estimated_minutes: 240,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:45:00.000000Z',
    updated_at: '2026-09-24T09:45:00.000000Z',
  },
  {
    id: 11,
    name: 'Sơn và chống gỉ',
    category: 'Sơn – Bảo dưỡng thân vỏ',
    description: 'Đánh bóng, xử lý vết mục và phủ bảo vệ bề mặt.',
    base_price: 3500000,
    estimated_minutes: 180,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:50:00.000000Z',
    updated_at: '2026-09-24T09:50:00.000000Z',
  },
  {
    // Dịch vụ rẻ nhất (150.000 ₫), nằm trong danh mục "Khác".
    id: 12,
    name: 'Kiểm tra tổng hợp trước khi giao xe',
    category: 'Khác',
    description: 'Kiểm tra 30 hạng mục an toàn trước khi bàn giao xe cho khách.',
    base_price: 150000,
    estimated_minutes: 30,
    status: 'ACTIVE',
    created_at: '2026-09-24T09:55:00.000000Z',
    updated_at: '2026-09-24T09:55:00.000000Z',
  },
];
