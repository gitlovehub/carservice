/**
 * Nhãn giao diện dùng chung. Mỗi thao tác chỉ có MỘT cách gọi trên toàn hệ thống.
 * Nhãn riêng của từng màn hình viết tại màn hình đó; chỉ đưa vào đây khi lặp lại ở nhiều trang.
 */
export const LABELS = {
  action: {
    save: "Lưu",
    saveChanges: "Lưu thay đổi",
    create: "Tạo mới",
    add: "Thêm",
    edit: "Chỉnh sửa",
    delete: "Xóa",
    cancel: "Hủy",
    close: "Đóng",
    back: "Quay lại",
    confirm: "Xác nhận",
    submit: "Gửi",
    search: "Tìm kiếm",
    filter: "Lọc",
    clearFilter: "Xóa bộ lọc",
    refresh: "Làm mới",
    retry: "Thử lại",
    view: "Xem chi tiết",
    print: "In",
    export: "Xuất file",
    more: "Thao tác khác",
    logout: "Đăng xuất",
  },
  state: {
    loading: "Đang tải dữ liệu...",
    processing: "Đang xử lý...",
    saving: "Đang lưu...",
    empty: "Chưa có dữ liệu",
    noResult: "Không tìm thấy kết quả phù hợp",
    error: "Không tải được dữ liệu",
    notUpdated: "Chưa cập nhật",
  },
  table: {
    status: "Trạng thái",
    actions: "Thao tác",
    createdAt: "Ngày tạo",
    updatedAt: "Cập nhật",
  },
  pagination: {
    previous: "Trang trước",
    next: "Trang sau",
    page: "Trang",
    of: "trên",
    navigation: "Phân trang",
  },
  form: {
    required: "Bắt buộc",
    optional: "không bắt buộc",
    requiredError: "Vui lòng nhập thông tin này.",
  },
  notify: {
    saved: "Đã lưu thay đổi.",
    created: "Đã tạo mới thành công.",
    deleted: "Đã xóa.",
    genericError: "Đã xảy ra lỗi. Vui lòng thử lại.",
  },
  confirm: {
    deleteTitle: (name: string) => `Xóa ${name}?`,
    deleteDescription: "Dữ liệu đã xóa không thể khôi phục.",
    cancelTitle: "Bạn chắc chắn muốn hủy?",
    discardTitle: "Bỏ các thay đổi chưa lưu?",
    discardDescription: "Những gì bạn vừa nhập sẽ không được lưu.",
  },
  theme: {
    toLight: "Bật chế độ sáng",
    toDark: "Bật chế độ tối",
  },
} as const;
