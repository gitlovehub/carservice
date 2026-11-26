import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load,plain} from './loader.mjs';
const m=load('src/layouts/customerAccountNav.ts',{});
const links=m.CUSTOMER_ACCOUNT_LINKS;
assert.equal(new Set(links.map(x=>x.to)).size,links.length);
for(const link of links){assert.equal(m.isAccountLinkActive(link,link.to),true);assert.equal(m.isAccountLinkActive(link,link.to+'/manage'),true);assert.equal(m.isAccountLinkActive(link,link.to+'-other'),false);}
assert.ok(m.AVATAR_MENU_LINKS.every(x=>links.includes(x)));
console.log('PASS account-navigation');
