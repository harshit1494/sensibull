import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Activity, ChevronRight, ShieldCheck } from 'lucide-react';
import { checkLogin, HOME_AFTER_LOGIN, readSession, writeSession } from '@/lib/session';

const BROKERS = [
	{ id: 'zerodha', name: 'Zerodha', mark: 'Z', tone: '#f6461a' },
	{ id: 'angel', name: 'Angel One', mark: 'A', tone: '#11af4b' },
	{ id: 'upstox', name: 'Upstox', mark: 'U', tone: '#5a298b' },
	{ id: 'icici', name: 'ICICI Direct', mark: 'I', tone: '#b02a30' },
] as const;

export function LoginPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<'login' | 'signup'>('login');
	const [broker, setBroker] = useState<(typeof BROKERS)[number] | null>(null);
	const [error, setError] = useState('');
	const [safeOpen, setSafeOpen] = useState(false);
	const [done, setDone] = useState('');

	useEffect(() => {
		const existing = readSession();
		if (existing) navigate(HOME_AFTER_LOGIN, { replace: true });
	}, [navigate]);

	if (done) {
		return (
			<section className="free-login">
				<div className="free-login-card free-login-card--solo">
					<span className="brand">
						<span className="brand-symbol">
							<Activity size={17} />
						</span>
						SENSIBULL
					</span>
					<h1>You’re in, {done.split(' ')[0]}.</h1>
					<p>This free login stays on this browser. Strategy tools are ready whenever you are.</p>
					<div className="auth-actions">
						<Link className="primary-button" to={HOME_AFTER_LOGIN}>
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
			</section>
		);
	}

	return (
		<section className="free-login">
			<div className="free-login-left">
				<p className="free-login-kicker">Welcome to</p>
				<Link to="/" className="brand free-login-brand">
					<span className="brand-symbol">
						<Activity size={18} />
					</span>
					SENSIBULL
				</Link>
				<p className="free-login-about">
					India’s biggest Options Trading Platform. Trade low-risk Strategies, guess market direction with data, learn Options Trading
				</p>
				<div className="free-login-offer">
					<span className="rupee-mark" aria-hidden>
						₹
					</span>
					<div>
						<strong>No extra charges to trade directly from Sensibull</strong>
						<p>You only pay your normal brokerage to your broker. This applies to both free plans and Pro paid plans.</p>
					</div>
				</div>
				<div className="free-login-offer">
					<span className="sebi-mark" aria-hidden>
						SEBI
					</span>
					<div>
						<strong>SEBI Registered Research Analyst</strong>
						<p>INH200006895</p>
					</div>
				</div>
			</div>

			<div className="free-login-right">
				<div className="free-login-card">
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
								navigate('/tools/strategy-builder');
								return;
							}
							const session = checkLogin(email, password);
							if (!session) {
								setError('Email or password doesn’t match.');
								return;
							}
							writeSession(session);
							setDone(session.name);
							navigate(HOME_AFTER_LOGIN);
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
				</div>
				<p className="free-login-legal">
					By proceeding, you agree to <Link to="/legal">terms and conditions</Link>
					<span>Sensibull Web 1.0.0</span>
				</p>
			</div>
		</section>
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
