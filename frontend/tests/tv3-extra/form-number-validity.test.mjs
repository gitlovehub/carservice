import assert from 'node:assert/strict';import {component} from './component-harness.mjs';
const {validityMessage}=component('src/components/ui/formValidation.ts',{'../../config/labels':{},'../../services/api':{},'../../services/apiError':{},'./toastContent':{}});
assert.equal(validityMessage({validity:{badInput:true}}),'Vui lòng nhập giá trị hợp lệ.');assert.equal(validityMessage({validity:{stepMismatch:true}}),'Giá trị không đúng bước cho phép.');
