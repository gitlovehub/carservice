import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = readFileSync(new URL('../../src/pages/auth/auth.ts', import.meta.url), 'utf8');
// Routing and display helpers are pure; fail if a test unexpectedly calls an API.
const stubbed = source.replace('import { fetchApi } from "../../services/api";', 'const fetchApi = () => { throw new Error("Unexpected API call"); };').replace('import { clearAuthSessionMarker } from "../../services/authPersistence";', 'const clearAuthSessionMarker = () => { throw new Error("Unexpected session call"); };');
const { getRoleManagementPage, resolveReturnPath, readReturnLocation, getUserDisplayName, getUserInitials } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(stubbed)).toString('base64'));
test('role home paths match supported management areas', () => {
  for (const [role,path] of [['ADMIN','/admin'],['ADVISOR','/advisor'],['CUSTOMER','/customer/appointments']]) assert.equal(getRoleManagementPage(role).path,path);
  assert.equal(getRoleManagementPage('UNKNOWN'),null);
});
test('authentication pages redirect to role home', () => {
  for (const pathname of ['/login','/register','/forgot-password']) assert.equal(resolveReturnPath('CUSTOMER',{pathname}),'/customer/appointments');
});
test('cross-role management areas are rejected', () => {
  assert.equal(resolveReturnPath('CUSTOMER',{pathname:'/admin/customers'}),'/customer/appointments');
  assert.equal(resolveReturnPath('ADMIN',{pathname:'/advisor/customers'}),'/admin');
  assert.equal(resolveReturnPath('ADVISOR',{pathname:'/booking'}),'/advisor');
  assert.equal(resolveReturnPath('ADMIN',{pathname:'/customer/cars'}),'/admin');
});
test('allowed return location retains query and hash', () => {
  const from = {pathname:'/customer/cars',search:'?edit=1',hash:'#details'};
  assert.deepEqual(resolveReturnPath('CUSTOMER',from),from);
  assert.deepEqual(resolveReturnPath('ADMIN',{pathname:'/services'}),{pathname:'/services',search:'',hash:''});
});
test('return state rejects absent or malformed pathname', () => {
  for (const state of [null,{}, {from:{pathname:42}}]) assert.equal(readReturnLocation(state),null);
  assert.deepEqual(readReturnLocation({from:{pathname:'/services'}}),{pathname:'/services'});
});
test('display name prioritizes profile and falls back to email', () => {
  assert.equal(getUserDisplayName({full_name:'First',customer:{full_name:'Second'}}),'First');
  assert.equal(getUserDisplayName({employee:{full_name:'Staff'}}),'Staff');
  assert.equal(getUserDisplayName({email:'demo@example.test'}),'demo@example.test');
});
test('initials support names and role fallback', () => {
  assert.equal(getUserInitials({full_name:'Nguyen Van An'}),'NA');
  assert.equal(getUserInitials({full_name:'An'}),'AN');
  assert.equal(getUserInitials({role:'ADMIN'}),'AD');
  assert.equal(getUserInitials({role:'ADVISOR'}),'CV');
  assert.equal(getUserInitials({role:'TECHNICIAN'}),'KT');
});
