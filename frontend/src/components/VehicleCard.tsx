export default function VehicleCard() {
  const vehicle = {
    brand: "Toyota",
    model: "Camry",
    plate: "30A-123.45",
    year: 2024,
    km: 15000,
  };

  return (
    <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      {/* Header: icon + tên xe */}
      <div className="flex items-center gap-3 mb-4">
        <div className="shrink-0 w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-indigo-600"
          >
            <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
            <path d="M3 16a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1h-1" />
            <path d="M3 16v2a1 1 0 0 0 1 1h1" />
            <circle cx="7.5" cy="17.5" r="1.5" />
            <circle cx="16.5" cy="17.5" r="1.5" />
          </svg>
        </div>
        <div>
          <div className="text-base font-semibold text-gray-900">
            {vehicle.brand} {vehicle.model}
          </div>
          <div className="text-sm text-gray-500">{vehicle.plate}</div>
        </div>
      </div>

      {/* Thông tin chi tiết */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500 mb-0.5">Năm sản xuất</div>
          <div className="text-sm font-medium text-gray-900">
            {vehicle.year}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500 mb-0.5">Số km</div>
          <div className="text-sm font-medium text-gray-900">
            {vehicle.km.toLocaleString("vi-VN")} km
          </div>
        </div>
      </div>

      {/* Nút hành động */}
      <button
        type="button"
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors cursor-pointer"
      >
        Xem xe
      </button>
    </div>
  );
}
