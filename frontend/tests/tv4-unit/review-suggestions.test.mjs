import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeComment, buildSuggestions, serviceNamesOf } from '../../src/pages/customer/reviewSuggestions.ts';
test('combines selected comments and trimmed free text', () => {
  assert.equal(composeComment(['Good','Fast'], '  Thanks  '), 'Good. Fast. Thanks');
  assert.equal(composeComment([], '   '), '');
  assert.equal(composeComment([], ' Good '), 'Good');
  assert.equal(composeComment(['Good'], ''), 'Good');
});
test('service names are trimmed, deduplicated and exclude invoice parts', () => {
  assert.deepEqual(serviceNamesOf({appointment:{packages:[{name:' Oil '}],services:[{name:'Oil'}]},work_items:[{description:'Brake'}],invoice:{items:[{item_type:'PART',description:'Filter'},{item_type:'SERVICE',description:'Wash'}]}}), ['Oil','Brake','Wash']);
  assert.deepEqual(serviceNamesOf({}), []);
});
test('rating selects positive or negative service suggestions', () => {
  assert.ok(buildSuggestions(['THAY DẦU'],4).includes('Thay dầu nhanh, đúng loại'));
  assert.ok(buildSuggestions(['thay dầu'],3).includes('Thay dầu chưa đúng như tư vấn'));
});
test('suggestions are unique and limited to six', () => {
  const result = buildSuggestions(['dầu phanh điều hòa lốp ắc quy'],5);
  assert.equal(result.length,6); assert.equal(new Set(result).size, result.length);
  assert.equal(buildSuggestions([],5).length,4);
});
