import assert from 'node:assert/strict';
import {component} from './component-harness.mjs';
const {toastContent}=component('src/components/ui/toastContent.ts',{'../../services/apiError':{isTechnicalMessage:()=>false}});
for(const message of ['Không thể lưu','Không gửi được','Không xử lý được','Không tải được','Không thực hiện']) assert.equal(toastContent(message,'error').description,'Vui lòng thử lại sau giây lát.');
assert.equal(toastContent('Không thể lưu','info').description,undefined);
assert.equal(toastContent('Không gửiable','error').description,undefined);
