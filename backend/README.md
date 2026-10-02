# CarService Backend

Backend được xây dựng bằng Laravel. Tài liệu này hướng dẫn cài đặt dự án và
sử dụng chức năng đăng nhập, xác thực và phân quyền API.

## Cài đặt

Tại thư mục `backend`, cài các gói phụ thuộc, tạo file môi trường nếu chưa có,
cấu hình kết nối cơ sở dữ liệu trong `.env`, sau đó chạy migration:

```bash
composer install
php artisan migrate
```

Ứng dụng không tạo tài khoản đăng nhập mặc định khi chạy seeder. Hãy tạo tài
khoản quản trị bằng một quy trình an toàn, ví dụ qua Tinker:

```bash
php artisan tinker
```

```php
\App\Models\Account::create([
    'email' => 'advisor@example.com',
    'password_hash' => \Illuminate\Support\Facades\Hash::make('thay-bang-mat-khau-manh'),
    'role' => \App\Models\Account::ROLE_ADVISOR,
    'status' => \App\Models\Account::STATUS_ACTIVE,
]);
```

Không sử dụng mật khẩu ví dụ này trong môi trường thật.

## Cấu hình frontend

Trong file `.env` của backend, thiết lập danh sách domain frontend được phép
dùng xác thực session và gửi yêu cầu có thông tin xác thực. Ví dụ với Vite
chạy tại `http://localhost:5173`:

```dotenv
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:5173,127.0.0.1,127.0.0.1:5173,127.0.0.1:8000,::1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Khi triển khai, thay các giá trị ví dụ bằng domain và cổng thực tế. Origin phải
khớp với địa chỉ frontend, bao gồm giao thức và cổng nếu có.

## API xác thực

| Phương thức | Endpoint | Chức năng | Xác thực |
| --- | --- | --- | --- |
| `POST` | `/api/register` | Đăng ký tài khoản khách hàng; giới hạn 5 lần mỗi phút | Không |
| `POST` | `/api/login` | Đăng nhập; giới hạn 5 lần mỗi phút | Không |
| `GET` | `/api/me` | Lấy thông tin tài khoản đang đăng nhập | Có |
| `POST` | `/api/logout` | Đăng xuất và thu hồi token hiện tại | Có |

Chỉ tài khoản có trạng thái `ACTIVE` mới đăng nhập được. Vai trò hợp lệ gồm
`CUSTOMER`, `ADVISOR`, `TECHNICIAN` và `ADMIN`.

### Dùng với ứng dụng SPA

Sanctum xác thực SPA cùng hệ thống bằng cookie session. Trước khi đăng nhập,
frontend cần:

1. Gửi `GET /sanctum/csrf-cookie`.
2. Gửi yêu cầu đăng nhập và các yêu cầu tiếp theo kèm cookie; với Axios, bật
   `withCredentials: true` và `withXSRFToken: true`.

Đăng nhập thành công bằng session trả về thông tin tài khoản và
`"token": null`. Khi đăng xuất, session hiện tại sẽ bị hủy.

### Dùng với ứng dụng di động hoặc Postman

Gửi email và mật khẩu đến `POST /api/login`. Có thể gửi thêm `device_name` để
đặt tên cho token:

```json
{
  "email": "advisor@example.com",
  "password": "mat-khau-cua-tai-khoan",
  "device_name": "postman"
}
```

Gửi token nhận được trong các yêu cầu cần đăng nhập bằng header:

```text
Authorization: Bearer <token>
```

Gọi `POST /api/logout` với token này để thu hồi token của thiết bị hiện tại.

## Phân quyền theo vai trò

Đặt `auth:sanctum` trên các route cần đăng nhập. Thêm middleware `role` để giới
hạn vai trò được phép truy cập:

```php
Route::middleware(['auth:sanctum', 'role:ADVISOR,ADMIN'])->group(function () {
    // Khai báo các route chỉ dành cho cố vấn và quản trị viên tại đây.
});
```

Các vai trò middleware hỗ trợ: `CUSTOMER`, `ADVISOR`, `TECHNICIAN`, `ADMIN`.
Nếu người dùng chưa đăng nhập, API trả về `401`; nếu tài khoản bị khóa hoặc
không có vai trò phù hợp, API trả về `403`.
