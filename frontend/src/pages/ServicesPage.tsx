// frontend/src/pages/ServicesPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices, type ServiceItem } from '../services/api';

const CATEGORIES = [
    'Tất cả',
    'Bảo dưỡng định kỳ',
    'Gầm - Phanh',
    'Động cơ - Hộp số',
    'Điện - Điện lạnh',
    'Chăm sóc xe - Detailing',
];

export default function ServicesPage() {
    const navigate = useNavigate();
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [searchQuery, setSearchQuery] = useState('');
    const [detailModal, setDetailModal] = useState<ServiceItem | null>(null);

    useEffect(() => {
        fetchServices();
    }, [selectedCategory, searchQuery]);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const categoryParam = selectedCategory === 'Tất cả' ? undefined : selectedCategory;
            const data = await getServices({ category: categoryParam, search: searchQuery || undefined });
            setServices(Array.isArray(data) ? data : data.data || []);
        } catch (err) {
            console.error('Lỗi tải danh mục dịch vụ:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBookNow = (serviceId: number) => {
        navigate(`/booking?service_id=${serviceId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Danh Mục Dịch Vụ & <span className="text-red-600">Bảng Giá</span>
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Minh bạch chi phí, thời gian thi công và cam kết chất lượng theo tiêu chuẩn hãng.
                    </p>
                </div>

                {/* Thanh tìm kiếm & Bộ lọc */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-8 space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm tên dịch vụ, ví dụ: thay dầu nhớt, kiểm tra phanh..."
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900"
                            />
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-semibold transition-all ${selectedCategory === cat
                                    ? 'bg-gray-900 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Danh sách Dịch vụ (Grid) */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 animate-pulse space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-10 bg-gray-200 rounded-xl mt-4"></div>
                            </div>
                        ))}
                    </div>
                ) : services.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                        <p className="text-gray-500 text-sm">Không tìm thấy dịch vụ nào phù hợp.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map((svc) => (
                            <div
                                key={svc.id}
                                className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-md">
                                            {svc.category || 'Dịch vụ'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            ⏱ {svc.estimated_duration_min ? `${svc.estimated_duration_min} phút` : '30-60 phút'}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                                        {svc.name}
                                    </h3>
                                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                        {svc.description || 'Dịch vụ bảo dưỡng & kiểm tra đạt tiêu chuẩn kỹ thuật an toàn.'}
                                    </p>
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] text-gray-400 block">Giá tham khảo</span>
                                        <span className="text-base font-bold text-gray-900">
                                            {Number(svc.base_price).toLocaleString('vi-VN')} đ
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setDetailModal(svc)}
                                            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Chi tiết
                                        </button>
                                        <button
                                            onClick={() => handleBookNow(svc.id)}
                                            className="px-4 py-2 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-red-600 transition-colors"
                                        >
                                            Đặt lịch ngay
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Xem chi tiết */}
            {detailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in-95">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{detailModal.name}</h3>
                        <span className="inline-block text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium mb-4">
                            {detailModal.category}
                        </span>
                        <div className="space-y-3 text-sm text-gray-600">
                            <p>{detailModal.description || 'Dịch vụ được kiểm định và thực hiện bởi đội ngũ kỹ thuật viên tay nghề cao.'}</p>
                            <div className="flex justify-between py-2 border-y border-gray-100">
                                <span>Thời gian dự tính:</span>
                                <span className="font-semibold text-gray-900">{detailModal.estimated_duration_min || 45} phút</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Chi phí ước tính:</span>
                                <span className="font-bold text-red-600 text-base">
                                    {Number(detailModal.base_price).toLocaleString('vi-VN')} đ
                                </span>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setDetailModal(null)}
                                className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={() => {
                                    setDetailModal(null);
                                    handleBookNow(detailModal.id);
                                }}
                                className="px-4 py-2 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-red-600"
                            >
                                Đặt lịch với dịch vụ này
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}