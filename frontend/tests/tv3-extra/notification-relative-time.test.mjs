import assert from 'node:assert/strict';
import {component} from './component-harness.mjs';
const {relativeTime}=component('src/pages/showcase/CustomerNotificationBell.tsx',{'../../services/customerApi':{},react:{},'../../services/liveSync':{},'react-router-dom':{},'../../components/ui/Icon':{},'../../services/customerNotifications':{},'../../services/apiError':{}});
const now=Date.parse('2026-11-26T12:00:00Z'); const ago=seconds=>new Date(now-seconds*1000).toISOString();
for(const [seconds,label] of [[59,'Vừa xong'],[60,'1 phút trước'],[3599,'59 phút trước'],[3600,'1 giờ trước'],[86399,'23 giờ trước'],[86400,'Hôm qua'],[172800,'2 ngày trước']]) assert.equal(relativeTime(ago(seconds),now),label);
assert.equal(relativeTime('invalid',now),''); assert.equal(relativeTime(null,now),'');
