/** P1D — giao diện bằng chứng: duyệt tại quầy chỉ qua OTP email chủ xe; ảnh tải qua API có kiểm quyền. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const panels = read('src/pages/advisor/RepairOrderPanels.tsx');
const counter = read('src/pages/advisor/CounterApprovalPanel.tsx');
const evidence = read('src/services/evidenceService.ts');
const uploader = read('src/components/evidence/PhotoUploader.tsx');

// Duyệt tại quầy: chỉ qua OTP; không có đường ghi phản hồi trực tiếp.
assert.match(panels, /<CounterApprovalPanel /, 'SENT quotation shows the counter OTP panel');
assert.match(evidence, /\/quotations\/\$\{quotationId\}\/otp/, 'OTP is requested from the backend');
assert.match(evidence, /\/quotations\/\$\{quotationId\}\/verify-otp/, 'Response is applied only through OTP verification');
assert.doesNotMatch(evidence + counter, /\/respond[`"']/, 'No direct staff respond call');
assert.match(counter, /setSent\(null\)/, 'Changing a decision invalidates the code already sent');
assert.match(counter, /autoComplete="one-time-code"/, 'OTP input is a one-time-code field');

// Ảnh: tải blob kèm token, thu nhỏ phía client, đúng loại file.
assert.match(evidence, /responseType: "blob"/, 'Photos are fetched as authorized blobs');
assert.match(evidence, /maxSide = 1600/, 'Client-side compression to 1600 px');
assert.match(uploader, /accept="image\/jpeg,image\/png,image\/webp"/, 'Only allowed image types can be picked');
assert.match(uploader, /URL\.revokeObjectURL/, 'Object URLs are released');
assert.match(panels, /<PhotoUploader type="inspection"/, 'Diagnosis photos are attached to the inspection');

console.log('PASS P1D: counter OTP approval + evidence photos UI.');
