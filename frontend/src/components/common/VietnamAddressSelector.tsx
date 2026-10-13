import React, { useEffect, useMemo, useState } from "react";

type Province = {
  code: number;
  name: string;
};

type Ward = {
  code: number;
  name: string;
  districtName?: string;
};

// 63 Tỉnh/Thành phố trực thuộc Trung ương của Việt Nam
const FALLBACK_PROVINCES: Province[] = [
  { code: 1, name: "Thành phố Hà Nội" },
  { code: 79, name: "Thành phố Hồ Chí Minh" },
  { code: 31, name: "Thành phố Hải Phòng" },
  { code: 48, name: "Thành phố Đà Nẵng" },
  { code: 92, name: "Thành phố Cần Thơ" },
  { code: 2, name: "Tỉnh Hà Giang" },
  { code: 4, name: "Tỉnh Cao Bằng" },
  { code: 6, name: "Tỉnh Bắc Kạn" },
  { code: 8, name: "Tỉnh Tuyên Quang" },
  { code: 10, name: "Tỉnh Lào Cai" },
  { code: 11, name: "Tỉnh Điện Biên" },
  { code: 12, name: "Tỉnh Lai Châu" },
  { code: 14, name: "Tỉnh Sơn La" },
  { code: 15, name: "Tỉnh Yên Bái" },
  { code: 17, name: "Tỉnh Hoà Bình" },
  { code: 19, name: "Tỉnh Thái Nguyên" },
  { code: 20, name: "Tỉnh Lạng Sơn" },
  { code: 22, name: "Tỉnh Quảng Ninh" },
  { code: 24, name: "Tỉnh Bắc Giang" },
  { code: 25, name: "Tỉnh Phú Thọ" },
  { code: 26, name: "Tỉnh Vĩnh Phúc" },
  { code: 27, name: "Tỉnh Bắc Ninh" },
  { code: 30, name: "Tỉnh Hải Dương" },
  { code: 33, name: "Tỉnh Hưng Yên" },
  { code: 34, name: "Tỉnh Thái Bình" },
  { code: 35, name: "Tỉnh Hà Nam" },
  { code: 36, name: "Tỉnh Nam Định" },
  { code: 37, name: "Tỉnh Ninh Bình" },
  { code: 38, name: "Tỉnh Thanh Hóa" },
  { code: 40, name: "Tỉnh Nghệ An" },
  { code: 42, name: "Tỉnh Hà Tĩnh" },
  { code: 44, name: "Tỉnh Quảng Bình" },
  { code: 45, name: "Tỉnh Quảng Trị" },
  { code: 46, name: "Tỉnh Thừa Thiên Huế" },
  { code: 49, name: "Tỉnh Quảng Nam" },
  { code: 51, name: "Tỉnh Quảng Ngãi" },
  { code: 52, name: "Tỉnh Bình Định" },
  { code: 54, name: "Tỉnh Phú Yên" },
  { code: 56, name: "Tỉnh Khánh Hòa" },
  { code: 58, name: "Tỉnh Ninh Thuận" },
  { code: 60, name: "Tỉnh Bình Thuận" },
  { code: 62, name: "Tỉnh Kon Tum" },
  { code: 64, name: "Tỉnh Gia Lai" },
  { code: 66, name: "Tỉnh Đắk Lắk" },
  { code: 67, name: "Tỉnh Đắk Nông" },
  { code: 68, name: "Tỉnh Lâm Đồng" },
  { code: 70, name: "Tỉnh Bình Phước" },
  { code: 72, name: "Tỉnh Tây Ninh" },
  { code: 74, name: "Tỉnh Bình Dương" },
  { code: 75, name: "Tỉnh Đồng Nai" },
  { code: 77, name: "Tỉnh Bà Rịa - Vũng Tàu" },
  { code: 80, name: "Tỉnh Long An" },
  { code: 82, name: "Tỉnh Tiền Giang" },
  { code: 83, name: "Tỉnh Bến Tre" },
  { code: 84, name: "Tỉnh Trà Vinh" },
  { code: 86, name: "Tỉnh Vĩnh Long" },
  { code: 87, name: "Tỉnh Đồng Tháp" },
  { code: 89, name: "Tỉnh An Giang" },
  { code: 91, name: "Tỉnh Kiên Giang" },
  { code: 93, name: "Tỉnh Hậu Giang" },
  { code: 94, name: "Tỉnh Sóc Trăng" },
  { code: 95, name: "Tỉnh Bạc Liêu" },
  { code: 96, name: "Tỉnh Cà Mau" },
];

const cachedProvinces: Province[] = [];
const cachedProvinceWards: Record<number, Ward[]> = {};

type VietnamAddressSelectorProps = {
  value: string;
  onChange: (newAddress: string) => void;
  error?: string;
};

export default function VietnamAddressSelector({
  value,
  onChange,
  error,
}: VietnamAddressSelectorProps) {
  const [provinces, setProvinces] = useState<Province[]>(FALLBACK_PROVINCES);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState<string>("");
  const [searchWardText, setSearchWardText] = useState<string>("");

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // 1. Tải danh sách 63 Tỉnh/Thành phố
  useEffect(() => {
    if (cachedProvinces.length > 0) {
      setProvinces(cachedProvinces);
      return;
    }

    setLoadingProvinces(true);
    fetch("https://provinces.open-api.vn/api/?depth=1")
      .then((res) => res.json())
      .then((data: Province[]) => {
        if (Array.isArray(data) && data.length > 0) {
          cachedProvinces.push(...data);
          setProvinces(data);
        }
      })
      .catch(() => {
        setProvinces(FALLBACK_PROVINCES);
      })
      .finally(() => {
        setLoadingProvinces(false);
      });
  }, []);

  // 2. Tải toàn bộ Xã/Phường trực thuộc khi chọn Tỉnh/Thành phố (Mô hình 2 cấp: Tỉnh/TP -> Xã/Phường)
  useEffect(() => {
    if (!selectedProvince) {
      setWards([]);
      setSelectedWard("");
      setSearchWardText("");
      return;
    }

    const provinceObj = provinces.find((p) => p.name === selectedProvince);
    if (!provinceObj) return;

    if (cachedProvinceWards[provinceObj.code]) {
      setWards(cachedProvinceWards[provinceObj.code]);
      setSelectedWard("");
      setSearchWardText("");
      return;
    }

    setLoadingWards(true);
    fetch(`https://provinces.open-api.vn/api/p/${provinceObj.code}?depth=3`)
      .then((res) => res.json())
      .then((data: { districts?: Array<{ name: string; wards?: Array<{ code: number; name: string }> }> }) => {
        const districtList = data.districts || [];
        const allWards: Ward[] = [];

        districtList.forEach((d) => {
          if (Array.isArray(d.wards)) {
            d.wards.forEach((w) => {
              allWards.push({
                code: w.code,
                name: w.name,
                districtName: d.name,
              });
            });
          }
        });

        // Sắp xếp Xã/Phường theo thứ tự bảng chữ cái
        allWards.sort((a, b) => a.name.localeCompare(b.name, "vi"));

        cachedProvinceWards[provinceObj.code] = allWards;
        setWards(allWards);
        setSelectedWard("");
        setSearchWardText("");
      })
      .catch(() => {
        setWards([]);
      })
      .finally(() => {
        setLoadingWards(false);
      });
  }, [selectedProvince, provinces]);

  // 3. Tự động ghép địa chỉ mới theo mô hình 2 cấp: [Số nhà/đường], [Xã/Phường], [Tỉnh/TP] (Đã bỏ Quận/Huyện)
  const updateAddress = (prov: string, wrd: string, street: string) => {
    const parts: string[] = [];
    if (street.trim()) parts.push(street.trim());
    if (wrd.trim()) parts.push(wrd.trim());
    if (prov.trim()) parts.push(prov.trim());

    const combined = parts.join(", ");
    onChange(combined);
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value;
    setSelectedProvince(newProv);
    setSelectedWard("");
    updateAddress(newProv, "", streetAddress);
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newWard = e.target.value;
    setSelectedWard(newWard);
    updateAddress(selectedProvince, newWard, streetAddress);
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStreet = e.target.value;
    setStreetAddress(newStreet);
    updateAddress(selectedProvince, selectedWard, newStreet);
  };

  // Lọc danh sách Xã/Phường nếu người dùng gõ tìm kiếm nhanh
  const filteredWards = useMemo(() => {
    if (!searchWardText.trim()) return wards;
    const lower = searchWardText.toLowerCase().trim();
    return wards.filter(
      (w) =>
        w.name.toLowerCase().includes(lower) ||
        (w.districtName && w.districtName.toLowerCase().includes(lower)),
    );
  }, [wards, searchWardText]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-[#1F2933]">
          Địa chỉ (Chọn tự động theo quy chuẩn mới)
        </label>
        <span className="rounded-md bg-[#F4F6F8] px-2 py-0.5 text-[10px] font-semibold text-[#66717C]">
          2 cấp: Tỉnh/TP → Xã/Phường
        </span>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-[#FBFBFA] p-3.5">
        {/* Bước 1: Chọn Tỉnh / Thành phố */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700">
            1. Tỉnh / Thành phố <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedProvince}
            onChange={handleProvinceChange}
            disabled={loadingProvinces}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F]"
          >
            <option value="">
              {loadingProvinces
                ? "Đang tải tỉnh thành..."
                : "-- Chọn Tỉnh / Thành phố --"}
            </option>
            {provinces.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bước 2: Chọn Xã / Phường (Bỏ cấp Quận/Huyện) */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-700">
              2. Xã / Phường <span className="text-rose-500">*</span>
            </label>
            {wards.length > 0 && (
              <span className="text-[10px] text-slate-500">
                {wards.length} xã/phường
              </span>
            )}
          </div>

          {/* Ô tìm kiếm nhanh xã/phường */}
          {selectedProvince && wards.length > 10 && (
            <div className="mt-1 mb-1.5">
              <input
                type="text"
                value={searchWardText}
                onChange={(e) => setSearchWardText(e.target.value)}
                placeholder="🔍 Gõ nhanh tên xã/phường để lọc..."
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-[#20252B] placeholder:text-slate-400 focus:border-[#D6A85F] focus:outline-none"
              />
            </div>
          )}

          <select
            value={selectedWard}
            onChange={handleWardChange}
            disabled={!selectedProvince || loadingWards}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F] disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">
              {loadingWards
                ? "Đang tải danh sách xã/phường..."
                : selectedProvince
                ? "-- Chọn Xã / Phường --"
                : "-- Chọn Tỉnh/Thành phố trước --"}
            </option>
            {filteredWards.map((w) => (
              <option key={w.code} value={w.name}>
                {w.name} {w.districtName ? `(${w.districtName})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Bước 3: Số nhà, ngõ/đường chi tiết */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700">
            3. Số nhà, tên ngõ/đường chi tiết
          </label>
          <input
            type="text"
            value={streetAddress}
            onChange={handleStreetChange}
            placeholder="Ví dụ: Số 36, Phố Dịch Vọng Hậu"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F]"
          />
        </div>

        {/* Địa chỉ hoàn chỉnh tổng hợp tự động */}
        <div className="rounded-xl border border-[#D6A85F]/40 bg-[#FBF8F1] p-3 text-[11px]">
          <div className="flex items-center gap-1.5 font-semibold text-[#8B6B38]">
            <span>📍</span>
            <span>Địa chỉ tự động tổng hợp:</span>
          </div>
          <p className="mt-1 font-semibold text-[#1F2933]">
            {value ? value : "(Vui lòng chọn Tỉnh/TP và Xã/Phường)"}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-[11px] font-medium text-rose-500">{error}</p>
      )}
    </div>
  );
}
