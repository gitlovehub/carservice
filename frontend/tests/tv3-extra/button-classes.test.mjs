import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load,plain} from './loader.mjs';
const m=load('src/components/ui/buttonClass.ts',{});
assert.equal(m.buttonClass(), 'cs-btn cs-btn-secondary');
assert.equal(m.buttonClass({variant:'primary',size:'lg',block:true}), 'cs-btn cs-btn-primary cs-btn-lg cs-btn-block');
assert.equal(m.buttonClass({variant:'ghost',iconOnly:true,tone:'danger',className:'extra'}), 'cs-btn cs-btn-ghost cs-btn-icon cs-btn-tone-danger extra');
console.log('PASS button-classes');
