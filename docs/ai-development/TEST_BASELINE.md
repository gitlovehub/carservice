# TEST BASELINE

## Cách chạy

| Kiểm tra | Lệnh (Windows/Laragon) |
|---|---|
| Backend | `cd backend; D:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe artisan test` (SQLite `:memory:`, không đụng DB thật) |
| Pint | `php vendor/bin/pint --test <file đã sửa>` — chỉ chạy trên file đã sửa |
| Smoke frontend | `cd frontend; Get-ChildItem tests\*.mjs \| % { node $_.FullName }` hoặc `npm run test:<tên>` |
| TypeScript | `cd frontend; npx tsc -b` |
| Build | `cd frontend; npx vite build` |
| ESLint | `npx eslint <file đã sửa>` (toàn dự án còn nợ 22 lỗi cũ) |

## Lịch sử

| Ngày | Mốc | Backend | Smoke | tsc | build | ESLint toàn dự án | Trình duyệt |
|---|---|---|---|---|---|---|---|
| — | Sau Phase 5 | 143/143 (605) | 13/13 | đạt | đạt | 22 lỗi, 2 cảnh báo | 22/25 kịch bản |
| 08/11/2026 | Sau P0 | 146/146 (634) | 14/14 | đạt | đạt | không chạy lại (2 file sửa: 0 lỗi) | chưa |
| 08/11/2026 | Chạy lại khi khởi tạo | **146/146 (634)** | **14/14** | **đạt** | không chạy lại | — | — |
| 08/11/2026 | P0-03 | — | — | — | — | — | Chi tiết phiếu Advisor: 8/8 lượt đạt (4 trạng thái × sáng/tối) |

| 08/11/2026 | **Kết thúc P3** | 189/189 | **17/17** | đạt | đạt | file mới 0; nợ cũ không tăng | /repair-status sáng đạt; tối + /quotation chưa kết luận; SupplementPanel: BROWSER_NOT_VERIFIED |
| 08/11/2026 | **Kết thúc P2** | 182/182 (≈915) | **16/16** | đạt | đạt | file mới 0; nợ cũ không tăng | Hồi quy #10 đạt; CheckInPanel/đổi xe: BROWSER_NOT_VERIFIED |
| 08/11/2026 | **Kết thúc P1** | 169/169 | **15/15** | đạt | đạt | file sửa: 0 lỗi | P1D: 2/2 (sáng/tối); OTP gửi/nhập + upload: BROWSER_NOT_VERIFIED |
| 08/11/2026 | P1C | **169/169 (796)** | 14/14 | — | — | — | — |
| 08/11/2026 | P1B | **160/160 (698)** | 14/14 | — | — | — | — |
| 08/11/2026 | P1A-02 | **153/153 (657)** (QA-01 chập chờn 1/4) | 14/14 | — | — | — | — |
| 08/11/2026 | P1A-01 | **150/150 (644)** | 14/14 (không đổi frontend) | — | — | — | — |

Script trình duyệt (chỉ GET, dùng dữ liệu có sẵn): scratchpad `audit/p0check.mjs` + `audit/cdp.mjs` (thư mục tạm của phiên; nếu mất thì viết lại theo mô tả trong `PHASE_P0_REPORT.md` §5).
