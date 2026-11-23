import { fmtDateTime } from "../../services/adminApi";
import { mediaApi, VEHICLE_POSITIONS } from "../../services/evidenceService";
import { formatGarageAddress, garageApi, type GarageInfo } from "../../services/garageService";
import type { WorkflowHandover, WorkflowOrder } from "../../services/workflowService";
import { CATEGORY_TEXT, comparedCheckIn, CONDITION_TEXT, confirmationText, findBefore, FUEL_TEXT, RELATION_TEXT } from "./handoverText";

/**
 * Mẫu in A4 biên bản nhận / trả xe (PO 18/11/2026): nền trắng, logo CarService, khách + xe, tình trạng, ảnh minh chứng,
 * checklist tài sản, ô ký khách hàng / cố vấn. Mở cửa sổ mới → hộp thoại in của trình duyệt (in giấy hoặc "Lưu thành PDF").
 * Chữ ký giấy chỉ để lưu hồ sơ tại gara; xác nhận trong hệ thống vẫn do chủ xe làm (tài khoản / mã email — D-008, D-012).
 */

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const dateTime = (iso?: string | null) => iso ? fmtDateTime(iso) : "—";
const FLAGGED = ["SCRATCH", "DENT", "BROKEN", "MISSING"];

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/** Ảnh nằm sau API kiểm quyền → tải blob kèm token, nhúng dạng data URL để cửa sổ in hiện được. */
async function photos(handoverId: number) {
  try {
    const items = (await mediaApi.list("handover", handoverId)).filter(m => m.mime.startsWith("image/")).slice(0, 8);
    const loaded = await Promise.all(items.map(async item => {
      try { return { src: await toDataUrl(await mediaApi.blob(item.id)), caption: item.position_code ? VEHICLE_POSITIONS[item.position_code] ?? item.position_code : dateTime(item.created_at) }; }
      catch { return null; }
    }));
    return loaded.filter((p): p is { src: string; caption: string } => p !== null);
  } catch { return []; }
}

export function handoverHtml(order: WorkflowOrder, h: WorkflowHandover, garage: GarageInfo | null, images: Array<{ src: string; caption: string }>) {
  const isOut = h.type === "CHECK_OUT";
  const title = isOut ? "BIÊN BẢN TRẢ XE" : "BIÊN BẢN NHẬN XE";
  const items = h.checklist_items ?? [];
  const condition = items.filter(i => i.category === "EXTERIOR" || i.category === "INTERIOR");
  const assets = items.filter(i => i.category !== "EXTERIOR" && i.category !== "INTERIOR");
  const vehicle = order.vehicle;
  const car = [vehicle?.model?.brand?.name, vehicle?.model?.name, vehicle?.trim?.name || vehicle?.variant].filter(Boolean).join(" ") || "—";
  const confirmation = h.confirmations?.[0];
  const status = { DRAFT: "Bản nháp — chưa gửi khách", SUBMITTED: "Đã gửi, chờ chủ xe xác nhận", CONFIRMED: "Chủ xe đã xác nhận", VOID: "Đã hủy" }[h.status];
  const cond = (c: string) => `<span class="${FLAGGED.includes(c) ? "bad" : "ok"}">${esc(CONDITION_TEXT[c as keyof typeof CONDITION_TEXT] ?? c)}</span>`;
  const row = (label: string, value: unknown) => `<tr><th>${esc(label)}</th><td>${esc(value || "—")}</td></tr>`;
  const logo = `${window.location.origin}/brand/carservice-logo.png`;
  const compare = comparedCheckIn(h, order.handovers);
  const beforeCell = (i: (typeof items)[number]) => {
    const prior = findBefore(compare, i);
    return `<td>${prior ? `${cond(prior.condition)}${prior.quantity ? ` × ${esc(prior.quantity)}` : ""}${prior.note ? `<br>${esc(prior.note)}` : ""}` : "Không có"}</td>`;
  };

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)} · ${esc(order.repair_order_code)}</title>
<style>
@page{size:A4;margin:14mm 13mm}
*{box-sizing:border-box}body{margin:0;background:#fff;color:#151515;font:12.5px/1.45 system-ui,"Segoe UI",Arial,sans-serif}
.page{max-width:184mm;margin:0 auto}
.head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:10px;border-bottom:2.5px solid #b8862f}
.head img{height:46px}.garage{font-size:11.5px;color:#444;margin-top:2px}
.doc{text-align:right}.doc h1{margin:0;font-size:19px;letter-spacing:.04em;color:#151515}.doc div{font-size:11.5px;color:#444}
.status{display:inline-block;margin-top:4px;padding:2px 8px;border:1px solid #b8862f;border-radius:999px;font-size:11px;color:#7a5718}
h2{margin:14px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#7a5718}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
table{width:100%;border-collapse:collapse}th,td{padding:5px 7px;border:1px solid #d6d6d6;text-align:left;vertical-align:top}
.kv th{width:38%;background:#faf6ee;font-weight:600}
.list thead th{background:#faf6ee;font-size:11px;text-transform:uppercase}
.c{text-align:center}.ok{color:#1d6b3a;font-weight:600}.bad{color:#b3261e;font-weight:700}
.note{font-weight:500;padding:7px 9px;border:1px solid #d6d6d6;border-radius:4px;min-height:32px;white-space:pre-wrap}
.photos{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.photos figure{margin:0;border:1px solid #d6d6d6;break-inside:avoid}
.photos img{display:block;width:100%;height:95px;object-fit:cover}.photos figcaption{padding:2px 4px;font-size:10.5px;color:#444}
.econfirm{margin-top:10px;padding:7px 9px;border-left:3px solid #1d6b3a;background:#f1f8f3;font-size:11.5px}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:20px;text-align:center;break-inside:avoid}
.sign b{display:block;font-size:12.5px}.sign i{display:block;font-size:11px;color:#555}.sign .line{height:78px}.sign .name{border-top:1px dotted #777;padding-top:4px;font-weight:600}
.foot{margin-top:14px;font-size:10.5px;color:#666;text-align:center}
.toolbar{position:sticky;top:0;display:flex;justify-content:flex-end;gap:8px;padding:10px 0;background:#fff}
.toolbar button{min-height:38px;padding:0 16px;border-radius:10px;border:1px solid #b8862f;background:linear-gradient(135deg,#f2cf86,#d9a54e);color:#1e1810;font-weight:700;cursor:pointer}
.toolbar button.ghost{background:#fff;color:#151515;border-color:#ccc}
.toolbar button:hover{filter:brightness(1.05)}
@media print{.toolbar{display:none}}
</style></head><body><div class="page">
<div class="toolbar"><button class="ghost" onclick="window.close()">Đóng</button><button onclick="window.print()">In / Lưu PDF</button></div>
<div class="head"><div><img src="${esc(logo)}" alt="CarService" onerror="this.style.display='none'"><div class="garage"><b>${esc(garage?.name || "CarService")}</b>${formatGarageAddress(garage) ? ` · ${esc(formatGarageAddress(garage))}` : ""}${garage?.phone ? ` · ĐT ${esc(garage.phone)}` : ""}</div></div>
<div class="doc"><h1>${esc(title)}</h1><div>Số: <b>BB-${esc(String(h.id).padStart(5, "0"))}</b> · Phiếu: <b>${esc(order.repair_order_code)}</b></div><div>Lập lúc: ${esc(dateTime(h.submitted_at ?? order.received_at))}</div><span class="status">${esc(status)}</span></div></div>

<div class="cols">
<div><h2>Khách hàng</h2><table class="kv">${row("Chủ xe", order.customer?.full_name)}${row("Điện thoại", order.customer?.phone)}${row("Email", order.customer?.email)}</table></div>
<div><h2>Xe</h2><table class="kv">${row("Dòng xe", car)}${row("Biển số", vehicle?.license_plate)}${row("Năm sản xuất", vehicle?.year)}</table></div>
</div>
<div class="cols">
<div><h2>Thông tin ${isOut ? "trả" : "tiếp nhận"}</h2><table class="kv">${row("Số km (ODO)", h.mileage != null ? `${h.mileage.toLocaleString("vi-VN")} km` : "")}${row("Nhiên liệu", FUEL_TEXT[h.fuel_level ?? ""])}${compare ? `${row("Số km lúc nhận", compare.mileage != null ? `${compare.mileage.toLocaleString("vi-VN")} km` : "")}${row("Nhiên liệu lúc nhận", FUEL_TEXT[compare.fuel_level ?? ""])}` : ""}</table></div>
<div><h2>Người ${isOut ? "nhận" : "giao"} xe</h2><table class="kv">${row("Họ tên", h.person_name)}${row("Quan hệ", RELATION_TEXT[h.person_relation])}${row("Điện thoại", h.person_phone)}${h.has_person_id ? row("Giấy tờ tùy thân", h.person_relation === "AUTHORIZED" ? "Đã đối chiếu" : "Đã ghi nhận") : ""}</table></div>
</div>

<h2>Tình trạng xe</h2>
<table class="list"><thead><tr><th style="width:22%">Vị trí</th>${compare ? `<th style="width:24%">Lúc nhận</th>` : ""}<th style="width:18%">${compare ? "Lúc trả" : "Tình trạng"}</th><th>Mô tả</th></tr></thead><tbody>
${condition.map(i => `<tr><td>${esc(i.label)}</td>${compare ? beforeCell(i) : ""}<td>${cond(i.condition)}</td><td>${esc(i.note || "")}${i.is_discrepancy ? ` <span class="bad">(thay đổi so với lúc nhận)</span>` : ""}</td></tr>`).join("") || `<tr><td colspan="${compare ? 4 : 3}" class="c">Không ghi nhận</td></tr>`}
</tbody></table>
${compare?.general_condition ? `<p style="margin:6px 0 0"><b>Tình trạng xe khi nhận:</b></p><div class="note">${esc(compare.general_condition)}</div>` : ""}
${h.general_condition ? `<p style="margin:6px 0 0"><b>Tình trạng xe ${h.type === "CHECK_OUT" ? "khi trả" : "khi nhận"}:</b></p><div class="note">${esc(h.general_condition)}</div>` : ""}

<h2>Tài sản bàn giao</h2>
<table class="list"><thead><tr><th style="width:5%" class="c">#</th><th>Hạng mục</th><th style="width:15%">Nhóm</th>${compare ? `<th style="width:16%">Lúc nhận</th>` : ""}<th style="width:14%">${compare ? "Lúc trả" : "Tình trạng"}</th><th style="width:8%" class="c">Số lượng</th><th style="width:26%">Ghi chú</th></tr></thead><tbody>
${assets.map((i, n) => `<tr><td class="c">${n + 1}</td><td>${esc(i.label)}</td><td>${esc(CATEGORY_TEXT[i.category])}</td>${compare ? beforeCell(i) : ""}<td>${cond(i.condition)}</td><td class="c">${esc(i.quantity ?? "")}</td><td>${esc(i.note || "")}</td></tr>`).join("") || `<tr><td colspan="${compare ? 7 : 6}" class="c">Không có</td></tr>`}
</tbody></table>
${compare ? `<p style="margin:6px 0 0"><b>Đồ có giá trị lúc nhận:</b></p><div class="note">${esc(compare.valuables_note || "—")}</div>` : ""}
<p style="margin:6px 0 0"><b>Đồ có giá trị ${compare ? "lúc trả" : "khách để lại trong xe"}:</b></p><div class="note">${esc(h.valuables_note || "—")}</div>

${images.length ? `<h2>Ảnh minh chứng</h2><div class="photos">${images.map(p => `<figure><img src="${p.src}" alt=""><figcaption>${esc(p.caption)}</figcaption></figure>`).join("")}</div>` : ""}

${confirmation ? `<div class="econfirm">Chủ xe đã xác nhận ${esc(confirmationText(confirmation.method))} lúc <b>${esc(dateTime(confirmation.confirmed_at))}</b>${confirmation.comment ? ` — “${esc(confirmation.comment)}”` : ""}.</div>` : ""}

<div class="sign">
<div><b>${isOut ? "NGƯỜI NHẬN XE" : "KHÁCH HÀNG – NGƯỜI GIAO XE"}</b><i>(Ký, ghi rõ họ tên)</i><div class="line"></div><div class="name">${esc(h.person_name)}</div></div>
<div><b>CỐ VẤN DỊCH VỤ</b><i>(Ký, ghi rõ họ tên)</i><div class="line"></div><div class="name">${esc(order.advisor?.full_name || "")}</div></div>
</div>
<p class="foot">Biên bản lập thành 02 bản, mỗi bên giữ 01 bản. Hai bên đã kiểm tra tình trạng xe và tài sản như trên.</p>
</div><script>window.addEventListener("load",function(){setTimeout(function(){window.print()},250)})</script></body></html>`;
}

/** In biên bản: mở cửa sổ trước (tránh trình duyệt chặn pop-up), tải ảnh + thông tin gara rồi ghi nội dung. */
export async function printHandover(order: WorkflowOrder, handover: WorkflowHandover) {
  const win = window.open("", "_blank", "width=960,height=1100");
  if (!win) return false;
  win.document.write(`<p style="font:14px system-ui;padding:24px">Đang chuẩn bị biên bản…</p>`);
  const [garage, images] = await Promise.all([garageApi.get().catch(() => null), photos(handover.id)]);
  win.document.open();
  win.document.write(handoverHtml(order, handover, garage, images));
  win.document.close();
  return true;
}
