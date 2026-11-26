import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mount} from './form-harness.mjs';
function setup(value='',props={}){const changes=[];const h=mount('src/components/auth/OtpInput.tsx',{props:{value,onChange:v=>changes.push(v),...props}});return {inputs:h.all(n=>n.type==='input'),changes};}
test('OTP uses six numeric inputs by default and honors disabled/error props',()=>{const {inputs}=setup('',{disabled:true,hasError:true});assert.equal(inputs.length,6);for(const n of inputs){assert.equal(n.props.inputMode,'numeric');assert.equal(n.props.maxLength,1);assert.equal(n.props.disabled,true);assert.equal(n.props['aria-invalid'],true);}});
test('OTP ignores non-digits and keeps last entered digit',()=>{const {inputs,changes}=setup('12');inputs[2].props.onChange({target:{value:'abc'}});assert.deepEqual(changes,[]);inputs[2].props.onChange({target:{value:'a34'}});assert.deepEqual(changes,['124']);});
test('OTP paste strips non-digits and truncates to configured length',()=>{const {inputs,changes}=setup('',{length:4});inputs[0].props.onPaste({preventDefault(){},clipboardData:{getData:()=> 'a12-3456'}});assert.deepEqual(changes,['1234']);});
test('OTP backspace removes last digit or previous digit when current input is empty',()=>{const {inputs,changes}=setup('123');for(const i of [2,3])inputs[i].props.onKeyDown({key:'Backspace',preventDefault(){}});assert.deepEqual(changes,['12','12']);});
