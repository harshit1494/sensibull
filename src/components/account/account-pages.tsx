import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
	BookOpen, ChevronRight, CircleHelp, Coins, Flag, FolderOpen, Grid2x2, Hash, Headset, LayoutList, Menu, MonitorPlay, PencilRuler, Radio,
	Search, Settings, Share2, Target, TrendingUp, Triangle, Users, type LucideIcon,
} from 'lucide-react';
import { LoginModal } from '@/components/auth/login-modal';
import { AdvancedTools } from '@/components/account/tool-previews';
import { MobileTabBar, openLogin, TerminalPage, useSession } from '@/components/tools/terminal-chrome';
import { useIsDesktop } from '@/hooks/use-desktop';
import '@/components/account/account-pages.css';

function EmptyMailbox() {
	return (
		<svg className="ac-mailbox" viewBox="0 0 200 200" aria-hidden="true">
			<circle cx="100" cy="100" r="100" fill="#f2f2f2" />
			<rect x="94" y="112" width="14" height="88" fill="#e2bd9a" />
			<path d="M78 58h70a24 24 0 0 1 24 24v36H78z" fill="#8fbde8" />
			<rect x="78" y="114" width="94" height="6" fill="#5e8fc9" />
			<path d="M60 58h18a24 24 0 0 1 24 24v38H36V82a24 24 0 0 1 24-24z" fill="#555a75" />
			<rect x="24" y="114" width="78" height="6" fill="#5e8fc9" />
			<rect x="118" y="28" width="3" height="48" fill="#e2bd9a" />
			<path d="M121 28h16l-4 6 4 6h-16z" fill="#f6c97a" />
			<circle cx="119.5" cy="76" r="4" fill="#f6c97a" />
			<circle cx="52" cy="78" r="22" fill="#fff" stroke="#3d4258" strokeWidth="4" />
			<path d="M43 69l18 18M61 69L43 87" stroke="#3d4258" strokeWidth="4" strokeLinecap="round" />
		</svg>
	);
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
	return (
		<div className="ac-empty">
			<EmptyMailbox />
			<strong>{title}</strong>
			{children ? <p>{children}</p> : null}
		</div>
	);
}

function LoginGate({ what }: { what: string }) {
	return (
		<div className="ac-gate">
			<Empty title={`Login to see your ${what}`}>Connect your broker to see live {what} here.</Empty>
			<button type="button" className="sb-btn-primary" onClick={openLogin}>Login</button>
		</div>
	);
}

function AccountShell({ title, active, wide, children }: { title: string; active: 'home' | 'positions' | 'orders'; wide?: boolean; children: ReactNode }) {
	return (
		<TerminalPage title={title} active={active} className="ac-app">
			<main className={wide ? 'ac-main ac-main--wide' : 'ac-main'}>{children}</main>
			<MobileTabBar active={active} />
			<LoginModal />
		</TerminalPage>
	);
}

/* ------------------------------------------------------------------ Positions */

const CHARGES = [
	['Brokerage', '₹0.00'],
	['STT', '₹0.00'],
	['Exchange txn charges', '₹0.00'],
	['GST', '₹0.00'],
	['SEBI fees', '₹0.00'],
	['Stamp duty', '₹0.00'],
] as const;

function ChargesPanel({ onClose }: { onClose: () => void }) {
	return (
		<div className="ac-sheet" role="dialog" aria-label="Charges">
			<div className="ac-sheet-head">
				<strong>Charges</strong>
				<button type="button" className="sb-link" onClick={onClose}>Close</button>
			</div>
			<table className="ac-table">
				<tbody>
					{CHARGES.map(([label, value]) => (
						<tr key={label}><td>{label}</td><td>{value}</td></tr>
					))}
					<tr className="ac-total"><td>Total charges</td><td>₹0.00</td></tr>
				</tbody>
			</table>
			<p className="ac-hint">Charges are calculated on today’s executed orders.</p>
		</div>
	);
}

function FundsPanel({ onClose }: { onClose: () => void }) {
	return (
		<div className="ac-sheet" role="dialog" aria-label="Funds">
			<div className="ac-sheet-head">
				<strong>Funds</strong>
				<button type="button" className="sb-link" onClick={onClose}>Close</button>
			</div>
			<table className="ac-table">
				<tbody>
					<tr><td>Available margin</td><td>₹0.00</td></tr>
					<tr><td>Used margin</td><td>₹0.00</td></tr>
					<tr><td>Opening balance</td><td>₹0.00</td></tr>
				</tbody>
			</table>
			<p className="ac-hint">Funds are fetched from your broker account.</p>
		</div>
	);
}

function VerifiedPanel({ onClose }: { onClose: () => void }) {
	return (
		<div className="ac-sheet">
			<div className="ac-sheet-head">
				<strong>Verified P&amp;L</strong>
				<button type="button" className="sb-link" onClick={onClose}>Close</button>
			</div>
			<p className="ac-hint">Share broker-verified P&amp;L once you have live positions. <Link to="/tools/verified">See verified traders</Link></p>
		</div>
	);
}

type Panel = 'funds' | 'charges' | 'verified' | null;

function PanelView({ panel, onClose }: { panel: Panel; onClose: () => void }) {
	if (panel === 'funds') return <FundsPanel onClose={onClose} />;
	if (panel === 'charges') return <ChargesPanel onClose={onClose} />;
	if (panel === 'verified') return <VerifiedPanel onClose={onClose} />;
	return null;
}

function ClosedSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="ac-switch">
			<input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
			<span aria-hidden="true" />
			Closed positions
		</label>
	);
}

export function PositionsPage() {
	const session = useSession();
	const desktop = useIsDesktop();
	const [tab, setTab] = useState<'positions' | 'groups'>('positions');
	const [showClosed, setShowClosed] = useState(true);
	const [panel, setPanel] = useState<Panel>(null);
	const toggle = (next: Exclude<Panel, null>) => setPanel(panel === next ? null : next);

	if (desktop) {
		return (
			<AccountShell title="Positions" active="positions" wide>
				{!session ? (
					<section className="dp-main ac-card"><LoginGate what="positions" /></section>
				) : (
					<div className="dp">
						<aside className="dp-side">
							<div className="dp-seg" role="tablist">
								<button type="button" role="tab" aria-selected={tab === 'positions'} className={tab === 'positions' ? 'on' : ''} onClick={() => setTab('positions')}>Positions</button>
								<button type="button" role="tab" aria-selected={tab === 'groups'} className={tab === 'groups' ? 'on' : ''} onClick={() => setTab('groups')}>Groups</button>
							</div>
							<div className="dp-summary">
								<div className="dp-summary-row">
									<div><span>Total P&amp;L</span><strong>--</strong></div>
									<div><span>Booked P&amp;L <CircleHelp size={12} /></span><strong>--</strong></div>
									<div><span>Unbooked P&amp;L</span><strong>--</strong></div>
								</div>
								<p className="dp-decay">Total Decay <b>--</b></p>
							</div>
							<div className="dp-btns">
								<button type="button" className={`ac-btn ${panel === 'charges' ? 'on' : ''}`} onClick={() => toggle('charges')}>Charges</button>
								<button type="button" className={`ac-btn grow ${panel === 'verified' ? 'on' : ''}`} onClick={() => toggle('verified')}><Share2 size={15} /> Share Verified P&amp;L</button>
								<button type="button" className="ac-btn icon" aria-label="Position settings"><Settings size={16} /></button>
							</div>
							<PanelView panel={panel} onClose={() => setPanel(null)} />
							<div className="dp-bar">
								<ClosedSwitch checked={showClosed} onChange={setShowClosed} />
								<button type="button" className="sb-link" onClick={() => toggle('funds')}>View Funds</button>
							</div>
							<p className="dp-none">{tab === 'groups' ? 'You have not created any position groups.' : 'You do not have any open F&O positions.'}</p>
						</aside>
						<section className="dp-main ac-card">
							<Empty title={tab === 'groups' ? 'No groups to show' : 'No positions to show'} />
						</section>
					</div>
				)}
			</AccountShell>
		);
	}

	return (
		<AccountShell title="Positions" active="positions">
			<div className="ac-tabs ac-tabs--wide" role="tablist">
				<button type="button" role="tab" aria-selected={tab === 'positions'} className={tab === 'positions' ? 'on' : ''} onClick={() => setTab('positions')}>Positions</button>
				<button type="button" role="tab" aria-selected={tab === 'groups'} className={tab === 'groups' ? 'on' : ''} onClick={() => setTab('groups')}>Groups</button>
				<Link to="/orders" role="tab">Orders</Link>
			</div>

			{!session ? (
				<LoginGate what="positions" />
			) : tab === 'groups' ? (
				<Empty title="No groups to show">Group your positions by strategy to track them together.</Empty>
			) : (
				<>
					<section className="ac-summary">
						<div className="ac-summary-row">
							<div><span>Total P&amp;L</span><strong>--</strong></div>
							<div className="ac-center"><span>Booked P&amp;L <CircleHelp size={13} /></span><strong>--</strong></div>
							<div className="ac-right"><span>Unbooked P&amp;L</span><strong>--</strong></div>
						</div>
						<p className="ac-decay">Total Decay <b>--</b></p>
					</section>

					<div className="ac-btns">
						<button type="button" className={`ac-btn grow ${panel === 'verified' ? 'on' : ''}`} onClick={() => toggle('verified')}><Share2 size={16} /> Verified P&amp;L</button>
						<button type="button" className={`ac-btn grow ${panel === 'funds' ? 'on' : ''}`} onClick={() => toggle('funds')}>Funds</button>
						<button type="button" className={`ac-btn ${panel === 'charges' ? 'on' : ''}`} onClick={() => toggle('charges')}>Charges</button>
						<button type="button" className="ac-btn icon" aria-label="Position settings"><Settings size={17} /></button>
					</div>

					<PanelView panel={panel} onClose={() => setPanel(null)} />

					<div className="ac-bar">
						<ClosedSwitch checked={showClosed} onChange={setShowClosed} />
						<button type="button" className="ac-goto"><Menu size={17} /> Go To</button>
					</div>

					<Empty title="No positions to show">You do not have any open F&amp;O positions.</Empty>
				</>
			)}
		</AccountShell>
	);
}

/* --------------------------------------------------------------------- Orders */

const ORDER_TABS = ['All Orders', 'Open Orders', 'Executed Orders', 'Stoploss Orders', 'Conditional Exits'] as const;

export function OrdersPage() {
	const session = useSession();
	const desktop = useIsDesktop();
	const [tab, setTab] = useState<(typeof ORDER_TABS)[number]>('All Orders');
	const [query, setQuery] = useState('');
	const [charges, setCharges] = useState(false);

	const tabs = (
		<div className="ac-tabs" role="tablist">
			{ORDER_TABS.map((name) => (
				<button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? 'on' : ''} onClick={() => setTab(name)}>{name}</button>
			))}
		</div>
	);
	const search = (
		<label className="ac-search">
			<Search size={desktop ? 15 : 17} />
			<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search orders" />
		</label>
	);
	const chargesBtn = <button type="button" className={`ac-btn ${charges ? 'on' : ''}`} onClick={() => setCharges(!charges)}>Charges</button>;
	const empty = <Empty title={query ? `No orders match “${query}”` : 'No orders to show'} />;

	return (
		<AccountShell title="Orders" active="orders" wide={desktop}>
			{!session ? (
				<section className="ac-card"><LoginGate what="orders" /></section>
			) : desktop ? (
				<section className="ac-card do-card">
					<div className="do-head">
						{tabs}
						<div className="do-tools">{search}{chargesBtn}</div>
					</div>
					{charges ? <ChargesPanel onClose={() => setCharges(false)} /> : null}
					<table className="do-table">
						<thead>
							<tr><th>Time</th><th className="do-inst">Instrument</th><th>LTP</th><th>Qty</th><th>Price</th><th>Status</th></tr>
						</thead>
					</table>
					{empty}
				</section>
			) : (
				<section className="ac-card">
					{tabs}
					<div className="ac-search-row">{search}{chargesBtn}</div>
					{charges ? <ChargesPanel onClose={() => setCharges(false)} /> : null}
					<div className="ac-card-body">{empty}</div>
				</section>
			)}
		</AccountShell>
	);
}

/* ----------------------------------------------------------------------- Home */

const SHOWCASE = [
	{ name: 'AAKASH SAINI', handle: '@AAKASHS28507722', pnl: '26.8L', roi: '+20%' },
	{ name: 'Sachin Goyal', handle: '@_sachin_goyal', pnl: '26.55L', roi: '+60%' },
	{ name: 'Rohit Yadav', handle: '@rohit_yadav91', pnl: '6.85L', roi: '+2.1%' },
	{ name: 'SbM', handle: '@arthatrader7', pnl: '5.94L', roi: '' },
	{ name: 'Vasudev Jangir', handle: '@vasudev_ja57221', pnl: '5.55L', roi: '+1485%' },
	{ name: 'Siva', handle: '@SIVARAMAKRUSHNA', pnl: '5.31L', roi: '+277%' },
	{ name: 'Nifty Sniper', handle: '@trading_bn', pnl: '5.29L', roi: '' },
	{ name: 'Vikas Somani', handle: '@v_somani', pnl: '4.76L', roi: '' },
	{ name: 'Prithvi Khithani', handle: '@PrithviKhithan1', pnl: '4.73L', roi: '+13%' },
	{ name: 'Ishan mishra', handle: '@ishanmish', pnl: '3.97L', roi: '+2.1%' },
	{ name: 'Bharath Reddy', handle: '@vu3xam', pnl: '3.9L', roi: '+2.2%' },
	{ name: 'Unnikrishnan', handle: '@unni180772', pnl: '3.11L', roi: '+9%' },
];

type HomeCard = { title: string; desc?: string; to: string; icon: LucideIcon; badge?: 'Popular' | 'New' };

const HOME_CARDS: HomeCard[] = [
	{ title: 'Strategy Builder', desc: 'Create & analyse trades', to: '/tools/strategy-builder', icon: PencilRuler, badge: 'Popular' },
	{ title: 'Draft Portfolios', desc: 'Create, record, and track trades', to: '/tools/strategy-builder?drafts=1', icon: FolderOpen },
	{ title: 'Verified By TIGERBULL', desc: 'Share your verified P&L. Or follow verified profitable traders', to: '/tools/verified', icon: Coins },
	{ title: 'Expiry Trades', desc: 'Predict the expiry and get profitable option trades', to: '/tools/expiry-trades', icon: Flag },
	{ title: 'Learn Options Strategies', desc: 'Learn about different Options trading strategies', to: '/tools/learn-options-strategies', icon: BookOpen, badge: 'New' },
	{ title: 'Learn Options Trading', desc: 'Learn from free video courses', to: '/tools/learn-options-trading', icon: MonitorPlay },
	{ title: 'Easy Options', desc: 'Just guess up or down', to: '/tools/easy-options', icon: Triangle },
	{ title: 'Strategy Wizard', desc: 'Give a target, get a trade', to: '/tools/strategy-wizard', icon: Target },
	{ title: 'Market Analysis', to: '/tools/market-analysis', icon: TrendingUp },
	{ title: 'Help / Support', desc: 'Common questions and FAQs', to: '/help', icon: Headset },
	{ title: 'FAQ', to: '/help', icon: CircleHelp },
];

const FEATURES: { title: string; desc: string; cta: string; to: string; icon: LucideIcon; tone: string }[] = [
	{ title: 'Easiest way to trade options', desc: 'Just guess up or down, and get Option Strategies.', cta: 'Easy options', to: '/tools/easy-options', icon: Triangle, tone: '#32d583' },
	{ title: 'Get ready-made strategies', desc: 'Predict the index or a stock, and get the best Option Strategies', cta: 'Strategy wizard', to: '/tools/strategy-wizard', icon: Target, tone: '#c9cdd3' },
	{ title: 'Create your own strategies', desc: 'Create and analyse your own custom Options Strategies', cta: 'Strategy builder', to: '/tools/strategy-builder', icon: PencilRuler, tone: '#f68663' },
	{ title: 'Draft Portfolios', desc: 'Create and track your trades', cta: 'Draft Portfolios', to: '/tools/strategy-builder?drafts=1', icon: FolderOpen, tone: '#68a5ea' },
	{ title: 'NIFTY Heatmap', desc: 'Discover market trends at a glance', cta: 'Heatmap', to: '/tools/screener?view=heatmap', icon: Grid2x2, tone: '#32d583' },
	{ title: '#VerifiedByTIGERBULL', desc: 'Share your verified P&L with the trading community', cta: 'Share Verified P&L', to: '/tools/verified', icon: Hash, tone: '#68a5ea' },
];

const PROMO_KEY = 'sb-mindful-promo-dismissed';

function initials(name: string) {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function useRotation(count: number, ms = 4000) {
	const [index, setIndex] = useState(0);
	useEffect(() => {
		const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ms);
		return () => window.clearInterval(id);
	}, [count, ms]);
	return [index, setIndex] as const;
}

function TraderCard({ trader }: { trader: (typeof SHOWCASE)[number] }) {
	return (
		<Link to="/tools/verified" className="hd-trader">
			<span className="hd-trader-top">
				<span className="ac-trader-pic">{initials(trader.name)}<em>Live</em></span>
				<span className="ac-trader-name"><strong>{trader.name}</strong><small>{trader.handle}</small></span>
			</span>
			<span className="hd-trader-pnl"><strong>{trader.pnl}</strong>{trader.roi ? <small>{trader.roi}</small> : null}</span>
		</Link>
	);
}

function MindfulPromo() {
	const [hidden, setHidden] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem(PROMO_KEY) === '1');
	if (hidden) return null;
	return (
		<aside className="hd-promo">
			<div className="hd-promo-art" aria-hidden="true">
				<svg viewBox="0 0 120 110">
					<ellipse cx="60" cy="100" rx="44" ry="7" fill="#00000030" />
					<path d="M30 92c10-14 50-14 60 0z" fill="#2b3a67" />
					<rect x="47" y="44" width="26" height="40" rx="10" fill="#2b3a67" />
					<path d="M58 46l2 22 2-22z" fill="#d6463a" />
					<path d="M47 56L18 48M73 56l29-8" stroke="#2b3a67" strokeWidth="8" strokeLinecap="round" />
					<circle cx="60" cy="30" r="13" fill="#f0c19a" />
					<path d="M47 27c2-12 24-12 26 0-6-4-20-4-26 0z" fill="#5a3a24" />
					<path d="M52 37c4 5 12 5 16 0" fill="#5a3a24" />
				</svg>
			</div>
			<div className="hd-promo-text">
				<strong>Introducing Mindful Trading</strong>
				<p>Breathe, then trade. A simple pause to help you trade more intentionally.</p>
				<div className="hd-promo-actions">
					<Link to="/tools/mindful-trading" className="hd-promo-try">Try Now</Link>
					<button type="button" className="hd-promo-dismiss" onClick={() => { window.localStorage.setItem(PROMO_KEY, '1'); setHidden(true); }}>Dismiss</button>
				</div>
			</div>
		</aside>
	);
}

function DesktopHome({ name }: { name: string | null }) {
	const pages = Math.ceil(SHOWCASE.length / 4);
	const [page, setPage] = useRotation(pages, 5000);

	return (
		<div className="hd">
			<h2 className="hd-welcome">{name ? `Welcome ${name},` : 'Welcome to TIGERBULL'}</h2>
			<p className="ac-showcase-head hd-live">
				<Radio size={16} /> <b>6061 people</b> are sharing their live positions right now. <Link to="/tools/verified">Check out Showcase</Link>
			</p>
			<div className="hd-traders">
				{SHOWCASE.slice(page * 4, page * 4 + 4).map((trader) => <TraderCard key={trader.handle} trader={trader} />)}
			</div>
			<div className="ac-dots">
				{Array.from({ length: pages }, (_, i) => (
					<button key={i} type="button" className={i === page ? 'on' : ''} aria-label={`Showcase page ${i + 1}`} onClick={() => setPage(i)} />
				))}
			</div>

			<div className="hd-row">
				<div className="hd-features">
					{FEATURES.map(({ title, desc, cta, to, icon: Icon, tone }) => (
						<div key={title} className="hd-feature">
							<p className="hd-feature-title"><Icon size={24} color={tone} strokeWidth={1.8} /> {title}</p>
							<p className="hd-feature-desc">{desc}</p>
							<Link to={to} className="hd-feature-cta">{cta}</Link>
						</div>
					))}
				</div>
				<MindfulPromo />
			</div>

			<AdvancedTools />
		</div>
	);
}

function MobileHome({ session }: { session: ReturnType<typeof useSession> }) {
	const [slide, setSlide] = useRotation(3);
	const trader = SHOWCASE[slide];

	return (
		<>
			{session ? (
				<Link to="/tools/verified" className="ac-profile">
					<span className="ac-avatar">{initials(session.name)}</span>
					<span className="ac-profile-text">
						<strong>{session.name}</strong>
						<small>{session.email}</small>
					</span>
					<ChevronRight size={20} />
				</Link>
			) : (
				<button type="button" className="ac-profile" onClick={openLogin}>
					<span className="ac-avatar"><Users size={18} /></span>
					<span className="ac-profile-text">
						<strong>Login to TIGERBULL</strong>
						<small>Connect your broker for live prices and trading</small>
					</span>
					<ChevronRight size={20} />
				</button>
			)}

			<section className="ac-showcase">
				<p className="ac-showcase-head">
					<Radio size={16} /> <b>6061 people</b> are sharing their live positions right now. <Link to="/tools/verified">Check out Showcase</Link>
				</p>
				<Link to="/tools/verified" className="ac-trader">
					<span className="ac-trader-pic">
						{initials(trader.name)}
						<em>Live</em>
					</span>
					<span className="ac-trader-name">
						<strong>{trader.name}</strong>
						<small>{trader.handle}</small>
					</span>
					<span className="ac-trader-pnl">
						<strong>{trader.pnl}</strong>
						<small>{trader.roi}</small>
					</span>
				</Link>
				<div className="ac-dots">
					{SHOWCASE.slice(0, 3).map((t, i) => (
						<button key={t.handle} type="button" className={i === slide ? 'on' : ''} aria-label={`Show ${t.name}`} onClick={() => setSlide(i)} />
					))}
				</div>
			</section>

			<div className="ac-grid">
				{HOME_CARDS.map(({ title, desc, to, icon: Icon, badge }) => (
					<Link key={title} to={to} className="ac-tile">
						{badge ? <em className={`ac-badge ${badge === 'New' ? 'new' : ''}`}>{badge}</em> : null}
						<span className="ac-tile-icon"><Icon size={30} strokeWidth={1.4} /></span>
						<span className="ac-tile-text">
							<strong>{title}</strong>
							{desc ? <small>{desc}</small> : null}
						</span>
						<ChevronRight size={20} className="ac-tile-chev" />
					</Link>
				))}
			</div>
			<p className="ac-foot"><LayoutList size={14} /> Prices and P&amp;L on this page are illustrative, not a live feed.</p>
		</>
	);
}

export function AccountHomePage() {
	const session = useSession();
	const desktop = useIsDesktop();
	return (
		<AccountShell title="Home" active="home" wide={desktop}>
			{desktop ? <DesktopHome name={session?.name ?? null} /> : <MobileHome session={session} />}
		</AccountShell>
	);
}
