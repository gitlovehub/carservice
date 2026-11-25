import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mount} from './form-harness.mjs';
const render=password=>mount('src/components/auth/PasswordStrengthIndicator.tsx',{props:{password}});
test('empty password hides strength indicator',()=>assert.equal(render('').render(),null));
test('indicator evaluates each requirement and strength level',()=>{for(const [password,count,label] of [['!',0,'Rất yếu'],['a',1,'Yếu'],['aA',2,'Trung bình'],['aA1',3,'Khá tốt'],['Password1',4,'Rất mạnh']]){const h=render(password);assert.equal(h.all(n=>n.props.children==='✓').length,count);assert.ok(h.all(n=>n.props.children===label).length);}});
