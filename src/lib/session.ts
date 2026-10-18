const KEY = 'sensibull-session';

export type Session = { name: string; email: string };

const DEMO_ACCOUNT = { name: 'Harshit Chand', email: 'harshitchand@gmail.com', password: 'harshitH1@' };

export const HOME_AFTER_LOGIN = '/home';

export function checkLogin(email: string, password: string): Session | null {
	if (email.trim().toLowerCase() !== DEMO_ACCOUNT.email || password !== DEMO_ACCOUNT.password) return null;
	return { name: DEMO_ACCOUNT.name, email: DEMO_ACCOUNT.email };
}

export function readSession(): Session | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as Session) : null;
	} catch {
		return null;
	}
}

export function writeSession(session: Session | null) {
	if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
	else window.localStorage.removeItem(KEY);
	window.dispatchEvent(new Event('sensibull-session'));
}
