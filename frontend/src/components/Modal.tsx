import React from "react";
import type { ModalDialogProps } from "../types";
import { Icon } from "./Icon";
import { FormInput } from "./FormInput";

export function Modal({ dialog, onClose }: { dialog: ModalDialogProps; onClose: () => void }) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    dialog.onConfirm?.(data);
    onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">CARSERVICE / WIREFRAME</span>
            <h2 id="modal-title">{dialog.title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
            <Icon name="close" size={18} />
          </button>
        </div>

        {dialog.description && <p className="modal-description">{dialog.description}</p>}

        {dialog.warning && (
          <p className="modal-warning" role="alert">
            Hãy kiểm tra kỹ trước khi xác nhận. Thao tác này chỉ là minh họa wireframe, không thay đổi dữ liệu thực.
          </p>
        )}

        {dialog.review && (
          <div className="review-checklist">
            <strong>Checklist bàn giao cho trưởng nhóm</strong>
            <ul>
              <li>Đối chiếu các màn hình với sơ đồ Use Case của bốn vai trò.</li>
              <li>Kiểm tra bố cục, quyền truy cập và thành phần dùng chung.</li>
              <li>Thử tìm kiếm, bộ lọc, biểu mẫu và modal cảnh báo.</li>
              <li>Ghi nhận phản hồi trong vòng REVIEW & TEST của nhóm.</li>
            </ul>
            <span>Trạng thái: Chờ trưởng nhóm rà soát · Chưa gửi qua hệ thống bên ngoài.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!dialog.review && !dialog.info && (
            <div className="modal-fields">
              {dialog.fields?.map((f) => (
                <FormInput key={f.label} field={f} defaultValue={dialog.initialValues?.[f.label]} />
              )) || (
                <p className="modal-description">
                  Xác nhận thao tác trên bản xem trước wireframe. Chưa kết nối dữ liệu thực.
                </p>
              )}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>
              {dialog.review || dialog.info ? "Đóng" : "Hủy"}
            </button>
            {!dialog.review && !dialog.info && (
              <button type="submit" className={dialog.warning ? "danger-button" : "primary-button"}>
                {dialog.action || "Xác nhận"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
