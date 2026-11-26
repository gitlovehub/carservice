import assert from 'node:assert/strict';
import {component} from './component-harness.mjs';
const Button=()=>null;
const {EmptyState,ErrorState}=component('src/components/ui/States.tsx',{react:{useRef:x=>({current:x}),useState:x=>[x,()=>{}]},'../../config/labels':{LABELS:{state:{empty:'Trống',error:'Lỗi'},action:{retry:'Thử lại'}}},'./Button':{Button},'./Icon':{}});
let t=EmptyState({description:'Chưa có dịch vụ',compact:true,action:'Tạo mới'});assert.equal(t.props.title,'Trống');assert.equal(t.props.icon,'box');assert.equal(t.props.action,'Tạo mới');assert.equal(t.props.compact,true);
t=ErrorState({description:'Mất kết nối',onRetry:()=>{}});assert.equal(t.props.role,'alert');assert.equal(t.props.title,'Lỗi');assert.equal(t.props.action.type,Button);assert.equal(t.props.action.props.loading,false);assert.equal(t.props.action.props.children,'Thử lại');
assert.equal(ErrorState({onRetry:()=>{},action:'Liên hệ'}).props.action,'Liên hệ');assert.equal(ErrorState({}).props.action,undefined);
