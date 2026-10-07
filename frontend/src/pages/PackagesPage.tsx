// frontend/src/pages/PackagesPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMaintenancePackages, type MaintenancePackage } from '../services/api';

export default function PackagesPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<MaintenancePackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Đưa hàm fetch lên TRƯỚC useEffect
  const fetchPackages = async () => {
    setLoading(true);
    try {
      const data = await getMaintenancePackages();
      setPackages(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error('Lỗi tải gói bảo dưỡng:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gọi hàm trong useEffect SAU
  useEffect(() => {
    fetchPackages();
  }, []);

  // CHỈ KHAI BÁO 1 LẦN DUY NHẤT
  const handleSelectPackage = (pkgId: number) => {
    navigate(`/booking?package_id=${pkgId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Gói Bảo Dưỡng <span className="text-red-600">Định Kỳ</span>
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Tối ưu vận hành và bảo vệ tuổi thọ xế yêu theo các mốc km chuẩn quốc tế.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="space-y-2 py-4">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between hover:border-gray-900 hover:shadow-lg transition-all"
              >
                <div>
                  <div className="w-12 h-12 bg-red-50 text-red-600 font-bold text-sm rounded-xl flex items-center justify-center mb-4">
                    {pkg.mileage_km ? `${pkg.mileage_km / 1000}k` : 'Auto'}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {pkg.description || `Mốc ${pkg.mileage_km?.toLocaleString()} km hoặc sau mỗi 6 tháng`}
                  </p>

                  <div className="mt-6">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">
                      Hạng mục công việc ({pkg.services?.length || 0}):
                    </p>
                    <ul className="space-y-2 text-xs text-gray-600">
                      {pkg.services && pkg.services.length > 0 ? (
                        pkg.services.slice(0, 5).map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{s.name}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-400 italic">Kiểm tra tổng quát theo tiêu chuẩn</li>
                      )}
                      {pkg.services && pkg.services.length > 5 && (
                        <li className="text-gray-400 italic text-[11px]">
                          + {pkg.services.length - 5} hạng mục khác
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-100">
                  {pkg.price && (
                    <div className="mb-3 text-center">
                      <span className="text-xs text-gray-400">Giá gói: </span>
                      <span className="text-lg font-bold text-red-600">
                        {Number(pkg.price).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleSelectPackage(pkg.id)}
                    className="w-full py-2.5 px-4 bg-gray-900 hover:bg-red-600 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                  >
                    Chọn gói này để đặt lịch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}