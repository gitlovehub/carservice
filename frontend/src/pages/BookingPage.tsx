import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getServices, getMaintenancePackages, type ServiceItem, type MaintenancePackage } from '../services/api';

export default function BookingPage() {
    const [searchParams] = useSearchParams();
    const initPackageId = searchParams.get('package_id') ? Number(searchParams.get('package_id')) : null;
    const initServiceId = searchParams.get('service_id') ? Number(searchParams.get('service_id')) : null;

    const [packages, setPackages] = useState<MaintenancePackage[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [selectedPackageId, setSelectedPackageId] = useState<number | null>(initPackageId);
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(
        initServiceId ? [initServiceId] : []
    );
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [appointmentDate, setAppointmentDate] = useState('');
    const [notes, setNotes] = useState('');

    const loadData = async () => {
        try {
            const [pkgsData, svcsData] = await Promise.all([
                getMaintenancePackages(),
                getServices(),
            ]);
            setPackages(Array.isArray(pkgsData) ? pkgsData : pkgsData.data || []);
            setServices(Array.isArray(svcsData) ? svcsData : svcsData.data || []);
        } catch (e) {
            console.error('Lỗi nạp dữ liệu booking:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleService = (id: number) => {
        setSelectedServiceIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSubmitBooking = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            customer_name: customerName,
            customer_phone: customerPhone,
            appointment_date: appointmentDate,
            notes,
            package_ids: selectedPackageId ? [selectedPackageId] : [],
            service_ids: selectedServiceIds,
        };

        console.log('Payload gửi tới POST /appointments:', payload);
        alert('Đã gom đủ package_ids & service_ids! Sẵn sàng gửi API đặt lịch.');
    };

    if (loading) {
        return <div className="p-12 text-center text-sm text-gray-500">Đang tải biểu mẫu đặt lịch...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Đặt Lịch Hẹn <span className="text-red-600">Dịch Vụ</span>
                </h2>

                <form onSubmit={handleSubmitBooking} className="space-y-8">
                    {/* 1. Chọn Gói bảo dưỡng */}
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-3">
                            1. Chọn Gói bảo dưỡng định kỳ (Tùy chọn)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div
                                onClick={() => setSelectedPackageId(null)}
                                className={`p-4 rounded-xl border cursor-pointer text-center text-xs font-medium transition-all ${selectedPackageId === null
                                    ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                Không chọn gói định kỳ
                            </div>
                            {packages.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    onClick={() => setSelectedPackageId(pkg.id)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedPackageId === pkg.id
                                        ? 'border-red-600 bg-red-50/50 shadow-sm'
                                        : 'border-gray-200 bg-white hover:border-gray-400'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-sm text-gray-900">{pkg.name}</span>
                                        <input
                                            type="radio"
                                            name="maintenance_pkg"
                                            checked={selectedPackageId === pkg.id}
                                            onChange={() => setSelectedPackageId(pkg.id)}
                                            className="text-red-600"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-1">{pkg.description || 'Theo số km'}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. Chọn Dịch vụ lẻ phát sinh */}
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-3">
                            2. Chọn thêm Dịch vụ lẻ ({selectedServiceIds.length} đã chọn)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 border border-gray-100 rounded-xl">
                            {services.map((svc) => (
                                <label
                                    key={svc.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedServiceIds.includes(svc.id)
                                        ? 'border-gray-900 bg-gray-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedServiceIds.includes(svc.id)}
                                        onChange={() => toggleService(svc.id)}
                                        className="mt-0.5 rounded text-gray-900 focus:ring-gray-900"
                                    />
                                    <div className="flex-1 text-xs">
                                        <span className="font-semibold text-gray-800 block">{svc.name}</span>
                                        <span className="text-gray-500">
                                            {Number(svc.base_price).toLocaleString('vi-VN')} đ
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 3. Thông tin khách hàng, ngày hẹn & Ghi chú */}
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-3">
                            3. Thông tin người đặt hẹn
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Họ tên *</label>
                                <input
                                    type="text"
                                    required
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Nguyễn Văn A"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Số điện thoại *</label>
                                <input
                                    type="tel"
                                    required
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="0912 345 678"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Ngày giờ hẹn *</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={appointmentDate}
                                    onChange={(e) => setAppointmentDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                                />
                            </div>
                        </div>

                        {/* Ô Ghi chú đã được bổ sung */}
                        <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú thêm</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Tình trạng xe, yêu cầu đặc biệt..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs h-24 resize-none"
                            ></textarea>
                        </div>
                    </div>

                    {/* Nút gửi */}
                    <button
                        type="submit"
                        className="w-full py-3 bg-gray-900 hover:bg-red-600 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99]"
                    >
                        Xác Nhận Đặt Lịch
                    </button>
                </form>
            </div>
        </div>
    );
}