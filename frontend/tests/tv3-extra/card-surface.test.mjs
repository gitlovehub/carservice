import assert from 'node:assert/strict';
import {component} from './component-harness.mjs';
const {Card}=component('src/components/ui/Card.tsx');
const child={type:'p',props:{children:'Dữ liệu'}};
const t=Card({children:child,className:'custom-card'});
assert.equal(t.type,'section');assert.equal(t.props.children,child);
for(const token of ['cs-card','rounded-card','border-cs-border','bg-cs-surface','p-card','shadow-card','custom-card']) assert.ok(t.props.className.split(/\s+/).includes(token));
assert.ok(!Card({children:child}).props.className.includes('undefined'));
