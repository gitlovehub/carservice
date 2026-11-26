import assert from 'node:assert/strict';
import { load, plain } from './loader.mjs';
const { toastContent } = load('src/components/ui/toastContent.ts', {'../../services/apiError':load('src/services/apiError.ts')});
for (const [message,title,description] of [
 ['Failed to fetch','Mất kết nối','Vui lòng kiểm tra kết nối mạng và thử lại.'],
 ['timeout of 20000ms exceeded','Máy chủ phản hồi chậm','Vui lòng thử lại sau giây lát.'],
 ['Unauthenticated','Phiên đăng nhập đã hết hạn','Vui lòng đăng nhập lại.'],
 ['Too Many Attempts','Thao tác quá nhanh','Vui lòng thử lại sau ít phút.'],
 ['This action is unauthorized','Không có quyền thực hiện','Vui lòng liên hệ quản trị viên nếu bạn cần quyền này.']
]) assert.deepEqual(plain(toastContent(message,'error')), {title,description});
