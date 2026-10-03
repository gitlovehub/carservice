export type Role = "Khách hàng" | "Cố vấn dịch vụ" | "Kỹ thuật viên" | "Quản trị viên";

export interface FieldConfig {
  label: string;
  placeholder?: string;
  type?: string;
  options?: string[];
}

export interface ModalDialogProps {
  title: string;
  description?: string;
  warning?: boolean;
  review?: boolean;
  info?: boolean;
  fields?: FieldConfig[];
  initialValues?: Record<string, string>;
  action?: string;
  onConfirm?: (data: Record<string, string>) => void;
}

export interface PageDataConfig {
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
  primary?: string;
  fields?: FieldConfig[];
  actions?: string[];
}
