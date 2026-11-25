import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mount} from './form-harness.mjs';
const setup=options=>mount('src/pages/auth/Login.tsx',options);
function fill(h,email=' user@example.com ',password='Password1'){h.input('login-email',email);h.input('login-password',password);}
test('login rejects missing credentials and malformed email',async()=>{const h=setup();await h.submit();assert.ok(h.error('login-email'));assert.ok(h.error('login-password'));fill(h,'bad');await h.submit();assert.ok(h.error('login-email'));assert.equal(h.calls.length,0);});
test('successful login sends trimmed email and stores session, not password',async()=>{const h=setup({api:async()=>({account:{role:'CUSTOMER'},token:'fake-token'})});fill(h);await h.submit();assert.equal(h.calls[0].url,'/login');assert.deepEqual(JSON.parse(h.calls[0].body),{email:'user@example.com',password:'Password1',device_name:'web'});assert.equal(h.storage.get('token'),'fake-token');assert.ok(![...h.storage.values()].some(x=>x.includes('Password1')));h.timers[0]();assert.equal(h.navigation[0][0],'/customer');});
test('technician login revokes token rather than storing a session',async()=>{const h=setup({api:async url=>url==='/login'?{account:{role:'TECHNICIAN'},token:'fake-token'}:{}});fill(h);await h.submit();assert.equal(h.calls[1].url,'/logout');assert.equal(h.calls[1].headers.Authorization,'Bearer fake-token');assert.equal(h.storage.has('token'),false);assert.equal(h.navigation.length,0);});
test('unverified email opens verification prompt',async()=>{const h=setup({api:async()=>{throw {data:{message:'Email chưa xác thực'}};}});fill(h);await h.submit();assert.equal(h.one(n=>n.type==='VerifyEmailPrompt').props.email,'user@example.com');assert.equal(h.storage.has('token'),false);});
