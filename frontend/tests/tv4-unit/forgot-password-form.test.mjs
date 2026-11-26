import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mount} from './form-harness.mjs';
const setup=()=>mount('src/pages/auth/ForgotPassword.tsx');
async function reset(h){h.input('fp-email',' user@example.com ');await h.submit();}
function fields(h,otp='123456',pw='Password1',confirm=pw){h.one(n=>n.type==='OtpInput').props.onChange(otp);h.input('fp-new-password',pw);h.input('fp-confirm-password',confirm);}
test('forgot password rejects invalid email without request',async()=>{const h=setup();h.input('fp-email','bad');await h.submit();assert.ok(h.error('fp-email'));assert.equal(h.calls.length,0);});
test('valid email requests OTP and starts resend cooldown',async()=>{const h=setup();await reset(h);assert.equal(h.calls[0].url,'/forgot-password');assert.deepEqual(JSON.parse(h.calls[0].body),{email:'user@example.com'});assert.ok(h.all(n=>n.type==='span'&&JSON.stringify(n.props.children).includes('60')).length);});
test('reset rejects short OTP, weak password and mismatched confirmation',async()=>{for(const [otp,pw,confirm] of [['123','Password1','Password1'],['123456','weak','weak'],['123456','Password1','Other1']]){const h=setup();await reset(h);fields(h,otp,pw,confirm);await h.submit();assert.equal(h.calls.length,1);}});
test('valid reset sends OTP and confirmation and shows completion',async()=>{const h=setup();await reset(h);fields(h);await h.submit();assert.equal(h.calls[1].url,'/reset-password');assert.deepEqual(JSON.parse(h.calls[1].body),{email:'user@example.com',otp:'123456',password:'Password1',password_confirmation:'Password1'});assert.ok(h.all(n=>n.props.role==='status').length);});
