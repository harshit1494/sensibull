import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
	ArrowRight, BarChart2, BookOpen, Brain, CalendarDays, ChevronDown, Clock, Filter, Grid2x2, Landmark, LineChart, LogIn, Network,
	PencilRuler, Radio, Search, Shuffle, Target, TrendingUp, UserRound, Wand2, Zap, Activity, FolderOpen, GraduationCap, Home, Briefcase, Bookmark, type LucideIcon,
} from 'lucide-react';
import '@/components/tools/strategy-builder.css';
import '@/components/tools/mega-menu.css';
import { readSession, writeSession, type Session } from '@/lib/session';
import { BrandLockup } from '@/components/brand-logo';

type Active = 'home' | 'trade' | 'analyse' | 'watchlist' | 'positions' | 'orders';

export function useSession() {
	const [session, setSession] = useState<Session | null>(null);
	useEffect(() => {
		const sync = () => setSession(readSession());
		sync();
		window.addEventListener('tigerbull-session', sync);
		return () => window.removeEventListener('tigerbull-session', sync);
	}, []);
	return session;
}

export function openLogin() {
	window.dispatchEvent(new Event('tigerbull-open-login'));
}

type Item = { label: string; to: string; icon: LucideIcon; desc?: string; badge?: { text: string; tone: 'blue' | 'yellow' } };
type Column = { title?: string; items: Item[] };

const TRADE: Column[] = [
	{
		items: [
			{ label: 'Strategy Builder', to: '/tools/strategy-builder', icon: PencilRuler, desc: 'Analyse your positions, or create and analyse new trades', badge: { text: 'Popular', tone: 'blue' } },
			{ label: 'Strategy Wizard', to: '/tools/strategy-wizard', icon: Target, desc: 'Give a target and get the best trades for your target' },
			{ label: 'Expiry Trades', to: '/tools/expiry-trades', icon: Wand2, desc: 'Predict the expiry and get profitable option trades' },
			{ label: 'Easy Options', to: '/tools/easy-options', icon: Zap, desc: 'Just guess up or down, and get simple trades with small risks' },
		],
	},
	{
		items: [
			{ label: 'Draft Portfolios', to: '/tools/strategy-builder?drafts=1', icon: FolderOpen, desc: 'Create, record, and track trades' },
			{ label: 'Mindful Trading', to: '/tools/mindful-trading', icon: Brain, desc: 'Stop Impulsive Trading', badge: { text: 'New', tone: 'yellow' } },
		],
	},
	{
		items: [
			{ label: 'Learn Options Strategies', to: '/tools/learn-options-strategies', icon: BookOpen, desc: 'Learn about different Options trading strategies', badge: { text: 'New', tone: 'yellow' } },
			{ label: 'Learn Options Trading', to: '/tools/learn-options-trading', icon: GraduationCap, desc: 'Free video courses on Options Trading' },
		],
	},
];

const ANALYSE: Column[] = [
	{
		title: 'Tools to predict direction',
		items: [
			{ label: 'Option Chain', to: '/tools/option-chain', icon: Network },
			{ label: 'Open Interest', to: '/tools/open-interest', icon: BarChart2, badge: { text: 'New And Improved', tone: 'yellow' } },
			{ label: 'Multi Strike OI', to: '/tools/open-interest?tab=multi', icon: Shuffle },
			{ label: 'FII DII Data', to: '/tools/fii-dii', icon: Landmark },
			{ label: 'Live Options Charts', to: '/tools/live-options-charts', icon: TrendingUp },
			{ label: 'Multi Straddle-Strangle Charts', to: '/tools/multi-straddle-strangle', icon: Clock },
		],
	},
	{
		title: 'Find great trades',
		items: [
			{ label: 'Stock Data', to: '/tools/stock-data', icon: Search },
			{ label: 'Screener', to: '/tools/screener', icon: Filter },
			{ label: 'Technical Signals', to: '/tools/technical-signals', icon: Radio },
			{ label: 'Market Analysis', to: '/tools/market-analysis', icon: Activity },
		],
	},
	{
		title: 'Others',
		items: [
			{ label: 'IV Chart', to: '/tools/iv-chart', icon: LineChart },
			{ label: 'Stock Market Calendar', to: '/tools/economic-calendar', icon: CalendarDays },
			{ label: 'Heatmap', to: '/tools/screener?view=heatmap', icon: Grid2x2 },
		],
	},
];

function isActiveItem(item: Item, path: string, search: string) {
	const [p, q] = item.to.split('?');
	if (p !== path) return false;
	if (!q) return !search.includes('tab=multi') || item.label !== 'Open Interest';
	return search.includes(q.split('#')[0]);
}

/**
 * TIGERBULL-style navigation: Trade / Analyse open full-width mega menus on hover (or click / keyboard),
 * with a dimmed backdrop over the page; leaving the header + panel, pressing Esc, clicking the backdrop
 * or navigating closes them.
 */
export function MegaNav({ active, onWatchlist, onPositions, onOrders }: { active: Active; onWatchlist?: () => void; onPositions?: () => void; onOrders?: () => void }) {
	const [menu, setMenu] = useState<'trade' | 'analyse' | null>(null);
	const openTimer = useRef<number>(0);
	const closeTimer = useRef<number>(0);
	const location = useLocation();
	const navigate = useNavigate();
	const session = useSession();
	// Positions / Orders need a broker login — show the login popup until the user is signed in.
	const gated = (fn?: () => void, view?: string) => () => {
		setMenu(null);
		if (!session) return openLogin();
		if (fn) fn();
		else navigate(`/${view}`);
	};

	useEffect(() => setMenu(null), [location.pathname, location.search]);
	useEffect(() => {
		if (!menu) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [menu]);
	useEffect(() => () => { window.clearTimeout(openTimer.current); window.clearTimeout(closeTimer.current); }, []);

	const hoverOpen = (m: 'trade' | 'analyse') => {
		window.clearTimeout(closeTimer.current);
		window.clearTimeout(openTimer.current);
		openTimer.current = window.setTimeout(() => setMenu(m), menu ? 0 : 90);
	};
	const hoverClose = () => {
		window.clearTimeout(openTimer.current);
		closeTimer.current = window.setTimeout(() => setMenu(null), 160);
	};
	const keep = () => window.clearTimeout(closeTimer.current);
	const cols = menu === 'trade' ? TRADE : ANALYSE;

	return (
		<>
			<nav className="sb-nav" onMouseLeave={hoverClose}>
				{(['trade', 'analyse'] as const).map((m) => (
					<button
						key={m}
						type="button"
						className={`${active === m ? 'on' : ''} ${menu === m ? 'open' : ''}`}
						aria-expanded={menu === m}
						aria-haspopup="true"
						onMouseEnter={() => hoverOpen(m)}
						onClick={() => setMenu(menu === m ? null : m)}
						onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setMenu(m); } }}
					>
						{m === 'trade' ? 'Trade' : 'Analyse'} <ChevronDown size={14} className="mm-chev" />
					</button>
				))}
				<button type="button" className={active === 'watchlist' ? 'on' : ''} onMouseEnter={hoverClose} onClick={() => (onWatchlist ? onWatchlist() : navigate('/watchlist'))}>
					Watchlist <i>New</i>
				</button>
				<button type="button" className={active === 'positions' ? 'on' : ''} onMouseEnter={hoverClose} onClick={gated(onPositions, 'positions')}>Positions</button>
				<button type="button" className={active === 'orders' ? 'on' : ''} onMouseEnter={hoverClose} onClick={gated(onOrders, 'orders')}>Orders</button>
			</nav>
			{menu ? (
				<>
					<div className="mm-backdrop" onMouseEnter={hoverClose} onClick={() => setMenu(null)} aria-hidden="true" />
					<div className={`mm-panel ${menu}`} role="menu" onMouseEnter={keep} onMouseLeave={hoverClose}>
						<div className="mm-cols">
							{cols.map((col, ci) => (
								<div key={ci} className="mm-col">
									{col.title ? <p className="mm-title">{col.title}</p> : null}
									{col.items.map((item) => {
										const Icon = item.icon;
										const on = isActiveItem(item, location.pathname, location.search);
										return (
											<Link key={item.label} to={item.to} role="menuitem" className={`mm-item ${on ? 'active' : ''} ${item.desc ? 'rich' : ''}`} onClick={() => setMenu(null)}>
												<Icon size={22} strokeWidth={1.6} />
												<span className="mm-text">
													<span className="mm-label">
														{item.label}
														{item.badge ? <em className={`mm-badge ${item.badge.tone}`}>{item.badge.text}</em> : null}
														{item.desc ? <ArrowRight size={16} className="mm-arrow" /> : null}
													</span>
													{item.desc ? <span className="mm-desc">{item.desc}</span> : null}
												</span>
											</Link>
										);
									})}
								</div>
							))}
						</div>
					</div>
				</>
			) : null}
		</>
	);
}

/** TIGERBULL web-terminal header (logo / page title, centre nav, login + avatar). */
export function TerminalHeader({ title, active }: { title: string; active: Active }) {
	const session = useSession();
	const [accountOpen, setAccountOpen] = useState(false);

	return (
		<header className="sb-top">
			<div className="sb-brand">
				<Link to={session ? '/home' : '/'} className="sb-logo" aria-label="TIGERBULL home">
					<BrandLockup size={24} />
				</Link>
				<em>/</em>
				<h1>{title}</h1>
			</div>
			<MegaNav active={active} />
			<div className="sb-top-actions">
				{session ? null : (
					<button type="button" className="sb-login" onClick={openLogin}>
						<LogIn size={15} /> Login
					</button>
				)}
				<button type="button" className="sb-avatar" onClick={() => (session ? setAccountOpen(!accountOpen) : openLogin())} aria-label="Account">
					<UserRound size={20} /> <ChevronDown size={14} />
				</button>
				{accountOpen && session ? (
					<div className="sb-account">
						<strong>{session.name}</strong>
						<p>{session.email}</p>
						<Link to="/home" className="sb-account-link" onClick={() => setAccountOpen(false)}>Home</Link>
						<button type="button" onClick={() => { writeSession(null); setAccountOpen(false); }}>Log out</button>
					</div>
				) : null}
			</div>
		</header>
	);
}

const TAB_BAR: { id: Active; label: string; to: string; icon: LucideIcon }[] = [
	{ id: 'home', label: 'Home', to: '/home', icon: Home },
	{ id: 'analyse', label: 'Analyse', to: '/tools/option-chain', icon: BarChart2 },
	{ id: 'positions', label: 'Positions', to: '/positions', icon: Briefcase },
	{ id: 'watchlist', label: 'Watchlist', to: '/watchlist', icon: Bookmark },
];

/** Bottom tab bar shown on narrow screens, like the TIGERBULL web app. */
export function MobileTabBar({ active }: { active: Active }) {
	return (
		<nav className="sb-tabbar" aria-label="App navigation">
			{TAB_BAR.map(({ id, label, to, icon: Icon }) => (
				<Link key={id} to={to} className={active === id || (id === 'positions' && active === 'orders') ? 'on' : ''}>
					<Icon size={18} strokeWidth={1.7} />
					{label}
				</Link>
			))}
		</nav>
	);
}

export function LoginBanner() {
	const session = useSession();
	if (session) return null;
	return (
		<div className="sb-banner">
			<p>Login with your broker for real-time prices and trading.</p>
			<button type="button" onClick={openLogin}>Login</button>
		</div>
	);
}

export function TerminalPage({ title, active, children, className }: { title: string; active: Active; children: ReactNode; className?: string }) {
	return (
		<div className={`sb-app ${className ?? ''}`}>
			<TerminalHeader title={title} active={active} />
			{children}
		</div>
	);
}

