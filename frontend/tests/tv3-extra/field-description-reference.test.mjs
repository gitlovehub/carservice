import assert from 'node:assert/strict';
import {component,nodes} from './component-harness.mjs';
const {Field}=component('src/components/ui/Field.tsx',{react:{forwardRef:f=>f,useId:()=> 'f',useState:x=>[x,()=>{}]},'../../config/labels':{LABELS:{form:{}}},'./Icon':{},'./fieldContext':{FieldContext:{Provider:()=>null}},'./focusInvalid':{},'./formValidation':{}});
for(const [error,expected] of [['Invalid','f-error'],[' ','f-hint'],[undefined,'f-hint']]){const t=Field({label:'Email',hint:'Hint',error});assert.equal(t.props.value['aria-describedby'],expected);assert.equal(nodes(t,n=>n.props?.id===expected).length,1);}
