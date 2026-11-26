import assert from 'node:assert/strict';
import { load } from './loader.mjs';
class Input { constructor(props) { Object.assign(this, props); } }
class Select extends Input {}
class Textarea extends Input {}
const { validityMessage, isFormControl } = load('src/components/ui/formValidation.ts', {
  '../../config/labels': {LABELS:{}}, '../../services/api': {}, '../../services/apiError': {}, './toastContent': {}
}, {HTMLInputElement:Input, HTMLSelectElement:Select, HTMLTextAreaElement:Textarea});
const input = (validity, props = {}) => new Input({validity, ...props});
assert.equal(validityMessage(input({valueMissing:true})), 'Vui lòng nhập thông tin này.');
assert.equal(validityMessage(new Select({validity:{valueMissing:true}})), 'Vui lòng chọn một mục.');
assert.equal(validityMessage(input({valueMissing:true},{type:'checkbox'})), 'Vui lòng chọn mục này.');
assert.equal(validityMessage(input({typeMismatch:true},{type:'email'})), 'Email không hợp lệ.');
assert.equal(validityMessage(input({tooShort:true},{minLength:8})), 'Cần ít nhất 8 ký tự.');
assert.equal(validityMessage(input({tooLong:true},{maxLength:20})), 'Tối đa 20 ký tự.');
assert.equal(validityMessage(input({rangeUnderflow:true},{min:'1'})), 'Giá trị nhỏ nhất là 1.');
assert.equal(validityMessage(input({rangeOverflow:true},{max:'100'})), 'Giá trị lớn nhất là 100.');
assert.equal(validityMessage(input({patternMismatch:true},{title:'Sai mẫu'})), 'Sai mẫu');
assert.equal(isFormControl(null), false);
assert.equal(isFormControl(new Textarea({})), true);
