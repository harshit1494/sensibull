import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import {
	AlignCenter, Archive, ChartNoAxesColumn, ChevronDown, Clock, Ellipsis, Filter, Landmark, Menu, SquarePen, X,
	type LucideIcon,
} from 'lucide-react';
import { BrandLockup } from '@/components/brand-logo';
import { readSession, writeSession, type Session } from '@/lib/session';

type MenuTool = { label: string; to: string; icon: LucideIcon; desc?: string };

const POPULAR: MenuTool[] = [
	{ label: 'Strategy Builder', to: '/tools/strategy-builder', icon: SquarePen, desc: 'Analyse your positions, or create and analyse new trades' },
	{ label: 'Option Chain', to: '/tools/option-chain', icon: AlignCenter, desc: 'Per strike options prices, Open Interest, Greeks, IV and more' },
	{ label: 'Draft Portfolios', to: '/tools/strategy-builder?drafts=1', icon: Archive, desc: 'Create, record and track trades' },
];

const ADVANCED: MenuTool[] = [
	{ label: 'Open Interest', to: '/tools/open-interest', icon: ChartNoAxesColumn },
	{ label: 'Multi Straddle Strangle Charts', to: '/tools/multi-straddle-strangle', icon: Clock },
	{ label: 'FII DII Data', to: '/tools/fii-dii', icon: Landmark },
	{ label: 'Screener', to: '/tools/screener', icon: Filter },
];

function ToolLink({ tool, onPick }: { tool: MenuTool; onPick: () => void }) {
	const Icon = tool.icon;
	return (
		<li>
			<Link to={tool.to} className="tool-pop-link" onClick={onPick}>
				<Icon size={16} strokeWidth={1.4} />
				<span>
					<strong>{tool.label}</strong>
					{tool.desc ? <small>{tool.desc}</small> : null}
				</span>
			</Link>
		</li>
	);
}

export function Header() {
	const [open, setOpen] = useState(false);
	const [mobile, setMobile] = useState(false);
	const [session, setSession] = useState<Session | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const location = useLocation();

	useEffect(() => {
		const sync = () => setSession(readSession());
		sync();
		window.addEventListener('tigerbull-session', sync);
		return () => window.removeEventListener('tigerbull-session', sync);
	}, []);

	useEffect(() => {
		setOpen(false);
		setMobile(false);
	}, [location.pathname]);

	useEffect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const pick = () => {
		setOpen(false);
		setMobile(false);
	};

	return (
		<header className="site-header">
			<Link className="brand" to="/">
				<BrandLockup size={28} />
			</Link>
			<nav className={mobile ? 'navigation mobile-open' : 'navigation'} aria-label="Main navigation">
				<Link to="/#pricing" onClick={() => setMobile(false)}>
					Pricing
				</Link>
				<NavLink to="/about" onClick={() => setMobile(false)}>
					About
				</NavLink>
				<div className={open ? 'tool-menu open' : 'tool-menu'} ref={menuRef}>
					<button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="tools-popover">
						Tools <ChevronDown size={16} className="tool-chevron" />
					</button>
					{open ? (
						<div className="tool-pop" id="tools-popover">
							<ul>
								<li className="tool-pop-head">Popular</li>
								{POPULAR.map((tool) => <ToolLink key={tool.label} tool={tool} onPick={pick} />)}
							</ul>
							<ul>
								<li className="tool-pop-head">Advanced</li>
								{ADVANCED.map((tool) => <ToolLink key={tool.label} tool={tool} onPick={pick} />)}
								<li className="tool-pop-more">
									<Link to="/home" className="tool-pop-link" onClick={pick}>
										<Ellipsis size={16} strokeWidth={1.4} />
										<span><strong>More</strong></span>
									</Link>
								</li>
							</ul>
						</div>
					) : null}
				</div>
			</nav>
			{session ? (
				<button
					className="login-button"
					type="button"
					onClick={() => {
						writeSession(null);
						setSession(null);
					}}
				>
					Log out
				</button>
			) : (
				<button
					className="login-button"
					type="button"
					onClick={() => window.dispatchEvent(new Event('tigerbull-open-login'))}
				>
					Free Login
				</button>
			)}
			<button className="mobile-toggle" aria-label="Toggle navigation" type="button" onClick={() => setMobile(!mobile)}>
				{mobile ? <X /> : <Menu />}
			</button>
		</header>
	);
}
