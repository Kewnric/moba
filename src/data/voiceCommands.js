// The voice commands, shown in Settings and from the voice bar.
export const VOICE_COMMANDS = [
  { say: 'Lancelot, or "they picked Lancelot"', does: 'Fills the next slot' },
  { say: 'Lancelot and Ling', does: 'Fills two slots' },
  { say: 'Ban Lancelot', does: 'Fills the next ban' },
  { say: 'Undo', does: 'Takes back the last change' },
  { say: 'Erase, or "remove last"', does: 'Removes the last hero added' },
  { say: 'Remove Ling', does: 'Removes that hero' },
  { say: 'Lancelot is their jungler', does: 'Marks them JG' },
  { say: 'Lock in, or "lock in Ling"', does: 'Opens the game plan' },
  { say: 'Unlock', does: 'Goes back to choosing' },
  { say: 'New draft', does: 'Starts a fresh draft' },
  { say: 'Stop listening', does: 'Turns voice off' },
];

export const VOICE_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-PH', label: 'English (Philippines)' },
  { value: 'en-SG', label: 'English (Singapore)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'fil-PH', label: 'Filipino' },
  { value: 'ms-MY', label: 'Malay' },
  { value: 'id-ID', label: 'Indonesian' },
];
