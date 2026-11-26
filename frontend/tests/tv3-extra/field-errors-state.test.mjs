import assert from 'node:assert/strict';
import {load,plain} from './loader.mjs';
let state={},focus=0;const notices=[];let apiResult={fields:{},toast:null};
const {useFieldErrors}=load('src/components/ui/useFieldErrors.ts',{react:{useCallback:fn=>fn,useState:()=>[state,v=>{state=typeof v==='function'?v(state):v;}]},'./feedbackContext':{useAppFeedback:()=>({notify:(...args)=>notices.push(args)})},'./focusInvalid':{focusFirstInvalid:()=>focus++},'./formValidation':{splitApiErrors:()=>apiResult}});
const hook=useFieldErrors();assert.equal(hook.mark({email:'Sai',name:'Thiếu'}),true);assert.equal(focus,0);hook.clear('email');assert.deepEqual(plain(state),{name:'Thiếu'});const unchanged=state;hook.clear('unknown');assert.equal(state,unchanged);
assert.equal(hook.show({name:'Thiếu'}),true);assert.equal(focus,1);assert.equal(hook.show({}),false);assert.equal(focus,1);
apiResult={fields:{phone:'Sai'},toast:'Lỗi nghiệp vụ'};hook.showApi({});assert.deepEqual(plain(state),{phone:'Sai'});assert.equal(focus,2);assert.deepEqual(notices,[['Lỗi nghiệp vụ','error']]);hook.reset();assert.deepEqual(plain(state),{});
