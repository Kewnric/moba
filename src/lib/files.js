import { STORAGE_KEYS } from './saveData.js';

// Crops the middle square of an image and shrinks it to size × size, so portraits keep their proportions.
export const compressImage = (file, callback, size = 128) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const side = Math.min(img.width, img.height);
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
            callback(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
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
