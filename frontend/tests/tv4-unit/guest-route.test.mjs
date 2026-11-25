import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mount } from './form-harness.mjs';
function guest(session) {
  const from={pathname:'/customer/cars'}; const calls=[];
  const result=mount('src/pages/auth/GuestOnlyRoute.tsx',{props:{children:'login-form'},modules:{
    '../../contexts/authSession':{useAuthSession:()=>session}, 'react-router-dom':{Navigate:'Navigate',useLocation:()=>({state:{from}})},
    '../../components/ui':{LoadingState:'LoadingState'}, './auth':{readReturnLocation:state=>state.from,resolveReturnPath:(...args)=>{calls.push(args);return from;}}
  }}).render(); return {result,calls,from};
}
test('guest route waits while authentication is being verified',()=>assert.equal(guest({status:'checking'}).result.type,'LoadingState'));
test('guest route permits login for guest and verification error states',()=>{for(const status of ['guest','error']) assert.equal(guest({status}).result.props.children,'login-form');});
test('authenticated guest-route visitor is redirected using role and saved location',()=>{const {result,calls,from}=guest({status:'authenticated',account:{role:'CUSTOMER'}});assert.equal(result.type,'Navigate');assert.deepEqual(result.props,{to:from,replace:true});assert.deepEqual(calls,[['CUSTOMER',from]]);});
