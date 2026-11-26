import assert from 'node:assert/strict';
import { load, plain } from './loader.mjs';
const { confirmDelete, confirmDiscard } = load('src/components/ui/confirmPresets.ts', {'../../config/labels':load('src/config/labels.ts')});
assert.deepEqual(plain(confirmDelete('dịch vụ A')), {title:'Xóa dịch vụ A?',description:'Dữ liệu đã xóa không thể khôi phục.',confirmText:'Xóa',cancelText:'Hủy',variant:'danger',confirmIcon:'trash'});
assert.equal(confirmDelete('xe A','Xác nhận tùy chỉnh').description,'Xác nhận tùy chỉnh');
assert.deepEqual(plain(confirmDiscard()), {title:'Bỏ các thay đổi chưa lưu?',description:'Những gì bạn vừa nhập sẽ không được lưu.',confirmText:'Bỏ thay đổi',cancelText:'Tiếp tục chỉnh sửa',variant:'warning'});
