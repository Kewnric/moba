// Backup files: naming, writing and safely reading them back. Plain functions shared by the app and tests.
import { buildExport, normalizeImport } from './saveData.js';

// A full backup (every jungler rated against every hero with notes, plus 500 games) is about 1.5 MB, so a
// file much bigger than this isn't a JunglerOS backup and isn't read at all.
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

const pad = (value) => String(value).padStart(2, '0');

// Local date and time down to the minute, so repeated exports don't pile up as "(1)", "(2)" copies.
export const backupFileName = (now = new Date()) =>
  `jungleros_backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`;

// Compact JSON with no indentation, which keeps the file small and quick to save.
export const serializeBackup = (data, history) => JSON.stringify(buildExport(data, history));

const describeSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const looksLikeJson = (file) => /\.json$/i.test(file.name) || file.type === 'application/json';

// Checks the chosen file's type and size before reading it, then parses it as a JunglerOS backup.
// Every error message can be shown to the player as is.
export async function readBackupFile(file, { maxBytes = BACKUP_MAX_BYTES } = {}) {
  if (!file) throw new Error('No file was chosen, so nothing was restored.');
  if (!looksLikeJson(file)) throw new Error('Choose a JunglerOS backup file ending in .json. Nothing was restored.');
  if (file.size === 0) throw new Error('That file is empty, so nothing was restored.');
  if (file.size > maxBytes) {
    throw new Error(`That file is ${describeSize(file.size)}, too large to be a JunglerOS backup (they stay under ${describeSize(maxBytes)}). Nothing was restored.`);
  }

  let text;
  try {
    text = await file.text();
  } catch (error) {
    throw new Error("That file couldn't be read, so nothing was restored. Try choosing it again.");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("That file isn't valid JSON, so nothing was restored.");
  }

  try {
    return { ...normalizeImport(parsed), fileName: file.name };
  } catch (error) {
    throw new Error(`${error.message} Nothing was restored.`);
  }
}
