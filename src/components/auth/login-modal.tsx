import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Activity, ChevronRight, ShieldCheck, X } from 'lucide-react';
import { checkLogin, HOME_AFTER_LOGIN, readSession, writeSession } from '@/lib/session';

const BROKERS = [
	{ id: 'zerodha', name: 'Zerodha', mark: 'Z', tone: '#f6461a' },
	{ id: 'angel', name: 'Angel One', mark: 'A', tone: '#11af4b' },
	{ id: 'upstox', name: 'Upstox', mark: 'U', tone: '#5a298b' },
	{ id: 'icici', name: 'ICICI Direct', mark: 'I', tone: '#b02a30' },
] as const;

export const OPEN_LOGIN_EVENT = 'sensibull-open-login';

export function LoginModal() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const handler = () => setOpen(true);
		window.addEventListener(OPEN_LOGIN_EVENT, handler);
		return () => window.removeEventListener(OPEN_LOGIN_EVENT, handler);
	}, []);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [open]);

	if (!open) return null;

	return (
		<div className="login-modal-overlay" role="dialog" aria-modal="true" aria-label="Free Login">
			<button className="login-modal-backdrop" aria-label="Close login" onClick={() => setOpen(false)} />
			<div className="login-modal">
				<button className="login-modal-close" aria-label="Close" type="button" onClick={() => setOpen(false)}>
					<X size={20} />
				</button>
				<LoginModalBody onDone={() => setOpen(false)} />
			</div>
		</div>
	);
}

function LoginModalBody({ onDone }: { onDone: () => void }) {
	const navigate = useNavigate();
	const location = useLocation();
	const [mode, setMode] = useState<'login' | 'signup'>('login');
	const [broker, setBroker] = useState<(typeof BROKERS)[number] | null>(null);
	const [error, setError] = useState('');
	const [safeOpen, setSafeOpen] = useState(false);
	const [done, setDone] = useState('');

	useEffect(() => {
		const existing = readSession();
		if (existing) setDone(existing.name);
	}, []);

	if (done) {
		return (
			<div className="login-modal-card login-modal-card--solo">
				<span className="brand">
					<span className="brand-symbol">
						<Activity size={17} />
					</span>
					SENSIBULL
				</span>
				<h1>You’re in, {done.split(' ')[0]}.</h1>
				<p>This free login stays on this browser. Strategy tools are ready whenever you are.</p>
				<div className="auth-actions">
					<Link className="primary-button" to={HOME_AFTER_LOGIN} onClick={onDone}>
						Go to Home
					</Link>
					<button
						className="outline-button"
						type="button"
						onClick={() => {
							writeSession(null);
							setDone('');
						}}
					>
						Log out
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="login-modal-card">
			<h1>Free Login</h1>
			<p className="free-login-sub">
				{broker ? `Continue with ${broker.name}, or use email.` : 'Use email, or pick a broker. No charge for this login.'}
			</p>
			<div className="auth-switch" role="tablist">
				<button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>
					Login
				</button>
				<button type="button" className={mode === 'signup' ? 'selected' : ''} onClick={() => setMode('signup')}>
					Sign up
				</button>
			</div>
			<form
				className="auth-form"
				onSubmit={(event) => {
					event.preventDefault();
					const data = new FormData(event.currentTarget);
					const email = String(data.get('email') ?? '').trim().toLowerCase();
					const password = String(data.get('password') ?? '');
					const name = String(data.get('name') ?? '').trim();
					const accounts = readAccounts();
					if (mode === 'signup') {
						if (password.length < 6) {
							setError('Use at least 6 characters for the password.');
							return;
						}
						if (accounts[email]) {
							setError('That email already has an account. Log in instead.');
							return;
						}
						accounts[email] = { name: name || email.split('@')[0], password };
						window.localStorage.setItem('sensibull-accounts', JSON.stringify(accounts));
						writeSession({ name: accounts[email].name, email });
						setDone(accounts[email].name);
						return;
					}
					const session = checkLogin(email, password);
					if (!session) {
						setError('Email or password doesn’t match.');
						return;
					}
					writeSession(session);
					onDone();
					if (location.pathname === '/') navigate(HOME_AFTER_LOGIN);
				}}
			>
				{mode === 'signup' ? (
					<label>
						Name
						<input name="name" autoComplete="name" placeholder="Your name" required />
					</label>
				) : null}
				<label>
					Email
					<input name="email" type="email" autoComplete="email" placeholder="you@email.com" required />
				</label>
				<label>
					Password
					<input
						name="password"
						type="password"
						autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
						placeholder="••••••••"
						required
					/>
				</label>
				{error ? <p className="form-error">{error}</p> : null}
				<button className="primary-button" type="submit">
					{mode === 'login' ? 'Free Login' : 'Create free account'}
				</button>
			</form>

			<p className="or-login">Or login with</p>
			<button
				type="button"
				className={`broker-btn broker-btn--hero${broker?.id === 'zerodha' ? ' selected' : ''}`}
				onClick={() => setBroker(BROKERS[0])}
			>
				<span className="broker-mark" style={{ background: '#f6461a' }}>
					Z
				</span>
				Login with Zerodha
			</button>
			<p className="open-now">
				Don’t have a Zerodha account?{' '}
				<a href="https://zerodha.com/open-account/" target="_blank" rel="noreferrer">
					Open Now
				</a>
			</p>
			<div className="broker-row">
				{BROKERS.slice(1).map((item) => (
					<button
						key={item.id}
						type="button"
						className={`broker-btn${broker?.id === item.id ? ' selected' : ''}`}
						onClick={() => setBroker(item)}
					>
						<span className="broker-mark" style={{ background: item.tone }}>
							{item.mark}
						</span>
						{item.name}
					</button>
				))}
			</div>
			<button type="button" className="safe-link" onClick={() => setSafeOpen(!safeOpen)}>
				<ShieldCheck size={16} />
				Is it safe to login with my broker?
			</button>
			{safeOpen ? (
				<p className="safe-note">
					Broker login on this site only stores your name and email in this browser. We never ask for a trading PIN or
					funds password.
				</p>
			) : null}
			<button type="button" className="broker-btn google-btn" onClick={() => setMode('signup')}>
				<span className="g-mark" aria-hidden>
					G
				</span>
				Sign in with Google
				<ChevronRight size={16} />
			</button>
			<p className="free-login-legal">
				By proceeding, you agree to <Link to="/legal">terms and conditions</Link>
				<span>Sensibull Web 1.0.0</span>
			</p>
		</div>
	);
}

function readAccounts(): Record<string, { name: string; password: string }> {
	try {
		return JSON.parse(window.localStorage.getItem('sensibull-accounts') ?? '{}') as Record<
			string,
			{ name: string; password: string }
		>;
	} catch {
		return {};
	}
}
