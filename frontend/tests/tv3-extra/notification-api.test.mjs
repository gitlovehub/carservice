import assert from 'node:assert/strict';
import {load,plain} from './loader.mjs';
const calls=[]; let response={data:[{id:5}],unread_count:'2'};
const api=load('src/services/customerNotifications.ts',{'./api':{fetchApi:async (...args)=>{calls.push(args);return response;}}});
assert.deepEqual(plain(await api.getCustomerNotifications(50)),{items:[{id:5}],unreadCount:2});
response=null; assert.deepEqual(plain(await api.getCustomerNotifications()),{items:[],unreadCount:0});
await api.readCustomerNotification(5); await api.readAllCustomerNotifications(); await api.clearCustomerNotifications();
assert.deepEqual(plain(calls),[['/me/notifications?limit=50'],['/me/notifications'],['/me/notifications/5/read',{method:'PATCH'}],['/me/notifications/read-all',{method:'PATCH'}],['/me/notifications',{method:'DELETE'}]]);
