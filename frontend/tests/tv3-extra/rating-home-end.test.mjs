import assert from 'node:assert/strict';
import {component} from './component-harness.mjs';
const {RatingInput}=component('src/components/ui/Rating.tsx',{react:{useState:x=>[x,()=>{}]}});
const changes=[],focused=[];let prevented=0;
const currentTarget={querySelectorAll:()=>Array.from({length:5},(_,i)=>({focus:()=>focused.push(i+1)}))};
const key=(value,key)=>RatingInput({value,label:'Rating',onChange:x=>changes.push(x)}).props.onKeyDown({key,currentTarget,preventDefault:()=>prevented++});
key(3,'Home');key(1,'End');assert.deepEqual(changes,[1,5]);assert.deepEqual(focused,[1,5]);assert.equal(prevented,2);
