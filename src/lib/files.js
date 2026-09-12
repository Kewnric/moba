import { STORAGE_KEYS } from './storage.js';

export const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 100; canvas.height = 100;
            ctx.drawImage(img, 0, 0, 100, 100);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
    };
};

export const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
};

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
    downloadJson(raw, `jungleros_raw_saves_${new Date().toISOString().slice(0, 10)}.json`);
};
