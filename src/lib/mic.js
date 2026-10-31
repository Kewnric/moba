// Mic level maths for the mic tester. Plain functions so they can be tested without a microphone.
const FLOOR_DB = -60;

// Loudness of a batch of audio samples on a 0 to 1 scale, where 0 is -60 dB or quieter and 1 is full volume.
export function levelFromSamples(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  const rms = Math.sqrt(sum / samples.length);
  if (rms <= 0) return 0;
  const db = 20 * Math.log10(rms);
  return Math.max(0, Math.min(1, (db - FLOOR_DB) / -FLOOR_DB));
}

// What the loudest moment of the last few seconds says about the mic.
export function micVerdict(peak) {
  if (peak < 0.15) return { key: 'silent', label: 'No sound yet', hint: "Talk now. If this stays flat, pick another mic or check that it isn't muted." };
  if (peak < 0.45) return { key: 'quiet', label: 'Very quiet', hint: 'It can hear you, but voice commands may miss words. Move closer or raise the mic volume.' };
  if (peak <= 0.95) return { key: 'good', label: 'Good level', hint: 'Your voice is coming through clearly.' };
  return { key: 'loud', label: 'Too loud', hint: 'Move back a little or lower the mic volume.' };
}

const ERROR_TEXT = {
  NotAllowedError: "Mic access is blocked. Allow the microphone for this site in your browser's settings, then try again.",
  SecurityError: "Mic access is blocked. Allow the microphone for this site in your browser's settings, then try again.",
  NotFoundError: 'No microphone was found. Plug one in, then try again.',
  NotReadableError: "The mic couldn't be opened. Another app may be using it.",
  OverconstrainedError: "That mic isn't available any more. Pick another one.",
};

export const micErrorText = (error) => ERROR_TEXT[error && error.name] || "The mic couldn't be opened. Check that it's connected, then try again.";

// One open mic per device, shared by everything that needs it. Each separate open can make the browser ask for
// permission again, and on a page opened as a local file it never remembers the answer.
const openMics = new Map();

export function acquireMic(deviceId = '') {
  let mic = openMics.get(deviceId);
  if (!mic) {
    mic = { users: 0, opening: navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId } } : true }) };
    openMics.set(deviceId, mic);
    mic.opening.catch(() => { if (openMics.get(deviceId) === mic) openMics.delete(deviceId); });
  }
  mic.users += 1;
  return mic.opening;
}

export function releaseMic(deviceId = '') {
  const mic = openMics.get(deviceId);
  if (!mic) return;
  mic.users -= 1;
  if (mic.users > 0) return;
  openMics.delete(deviceId);
  mic.opening.then((stream) => stream.getTracks().forEach((track) => track.stop())).catch(() => {});
}
