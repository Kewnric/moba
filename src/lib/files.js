import { STORAGE_KEYS } from './saveData.js';

// How long a download link stays valid. Revoking it right after the click can make some browsers save
// an empty or failed file, so it's released later instead.
const DOWNLOAD_LINK_LIFETIME_MS = 60_000;

// Saves text as a file through the browser's normal download, without opening any extra windows.
export function downloadFile(text, filename, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_LINK_LIFETIME_MS);
}

// Copies every saved JunglerOS key exactly as stored, including unreadable backups.
export const exportRawSaves = () => {
    const raw = {};
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            [key, `${key}_corrupt_backup`].forEach(storedKey => {
                const value = window.localStorage.getItem(storedKey);
                if (value !== null) raw[storedKey] = value;
            });
        });
    } catch (error) {
        raw.error = `Browser storage could not be read: ${error.message}`;
    }
    downloadFile(JSON.stringify(raw), `jungleros_raw_saves_${new Date().toISOString().slice(0, 10)}.json`);
};
