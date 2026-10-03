import { useState } from "react";
import type { ModalDialogProps, PageDataConfig } from "../types";
import { Icon, getIconForTitle } from "../components/Icon";
import { StatusBadge } from "../components/StatusBadge";
import { customerFormFields } from "../data/mockData";

interface TableViewProps {
  page: string;
  data: PageDataConfig;
  onOpen: (dialog: ModalDialogProps) => void;
  onNavigate: (page: string) => void;
  customerRows: string[][];
  onCreateCustomer?: (row: string[]) => void;
  onUpdateCustomer?: (phone: string, row: string[]) => void;
}

export function TableView({
  page,
  data,
  onOpen,
  onNavigate,
  customerRows,
  onCreateCustomer,
  onUpdateCustomer,
}: TableViewProps) {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [filterState, setFilterState] = useState("all");

  const isCustomerPage = page === "Khách hàng";
  const rows = isCustomerPage ? customerRows : data.rows;

  const statuses = [
    ...new Set(
      rows
        .flat()
        .filter((cell) =>
          [
            "Chờ xác nhận",
            "Đã xác nhận",
            "Đang sửa chữa",
            "Chờ báo giá",
            "Chờ duyệt",
            "Đã gửi",
            "Đang kiểm tra",
            "Chưa bắt đầu",
            "Đang thực hiện",
            "Hoạt động",
          ].includes(cell)
        )
    ),
  ];

  const colIdx = isCustomerPage
    ? 3
    : page === "Dịch vụ"
    ? 1
    : page === "Xe của khách"
    ? 0
    : page === "Xe của tôi"
    ? 1
    : page === "Phụ tùng & tồn kho"
    ? 2
    : 1;

  const filterLabel = statuses.length ? "trạng thái" : data.columns[colIdx].toLowerCase();
  const filterOptions = statuses.length ? statuses : [...new Set(rows.map((r) => r[colIdx]).filter(Boolean))];

  const filteredRows = rows.filter(
    (r) =>
      r.join(" ").toLowerCase().includes(query.toLowerCase()) &&
      (filterState === "all" || (statuses.length ? r.includes(filterState) : r[colIdx] === filterState))
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">GARA / {page.toUpperCase()}</div>
          <h1>{data.title}</h1>
          <p>{data.description}</p>
        </div>
        <div className="heading-actions">
          {page === "Tài khoản & nhân viên" && (
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                onOpen({
                  title: "Thêm nhân viên",
                  fields: [
                    { label: "Họ và tên" },
                    { label: "Số điện thoại", type: "tel" },
                    { label: "Vai trò", options: ["Chọn vai trò", "Cố vấn dịch vụ", "Kỹ thuật viên"] },
                  ],
                  action: "Thêm nhân viên",
                })
              }
            >
              Thêm nhân viên
            </button>
          )}
          {data.primary && (
            <button
              type="button"
              className="primary-button heading-action"
              onClick={() =>
                onOpen({
                  title: data.primary!,
                  fields: data.fields,
                  action: data.primary,
                  description: "Biểu mẫu minh họa theo use case; chưa kết nối dữ liệu thực.",
                  onConfirm: isCustomerPage
                    ? (val) => onCreateCustomer?.([val["Họ và tên"], val["Số điện thoại"], val.Email, val["Địa chỉ"]])
                    : undefined,
                })
              }
            >
              <Icon name="plus" size={17} />
              {data.primary}
            </button>
          )}
        </div>
      </div>

      <section className="panel search-panel">
        <h2>
          <Icon name="search" size={21} />
          {isCustomerPage ? "Tìm kiếm khách hàng" : `Tìm kiếm ${page.toLowerCase()}`}
        </h2>
        <form
          className="search-controls"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(searchInput);
          }}
        >
          <div className="search-input">
            <Icon name="search" size={18} />
            <input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (!e.target.value) setQuery("");
              }}
              placeholder={
                isCustomerPage
                  ? "Nhập số điện thoại hoặc tên khách hàng..."
                  : `Nhập từ khóa tìm kiếm ${page.toLowerCase()}...`
              }
              aria-label="Từ khóa tìm kiếm"
            />
          </div>
          <div className="filter-select">
            <Icon name="filter" size={16} />
            <select
              aria-label={`Lọc theo ${filterLabel}`}
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
            >
              <option value="all">Tất cả {filterLabel}</option>
              {filterOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="secondary-button">
            Tìm kiếm
          </button>
        </form>
        <p className="panel-hint">
          {isCustomerPage
            ? "Có thể tìm kiếm nhanh theo số điện thoại của khách hàng."
            : "Tìm kiếm và lọc danh sách theo thông tin hiện có."}
        </p>
      </section>

      <section className="panel list-panel">
        <div className="panel-title">
          <h2>
            <Icon name={getIconForTitle(page)} size={21} />
            {isCustomerPage ? "Danh sách khách hàng" : `Danh sách ${page.toLowerCase()}`}
          </h2>
          <span>
            {filteredRows.length} {isCustomerPage ? "khách hàng" : "kết quả"}
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                {data.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr key={`${row[0]}-${idx}`}>
                  <td>{idx + 1}</td>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className={cIdx === 0 ? "name-cell" : ""}>
                      {statuses.includes(cell) ? <StatusBadge>{cell}</StatusBadge> : cell}
                    </td>
                  ))}
                  <td>
                    <div className="row-actions">
                      {isCustomerPage ? (
                        <>
                          <button
                            type="button"
                            className="mini-button"
                            onClick={() => onNavigate("Xe của khách")}
                          >
                            <Icon name="car" size={15} /> Xe
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Cập nhật ${row[0]}`}
                            onClick={() =>
                              onOpen({
                                title: "Cập nhật khách hàng",
                                fields: customerFormFields,
                                initialValues: Object.fromEntries(
                                  customerFormFields.map((f, i) => [f.label, row[i]])
                                ),
                                action: "Lưu thay đổi",
                                description: `Thông tin của ${row[0]}. Thay đổi chỉ tồn tại trong bản xem trước.`,
                                onConfirm: (val) =>
                                  onUpdateCustomer?.(row[1], [
                                    val["Họ và tên"],
                                    val["Số điện thoại"],
                                    val.Email,
                                    val["Địa chỉ"],
                                  ]),
                              })
                            }
                          >
                            <Icon name="edit" size={16} />
                          </button>
                        </>
                      ) : (
                        data.actions?.map((act) => (
                          <button
                            key={act}
                            type="button"
                            className="mini-button"
                            onClick={() =>
                              onOpen({
                                title: act,
                                description: `${row[0]} · ${data.title}. ${
                                  /Hủy|Xóa|Khóa|Đóng phiếu|Từ chối/.test(act)
                                    ? "Bạn có chắc muốn thực hiện thao tác này?"
                                    : "Đây là tương tác xem trước, chưa kết nối dữ liệu thực."
                                }`,
                                warning: /Hủy|Xóa|Khóa|Đóng phiếu|Từ chối/.test(act),
                                action: /Hủy|Xóa|Khóa|Đóng phiếu|Từ chối/.test(act)
                                  ? "Xác nhận thao tác"
                                  : undefined,
                                fields: act.includes("Đổi lịch")
                                  ? [{ label: "Ngày hẹn mới", type: "date" }, { label: "Khung giờ mới" }]
                                  : act.includes("Đóng phiếu")
                                  ? [{ label: "Lý do đóng phiếu" }]
                                  : act.includes("Cập nhật") || act.includes("Ghi nhận") || act.includes("Đề xuất")
                                  ? [{ label: "Nội dung cập nhật" }]
                                  : undefined,
                              })
                            }
                          >
                            {act}
                          </button>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan={data.columns.length + 2}>
                    Không tìm thấy kết quả phù hợp. Hãy thử từ khóa hoặc bộ lọc khác.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
