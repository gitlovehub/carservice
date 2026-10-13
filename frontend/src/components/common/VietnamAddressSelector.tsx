import React, { useEffect, useMemo, useRef, useState } from "react";

type Province = {
  code: number;
  name: string;
};

type Ward = {
  code: number;
  name: string;
  districtName?: string;
  isNew2025?: boolean;
};

// Loại bỏ dấu tiếng Việt để tìm kiếm không dấu (VD: "da phuc" -> "đa phúc")
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

// Danh mục bổ sung các đơn vị hành chính MỚI thành lập / sáp nhập theo các Nghị quyết sắp xếp 2024 - 2025
// (Đặc biệt Nghị quyết 1656/NQ-UBTVQH15 có hiệu lực từ 01/07/2025)
const NEW_ADMIN_UNITS_2025: Record<number, Ward[]> = {
  1: [
    // TP Hà Nội
    {
      code: 90001,
      name: "Xã Đa Phúc",
      districtName: "Sóc Sơn cũ (Sáp nhập 7 xã: Bắc Phú, Đức Hòa, Kim Lũ, Tân Hưng, Việt Long, Xuân Giang, Xuân Thu)",
      isNew2025: true,
    },
    {
      code: 90002,
      name: "Phường Hoàn Kiếm",
      districtName: "Quận Hoàn Kiếm cũ (Sáp nhập Hàng Bạc, Hàng Đào, Hàng Gai, Hàng Buồm...)",
      isNew2025: true,
    },
    {
      code: 90003,
      name: "Phường Cửa Nam",
      districtName: "Quận Hoàn Kiếm cũ (Sáp nhập Hàng Bài, Phan Chu Trinh, Trần Hưng Đạo...)",
      isNew2025: true,
    },
    {
      code: 90004,
      name: "Phường Ba Đình",
      districtName: "Quận Ba Đình cũ (Sáp nhập Quán Thánh, Trúc Bạch, Điện Biên...)",
      isNew2025: true,
    },
    {
      code: 90005,
      name: "Phường Ngọc Hà",
      districtName: "Quận Ba Đình cũ (Sáp nhập Vĩnh Phúc, Liễu Giai, Đội Cấn...)",
      isNew2025: true,
    },
    {
      code: 90006,
      name: "Phường Giảng Võ",
      districtName: "Quận Ba Đình cũ (Sáp nhập Cát Linh, Láng Hạ, Thành Công...)",
      isNew2025: true,
    },
    {
      code: 90007,
      name: "Phường Hai Bà Trưng",
      districtName: "Quận Hai Bà Trưng cũ (Sáp nhập Đồng Nhân, Phố Huế, Bạch Đằng...)",
      isNew2025: true,
    },
    {
      code: 90008,
      name: "Phường Khâm Thiên",
      districtName: "Quận Đống Đa cũ (Sáp nhập Trung Phụng, Phương Liên...)",
      isNew2025: true,
    },
    {
      code: 90009,
      name: "Phường Văn Miếu - Quốc Tử Giám",
      districtName: "Quận Đống Đa cũ",
      isNew2025: true,
    },
    {
      code: 90010,
      name: "Phường Phương Liệt",
      districtName: "Quận Thanh Xuân cũ",
      isNew2025: true,
    },
    {
      code: 90011,
      name: "Phường Hạ Đình",
      districtName: "Quận Thanh Xuân cũ",
      isNew2025: true,
    },
    {
      code: 90012,
      name: "Phường Kim Giang",
      districtName: "Quận Thanh Xuân cũ",
      isNew2025: true,
    },
    {
      code: 90013,
      name: "Xã Quảng Oai",
      districtName: "Huyện Ba Vì cũ",
      isNew2025: true,
    },
    {
      code: 90014,
      name: "Xã Vật Lại",
      districtName: "Huyện Ba Vì cũ",
      isNew2025: true,
    },
    {
      code: 90015,
      name: "Xã Hát Môn",
      districtName: "Huyện Phúc Thọ cũ",
      isNew2025: true,
    },
    {
      code: 90016,
      name: "Xã Tiên Phương",
      districtName: "Huyện Chương Mỹ cũ",
      isNew2025: true,
    },
    {
      code: 90017,
      name: "Xã Dân Hòa",
      districtName: "Huyện Thanh Oai cũ",
      isNew2025: true,
    },
  ],
  79: [
    // TP Hồ Chí Minh
    {
      code: 90101,
      name: "Phường An Khánh",
      districtName: "TP Thủ Đức",
      isNew2025: true,
    },
    {
      code: 90102,
      name: "Phường Bến Nghé",
      districtName: "Quận 1",
      isNew2025: true,
    },
    {
      code: 90103,
      name: "Phường Bến Thành",
      districtName: "Quận 1",
      isNew2025: true,
    },
    {
      code: 90104,
      name: "Phường Đa Kao",
      districtName: "Quận 1",
      isNew2025: true,
    },
    {
      code: 90105,
      name: "Phường Võ Thị Sáu",
      districtName: "Quận 3",
      isNew2025: true,
    },
  ],
};

const cachedProvinces: Province[] = [];
const cachedProvinceWards: Record<number, Ward[]> = {};

// Helper: Phân tích chuỗi địa chỉ có sẵn thành các phần: Tỉnh/TP, Xã/Phường, Số nhà/đường
function parseAddressString(addressStr: string, provinceList: Province[]): {
  province: string;
  ward: string;
  street: string;
} {
  if (!addressStr || addressStr === "Chưa cập nhật") {
    return { province: "", ward: "", street: "" };
  }

  const raw = addressStr.trim();

  // 1. Tìm province từ chuỗi địa chỉ
  let matchedProv = "";
  // Tìm ưu tiên tên dài hơn
  const sortedProvinces = [...provinceList].sort(
    (a, b) => b.name.length - a.name.length
  );

  for (const prov of sortedProvinces) {
    if (raw.toLowerCase().includes(prov.name.toLowerCase())) {
      matchedProv = prov.name;
      break;
    }
    const shortName = prov.name.replace(/^(Thành phố |Tỉnh )/, "");
    if (raw.toLowerCase().includes(shortName.toLowerCase())) {
      matchedProv = prov.name;
      break;
    }
  }

  if (!matchedProv) {
    return { province: "", ward: "", street: raw };
  }

  // 2. Tách phần trước province
  const provIndex = raw.toLowerCase().lastIndexOf(matchedProv.toLowerCase());
  let beforeProv = provIndex >= 0 ? raw.substring(0, provIndex).trim() : raw;
  beforeProv = beforeProv.replace(/,\s*$/, "");

  const parts = beforeProv
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { province: matchedProv, ward: "", street: "" };
  }
  if (parts.length === 1) {
    return { province: matchedProv, ward: parts[0], street: "" };
  }

  const ward = parts[parts.length - 1];
  const street = parts.slice(0, parts.length - 1).join(", ");
  return { province: matchedProv, ward, street };
}

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

  // 1. Tự động điền dữ liệu nếu `value` đã có sẵn từ hồ sơ khách hàng
  useEffect(() => {
    if (!value || value === "Chưa cập nhật") return;

    // Nếu chưa có tỉnh thành được chọn trong state
    if (!selectedProvince) {
      const parsed = parseAddressString(value, provinces);
      if (parsed.province) {
        setSelectedProvince(parsed.province);
      }
      if (parsed.ward) {
        setSelectedWard(parsed.ward);
        setSearchWardInput(parsed.ward);
      }
      if (parsed.street) {
        setStreetAddress(parsed.street);
      }
    }
  }, [value, provinces, selectedProvince]);

  // 2. Tải danh sách 63 Tỉnh/Thành phố
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

  // 3. Tải toàn bộ Xã/Phường của Tỉnh/Thành phố + Tích hợp đơn vị hành chính MỚI 2024-2025
  useEffect(() => {
    if (!selectedProvince) {
      setWards([]);
      return;
    }

    const provinceObj = provinces.find((p) => p.name === selectedProvince);
    if (!provinceObj) return;

    // Nếu đã cache dữ liệu xã/phường của tỉnh này
    if (cachedProvinceWards[provinceObj.code]) {
      setWards(cachedProvinceWards[provinceObj.code]);
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

          // Nạp các xã/phường từ API
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

          // TÍCH HỢP BỔ SUNG CÁC ĐƠN VỊ HÀNH CHÍNH MỚI 2024-2025 (ví dụ: Xã Đa Phúc - Sóc Sơn cũ, Phường Hoàn Kiếm...)
          const newUnits = NEW_ADMIN_UNITS_2025[provinceObj.code] || [];
          newUnits.forEach((unit) => {
            // Tránh trùng lặp nếu đã tồn tại
            if (!allWards.some((w) => w.name === unit.name)) {
              allWards.unshift(unit);
            }
          });

          // Sắp xếp: Ưu tiên đơn vị mới 2025 lên đầu, sau đó sắp xếp theo alphabet
          allWards.sort((a, b) => {
            if (a.isNew2025 && !b.isNew2025) return -1;
            if (!a.isNew2025 && b.isNew2025) return 1;
            return a.name.localeCompare(b.name, "vi");
          });

          cachedProvinceWards[provinceObj.code] = allWards;
          setWards(allWards);
        }
      )
      .catch(() => {
        // Fallback khi offline hoặc lỗi API: dùng ít nhất các đơn vị mới
        const fallbackList = NEW_ADMIN_UNITS_2025[provinceObj.code] || [];
        setWards(fallbackList);
      })
      .finally(() => {
        setLoadingWards(false);
      });
  }, [selectedProvince, provinces]);

  // 4. Tự động ghép địa chỉ mới theo mô hình 2 cấp: [Số nhà/đường], [Xã/Phường], [Tỉnh/TP]
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

  // Chọn xã/phường từ gợi ý hoặc tự nhập
  const handleSelectWard = (wardName: string) => {
    const cleanWard = wardName.trim();
    setSelectedWard(cleanWard);
    setSearchWardInput(cleanWard);
    setIsWardDropdownOpen(false);
    updateAddress(selectedProvince, cleanWard, streetAddress);
  };

  // Nhập trực tiếp tên xã/phường (luôn đồng bộ ngay)
  const handleWardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchWardInput(val);
    setSelectedWard(val.trim());
    setIsWardDropdownOpen(true);
    updateAddress(selectedProvince, val.trim(), streetAddress);
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStreet = e.target.value;
    setStreetAddress(newStreet);
    updateAddress(selectedProvince, selectedWard, newStreet);
  };

  // 5. Lọc thông minh theo từ khóa (hỗ trợ tiếng Việt có dấu, không dấu, và tên quận huyện/sáp nhập cũ)
  const filteredWards = useMemo(() => {
    if (!searchWardInput.trim()) {
      return wards.slice(0, 60); // Hiển thị 60 xã/phường đầu tiên khi chưa gõ
    }

    const rawLower = searchWardInput.toLowerCase().trim();
    const toneFree = removeVietnameseTones(searchWardInput);

    return wards
      .filter((w) => {
        const nameRaw = w.name.toLowerCase();
        const nameToneFree = removeVietnameseTones(w.name);
        const distRaw = w.districtName ? w.districtName.toLowerCase() : "";
        const distToneFree = w.districtName
          ? removeVietnameseTones(w.districtName)
          : "";

        return (
          nameRaw.includes(rawLower) ||
          nameToneFree.includes(toneFree) ||
          distRaw.includes(rawLower) ||
          distToneFree.includes(toneFree)
        );
      })
      .slice(0, 60);
  }, [wards, searchWardInput]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-[#1F2933]">
          Địa chỉ (Chuẩn hóa tự động mô hình mới Việt Nam)
        </label>
        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          ✓ Quy chuẩn 2 cấp: Tỉnh/TP → Xã/Phường
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
                ? "Đang tải 63 tỉnh thành..."
                : "-- Bấm chọn Tỉnh / Thành phố --"}
            </option>
            {provinces.map((p) => (
              <option key={p.code} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bước 2: Tìm kiếm & Chọn Xã / Phường (Hỗ trợ tra cứu nhanh & tự nhập đơn vị mới 2025) */}
        <div ref={wardDropdownRef} className="relative">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-700">
              2. Xã / Phường <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {wards.length > 0 && (
                <span className="text-[10px] text-slate-500">
                  {wards.length} xã/phường có sẵn
                </span>
              )}
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 border border-amber-200">
                Cho phép tự gõ tên mới
              </span>
            </div>
          </div>

          <div className="relative mt-1">
            <input
              type="text"
              value={searchWardInput}
              disabled={!selectedProvince && provinces.length > 0}
              onFocus={() => {
                if (selectedProvince) {
                  setIsWardDropdownOpen(true);
                }
              }}
              onChange={handleWardInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (searchWardInput.trim()) {
                    handleSelectWard(searchWardInput.trim());
                  }
                }
              }}
              placeholder={
                !selectedProvince
                  ? "⚠️ Vui lòng chọn Tỉnh/Thành phố ở bước 1 trước"
                  : loadingWards
                  ? "⏳ Đang tải dữ liệu xã/phường..."
                  : "🔍 Gõ tìm kiếm hoặc tự nhập tên xã/phường (VD: Xã Đa Phúc)..."
              }
              className={`w-full rounded-xl border bg-white px-3 py-2.5 text-xs font-medium text-[#20252B] placeholder:text-slate-400 transition focus:outline-none ${
                isWardDropdownOpen
                  ? "border-[#D6A85F] ring-1 ring-[#D6A85F]"
                  : "border-slate-300"
              } disabled:bg-slate-100 disabled:text-slate-400`}
            />

            {/* Nút xóa nhanh hoặc nút mũi tên */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchWardInput && (
                <button
                  type="button"
                  title="Xóa để chọn lại"
                  onClick={() => {
                    setSearchWardInput("");
                    setSelectedWard("");
                    updateAddress(selectedProvince, "", streetAddress);
                    setIsWardDropdownOpen(true);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ✕
                </button>
              )}
              {selectedProvince && !loadingWards && (
                <button
                  type="button"
                  onClick={() => setIsWardDropdownOpen(!isWardDropdownOpen)}
                  className="text-slate-400 hover:text-slate-700 text-xs"
                >
                  {isWardDropdownOpen ? "▲" : "▼"}
                </button>
              )}
            </div>
          </div>

          {/* Menu Dropdown hiển thị kết quả lọc trực quan */}
          {isWardDropdownOpen && selectedProvince && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
              {/* Mục chọn nhanh giá trị vừa gõ (cho phép tự do nhập bất kỳ đơn vị mới nào) */}
              {searchWardInput.trim().length > 0 && (
                <div
                  onClick={() => handleSelectWard(searchWardInput.trim())}
                  className="flex cursor-pointer items-center justify-between rounded-lg bg-[#FAF5EB] p-2.5 text-xs text-[#6B4B18] transition hover:bg-[#F3E8D2] border border-[#D6A85F]/50 mb-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base text-[#D6A85F]">✨</span>
                    <div>
                      <div className="font-bold text-[#20252B]">
                        Sử dụng: "{searchWardInput.trim()}"
                      </div>
                      <span className="text-[10px] text-[#8B6B38]">
                        Áp dụng ngay đơn vị hành chính mới hoặc tên tùy chỉnh
                      </span>
                    </div>
                  </div>
                  <span className="rounded bg-[#D6A85F]/30 px-2 py-0.5 text-[10px] font-bold text-[#4E3917]">
                    Nhấn chọn ↵
                  </span>
                </div>
              )}

              {/* Danh sách các xã/phường tìm thấy */}
              {filteredWards.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  <p>
                    Không có trong danh mục cũ của tỉnh thành này.
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">
                    💡 Bạn có thể bấm vào khung vàng ở trên để dùng ngay:{" "}
                    <strong>"{searchWardInput}"</strong>
                  </p>
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
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className={isSelected ? "text-[#D6A85F]" : "text-slate-300"}>
                          ✓
                        </span>
                        <span className="font-semibold text-slate-800">
                          {w.name}
                        </span>
                        {w.isNew2025 && (
                          <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 px-1.5 py-0.2 text-[9px] font-bold">
                            Mới 2025
                          </span>
                        )}
                      </div>
                      {w.districtName && (
                        <span className="shrink-0 max-w-[50%] truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500" title={w.districtName}>
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
            3. Số nhà, tên ngõ/đường / thôn xóm chi tiết
          </label>
          <input
            type="text"
            value={streetAddress}
            onChange={handleStreetChange}
            placeholder="Ví dụ: Thôn Đức Hậu, hoặc Số 36 Phố Dịch Vọng Hậu"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-medium text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F]"
          />
        </div>

        {/* Địa chỉ hoàn chỉnh tổng hợp tự động */}
        <div className="rounded-xl border border-[#D6A85F]/40 bg-[#FBF8F1] p-3 text-[11px]">
          <div className="flex items-center gap-1.5 font-semibold text-[#8B6B38]">
            <span>📍</span>
            <span>Địa chỉ tự động tổng hợp theo quy chuẩn mới:</span>
          </div>
          <p className="mt-1 font-semibold text-[#1F2933] text-xs">
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
