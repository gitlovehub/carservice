import assert from 'node:assert/strict';
import { load, plain } from './loader.mjs';
const { toastContent, isBusinessConflict } = load('src/components/ui/toastContent.ts', {'../../services/apiError':load('src/services/apiError.ts')});
assert.deepEqual(plain(toastContent('SQLSTATE[42S02]: select * from accounts','error')), {title:'Không thể hoàn tất thao tác',description:'Vui lòng thử lại sau giây lát.'});
assert.deepEqual(plain(toastContent('Email đã tồn tại','error')), {title:'Email đã tồn tại',description:'Vui lòng sử dụng địa chỉ email khác.'});
assert.equal(isBusinessConflict('Email đã tồn tại'), true);
assert.equal(isBusinessConflict('Email không đúng định dạng'), false);
assert.deepEqual(plain(toastContent('Lưu thành công — bạn có thể tiếp tục')), {title:'Lưu thành công',description:'Bạn có thể tiếp tục'});
