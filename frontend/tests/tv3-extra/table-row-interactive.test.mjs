import assert from 'node:assert/strict';
import {component,nodes} from './component-harness.mjs';
const {DataTable}=component('src/components/ui/DataTable.tsx',{'../../config/labels':{LABELS:{table:{actions:'Actions'}}},'./States':{},'./SortHeader':{},'./tableSort':{ariaSort:()=>undefined}});
let calls=0;const tree=DataTable({columns:[{key:'name',header:'Name',render:r=>r.name}],rows:[{name:'A'}],rowKey:r=>r.name,caption:'Rows',onRowClick:()=>calls++});
const rows=nodes(tree,n=>(n.type==='tr'||n.type==='li')&&n.props.onClick);
assert.equal(rows.length,2);
for(const row of rows){row.props.onClick({target:{closest:()=>({})}});row.props.onClick({target:{closest:()=>null}});}
assert.equal(calls,2);
