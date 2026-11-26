import assert from 'node:assert/strict';
import {load} from './loader.mjs';
function setup(saved,blocked=false) {
 let state; const writes=[];
 const {useReviewView}=load('src/pages/admin/reviews/useReviewView.ts',{react:{useState:init=>{if(state===undefined)state=init();return [state,next=>{state=next;}];}}},{localStorage:{getItem:()=>{if(blocked)throw Error('blocked');return saved;},setItem:(...args)=>{if(blocked)throw Error('blocked');writes.push(args);}}});
 return {render:()=>useReviewView('reviews-admin'),writes};
}
const a=setup('list'); assert.equal(a.render()[0],'list'); a.render()[1]('grid'); assert.equal(a.render()[0],'grid'); assert.deepEqual(a.writes,[['reviews-admin','grid']]);
assert.equal(setup('invalid').render()[0],'grid');
const b=setup(null,true); assert.equal(b.render()[0],'grid'); b.render()[1]('list'); assert.equal(b.render()[0],'list');
