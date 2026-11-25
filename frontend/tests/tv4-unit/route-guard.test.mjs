import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount } from './form-harness.mjs';
const location = { pathname: '/admin/customers', search: '?page=2' };
function guard(session, allowedRoles = ['ADMIN']) {
  return mount('src/pages/auth/ProtectedRoute.tsx', { props: { allowedRoles, children: 'protected-content' }, modules: {
    '../../contexts/authSession': { useAuthSession: () => session },
    'react-router-dom': { Navigate: 'Navigate', useLocation: () => location },
    './auth': { getRoleManagementPage: role => role === 'CUSTOMER' ? { path: '/customer/appointments' } : null },
    '../../components/ui': { LoadingState: 'LoadingState' },
  }}).render();
}
test('protected route does not render children while checking session', () => assert.equal(guard({status:'checking'}).type,'LoadingState'));
test('protected route shows error instead of protected children on verification failure', () => assert.equal(guard({status:'error'}).props.role,'alert'));
test('guest is redirected to login with original location', () => { const r=guard({status:'guest'}); assert.equal(r.type,'Navigate'); assert.deepEqual(r.props,{to:'/login',state:{from:location},replace:true}); });
test('wrong role and missing role cannot render protected children', () => { assert.equal(guard({status:'authenticated',account:{role:'CUSTOMER'}}).props.to,'/customer/appointments'); assert.equal(guard({status:'authenticated',account:{}}).props.to,'/login'); });
test('allowed role renders protected children', () => assert.equal(guard({status:'authenticated',account:{role:'ADMIN'}}).props.children,'protected-content'));
