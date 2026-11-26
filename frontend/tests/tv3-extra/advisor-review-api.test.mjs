import assert from 'node:assert/strict';
import {load,plain} from './loader.mjs';
const calls=[]; const {advisorReviewApi:api}=load('src/services/advisorReviewApi.ts',{'./api':{fetchApi:async (...args)=>{calls.push(args);}}});
const signal=new AbortController().signal;
await api.list({page:2,search:'ô tô & xe',empty:'',missing:undefined},signal);
const url=new URL(calls[0][0],'https://example.test');
assert.equal(url.pathname,'/advisor/reviews'); assert.equal(url.searchParams.get('search'),'ô tô & xe'); assert.equal(url.searchParams.get('page'),'2'); assert.equal(url.searchParams.has('empty'),false); assert.equal(url.searchParams.has('missing'),false); assert.equal(calls[0][1].signal,signal);
await api.reply(9,'Cảm ơn'); await api.editReply(9,'Cảm ơn bạn','Cảm ơn');
assert.deepEqual(plain(calls.slice(1)),[['/advisor/reviews/9/reply',{method:'POST',body:JSON.stringify({reply:'Cảm ơn'})}],['/advisor/reviews/9/reply',{method:'PUT',body:JSON.stringify({reply:'Cảm ơn bạn',expected_reply:'Cảm ơn'})}]]);
