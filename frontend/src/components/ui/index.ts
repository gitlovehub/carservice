/**
 * Thư viện component dùng chung của CarService — import từ "components/ui".
 * Cách dùng ghi ở đầu mỗi file. Không tạo bản sao component trong trang.
 *
 *   Nút ............ Button, IconButton, buttonClass (cho <Link>)
 *   Biểu mẫu ....... Field, Input, Select, Textarea, SearchInput
 *   Trạng thái ..... Badge, StatusBadge (config/status.ts)
 *   Lớp phủ ........ Modal, Drawer, Dropdown; xác nhận/thông báo: useAppFeedback + confirmDelete/confirmDiscard
 *   Dữ liệu ........ DataTable, Pagination
 *   Bố cục ......... PageHeader, Card
 *   Trạng thái trang EmptyState, LoadingState, ErrorState
 *   Thao tác API ... useAsyncAction (src/hooks)
 */
export { Button, IconButton, type ButtonProps, type IconButtonProps } from "./Button";
export { buttonClass, type ButtonVariant, type ButtonSize } from "./buttonClass";
export { Field, Input, Select, Textarea, SearchInput } from "./Field";
export { controlClass } from "./fieldContext";
export { Badge, StatusBadge } from "./Badge";
export { Modal, Drawer } from "./Modal";
export { Dropdown, type DropdownItem } from "./Dropdown";
export { DataTable, type Column } from "./DataTable";
export { Pagination } from "./Pagination";
export { PageHeader } from "./PageHeader";
export { Card } from "./Card";
export { EmptyState, LoadingState, ErrorState } from "./States";
export { confirmDelete, confirmDiscard } from "./confirmPresets";
export { useAppFeedback } from "./feedbackContext";
export { Icon, type IconName } from "./Icon";
export { Switch } from "./Switch";
export { KmInput, QuantityStepper } from "./QuantityStepper";
export { SortHeader } from "./SortHeader";
export { NEWEST_FIRST, ariaSort, useTableSort, type SortDir, type SortState } from "./tableSort";
