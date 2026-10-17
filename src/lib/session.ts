export const SESSION_KEY = "kurio.session";
export const SESSION_EVENT = "kurio:session-change";

export type KurioSession = {
  user: { id: string; name: string; email: string; avatar?: string };
  token: string;
  expiresAt: string;
};

export function getSession(): KurioSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const session = raw ? (JSON.parse(raw) as KurioSession) : null;
    if (session && new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSession(session: KurioSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}
