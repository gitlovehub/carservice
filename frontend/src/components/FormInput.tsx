import type { FieldConfig } from "../types";

export function FormInput({ field, defaultValue }: { field: FieldConfig; defaultValue?: string }) {
  return (
    <label className="form-field">
      <span>{field.label}</span>
      {field.options ? (
        <select name={field.label} defaultValue={defaultValue || ""} required>
          {field.options.map((opt, idx) => (
            <option key={opt} value={idx ? opt : ""}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={field.label}
          type={field.type || "text"}
          placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}`}
          defaultValue={defaultValue}
          required={field.label !== "Ghi chú" && field.label !== "Biển số"}
        />
      )}
    </label>
  );
}
