import assert from 'node:assert/strict';
import {component} from './component-harness.mjs';
const {RatingInput}=component('src/components/ui/Rating.tsx',{react:{useState:x=>[x,()=>{}]}});
const changes=[],focused=[];let prevented=0;
const currentTarget={querySelectorAll:()=>Array.from({length:5},(_,i)=>({focus:()=>focused.push(i+1)}))};
const key=(value,key)=>RatingInput({value,label:'Rating',onChange:x=>changes.push(x)}).props.onKeyDown({key,currentTarget,preventDefault:()=>prevented++});
key(3,'ArrowRight');key(4,'ArrowDown');key(5,'ArrowRight');key(1,'ArrowLeft');key(2,'Tab');assert.deepEqual(changes,[4,3,5,1]);assert.deepEqual(focused,changes);assert.equal(prevented,4);
