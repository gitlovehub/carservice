import assert from 'node:assert/strict';
import {component,nodes} from './component-harness.mjs';
const calls=[];const {Badge,StatusBadge,ServiceStoppedTag}=component('src/components/ui/Badge.tsx',{'../../config/status':{getStatus:(...a)=>{calls.push(a);return {label:'Đã xong',tone:'success'};}}});
const badge=Badge({tone:'danger',children:'Lỗi',status:'FAILED'});assert.equal(badge.props['data-status'],'FAILED');assert.match(badge.props.className,/bg-danger-soft/);assert.equal(nodes(badge,n=>n.props?.['aria-hidden']==='true').length,1);assert.equal(nodes(Badge({children:'OK',dot:false}),n=>n.props?.['aria-hidden']==='true').length,0);
assert.equal(ServiceStoppedTag({status:'ACTIVE'}),null);assert.equal(ServiceStoppedTag({status:null}),null);const stopped=ServiceStoppedTag({status:'INACTIVE'});assert.equal(stopped.type,Badge);assert.equal(stopped.props.tone,'warning');
const status=StatusBadge({domain:'repair',status:'COMPLETED',audience:'customer'});assert.deepEqual(calls[0],['repair','COMPLETED','customer']);assert.equal(status.props.children,'Đã xong');assert.equal(status.props.tone,'success');assert.equal(StatusBadge({domain:'repair',status:null}).props.status,undefined);
