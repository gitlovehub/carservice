import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import type { ModalDialogProps, PageDataConfig, Role } from "./types";

import {
  customerFormFields,
  customerNavItems,
  initialCustomerRows,
  pageConfigs,
  roleNavMap,
} from "./data/mockData";

// Components
import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { Footer } from "./components/Footer";
import { Modal } from "./components/Modal";

// Pages hiện tại
import { TableView } from "./pages/TableView";
import { ReportView } from "./pages/ReportView";
import { CustomerView } from "./pages/CustomerView";

// Pages từ feature/auth-ui
import Home from "./pages/Home";
import Contact from "./pages/Contact";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

/**
 * App
 * --------------------------------------------------
 * App chỉ chịu trách nhiệm điều hướng URL.
 *
 * /            -> Trang chủ
 * /contact     -> Liên hệ
 * /login       -> Đăng nhập
 * /register    -> Đăng ký
 * /dashboard   -> Hệ thống quản lý CarService
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/contact" element={<Contact />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * Dashboard
 * --------------------------------------------------
 * Giữ lại toàn bộ giao diện quản lý hiện tại của develop.
 */
function Dashboard() {
  const [role, setRole] = useState<Role>("Cố vấn dịch vụ");

  const [activePage, setActivePage] = useState("Khách hàng");

  const [dialogState, setDialogState] =
    useState<ModalDialogProps | null>(null);

  const [customers, setCustomers] =
    useState<string[][]>(initialCustomerRows);

  /**
   * Kiểm tra người dùng hiện tại có phải nhân viên nội bộ không.
   *
   * Khách hàng:
   * - Không sử dụng Sidebar quản trị
   *
   * Nhân viên:
   * - Có Sidebar
   * - Menu phụ thuộc vào role
   */
  const isInternalRole = role !== "Khách hàng";

  const navItems = isInternalRole
    ? roleNavMap[role]
    : customerNavItems;

  /**
   * Thay đổi role.
   */
  function handleRoleChange(newRole: Role) {
    setRole(newRole);

    if (newRole === "Khách hàng") {
      setActivePage("Trang chủ");
    } else {
      setActivePage(roleNavMap[newRole][0]);
    }
  }

  /**
   * Mở Modal.
   */
  function handleOpenModal(dialog: ModalDialogProps) {
    setDialogState(dialog);
  }

  /**
   * Config riêng cho trang quản lý khách hàng.
   */
  const customerPageConfig: PageDataConfig = {
    title: "Quản lý khách hàng",

    description:
      "Tìm kiếm và quản lý thông tin khách hàng tại gara.",

    columns: [
      "KHÁCH HÀNG",
      "SỐ ĐIỆN THOẠI",
      "EMAIL",
      "ĐỊA CHỈ",
      "THAO TÁC",
    ],

    rows: [],

    primary: "Thêm khách hàng",

    fields: customerFormFields,
  };

  return (
    <div className="app-shell">
      {/* =========================
          TOPBAR
      ========================== */}

      <Topbar
        role={role}
        activePage={activePage}
        isInternalRole={isInternalRole}
        navItems={navItems}
        onPageChange={setActivePage}
        onRoleChange={handleRoleChange}
        onOpenAccountModal={() =>
          handleOpenModal({
            title: "Tài khoản nội bộ",

            description: `Tên người dùng · ${role}. Thông tin tài khoản hiển thị theo quyền của vai trò.`,

            info: true,
          })
        }
      />

      {/* =========================
          MAIN LAYOUT
      ========================== */}

      <div
        className={
          isInternalRole
            ? "layout internal-layout"
            : "layout customer-layout"
        }
      >
        {/* =========================
            SIDEBAR
            Chỉ nhân viên nội bộ mới có
        ========================== */}

        {isInternalRole && (
          <Sidebar
            role={role}
            activePage={activePage}
            navItems={navItems}
            onPageChange={setActivePage}
            onOpenReviewModal={() =>
              handleOpenModal({
                title: "REVIEW & TEST",
                review: true,
              })
            }
          />
        )}

        {/* =========================
            CONTENT
        ========================== */}

        <main className="main-content">
          <div className="content-inner">
            {isInternalRole ? (
              /**
               * =========================
               * NHÂN VIÊN
               * =========================
               */
              activePage === "Báo cáo & thống kê" ? (
                <ReportView />
              ) : (
                <TableView
                  key={activePage}
                  page={activePage}
                  data={
                    activePage === "Khách hàng"
                      ? customerPageConfig
                      : pageConfigs[activePage]
                  }
                  onOpen={handleOpenModal}
                  onNavigate={setActivePage}
                  customerRows={customers}
                  onCreateCustomer={(newCustomer) =>
                    setCustomers((prev) => [
                      ...prev,
                      newCustomer,
                    ])
                  }
                  onUpdateCustomer={(
                    phone,
                    updatedRow
                  ) =>
                    setCustomers((prev) =>
                      prev.map((customer) =>
                        customer[1] === phone
                          ? updatedRow
                          : customer
                      )
                    )
                  }
                />
              )
            ) : (
              /**
               * =========================
               * KHÁCH HÀNG
               * =========================
               */
              <CustomerView
                page={activePage}
                go={setActivePage}
                onOpen={handleOpenModal}
              />
            )}
          </div>
        </main>
      </div>

      {/* =========================
          FOOTER
          Chỉ giao diện khách hàng
      ========================== */}

      {!isInternalRole && (
        <Footer
          onOpenReviewModal={() =>
            handleOpenModal({
              title: "REVIEW & TEST",
              review: true,
            })
          }
        />
      )}

      {/* =========================
          MODAL
      ========================== */}

      {dialogState && (
        <Modal
          dialog={dialogState}
          onClose={() => setDialogState(null)}
        />
      )}
    </div>
  );
}