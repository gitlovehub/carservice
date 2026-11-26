import assert from 'node:assert/strict';
import {load} from './loader.mjs';
function setup(action, options, allowed=true) {
 const notifications=[], pending=[], errors=[], confirmations=[]; let stateIndex=0;
 const react={useState:initial=>{const writes=stateIndex++===0?pending:errors; return [initial,v=>writes.push(v)];},useRef:current=>({current}),useEffect:fn=>fn(),useCallback:fn=>fn};
 const {useAsyncAction}=load('src/hooks/useAsyncAction.ts', {react,'../config/labels':{LABELS:{notify:{genericError:'Lỗi chung'}}},'../components/ui/feedbackContext':{useAppFeedback:()=>({confirm:async opt=>{confirmations.push(opt);return allowed;},notify:(...args)=>notifications.push(args)})},'../services/apiError':{userErrorMessage:(err,fallback)=>err.message||fallback}});
 return {hook:useAsyncAction(action,options),notifications,pending,errors,confirmations};
}
let calls=0;
const cancelled=setup(async()=>++calls,{confirm:{title:'Xóa'},success:'OK'},false);
assert.equal(await cancelled.hook.run(),undefined);assert.equal(calls,0);assert.equal(cancelled.confirmations.length,1);assert.deepEqual(cancelled.notifications,[]);
let release;const task=new Promise(r=>{release=r});const completed=[];
const active=setup(async id=>{calls++;return task.then(()=>id);},{success:id=>`OK ${id}`,onSuccess:id=>completed.push(id)});
const first=active.hook.run(7);assert.equal(await active.hook.run(8),undefined);assert.equal(calls,1);release();assert.equal(await first,7);assert.deepEqual(active.pending,[true,false]);assert.deepEqual(active.notifications,[['OK 7','success']]);assert.deepEqual(completed,[7]);
const failing=setup(async()=>{throw Error('Thất bại')},{error:false});assert.equal(await failing.hook.run(),undefined);assert.deepEqual(failing.pending,[true,false]);assert.deepEqual(failing.errors,[null,'Thất bại']);assert.deepEqual(failing.notifications,[]);failing.hook.clearError();assert.equal(failing.errors.at(-1),null);
