// Năm trang mẫu dùng layout full-width. Những trang nghiệp vụ khác giữ nguyên CSS và API,
// nhưng cùng header/footer, không chuyển qua header cũ khi bấm menu.
// Tách khỏi ReferenceShell.tsx để file component chỉ export component (Fast Refresh).
export const referenceRoutes = new Set(['/', '/services', '/about', '/contact', '/repair-status']);
