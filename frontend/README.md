# CarService Frontend (WD_004)

Frontend React + TypeScript + Vite + Tailwind 4, với Axios + Sanctum của Laravel.

**Hướng dẫn kiến trúc, route, kiểm thử và bàn giao Task 01:** đọc [`../README_TASK_01_TRUONG.md`](../README_TASK_01_TRUONG.md).

```bash
npm ci
cp .env.example .env
npm run dev
```

Trên Windows thay `cp` bằng `copy`. Các lệnh kiểm tra: `npm run test:base`, `npm run lint`, `npm run build`.

Không copy dữ liệu hoặc cơ chế xác thực `localStorage` từ bản ATELIER demo vào hệ thống thật; backend Laravel là nguồn dữ liệu và quyền truy cập.
