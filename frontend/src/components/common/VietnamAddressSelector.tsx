import React, { useEffect, useState } from "react";

type Province = {
  code: number;
  name: string;
};

type District = {
  code: number;
  name: string;
};

type Ward = {
  code: number;
  name: string;
};

// Danh sách 63 tỉnh thành phố Việt Nam chuẩn Tổng cục Thống kê (Fallback dự phòng khi mạng offline)
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
const cachedDistricts: Record<number, District[]> = {};
const cachedWards: Record<number, Ward[]> = {};

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
  const [mode, setMode] = useState<"auto" | "manual">("auto");

  // Danh sách từ API
  const [provinces, setProvinces] = useState<Province[]>(FALLBACK_PROVINCES);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  // Lựa chọn hiện tại
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState<string>("");

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  // 1. Tải danh sách tỉnh/thành phố khi mount
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
        // Sử dụng danh sách fallback
        setProvinces(FALLBACK_PROVINCES);
      })
      .finally(() => {
        setLoadingProvinces(false);
      });
  }, []);

  // 2. Tải danh sách quận/huyện khi đổi tỉnh/thành
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      setSelectedDistrict("");
      setWards([]);
      setSelectedWard("");
      return;
    }

    const provinceObj = provinces.find((p) => p.name === selectedProvince);
    if (!provinceObj) return;

    if (cachedDistricts[provinceObj.code]) {
      setDistricts(cachedDistricts[provinceObj.code]);
      setSelectedDistrict("");
      setWards([]);
      setSelectedWard("");
      return;
    }

    setLoadingDistricts(true);
    fetch(`https://provinces.open-api.vn/api/p/${provinceObj.code}?depth=2`)
      .then((res) => res.json())
      .then((data: { districts?: District[] }) => {
        const districtList = data.districts || [];
        cachedDistricts[provinceObj.code] = districtList;
        setDistricts(districtList);
        setSelectedDistrict("");
        setWards([]);
        setSelectedWard("");
      })
      .catch(() => {
        setDistricts([]);
      })
      .finally(() => {
        setLoadingDistricts(false);
      });
  }, [selectedProvince, provinces]);

  // 3. Tải danh sách phường/xã khi đổi quận/huyện
  useEffect(() => {
    if (!selectedDistrict) {
      setWards([]);
      setSelectedWard("");
      return;
    }

    const districtObj = districts.find((d) => d.name === selectedDistrict);
    if (!districtObj) return;

    if (cachedWards[districtObj.code]) {
      setWards(cachedWards[districtObj.code]);
      setSelectedWard("");
      return;
    }

    setLoadingWards(true);
    fetch(`https://provinces.open-api.vn/api/d/${districtObj.code}?depth=2`)
      .then((res) => res.json())
      .then((data: { wards?: Ward[] }) => {
        const wardList = data.wards || [];
        cachedWards[districtObj.code] = wardList;
        setWards(wardList);
        setSelectedWard("");
      })
      .catch(() => {
        setWards([]);
      })
      .finally(() => {
        setLoadingWards(false);
      });
  }, [selectedDistrict, districts]);

  // 4. Tổng hợp địa chỉ tự động và cập nhật lên form
  const updateAutoAddress = (
    prov: string,
    dist: string,
    wrd: string,
    street: string,
  ) => {
    const parts: string[] = [];
    if (street.trim()) parts.push(street.trim());
    if (wrd.trim()) parts.push(wrd.trim());
    if (dist.trim()) parts.push(dist.trim());
    if (prov.trim()) parts.push(prov.trim());

    const combined = parts.join(", ");
    if (combined) {
      onChange(combined);
    }
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value;
    setSelectedProvince(newProv);
    setSelectedDistrict("");
    setSelectedWard("");
    updateAutoAddress(newProv, "", "", streetAddress);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDist = e.target.value;
    setSelectedDistrict(newDist);
    setSelectedWard("");
    updateAutoAddress(selectedProvince, newDist, "", streetAddress);
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newWard = e.target.value;
    setSelectedWard(newWard);
    updateAutoAddress(selectedProvince, selectedDistrict, newWard, streetAddress);
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStreet = e.target.value;
    setStreetAddress(newStreet);
    updateAutoAddress(selectedProvince, selectedDistrict, selectedWard, newStreet);
  };

  return (
    <div className="space-y-3">
      {/* Header & Toggle Mode */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-[#1F2933]">
          Địa chỉ
        </label>

        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={`rounded-md px-2 py-0.5 transition ${
              mode === "auto"
                ? "bg-white font-semibold text-[#20252B] shadow-xs"
                : "hover:text-[#20252B]"
            }`}
          >
            ⚡ Chọn tự động
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`rounded-md px-2 py-0.5 transition ${
              mode === "manual"
                ? "bg-white font-semibold text-[#20252B] shadow-xs"
                : "hover:text-[#20252B]"
            }`}
          >
            ✏️ Tự gõ
          </button>
        </div>
      </div>

      {mode === "auto" ? (
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-[#FBFBFA] p-3">
          {/* Tỉnh / Thành phố */}
          <div>
            <label className="text-[11px] font-medium text-slate-600">
              1. Tỉnh / Thành phố
            </label>
            <select
              value={selectedProvince}
              onChange={handleProvinceChange}
              disabled={loadingProvinces}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F]"
            >
              <option value="">
                {loadingProvinces ? "Đang tải tỉnh thành..." : "-- Chọn Tỉnh / Thành phố --"}
              </option>
              {provinces.map((p) => (
                <option key={p.code} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quận / Huyện & Phường / Xã */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-medium text-slate-600">
                2. Quận / Huyện
              </label>
              <select
                value={selectedDistrict}
                onChange={handleDistrictChange}
                disabled={!selectedProvince || loadingDistricts}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F] disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {loadingDistricts
                    ? "Đang tải quận/huyện..."
                    : selectedProvince
                    ? "-- Chọn Quận / Huyện --"
                    : "-- Chọn Tỉnh/TP trước --"}
                </option>
                {districts.map((d) => (
                  <option key={d.code} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600">
                3. Phường / Xã
              </label>
              <select
                value={selectedWard}
                onChange={handleWardChange}
                disabled={!selectedDistrict || loadingWards}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F] disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {loadingWards
                    ? "Đang tải phường/xã..."
                    : selectedDistrict
                    ? "-- Chọn Phường / Xã --"
                    : "-- Chọn Quận/Huyện trước --"}
                </option>
                {wards.map((w) => (
                  <option key={w.code} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Số nhà, tên đường chi tiết */}
          <div>
            <label className="text-[11px] font-medium text-slate-600">
              4. Số nhà, tên ngõ/đường chi tiết (tùy chọn)
            </label>
            <input
              type="text"
              value={streetAddress}
              onChange={handleStreetChange}
              placeholder="Ví dụ: Số 24, Ngõ 105 Doãn Kế Thiện"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-[#20252B] transition focus:border-[#D6A85F] focus:outline-none focus:ring-1 focus:ring-[#D6A85F]"
            />
          </div>

          {/* Xem trước kết quả */}
          <div className="rounded-lg border border-[#D6A85F]/30 bg-[#FBF8F1] p-2.5 text-[11px]">
            <span className="font-semibold text-[#8B6B38]">Địa chỉ hoàn chỉnh: </span>
            <span className="font-medium text-[#20252B]">
              {value || "(Chưa chọn thông tin)"}
            </span>
          </div>
        </div>
      ) : (
        /* Manual input textarea */
        <div>
          <textarea
            rows={2}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nhập địa chỉ của bạn (số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố)"
            className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-[#20252B] transition focus:outline-none ${
              error
                ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                : "border-slate-300 focus:border-[#D6A85F] focus:ring-1 focus:ring-[#D6A85F]"
            }`}
          />
        </div>
      )}

      {error && (
        <p className="text-[11px] font-medium text-rose-500">{error}</p>
      )}
    </div>
  );
}
