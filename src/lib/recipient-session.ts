// Local-only "session" for the recipient: a pairing code stored in localStorage.
// The recipient is NOT a Supabase auth user.
const KEY = "recipient_session_v1";

export type RecipientSession = { recipientId: string; pairingCode: string };

export function getRecipientSession(): RecipientSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj?.pairingCode || !obj?.recipientId) return null;
    return obj as RecipientSession;
  } catch {
    return null;
  }
}

export function setRecipientSession(s: RecipientSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearRecipientSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
