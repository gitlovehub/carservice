import type { ModalDialogProps } from "../types";
import { Icon, getIconForTitle } from "../components/Icon";
import { FormInput } from "../components/FormInput";
import { TableView } from "./TableView";
import { bookingFormFields, customerFormFields, customerPageDataMap } from "../data/mockData";

interface CustomerViewProps {
  page: string;
  go: (p: string) => void;
  onOpen: (dialog: ModalDialogProps) => void;
}

export function CustomerView({ page, go, onOpen }: CustomerViewProps) {
  if (page === "Đặt lịch") {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">KHÁCH HÀNG / ĐẶT LỊCH</div>
            <h1>Đặt lịch bảo dưỡng</h1>
            <p>Chọn xe, dịch vụ và thời gian phù hợp để gửi yêu cầu đặt lịch.</p>
          </div>
        </div>
        <section className="panel content-card">
          <div className="panel-title">
            <h2>
              <Icon name="calendar" />
              Thông tin đặt lịch
            </h2>
            <span>01 / 02</span>
          </div>
          <form
            className="booking-form"
            onSubmit={(e) => {
              e.preventDefault();
              onOpen({
                title: "Xác nhận đặt lịch",
                description:
                  "Kiểm tra lại xe, dịch vụ và thời gian trước khi xác nhận. Đây là bản xem trước wireframe.",
                action: "Xác nhận đặt lịch",
              });
            }}
          >
            {bookingFormFields.map((f) => (
              <FormInput key={f.label} field={f} />
            ))}
            <div className="form-submit">
              <button className="primary-button" type="submit">
                Tiếp tục xác nhận <Icon name="arrow" size={17} />
              </button>
            </div>
          </form>
        </section>
      </>
    );
  }

  if (page === "Trang chủ") {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">KHÁCH HÀNG / TRANG CHỦ</div>
            <h1>Chăm sóc xe của bạn</h1>
            <p>Theo dõi xe, lịch hẹn và dịch vụ bảo dưỡng tại CarService.</p>
          </div>
          <button className="primary-button heading-action" onClick={() => go("Đặt lịch")}>
            <Icon name="plus" size={17} />
            Đặt lịch bảo dưỡng
          </button>
        </div>

        <div className="customer-grid">
          <section className="panel home-feature">
            <span className="eyebrow">DỊCH VỤ CỦA BẠN</span>
            <h2>Mọi thông tin về xe, tại một nơi.</h2>
            <p>Quản lý xe, theo dõi lịch hẹn và tiến độ sửa chữa một cách dễ dàng.</p>
            <button className="text-link" onClick={() => go("Xe của tôi")}>
              Xem xe của tôi <Icon name="arrow" size={16} />
            </button>
          </section>
          <section className="panel quick-card">
            <h2>Lối tắt</h2>
            {["Dịch vụ", "Đặt lịch", "Lịch hẹn", "Xe của tôi"].map((item) => (
              <button key={item} onClick={() => go(item)}>
                <Icon name={getIconForTitle(item)} size={18} />
                {item}
                <Icon name="arrow" size={15} />
              </button>
            ))}
          </section>
        </div>

        <section className="panel tracking-card">
          <div className="panel-title">
            <h2>
              <Icon name="wrench" />
              Theo dõi dịch vụ
            </h2>
            <span>USE CASE KHÁCH HÀNG</span>
          </div>
          <div className="tracking-links">
            {[
              "Trạng thái phiếu sửa chữa",
              "Xem báo giá",
              "Duyệt / Từ chối báo giá",
              "Thanh toán",
              "Xem hóa đơn",
              "Đánh giá dịch vụ",
            ].map((title) => (
              <button
                key={title}
                onClick={() =>
                  onOpen({
                    title,
                    description: "Nội dung chi tiết theo luồng theo dõi dịch vụ. Đây là bản xem trước wireframe.",
                    fields:
                      title === "Đánh giá dịch vụ"
                        ? [
                            {
                              label: "Đánh giá",
                              options: ["Chọn mức đánh giá", "1 sao", "2 sao", "3 sao", "4 sao", "5 sao"],
                            },
                            { label: "Nhận xét" },
                          ]
                        : title === "Thanh toán"
                        ? [{ label: "Hình thức thanh toán", options: ["Chọn hình thức", "Online (QR)", "Trực tiếp"] }]
                        : title === "Duyệt / Từ chối báo giá"
                        ? [{ label: "Quyết định", options: ["Chọn quyết định", "Duyệt báo giá", "Từ chối báo giá"] }]
                        : undefined,
                  })
                }
              >
                {title}
                <Icon name="arrow" size={15} />
              </button>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (page === "Tài khoản") {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">KHÁCH HÀNG / TÀI KHOẢN</div>
            <h1>Tài khoản của tôi</h1>
            <p>Xem và cập nhật thông tin cá nhân, bảo mật tài khoản.</p>
          </div>
        </div>

        <section className="panel content-card">
          <div className="panel-title">
            <h2>
              <Icon name="users" />
              Thông tin cá nhân
            </h2>
          </div>
          <div className="profile-list">
            <div>
              <span>Họ và tên</span>
              <strong>Nguyễn Tiến Hiền</strong>
            </div>
            <div>
              <span>Số điện thoại</span>
              <strong>0901234567</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>nguyentienhien@gmail.com</strong>
            </div>
          </div>
          <div className="card-actions">
            <button
              className="secondary-button"
              onClick={() =>
                onOpen({
                  title: "Cập nhật thông tin cá nhân",
                  fields: customerFormFields,
                  action: "Lưu thay đổi",
                })
              }
            >
              Cập nhật thông tin
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                onOpen({
                  title: "Quên / đổi mật khẩu",
                  fields: [{ label: "Email", type: "email" }],
                  action: "Tiếp tục",
                })
              }
            >
              Đổi mật khẩu
            </button>
          </div>
        </section>

        <section className="panel account-access">
          <div className="panel-title">
            <h2>Truy cập tài khoản</h2>
            <span>ĐĂNG KÝ / ĐĂNG NHẬP</span>
          </div>
          <div className="card-actions">
            <button
              className="secondary-button"
              onClick={() =>
                onOpen({
                  title: "Đăng ký tài khoản",
                  fields: [...customerFormFields.slice(0, 3), { label: "Mật khẩu", type: "password" }],
                  action: "Đăng ký",
                })
              }
            >
              Đăng ký
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                onOpen({
                  title: "Đăng nhập",
                  fields: [{ label: "Số điện thoại / Email" }, { label: "Mật khẩu", type: "password" }],
                  action: "Đăng nhập",
                })
              }
            >
              Đăng nhập
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                onOpen({
                  title: "Quên mật khẩu",
                  fields: [{ label: "Email", type: "email" }],
                  action: "Tiếp tục",
                })
              }
            >
              Quên mật khẩu
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <TableView
      key={page}
      page={page}
      data={customerPageDataMap[page]}
      onOpen={onOpen}
      onNavigate={go}
      customerRows={[]}
    />
  );
}
