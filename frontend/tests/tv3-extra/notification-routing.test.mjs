import assert from 'node:assert/strict';
import {load} from './loader.mjs';
const {notificationTarget,notificationGroup}=load('src/services/customerNotifications.ts',{'./api':{}});
for (const [type,group,to] of [
 ['QUOTATION_SENT','quotation','/quotation?order=42'],
 ['INVOICE_ISSUED','billing','/invoices?order=42'],
 ['PAYMENT_RECEIVED','billing','/invoices?order=42'],
 ['HANDOVER_SUBMITTED','repair','/repair-status?orderId=42#bien-ban'],
 ['REVIEW_INVITE','review','/customer/service-history?review=42'],
 ['WAITING_FOR_PARTS','repair','/repair-status?orderId=42']]) {
 const item={type,repair_order_id:42,appointment_id:7}; assert.equal(notificationGroup(item),group); assert.equal(notificationTarget(item).to,to);
}
assert.equal(notificationTarget({type:'APPOINTMENT_CREATED',appointment_id:7}).to,'/customer/appointments?appointment=7');
assert.equal(notificationTarget({type:'UNKNOWN'}).to,'/customer/appointments');
