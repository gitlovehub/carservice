import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount } from './form-harness.mjs';
const setup = () => mount('src/pages/auth/Register.tsx');
function fill(h, changes = {}) {
  for (const [id, value] of Object.entries({ 'reg-name':' Nguyen Van A ', 'reg-phone':' 0912345678 ', 'reg-email':' test@example.com ', 'reg-password':'Password1', 'reg-confirm':'Password1', ...changes })) h.input(id,value);
  h.one(n => n.props.name === 'agree').props.onChange({target:{name:'agree',type:'checkbox',checked:true}});
}
test('blank registration shows required field errors without API request', async () => { const h=setup(); await h.submit(); for(const id of ['reg-name','reg-phone','reg-email','reg-password','reg-confirm']) assert.ok(h.error(id)); assert.equal(h.calls.length,0); });
test('registration rejects invalid name, phone and email', async () => { const h=setup(); fill(h,{'reg-name':' A ','reg-phone':'0123','reg-email':'bad'}); await h.submit(); for(const id of ['reg-name','reg-phone','reg-email']) assert.ok(h.error(id)); assert.equal(h.calls.length,0); });
test('registration rejects weak passwords and mismatched confirmation', async () => { for(const password of ['Ab1','password1','PASSWORD1','Password']) {const h=setup(); fill(h,{'reg-password':password,'reg-confirm':'other'}); await h.submit(); assert.ok(h.error('reg-password')); assert.ok(h.error('reg-confirm')); assert.equal(h.calls.length,0); } });
test('registration requires terms acceptance', async () => {const h=setup(); fill(h); h.one(n=>n.props.name==='agree').props.onChange({target:{name:'agree',type:'checkbox',checked:false}}); await h.submit(); assert.equal(h.calls.length,0); assert.ok(h.all(n=>n.props.role==='alert').length); });
test('valid registration trims contact fields and opens verification prompt', async () => {const h=setup(); fill(h); await h.submit(); assert.equal(h.calls[0].url,'/register'); assert.equal(h.calls[0].method,'POST'); assert.deepEqual(JSON.parse(h.calls[0].body),{full_name:'Nguyen Van A',phone:'0912345678',email:'test@example.com',password:'Password1',password_confirmation:'Password1',accept_terms:true}); assert.equal(h.one(n=>n.type==='VerifyEmailPrompt').props.email,'test@example.com'); });
