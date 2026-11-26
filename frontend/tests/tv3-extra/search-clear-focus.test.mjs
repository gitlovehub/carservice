import assert from 'node:assert/strict';
import {component,nodes} from './component-harness.mjs';
let focused=0;const changes=[];const ref={current:{focus:()=>focused++}};
const {SearchInput}=component('src/components/ui/Field.tsx',{react:{forwardRef:f=>f,useRef:()=>ref},'../../config/labels':{LABELS:{action:{search:'Search'}}},'./Icon':{},'./fieldContext':{},'./focusInvalid':{},'./formValidation':{}});
const tree=SearchInput({value:'abc',onChange:v=>changes.push(v)});
assert.equal(nodes(tree,n=>n.type==='input')[0].props.ref,ref);
nodes(tree,n=>n.type==='button')[0].props.onClick();assert.deepEqual(changes,['']);assert.equal(focused,1);
