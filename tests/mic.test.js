import { test } from 'vitest';
import assert from 'node:assert/strict';
import { levelFromSamples, micErrorText, micVerdict } from '../src/lib/mic.js';

test('silence reads as zero and full volume as one', () => {
  assert.equal(levelFromSamples(new Float32Array(128)), 0);
  assert.equal(levelFromSamples(new Float32Array(128).fill(1)), 1);
  assert.equal(levelFromSamples(new Float32Array(0)), 0);
});

test('louder sound always reads higher', () => {
  const quiet = levelFromSamples(new Float32Array(128).fill(0.01));
  const loud = levelFromSamples(new Float32Array(128).fill(0.2));
  assert.ok(quiet > 0 && quiet < loud && loud < 1);
});

test('the verdict moves from silent through good to too loud', () => {
  assert.deepEqual([0, 0.3, 0.7, 0.99].map((peak) => micVerdict(peak).key), ['silent', 'quiet', 'good', 'loud']);
});

test('mic errors explain what to do', () => {
  assert.match(micErrorText({ name: 'NotAllowedError' }), /Allow the microphone/);
  assert.match(micErrorText({ name: 'NotFoundError' }), /No microphone/);
  assert.match(micErrorText(new Error('anything')), /couldn't be opened/);
});
