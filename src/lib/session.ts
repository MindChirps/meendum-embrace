export type SessionType = "morning" | "afternoon" | "evening";

export function currentSession(date = new Date()): SessionType | null {
  const h = date.getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return null;
}
