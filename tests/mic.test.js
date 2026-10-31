import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { acquireMic, levelFromSamples, micErrorText, micVerdict, releaseMic } from '../src/lib/mic.js';

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

const fakeMic = () => {
  const stops = [];
  const getUserMedia = vi.fn(async () => {
    const track = { stop: () => stops.push('stopped') };
    return { getTracks: () => [track] };
  });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  return { getUserMedia, stops };
};

test('everything sharing a mic asks for it only once, and it closes after the last one lets go', async () => {
  const { getUserMedia, stops } = fakeMic();
  const first = await acquireMic('headset');
  const second = await acquireMic('headset');
  assert.equal(first, second);
  assert.equal(getUserMedia.mock.calls.length, 1);
  releaseMic('headset');
  await Promise.resolve();
  assert.deepEqual(stops, []);
  releaseMic('headset');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(stops, ['stopped']);
  vi.unstubAllGlobals();
});

test('different mics open separately, and a failed open can be tried again', async () => {
  const { getUserMedia } = fakeMic();
  await acquireMic('a');
  await acquireMic('b');
  assert.equal(getUserMedia.mock.calls.length, 2);
  releaseMic('a');
  releaseMic('b');
  getUserMedia.mockRejectedValueOnce(new Error('blocked'));
  await assert.rejects(acquireMic('c'));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await acquireMic('c');
  releaseMic('c');
  assert.equal(getUserMedia.mock.calls.length, 4);
  vi.unstubAllGlobals();
});
