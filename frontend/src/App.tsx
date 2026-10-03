import { useState } from "react";
import type { ModalDialogProps, PageDataConfig, Role } from "./types";
import {
  customerFormFields,
  customerNavItems,
  initialCustomerRows,
  pageConfigs,
  roleNavMap,
} from "./data/mockData";
import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { Footer } from "./components/Footer";
import { Modal } from "./components/Modal";
import { TableView } from "./pages/TableView";
import { ReportView } from "./pages/ReportView";
import { CustomerView } from "./pages/CustomerView";

export default function App() {
  const [role, setRole] = useState<Role>("Cố vấn dịch vụ");
  const [activePage, setActivePage] = useState("Khách hàng");
  const [dialogState, setDialogState] = useState<ModalDialogProps | null>(null);
  const [customers, setCustomers] = useState<string[][]>(initialCustomerRows);

  const isInternalRole = role !== "Khách hàng";
  const navItems = isInternalRole ? roleNavMap[role] : customerNavItems;

  function handleRoleChange(newRole: Role) {
    setRole(newRole);
    setActivePage(newRole === "Khách hàng" ? "Trang chủ" : roleNavMap[newRole][0]);
  }

  function handleOpenModal(dialog: ModalDialogProps) {
    setDialogState(dialog);
  }

  const customerPageConfig: PageDataConfig = {
    title: "Quản lý khách hàng",
    description: "Tìm kiếm và quản lý thông tin khách hàng tại gara.",
    columns: ["KHÁCH HÀNG", "SỐ ĐIỆN THOẠI", "EMAIL", "ĐỊA CHỈ", "THAO TÁC"],
    rows: [],
    primary: "Thêm khách hàng",
    fields: customerFormFields,
  };

  return (
    <div className="app-shell">
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

      <div className={isInternalRole ? "layout internal-layout" : "layout customer-layout"}>
        {isInternalRole && (
          <Sidebar
            role={role}
            activePage={activePage}
            navItems={navItems}
            onPageChange={setActivePage}
            onOpenReviewModal={() => handleOpenModal({ title: "REVIEW & TEST", review: true })}
          />
        )}

        <main className="main-content">
          <div className="content-inner">
            {isInternalRole ? (
              activePage === "Báo cáo & thống kê" ? (
                <ReportView />
              ) : (
                <TableView
                  key={activePage}
                  page={activePage}
                  data={activePage === "Khách hàng" ? customerPageConfig : pageConfigs[activePage]}
                  onOpen={handleOpenModal}
                  onNavigate={setActivePage}
                  customerRows={customers}
                  onCreateCustomer={(newCustomer) => setCustomers((prev) => [...prev, newCustomer])}
                  onUpdateCustomer={(phone, updatedRow) =>
                    setCustomers((prev) => prev.map((c) => (c[1] === phone ? updatedRow : c)))
                  }
                />
              )
            ) : (
              <CustomerView page={activePage} go={setActivePage} onOpen={handleOpenModal} />
            )}
          </div>
        </main>
      </div>

      {!isInternalRole && (
        <Footer onOpenReviewModal={() => handleOpenModal({ title: "REVIEW & TEST", review: true })} />
      )}

      {dialogState && <Modal dialog={dialogState} onClose={() => setDialogState(null)} />}
    </div>
  );
}