import React, { useEffect, useMemo, useRef, useState } from "react";

type Province = {
  code: number;
  name: string;
};

type Ward = {
  code: number;
  name: string;
  districtName?: string;
};

// Loại bỏ dấu tiếng Việt để tìm kiếm không dấu (VD: "dich vong" -> "dịch vọng")
function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

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

  // Trạng thái tìm kiếm dropdown Xã/Phường
  const [searchWardInput, setSearchWardInput] = useState<string>("");
  const [isWardDropdownOpen, setIsWardDropdownOpen] = useState<boolean>(false);
  const wardDropdownRef = useRef<HTMLDivElement>(null);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // Đóng dropdown khi nhấn ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wardDropdownRef.current &&
        !wardDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWardDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // 2. Tải toàn bộ Xã/Phường của Tỉnh/Thành phố (Mô hình 2 cấp: Tỉnh/TP -> Xã/Phường)
  useEffect(() => {
    if (!selectedProvince) {
      setWards([]);
      setSelectedWard("");
      setSearchWardInput("");
      return;
    }

    const provinceObj = provinces.find((p) => p.name === selectedProvince);
    if (!provinceObj) return;

    if (cachedProvinceWards[provinceObj.code]) {
      setWards(cachedProvinceWards[provinceObj.code]);
      setSelectedWard("");
      setSearchWardInput("");
      return;
    }

    setLoadingWards(true);
    fetch(`https://provinces.open-api.vn/api/p/${provinceObj.code}?depth=3`)
      .then((res) => res.json())
      .then(
        (data: {
          districts?: Array<{
            name: string;
            wards?: Array<{ code: number; name: string }>;
          }>;
        }) => {
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

          // Sắp xếp Xã/Phường theo alphabet tiếng Việt
          allWards.sort((a, b) => a.name.localeCompare(b.name, "vi"));

          cachedProvinceWards[provinceObj.code] = allWards;
          setWards(allWards);
          setSelectedWard("");
          setSearchWardInput("");
        },
      )
      .catch(() => {
        setWards([]);
      })
      .finally(() => {
        setLoadingWards(false);
      });
  }, [selectedProvince, provinces]);

  // 3. Tự động ghép địa chỉ mới theo mô hình 2 cấp: [Số nhà/đường], [Xã/Phường], [Tỉnh/TP]
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
    setSearchWardInput("");
    setIsWardDropdownOpen(false);
    updateAddress(newProv, "", streetAddress);
  };

  const handleSelectWard = (wardName: string) => {
    setSelectedWard(wardName);
    setSearchWardInput(wardName);
    setIsWardDropdownOpen(false);
    updateAddress(selectedProvince, wardName, streetAddress);
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStreet = e.target.value;
    setStreetAddress(newStreet);
    updateAddress(selectedProvince, selectedWard, newStreet);
  };

  // 4. Lọc thông minh theo từ khóa (hỗ trợ cả tiếng Việt có dấu và không dấu)
  const filteredWards = useMemo(() => {
    if (!searchWardInput.trim()) return wards.slice(0, 50); // Hiển thị 50 xã/phường đầu tiên khi chưa gõ

    const rawLower = searchWardInput.toLowerCase().trim();
    const toneFree = removeVietnameseTones(searchWardInput);

    return wards
      .filter((w) => {
        const nameRaw = w.name.toLowerCase();
        const nameToneFree = removeVietnameseTones(w.name);
        const distToneFree = w.districtName
          ? removeVietnameseTones(w.districtName)
          : "";

        return (
          nameRaw.includes(rawLower) ||
          nameToneFree.includes(toneFree) ||
          distToneFree.includes(toneFree)
        );
      })
      .slice(0, 50); // Giới hạn 50 kết quả để giao diện siêu mượt
  }, [wards, searchWardInput]);

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
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F]"
          >
            <option value="">
              {loadingProvinces
                ? "Đang tải tỉnh thành..."
                : "-- Bấm chọn Tỉnh / Thành phố --"}
            </option>
            {provinces.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bước 2: Tìm kiếm & Chọn Xã / Phường (Combobox Dropdown hiển thị trực quan) */}
        <div ref={wardDropdownRef} className="relative">
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

          <div className="relative mt-1">
            <input
              type="text"
              value={searchWardInput}
              disabled={!selectedProvince || loadingWards}
              onFocus={() => {
                if (selectedProvince && wards.length > 0) {
                  setIsWardDropdownOpen(true);
                }
              }}
              onChange={(e) => {
                setSearchWardInput(e.target.value);
                setIsWardDropdownOpen(true);
                if (!e.target.value) {
                  setSelectedWard("");
                  updateAddress(selectedProvince, "", streetAddress);
                }
              }}
              placeholder={
                !selectedProvince
                  ? "⚠️ Vui lòng chọn Tỉnh/Thành phố ở bước 1 trước"
                  : loadingWards
                  ? "⏳ Đang tải dữ liệu xã/phường..."
                  : "🔍 Bấm vào đây hoặc gõ tên xã/phường để chọn..."
              }
              className={`w-full rounded-xl border bg-white px-3 py-2.5 text-xs font-medium text-[#20252B] placeholder:text-slate-400 transition focus:outline-none ${
                isWardDropdownOpen
                  ? "border-[#D6A85F] ring-1 ring-[#D6A85F]"
                  : "border-slate-300"
              } disabled:bg-slate-100 disabled:text-slate-400`}
            />

            {/* Nút mũi tên mở danh sách */}
            {selectedProvince && !loadingWards && (
              <button
                type="button"
                onClick={() => setIsWardDropdownOpen(!isWardDropdownOpen)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {isWardDropdownOpen ? "▲" : "▼"}
              </button>
            )}
          </div>

          {/* Menu Dropdown hiển thị kết quả lọc trực tiếp */}
          {isWardDropdownOpen && selectedProvince && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
              {filteredWards.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  Không tìm thấy xã/phường nào khớp với "
                  <span className="font-semibold text-slate-800">
                    {searchWardInput}
                  </span>
                  "
                </div>
              ) : (
                filteredWards.map((w) => {
                  const isSelected = selectedWard === w.name;
                  return (
                    <div
                      key={w.code}
                      onClick={() => handleSelectWard(w.name)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                        isSelected
                          ? "bg-[#D6A85F]/20 font-bold text-[#3A3020]"
                          : "text-[#20252B] hover:bg-[#F7F7F5]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[#D6A85F]">✓</span>
                        <span className="font-semibold">{w.name}</span>
                      </div>
                      {w.districtName && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          {w.districtName}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
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
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F]"
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
