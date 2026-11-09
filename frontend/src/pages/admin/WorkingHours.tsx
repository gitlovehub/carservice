import { Button, Icon, PageHeader, QuantityStepper, Switch } from "../../components/ui";
import { useEffect, useState } from "react";
import { fetchApi } from "../../services/api";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { HolidaysPanel } from "./HolidaysPanel";

type WorkingHour = {
  id: number;
  day_of_week: number;
  open_time: string;
  close_time: string;
  max_slots: number;
  is_active: boolean | number;
  daily_capacity_minutes?: number | null;
};

type RowForm = {
  open_time: string;
  close_time: string;
  max_slots: string;
  is_active: boolean;
  /** Công suất tự đặt (giờ công / ngày); "" = tự động (số KTV × giờ mở cửa). Chỉ dùng để cảnh báo quá tải. */
  capacity_hours: string;
};

type RowState = {
  saving: boolean;
  error: string;
  success: boolean;
};

// Carbon dayOfWeek: Sunday = 0 ... Saturday = 6
const DAY_LABELS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

// Display order: Monday -> Sunday
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const fieldClass =
  "w-full rounded-xl border border-[#D9DDE1] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#1F2933] focus:ring-2 focus:ring-[#D6A85F]/20 disabled:cursor-not-allowed disabled:bg-[#F1F2F3] disabled:text-cs-muted";

function toHHmm(value: string): string {
  return (value || "").slice(0, 5);
}

function toForm(hour: WorkingHour): RowForm {
  return {
    open_time: toHHmm(hour.open_time),
    close_time: toHHmm(hour.close_time),
    max_slots: String(hour.max_slots),
    is_active: Boolean(Number(hour.is_active)),
    capacity_hours: hour.daily_capacity_minutes != null ? formatHours(hour.daily_capacity_minutes / 60) : "",
  };
}

/** 7.5 → "7,5"; 8 → "8". */
function formatHours(hours: number): string {
  return String(Math.round(hours * 10) / 10).replace(".", ",");
}

function parseHours(value: string): number {
  return Number(value.replace(",", "."));
}

/** Số phút mở cửa giữa hai mốc HH:mm (0 nếu không hợp lệ). */
function openMinutes(open: string, close: string): number {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const minutes = ch * 60 + cm - (oh * 60 + om);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

function isSame(a: RowForm, b: RowForm): boolean {
  return (
    a.open_time === b.open_time &&
    a.close_time === b.close_time &&
    a.max_slots === b.max_slots &&
    a.is_active === b.is_active &&
    a.capacity_hours === b.capacity_hours
  );
}

function validateRow(form: RowForm): string {
  if (!form.open_time || !form.close_time) {
    return "Vui lòng nhập giờ mở cửa và giờ đóng cửa.";
  }

  if (form.close_time <= form.open_time) {
    return "Giờ đóng cửa phải sau giờ mở cửa.";
  }

  const slots = Number(form.max_slots);

  if (form.max_slots === "" || !Number.isInteger(slots)) {
    return "Số lịch tối đa phải là số nguyên.";
  }

  if (slots < 0 || slots > 100) {
    return "Số lịch tối đa phải từ 0 đến 100.";
  }

  if (form.is_active && slots < 1) {
    return "Ngày hoạt động phải có ít nhất 1 lịch mỗi khung giờ.";
  }

  if (form.capacity_hours !== "") {
    const hours = parseHours(form.capacity_hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 1000) {
      return "Công suất tự đặt phải là số giờ công lớn hơn 0 (ví dụ 32). Bấm \"Dùng tự động\" nếu không muốn tự đặt.";
    }
  }

  return "";
}

const ROW_GRID = "lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr_0.9fr_1.35fr_1.2fr]";

/** Cột "Công suất / ngày": mặc định hiển thị số tính tự động; admin có thể tự đặt số giờ công. */
function CapacityCell({ day, form, technicians, onChange }: {
  day: string;
  form: RowForm;
  technicians: number;
  onChange: (capacityHours: string) => void;
}) {
  if (!form.is_active) {
    return <p className="text-sm text-cs-muted">Nghỉ</p>;
  }

  const openHours = openMinutes(form.open_time, form.close_time) / 60;
  // `!`: CSS nền cho <button> (không nằm trong @layer) ghi đè cỡ chữ utility.
  const linkClass = "cursor-pointer !text-[12px] !font-medium !leading-5 text-cs-accent-text hover:underline underline-offset-2";

  if (form.capacity_hours === "") {
    const auto = technicians * openHours;
    return (
      <div className="min-w-0">
        {technicians > 0 ? (
          <>
            <p className="text-sm font-semibold">{formatHours(auto)} giờ công</p>
            <p className="text-[12px] text-cs-muted">Tự động · {technicians} KTV × {formatHours(openHours)} giờ</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-cs-muted">Chưa tính được</p>
            <p className="text-[12px] text-cs-muted">Chưa có kỹ thuật viên hoạt động</p>
          </>
        )}
        <button
          type="button"
          className={linkClass}
          onClick={() => onChange(formatHours(technicians > 0 ? auto : 8))}
          aria-label={`Tự đặt công suất ${day}`}
        >
          Tự đặt
        </button>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={form.capacity_hours}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ""))}
          className={`${fieldClass} pr-[4.5rem]`}
          aria-label={`Công suất tự đặt (giờ công) ${day}`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-cs-muted">giờ công</span>
      </div>
      <p className="mt-1 text-[12px] text-cs-muted">
        Tự đặt ·{" "}
        <button type="button" className={linkClass} onClick={() => onChange("")} aria-label={`Dùng công suất tự động ${day}`}>
          Dùng tự động
        </button>
      </p>
    </div>
  );
}

function WorkingHours() {
  const { notify } = useAppFeedback();
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [saved, setSaved] = useState<Record<number, RowForm>>({});
  const [forms, setForms] = useState<Record<number, RowForm>>({});
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [technicians, setTechnicians] = useState(0);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError("");

    fetchApi("/admin/working-hours")
      .then((response: { data: WorkingHour[]; meta?: { technicians?: number } }) => {
        if (!active) return;
        setTechnicians(Number(response?.meta?.technicians ?? 0));

        const list = Array.isArray(response?.data) ? response.data : [];
        const nextForms: Record<number, RowForm> = {};

        list.forEach((hour) => {
          nextForms[hour.id] = toForm(hour);
        });

        setHours(list);
        setSaved(nextForms);
        setForms(nextForms);
        setRowStates({});
      })
      .catch((requestError: unknown) => {
        if (!active) return;

        setHours([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể tải cấu hình giờ làm việc.",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const sortedHours = [...hours].sort(
    (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week),
  );

  const activeDays = sortedHours.filter((hour) => forms[hour.id]?.is_active).length;
  const dirtyCount = sortedHours.filter(
    (hour) => forms[hour.id] && saved[hour.id] && !isSame(forms[hour.id], saved[hour.id]),
  ).length;

  const updateForm = (id: number, patch: Partial<RowForm>) => {
    setForms((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setRowStates((current) => ({
      ...current,
      [id]: { saving: false, error: "", success: false },
    }));
  };

  const resetRow = (id: number) => {
    setForms((current) => ({ ...current, [id]: saved[id] }));
    setRowStates((current) => ({
      ...current,
      [id]: { saving: false, error: "", success: false },
    }));
  };

  const saveRow = async (hour: WorkingHour) => {
    const form = forms[hour.id];
    const validationError = validateRow(form);

    if (validationError) {
      setRowStates((current) => ({
        ...current,
        [hour.id]: { saving: false, error: validationError, success: false },
      }));
      return;
    }

    setRowStates((current) => ({
      ...current,
      [hour.id]: { saving: true, error: "", success: false },
    }));

    try {
      const response: { data: WorkingHour } = await fetchApi(
        `/admin/working-hours/${hour.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            open_time: form.open_time,
            close_time: form.close_time,
            max_slots: Number(form.max_slots),
            is_active: form.is_active,
            daily_capacity_minutes: form.capacity_hours === "" ? null : Math.round(parseHours(form.capacity_hours) * 60),
          }),
        },
      );

      const nextForm = response?.data ? toForm(response.data) : form;

      setSaved((current) => ({ ...current, [hour.id]: nextForm }));
      setForms((current) => ({ ...current, [hour.id]: nextForm }));
      setRowStates((current) => ({
        ...current,
        [hour.id]: { saving: false, error: "", success: true },
      }));
      notify(`Đã cập nhật giờ làm việc ${DAY_LABELS[hour.day_of_week]}: ${nextForm.is_active ? `${nextForm.open_time}–${nextForm.close_time}, tối đa ${nextForm.max_slots} lịch mỗi khung giờ` : "nghỉ, không nhận lịch"}.`, "success");
    } catch (requestError: unknown) {
      const data = (requestError as { data?: { errors?: Record<string, string[]> } })
        ?.data;
      const firstFieldError = data?.errors
        ? Object.values(data.errors)[0]?.[0]
        : "";

      setRowStates((current) => ({
        ...current,
        [hour.id]: {
          saving: false,
          error:
            firstFieldError ||
            (requestError instanceof Error
              ? requestError.message
              : "Không thể lưu cấu hình."),
          success: false,
        },
      }));
    }
  };

  return (
    <div className="text-cs-text">

      <div>

        <main className="page-container">
          <div>
            <PageHeader title="Giờ làm việc & ngày nghỉ" description="Khung giờ nhận lịch, số lịch tối đa mỗi khung giờ và ngày nghỉ của xưởng."
              actions={<Button variant="outline" icon="refresh" loading={isLoading} onClick={() => setReloadKey((current) => current + 1)}>Làm mới</Button>}/>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-medium text-cs-muted">Ngày hoạt động</p>
                <p className="mt-4 text-2xl font-bold">
                  {isLoading ? "—" : `${activeDays}/${sortedHours.length}`}
                </p>
                <p className="mt-1 text-[11px] text-cs-muted">Số ngày nhận lịch trong tuần</p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-medium text-cs-muted">Ngày nghỉ</p>
                <p className="mt-4 text-2xl font-bold">
                  {isLoading ? "—" : sortedHours.length - activeDays}
                </p>
                <p className="mt-1 text-[11px] text-cs-muted">Không nhận lịch hẹn</p>
              </div>

              <div className="rounded-2xl border border-[#E1E4E6] bg-white p-5">
                <p className="text-xs font-medium text-cs-muted">Thay đổi chưa lưu</p>
                <p className="mt-4 text-2xl font-bold">{isLoading ? "—" : dirtyCount}</p>
                <p className="mt-1 text-[11px] text-cs-muted">Bấm "Lưu" ở từng ngày</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-[#E7C5C5] bg-[#FBEFEF] px-5 py-4 text-sm text-[#A24A4A]">
                <span>{error}</span>
                <Button size="sm" variant="secondary" icon="refresh" onClick={() => setReloadKey((current) => current + 1)}>Thử lại</Button>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-[#E1E4E6] bg-white">
              <div className={`hidden ${ROW_GRID} gap-4 border-b border-[#E1E4E6] bg-cs-surface-2 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-cs-muted lg:grid`}>
                <span>Ngày</span>
                <span>Trạng thái</span>
                <span>Giờ mở cửa</span>
                <span>Giờ đóng cửa</span>
                <span>Lịch tối đa / khung giờ</span>
                <span className="inline-flex items-center gap-1" title="Tổng giờ làm việc của thợ trong ngày. Dùng để cảnh báo cố vấn khi lịch hẹn vượt sức làm của gara.">
                  Công suất / ngày <Icon name="info" size={13}/>
                </span>
                <span className="text-right">Thao tác</span>
              </div>

              {isLoading && (
                <div className="space-y-3 p-6">
                  {[0, 1, 2, 3, 4, 5, 6].map((item) => (
                    <div
                      key={item}
                      className="h-14 animate-pulse rounded-xl bg-[#F1F2F3]"
                    />
                  ))}
                </div>
              )}

              {!isLoading && sortedHours.length === 0 && !error && (
                <p className="px-6 py-12 text-center text-sm text-cs-muted">
                  Chưa có cấu hình giờ làm việc. Vui lòng liên hệ bộ phận kỹ thuật để khởi tạo.
                </p>
              )}

              {!isLoading &&
                sortedHours.map((hour) => {
                  const form = forms[hour.id];
                  const original = saved[hour.id];

                  if (!form || !original) return null;

                  const state = rowStates[hour.id];
                  const dirty = !isSame(form, original);
                  const disabledFields = !form.is_active;

                  return (
                    <div
                      key={hour.id}
                      className="border-b border-[#EDEFF0] px-6 py-4 last:border-b-0"
                    >
                      <div className={`grid items-center gap-4 ${ROW_GRID}`}>
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-bold ${
                              form.is_active
                                ? "bg-[#F3E8D2] text-[#6D542A]"
                                : "bg-[#F1F2F3] text-cs-muted"
                            }`}
                          >
                            {hour.day_of_week === 0 ? "CN" : `T${hour.day_of_week + 1}`}
                          </span>
                          <div>
                            <p className="text-sm font-semibold">
                              {DAY_LABELS[hour.day_of_week]}
                            </p>
                            {dirty && (
                              <p className="text-[11px] font-medium text-[#B68A43]">
                                ● Chưa lưu
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Switch
                            checked={form.is_active}
                            onChange={(value) => updateForm(hour.id, { is_active: value })}
                            label={`Bật/tắt ${DAY_LABELS[hour.day_of_week]}`}
                          />
                          <span className="text-xs font-medium text-cs-muted">
                            {form.is_active ? "Hoạt động" : "Nghỉ"}
                          </span>
                        </div>

                        <input
                          type="time"
                          value={form.open_time}
                          disabled={disabledFields}
                          onChange={(event) =>
                            updateForm(hour.id, { open_time: event.target.value })
                          }
                          className={fieldClass}
                          aria-label={`Giờ mở cửa ${DAY_LABELS[hour.day_of_week]}`}
                        />

                        <input
                          type="time"
                          value={form.close_time}
                          disabled={disabledFields}
                          onChange={(event) =>
                            updateForm(hour.id, { close_time: event.target.value })
                          }
                          className={fieldClass}
                          aria-label={`Giờ đóng cửa ${DAY_LABELS[hour.day_of_week]}`}
                        />

                        <QuantityStepper label={`Số lịch tối đa mỗi khung giờ ${DAY_LABELS[hour.day_of_week]}`} min={0} max={100} size="md" className="w-[132px]"
                          disabled={disabledFields} value={form.max_slots === "" ? 0 : Number(form.max_slots)}
                          onChange={(value) => updateForm(hour.id, { max_slots: String(value ?? 0) })}/>

                        <CapacityCell
                          day={DAY_LABELS[hour.day_of_week]}
                          form={form}
                          technicians={technicians}
                          onChange={(capacity_hours) => updateForm(hour.id, { capacity_hours })}
                        />

                        <div className="flex items-center justify-start gap-2 lg:justify-end">
                          {dirty && (
                            <Button size="sm" variant="ghost" icon="refresh" disabled={state?.saving} onClick={() => resetRow(hour.id)}>Hoàn tác</Button>
                          )}
                          <Button size="sm" variant="primary" icon="check" disabled={!dirty} loading={state?.saving} loadingText="Đang lưu..." onClick={() => saveRow(hour)}>Lưu</Button>
                        </div>
                      </div>

                      {state?.error && (
                        <p className="mt-3 rounded-lg bg-[#FBEFEF] px-3 py-2 text-xs text-[#A24A4A]">
                          {state.error}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>

            <p className="mt-4 text-[12px] text-cs-muted">
              Khách hàng chỉ có thể đặt lịch trong các ngày hoạt động, trong khoảng giờ đã
              cấu hình và không vượt quá số lịch tối đa của mỗi khung giờ.
            </p>
            <p className="mt-1 text-[12px] text-cs-muted">
              <strong className="font-semibold text-cs-text">Công suất / ngày</strong> là tổng giờ làm việc của thợ trong ngày,
              mặc định tính tự động = số kỹ thuật viên đang hoạt động ({technicians}) × số giờ mở cửa. Khi lịch hẹn đã xác nhận
              vượt mức này, cố vấn sẽ thấy cảnh báo quá tải (không chặn đặt lịch). Chỉ bấm "Tự đặt" nếu thực tế khác, ví dụ có thợ nghỉ cố định ngày đó.
            </p>

            {(() => {
              // Khung giờ đặt lịch phải nằm trong giờ mở cửa sớm nhất – đóng cửa muộn nhất của các ngày hoạt động.
              const active = hours.filter(hour => Boolean(Number(hour.is_active)));
              const open = active.map(hour => toHHmm(hour.open_time)).sort()[0];
              const close = active.map(hour => toHHmm(hour.close_time)).sort().at(-1);
              return <HolidaysPanel open={open} close={close}/>;
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default WorkingHours;
