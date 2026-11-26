import assert from 'node:assert/strict';
import {load} from './loader.mjs';
const frames=new Map();let seq=0;const focused=[];const scrolls=[];
const rect={top:100,bottom:140,left:20,right:120,width:100,height:40};
function field(name,visible=true){return {parentElement:null,getClientRects:()=>visible?[rect]:[],closest:()=>null,getBoundingClientRect:()=>rect,matches:()=>true,focus:o=>focused.push([name,o.preventScroll])};}
const hidden=field('hidden',false),first=field('first'),second=field('second');
const dialog={querySelectorAll:()=>[hidden,first,second]};const body={};
const document={body,querySelectorAll:selector=>selector.includes('dialog')?[dialog]:[],elementFromPoint:()=>null};
const {focusFirstInvalid}=load('src/components/ui/focusInvalid.ts',{}, {document,window:{innerWidth:800,innerHeight:600,matchMedia:()=>({matches:true}),scrollBy:x=>scrolls.push(x)},Node:class{},requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq;},cancelAnimationFrame:id=>frames.delete(id)});
function flush(){while(frames.size){const [id,fn]=frames.entries().next().value;frames.delete(id);fn();}}
focusFirstInvalid();flush();assert.deepEqual(focused,[['first',true]]);assert.deepEqual(scrolls,[]);
focusFirstInvalid({querySelectorAll:()=>[second]});flush();assert.deepEqual(focused.at(-1),['second',true]);
focusFirstInvalid({querySelectorAll:()=>[]});flush();assert.equal(focused.length,2);
