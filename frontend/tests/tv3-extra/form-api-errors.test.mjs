import assert from 'node:assert/strict';
import { load, plain } from './loader.mjs';
const apiError = load('src/services/apiError.ts');
const toast = load('src/components/ui/toastContent.ts', {'../../services/apiError':apiError});
const labels = load('src/config/labels.ts');
class ApiClientError extends Error { constructor(data) { super('Invalid'); this.data = data; } }
const { apiFieldErrors, splitApiErrors, API_ERROR_MARK } = load('src/components/ui/formValidation.ts', {'../../config/labels':labels,'../../services/api':{ApiClientError},'../../services/apiError':apiError,'./toastContent':toast});
const error = new ApiClientError({errors:{email:['Email không hợp lệ.','Lỗi khác'], empty:[]}});
assert.deepEqual(plain(apiFieldErrors(error)), {email:'Email không hợp lệ.'});
assert.deepEqual(plain(apiFieldErrors(new Error('x'))), {});
assert.deepEqual(plain(splitApiErrors(error,{email:'emailInput'})), {fields:{emailInput:'Email không hợp lệ.'},toast:null});
const conflict = new ApiClientError({errors:{email:['Email đã tồn tại'], name:['The name field is required.']}});
assert.deepEqual(plain(splitApiErrors(conflict,{email:'emailInput',name:'nameInput'})), {fields:{emailInput:API_ERROR_MARK,nameInput:'Thông tin chưa hợp lệ.'},toast:'Email đã tồn tại'});
