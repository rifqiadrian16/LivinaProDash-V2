export interface AlarmSoundOption {
  id: string;
  name: string;
  source: any;
}

// Taruh file-file ini di assets/sounds/, lalu daftarkan di sini.
// Menambah preset baru TIDAK perlu rebuild, cukup restart Metro (--clear).
export const ALARM_SOUND_PRESETS: AlarmSoundOption[] = [
  {
    id: "beep_classic",
    name: "Beep Klasik",
    source: require("../assets/sounds/Beep.mp3"),
  },
  {
    id: "beep_electric",
    name: "Beep Elektrik",
    source: require("../assets/sounds/Beep Electric.mp3"),
  },
  {
    id: "warn",
    name: "Warning",
    source: require("../assets/sounds/Warning.mp3"),
  },
];

export const CUSTOM_SOUND_ID = "custom";
