import { createContext, useContext } from "react";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  required?: boolean;
};

/** <Field> cung cấp id, mô tả lỗi/gợi ý cho ô nhập bên trong; ô nhập ngoài Field vẫn hoạt động bình thường. */
export const FieldContext = createContext<FieldControlProps | null>(null);
export function useFieldControl() { return useContext(FieldContext); }

/** Class chuẩn cho ô nhập (dùng khi chưa thể thay bằng <Input>). */
export const controlClass =
  "block min-h-10 w-full rounded-control border border-cs-border bg-cs-surface px-3 py-2 text-small text-cs-text " +
  "placeholder:text-cs-muted transition-colors hover:border-cs-border-strong " +
  "focus:border-cs-accent focus:outline-none focus:ring-2 focus:ring-cs-accent/20 " +
  "disabled:cursor-not-allowed disabled:bg-cs-disabled disabled:text-cs-disabled-fg " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20 max-sm:min-h-11";
