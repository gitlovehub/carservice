import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiErrorKind, apiErrorMessage, isTechnicalMessage, userErrorMessage } from '../../src/services/apiError.ts';
test('maps HTTP statuses to error categories', () => {
  for (const [status, kind] of [[401,'unauthenticated'],[403,'forbidden'],[404,'not_found'],[409,'conflict'],[422,'validation'],[429,'rate_limited'],[500,'server'],[502,'unavailable'],[503,'unavailable'],[504,'unavailable'],[400,'request']]) assert.equal(apiErrorKind(status),kind);
});
test('classifies canceled and timed out requests', () => {
  assert.equal(apiErrorKind(0,'ERR_CANCELED'),'canceled');
  assert.equal(apiErrorKind(0,'ECONNABORTED'),'timeout');
  assert.equal(apiErrorKind(0,'ETIMEDOUT'),'timeout');
});
test('does not expose technical errors to users', () => {
  for (const raw of ['SQLSTATE[23000]', 'stack trace', 'The email field is required.']) {
    assert.equal(isTechnicalMessage(raw),true);
    assert.notEqual(apiErrorMessage('validation',{message:raw}),raw);
    assert.equal(userErrorMessage(new Error(raw),'fallback'),'fallback');
  }
});
test('preserves business validation and hides server internals', () => {
  assert.equal(apiErrorMessage('validation',{errors:{email:['Email đã tồn tại']},message:'Other'}),'Email đã tồn tại');
  const result = apiErrorMessage('server',{message:'SQLSTATE[23000]',reference:'REF-123'});
  assert.ok(result.includes('REF-123')); assert.ok(!result.includes('SQLSTATE'));
  assert.equal(userErrorMessage(null,'fallback'),'fallback');
});
