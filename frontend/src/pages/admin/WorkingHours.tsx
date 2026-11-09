import { Button, PageHeader } from "../../components/ui";
import { useEffect, useState } from "react";
import { fetchApi } from "../../services/api";
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
  /** P7: năng lực (phút / ngày) — chỉ dùng để cảnh báo quá tải. */
  daily_capacity_minutes: string;
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
    daily_capacity_minutes: hour.daily_capacity_minutes != null ? String(hour.daily_capacity_minutes) : "",
  };
}

function isSame(a: RowForm, b: RowForm): boolean {
  return (
    a.open_time === b.open_time &&
    a.close_time === b.close_time &&
    a.max_slots === b.max_slots &&
    a.is_active === b.is_active &&
    a.daily_capacity_minutes === b.daily_capacity_minutes
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

  return "";
}

function WorkingHours() {
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [saved, setSaved] = useState<Record<number, RowForm>>({});
  const [forms, setForms] = useState<Record<number, RowForm>>({});
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    setError("");

    fetchApi("/admin/working-hours")
      .then((response: { data: WorkingHour[] }) => {
        if (!active) return;

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
            daily_capacity_minutes: form.daily_capacity_minutes === "" ? null : Math.max(0, Math.round(Number(form.daily_capacity_minutes))),
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
    <div className="min-h-screen bg-cs-bg text-[#20252B]">

      <div className="lg:ml-[250px]">

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1200px]">
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
              <div className="hidden grid-cols-[1.1fr_0.9fr_1fr_1fr_1fr_1.4fr] gap-4 border-b border-[#E1E4E6] bg-cs-surface-2 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-cs-muted lg:grid">
                <span>Ngày</span>
                <span>Trạng thái</span>
                <span>Giờ mở cửa</span>
                <span>Giờ đóng cửa</span>
                <span>Lịch tối đa / khung giờ</span>
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
                      <div className="grid items-center gap-4 lg:grid-cols-[1.1fr_0.9fr_1fr_1fr_1fr_1.4fr]">
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

                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            role="switch"
                            checked={form.is_active}
                            onChange={(event) =>
                              updateForm(hour.id, { is_active: event.target.checked })
                            }
                            className="peer sr-only"
                            aria-label={`Bật/tắt ${DAY_LABELS[hour.day_of_week]}`}
                          />
                          <span className="relative h-6 w-11 rounded-full bg-[#CBD0D4] transition peer-checked:bg-[#397044] peer-focus-visible:ring-2 peer-focus-visible:ring-[#D6A85F]/40 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                          <span className="text-xs font-medium text-cs-muted">
                            {form.is_active ? "Hoạt động" : "Nghỉ"}
                          </span>
                        </label>

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

                        <div>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.max_slots}
                          disabled={disabledFields}
                          onChange={(event) =>
                            updateForm(hour.id, { max_slots: event.target.value })
                          }
                          className={fieldClass}
                          aria-label={`Số lịch tối đa ${DAY_LABELS[hour.day_of_week]}`}
                        />
                        <input
                          type="number"
                          min={0}
                          value={form.daily_capacity_minutes}
                          disabled={disabledFields}
                          placeholder="Năng lực (phút/ngày)"
                          title="Tổng phút làm việc gara xử lý được trong ngày — vượt mức chỉ cảnh báo, không chặn"
                          onChange={(event) => updateForm(hour.id, { daily_capacity_minutes: event.target.value })}
                          className={`mt-1 ${fieldClass}`}
                          aria-label={`Năng lực phút mỗi ngày ${DAY_LABELS[hour.day_of_week]}`}
                        />
                        </div>

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

                      {state?.success && !dirty && (
                        <p className="mt-3 rounded-lg bg-[#E7F3E8] px-3 py-2 text-xs text-[#397044]">
                          Đã cập nhật giờ làm việc {DAY_LABELS[hour.day_of_week]}.
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

            {(() => {
              const firstActive = hours.find(hour => Boolean(hour.is_active));
              return <HolidaysPanel open={firstActive ? firstActive.open_time.slice(0, 5) : undefined} close={firstActive ? firstActive.close_time.slice(0, 5) : undefined}/>;
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default WorkingHours;
