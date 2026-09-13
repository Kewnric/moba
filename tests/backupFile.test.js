import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BACKUP_MAX_BYTES, backupFileName, readBackupFile, serializeBackup } from '../src/lib/backupFile.js';

const saved = { version: 2, junglers: ['ling'], matchups: { ling: { tigreal: { tier: 'S', comment: 'Wait for his ult' } } }, comfort: { ling: 5 } };
const game = { id: 'g1', playedAt: '2026-09-13T10:00:00.000Z', result: 'win', playedId: 'ling', topPickId: null, draft: { ally: ['ling'], enemy: ['tigreal'] } };
const jsonFile = (text, name = 'backup.json', type = 'application/json') => new File([text], name, { type });

test('backupFileName uses the local date and time so each export gets its own name', () => {
  assert.equal(backupFileName(new Date(2026, 8, 13, 20, 4)), 'jungleros_backup_2026-09-13_2004.json');
});

test('serializeBackup writes compact JSON without indentation', () => {
  const text = serializeBackup(saved, [game]);
  assert.equal(text.includes('\n'), false);
  assert.equal(JSON.parse(text).app, 'JunglerOS');
});

test('a serialized backup reads back with its ratings, comfort and games', async () => {
  const imported = await readBackupFile(jsonFile(serializeBackup(saved, [game]), 'jungleros_backup.json'));
  assert.deepEqual(imported.data.matchups, saved.matchups);
  assert.deepEqual(imported.data.comfort, { ling: 5 });
  assert.deepEqual(imported.history, [game]);
  assert.equal(imported.fileName, 'jungleros_backup.json');
});

test('readBackupFile accepts .json files whatever the reported type or letter case', async () => {
  const text = serializeBackup(saved, []);
  assert.equal((await readBackupFile(jsonFile(text, 'BACKUP.JSON', ''))).data.junglers[0], 'ling');
  assert.equal((await readBackupFile(jsonFile(text, 'backup', 'application/json'))).data.junglers[0], 'ling');
});

test('readBackupFile rejects files that are not .json before reading them', async () => {
  await assert.rejects(readBackupFile(jsonFile('not json', 'photo.png', 'image/png')), /\.json/);
});

test('readBackupFile rejects an empty file', async () => {
  await assert.rejects(readBackupFile(jsonFile('')), /empty/);
});

test('readBackupFile rejects a file too large to be a backup', async () => {
  await assert.rejects(readBackupFile(jsonFile('x'.repeat(2048)), { maxBytes: 1024 }), /too large/);
  assert.ok(BACKUP_MAX_BYTES >= 1024 * 1024);
});

test('readBackupFile explains invalid JSON and files that are not backups', async () => {
  await assert.rejects(readBackupFile(jsonFile('{broken')), /isn't valid JSON/);
  await assert.rejects(readBackupFile(jsonFile('{"hello":"world"}')), /not a JunglerOS backup/);
});
