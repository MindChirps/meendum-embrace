export type Lang = "en" | "ta";

export const dict = {
  // Common
  appName: { en: "Meendum", ta: "மீண்டும்" },
  english: { en: "English", ta: "ஆங்கிலம்" },
  tamil: { en: "Tamil", ta: "தமிழ்" },

  // Role chooser
  chooseRole: { en: "Who is using this device?", ta: "இந்த கருவியை யார் பயன்படுத்துகிறார்?" },
  iAmGuardian: { en: "I am a Caregiver", ta: "நான் பராமரிப்பாளர்" },
  iAmRecipient: { en: "Begin Recovery", ta: "மீட்சியை தொடங்கு" },

  // Guardian auth
  signUp: { en: "Create caregiver account", ta: "பராமரிப்பாளர் கணக்கை உருவாக்கு" },
  signIn: { en: "Sign in", ta: "உள்நுழை" },
  email: { en: "Email", ta: "மின்னஞ்சல்" },
  password: { en: "Password", ta: "கடவுச்சொல்" },
  yourName: { en: "Your name", ta: "உங்கள் பெயர்" },
  recipientName: { en: "Their name", ta: "அவர்களின் பெயர்" },
  affectedSide: { en: "Affected side", ta: "பாதிக்கப்பட்ட பக்கம்" },
  left: { en: "Left", ta: "இடது" },
  right: { en: "Right", ta: "வலது" },
  alreadyHave: { en: "Already have an account?", ta: "ஏற்கனவே கணக்கு உள்ளதா?" },
  needAccount: { en: "Need an account?", ta: "புதிய கணக்கா?" },

  // Pairing
  pairingCode: { en: "Pairing code", ta: "இணைப்பு குறியீடு" },
  enterCode: { en: "Enter the pairing code shown by your caregiver", ta: "உங்கள் பராமரிப்பாளர் காட்டிய குறியீட்டை உள்ளிடவும்" },
  pair: { en: "Pair this device", ta: "இந்த கருவியை இணை" },
  givePairCode: { en: "Open this device on the survivor's tablet and enter:", ta: "உயிர் பிழைத்தவரின் கருவியில் இதை திறந்து உள்ளிடவும்:" },

  // Recipient screen
  sitStraight: { en: "Sit straight", ta: "நிமிர்ந்து உட்காரவும்" },
  start: { en: "Start", ta: "தொடங்கு" },
  done: { en: "Done", ta: "முடிந்தது" },
  skip: { en: "Skip", ta: "தவிர்க்க" },
  pain: { en: "Pain", ta: "வலி" },
  fatigue: { en: "Fatigue", ta: "சோர்வு" },
  breatheSlow: { en: "Breathe slowly", ta: "மெதுவாக மூச்சு விடுங்கள்" },
  allDone: { en: "Beautiful work today.", ta: "இன்று அழகான முயற்சி." },
  restNow: { en: "Rest now. You earned it.", ta: "ஓய்வெடுங்கள். நீங்கள் தகுதியானவர்." },
  weeklyConsistency: { en: "This week", ta: "இந்த வாரம்" },
  noTasksNow: { en: "Nothing scheduled right now. Rest.", ta: "தற்போது எதுவும் இல்லை. ஓய்வெடுங்கள்." },
  caregiverResting: { en: "Your caregiver is resting", ta: "உங்கள் பராமரிப்பாளர் ஓய்வில்" },
  pleaseWait: { en: "Please wait quietly", ta: "அமைதியாக காத்திருக்கவும்" },

  // Guardian dashboard
  dashboard: { en: "Dashboard", ta: "முகப்பு" },
  morning: { en: "Morning", ta: "காலை" },
  afternoon: { en: "Afternoon", ta: "மதியம்" },
  evening: { en: "Evening", ta: "மாலை" },
  addTask: { en: "Add task", ta: "பணியைச் சேர்" },
  taskName: { en: "Task name (max 20)", ta: "பணி பெயர் (அதிகபட்சம் 20)" },
  reps: { en: "Reps", ta: "மறுபடி" },
  save: { en: "Save", ta: "சேமி" },
  cancel: { en: "Cancel", ta: "ரத்து" },
  delete: { en: "Delete", ta: "நீக்கு" },
  active: { en: "Active", ta: "செயலில்" },
  todayProgress: { en: "Today's progress", ta: "இன்றைய முன்னேற்றம்" },
  iAmResting: { en: "I am resting", ta: "நான் ஓய்வு எடுக்கிறேன்" },
  resumeRecipient: { en: "Resume", ta: "தொடர்" },
  signOut: { en: "Sign out", ta: "வெளியேறு" },
  completed: { en: "Completed", ta: "முடிந்தது" },
  skipped: { en: "Skipped", ta: "தவிர்க்கப்பட்டது" },
  pending: { en: "Pending", ta: "நிலுவையில்" },
  maxTasks: { en: "Max 4 active tasks per session", ta: "ஒரு கால பகுதிக்கு அதிகபட்சம் 4 பணிகள்" },

  // History
  history: { en: "History", ta: "வரலாறு" },
  last7Days: { en: "Last 7 days", ta: "கடந்த 7 நாட்கள்" },
  last30Days: { en: "Last 30 days", ta: "கடந்த 30 நாட்கள்" },
  consistency: { en: "Consistency", ta: "தொடர்ச்சி" },
  painVsFatigue: { en: "Pain vs fatigue", ta: "வலி / சோர்வு" },
  perTaskAdherence: { en: "By task", ta: "பணி வாரியாக" },
  noActivityPeriod: { en: "No activity yet for this period.", ta: "இந்த காலத்தில் இதுவரை செயல்பாடு இல்லை." },
} as const;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: Lang): string {
  return dict[key][lang];
}
