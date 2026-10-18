import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router';
import {
	ArrowUpDown, BarChart3, Camera, CandlestickChart, ChevronDown, ChevronLeft, ChevronUp, Crosshair, Eraser, Lock, Magnet, Network,
	PencilLine, Plus, Ruler, Search, Settings, Slash, Smile, Trash2, Type, X, ZoomIn,
} from 'lucide-react';
import { LoginModal } from '@/components/auth/login-modal';
import { Empty } from '@/components/account/account-pages';
import { MobileTabBar, TerminalPage } from '@/components/tools/terminal-chrome';
import { useWidth } from '@/components/tools/ts-chart';
import { useIsDesktop } from '@/hooks/use-desktop';
import { FNO } from '@/lib/fno-stocks';
import { seeded } from '@/lib/market-mock';
import '@/components/account/account-pages.css';
import '@/components/account/watchlist.css';

type Item = { symbol: string; price: number; pct: number };
type Lists = Record<number, Item[]>;

const STORE_KEY = 'sb-watchlists';
const LIST_COUNT = 10;

const DEFAULT_LIST: Item[] = [
	{ symbol: 'NIFTY', price: 23146.15, pct: 0.65 },
	{ symbol: 'BANKNIFTY', price: 55844, pct: 0.06 },
	{ symbol: 'FINNIFTY', price: 25387.1, pct: 0.09 },
	{ symbol: 'SENSEX', price: 74729.27, pct: 0.56 },
	{ symbol: 'BANKEX', price: 62769.43, pct: -0.21 },
];

const UNIVERSE: Item[] = [
	...DEFAULT_LIST,
	...FNO.filter((s) => !DEFAULT_LIST.some((d) => d.symbol === s.symbol)).map((s) => ({ symbol: s.symbol, price: s.price, pct: s.change })),
];

const absChange = (item: Item) => (item.price * item.pct) / (100 + item.pct);
const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
const signed = (v: number, suffix = '') => `${v >= 0 ? '+' : ''}${v.toFixed(2)}${suffix}`;

function readLists(): Lists {
	try {
		const raw = window.localStorage.getItem(STORE_KEY);
		if (raw) return JSON.parse(raw) as Lists;
	} catch { /* fall through */ }
	return { 1: DEFAULT_LIST };
}

/* ------------------------------------------------------------------ Candles */

type Candle = { t: Date; o: number; h: number; l: number; c: number };

function tradingDays(count: number) {
	const days: Date[] = [];
	const d = new Date(2026, 9, 16);
	while (days.length < count) {
		if (d.getDay() !== 0 && d.getDay() !== 6) days.unshift(new Date(d));
		d.setDate(d.getDate() - 1);
	}
	return days;
}

const CANDLE_COUNT = 1250;
const DAYS = tradingDays(CANDLE_COUNT);

function makeCandles(item: Item): Candle[] {
	const rand = seeded('watchlist', item.symbol);
	const vol = item.symbol.includes('NIFTY') || item.symbol.includes('SENSEX') || item.symbol === 'BANKEX' ? 0.009 : 0.016;
	const closes: number[] = new Array(CANDLE_COUNT);
	closes[CANDLE_COUNT - 1] = item.price;
	closes[CANDLE_COUNT - 2] = item.price / (1 + item.pct / 100);
	let drift = 0;
	for (let i = CANDLE_COUNT - 3; i >= 0; i--) {
		drift = drift * 0.92 + (rand() - 0.5) * 0.004;
		closes[i] = closes[i + 1] / (1 + (rand() - 0.5) * 2 * vol + drift + 0.0004);
	}
	return closes.map((c, i) => {
		const o = i === CANDLE_COUNT - 1 ? c / (1 + item.pct / 100) * (1 + (rand() - 0.5) * 0.002) : (closes[i - 1] ?? c) * (1 + (rand() - 0.5) * vol * 0.5);
		const span = Math.abs(c - o) + c * vol * rand() * 0.6;
		return { t: DAYS[i], o, c, h: Math.max(o, c) + span * rand(), l: Math.min(o, c) - span * rand() };
	});
}

const RANGES = [['5y', 1250], ['1y', 250], ['6m', 125], ['3m', 63], ['1m', 21], ['5d', 5]] as const;
type Range = (typeof RANGES)[number][0];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function PriceChart({ item, height }: { item: Item; height: number }) {
	const [wrapRef, width] = useWidth<HTMLDivElement>();
	const [range, setRange] = useState<Range>('6m');
	const [oiProfile, setOiProfile] = useState(true);
	const [hover, setHover] = useState<number | null>(null);
	const svgRef = useRef<SVGSVGElement>(null);

	const all = useMemo(() => makeCandles(item), [item]);
	const count = RANGES.find(([r]) => r === range)?.[1] ?? 125;
	const candles = all.slice(-count);
	const axisW = 70;
	const toolsW = 0;
	const plotW = Math.max(200, width - axisW - toolsW);
	const plotH = Math.max(160, height - 30);
	const hi = Math.max(...candles.map((c) => c.h));
	const lo = Math.min(...candles.map((c) => c.l));
	const pad = (hi - lo) * 0.08;
	const top = hi + pad;
	const bottom = lo - pad;
	const y = (v: number) => ((top - v) / (top - bottom)) * plotH;
	const slot = plotW / candles.length;
	const body = Math.max(1, Math.min(14, slot * 0.62));
	const last = all[all.length - 1];
	const shownIndex = hover !== null ? all.length - candles.length + hover : all.length - 1;
	const shown = all[shownIndex];
	const chg = shown.c - (all[shownIndex - 1] ?? shown).c;

	const ticks = useMemo(() => {
		const raw = (top - bottom) / Math.max(6, Math.floor(plotH / 42));
		const mag = 10 ** Math.floor(Math.log10(raw));
		const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw) ?? raw;
		const out: number[] = [];
		for (let v = Math.ceil(bottom / step) * step; v <= top; v += step) out.push(v);
		return out;
	}, [top, bottom, plotH]);

	const xLabels = useMemo(() => {
		const out: { i: number; label: string }[] = [];
		const every = Math.max(1, Math.round(candles.length / Math.max(2, Math.floor(plotW / 110))));
		candles.forEach((c, i) => {
			const prev = candles[i - 1];
			const monthChange = !prev || prev.t.getMonth() !== c.t.getMonth();
			if (count > 300 ? monthChange && c.t.getMonth() === 0 : count > 30 ? monthChange : i % every === 0) {
				out.push({ i, label: count > 300 ? String(c.t.getFullYear()) : count > 30 ? MONTHS[c.t.getMonth()] : `${c.t.getDate()} ${MONTHS[c.t.getMonth()]}` });
			}
		});
		return out;
	}, [candles, count, plotW]);

	const oiBars = useMemo(() => {
		const rand = seeded('oi-profile', item.symbol);
		const step = ticks.length > 1 ? (ticks[1] - ticks[0]) / 4 : (top - bottom) / 40;
		const band = last.c * 0.06;
		const out: { v: number; call: number; put: number }[] = [];
		for (let v = Math.ceil((last.c - band) / step) * step; v <= Math.min(top, last.c + band); v += step) {
			const near = 1 - Math.abs(v - last.c) / band;
			const call = v >= last.c - step * 2 ? (0.25 + rand() * 0.75) * (0.35 + near * 0.65) : rand() * 0.12;
			const put = v <= last.c + step * 2 ? (0.25 + rand() * 0.75) * (0.35 + near * 0.65) : rand() * 0.12;
			out.push({ v, call, put });
		}
		return out;
	}, [item.symbol, ticks, top, last.c]);

	const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return;
		const i = Math.floor((e.clientX - rect.left) / slot);
		setHover(i >= 0 && i < candles.length ? i : null);
	};

	const tone = (v: number) => (v >= 0 ? 'up' : 'down');

	return (
		<div className="wl-chart">
			<div className="wl-chart-bar">
				<span className="wl-chart-sym"><Search size={14} /> {item.symbol}</span>
				<button type="button" className="wl-tb" aria-label="Compare"><Plus size={16} /></button>
				<span className="wl-sep" />
				<button type="button" className="wl-tb on">D</button>
				<span className="wl-sep" />
				<button type="button" className="wl-tb" aria-label="Candles"><CandlestickChart size={16} /></button>
				<button type="button" className="wl-tb" aria-label="Indicators"><BarChart3 size={16} /></button>
				<span className="wl-sep" />
				<label className="wl-check"><input type="checkbox" /> Default Template</label>
				<label className="wl-check"><input type="checkbox" checked={oiProfile} onChange={(e) => setOiProfile(e.target.checked)} /> OI Profile <i>New</i></label>
				<span className="wl-grow" />
				<button type="button" className="wl-tb" aria-label="Chart settings"><Settings size={16} /></button>
				<button type="button" className="wl-tb" aria-label="Snapshot"><Camera size={16} /></button>
			</div>
			<div className="wl-chart-body">
				<div className="wl-draw" aria-hidden="true">
					{[Crosshair, Slash, PencilLine, Type, Smile, Ruler, ZoomIn, Magnet, Lock, Eraser, Trash2].map((Icon, i) => <span key={i}><Icon size={17} strokeWidth={1.5} /></span>)}
				</div>
				<div className="wl-plot" ref={wrapRef}>
					<p className="wl-ohlc">
						<b>{item.symbol} · 1D · NSE</b>
						<span>O<em className={tone(chg)}>{fmt(shown.o)}</em></span>
						<span>H<em className={tone(chg)}>{fmt(shown.h)}</em></span>
						<span>L<em className={tone(chg)}>{fmt(shown.l)}</em></span>
						<span>C<em className={tone(chg)}>{fmt(shown.c)}</em></span>
						<em className={tone(chg)}>{signed(chg)} ({signed((chg / (shown.c - chg)) * 100, '%')})</em>
					</p>
					<svg ref={svgRef} width={plotW + axisW} height={plotH + 24} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`${item.symbol} daily candlestick chart`}>
						{ticks.map((v) => (
							<g key={v}>
								<line x1={0} x2={plotW} y1={y(v)} y2={y(v)} stroke="#1f2328" />
								<text x={plotW + 8} y={y(v) + 4} className="wl-axis">{v.toLocaleString('en-IN', { useGrouping: true, maximumFractionDigits: v < 100 ? 2 : 0 })}</text>
							</g>
						))}
						{xLabels.map(({ i, label }) => (
							<g key={`${i}-${label}`}>
								<line x1={i * slot + slot / 2} x2={i * slot + slot / 2} y1={0} y2={plotH} stroke="#1a1d21" />
								<text x={i * slot + slot / 2} y={plotH + 18} className="wl-axis" textAnchor="middle">{label}</text>
							</g>
						))}
						{oiProfile
							? oiBars.map((bar) => (
								<g key={bar.v} opacity="0.7">
									<rect x={plotW - bar.call * plotW * 0.24} y={y(bar.v) - 2.6} width={bar.call * plotW * 0.24} height="2.4" fill="#e0605a" />
									<rect x={plotW - bar.put * plotW * 0.24} y={y(bar.v) + 0.4} width={bar.put * plotW * 0.24} height="2.4" fill="#5cb85c" />
								</g>
							))
							: null}
						{candles.map((c, i) => {
							const x = i * slot + slot / 2;
							const up = c.c >= c.o;
							const color = up ? '#26a69a' : '#ef5350';
							return (
								<g key={c.t.getTime()}>
									<line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1" />
									<rect x={x - body / 2} y={y(Math.max(c.o, c.c))} width={body} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={color} />
								</g>
							);
						})}
						<line x1={0} x2={plotW} y1={y(last.c)} y2={y(last.c)} stroke="#26a69a" strokeDasharray="2 3" />
						<rect x={plotW} y={y(last.c) - 9} width={axisW - 4} height="18" rx="2" fill="#26a69a" />
						<text x={plotW + 6} y={y(last.c) + 4} className="wl-axis wl-axis--last">{fmt(last.c)}</text>
						{hover !== null ? (
							<g pointerEvents="none">
								<line x1={hover * slot + slot / 2} x2={hover * slot + slot / 2} y1={0} y2={plotH} stroke="#9aa0a6" strokeDasharray="4 4" />
								<rect x={Math.min(plotW - 80, Math.max(0, hover * slot + slot / 2 - 40))} y={plotH + 4} width="80" height="18" rx="2" fill="#363a45" />
								<text x={Math.min(plotW - 40, Math.max(40, hover * slot + slot / 2))} y={plotH + 17} className="wl-axis wl-axis--hover" textAnchor="middle">
									{`${candles[hover].t.getDate()} ${MONTHS[candles[hover].t.getMonth()]} '${String(candles[hover].t.getFullYear()).slice(2)}`}
								</text>
							</g>
						) : null}
					</svg>
				</div>
			</div>
			<div className="wl-chart-foot">
				{RANGES.map(([r]) => (
					<button key={r} type="button" className={r === range ? 'on' : ''} onClick={() => setRange(r)}>{r}</button>
				))}
				<span className="wl-grow" />
				<span className="wl-note">Model prices, not a live exchange feed</span>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------- List */

type SortMode = 'default' | 'az' | 'gainers' | 'losers';

function AddInstrument({ existing, onAdd, onClose }: { existing: Item[]; onAdd: (item: Item) => void; onClose: () => void }) {
	const [q, setQ] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	useEffect(() => inputRef.current?.focus(), []);
	const results = UNIVERSE.filter((i) => i.symbol.includes(q.trim().toUpperCase())).slice(0, 40);
	return (
		<div className="wl-add">
			<label className="ac-search">
				<Search size={15} />
				<input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search eg: NIFTY, RELIANCE" aria-label="Search instruments" onKeyDown={(e) => e.key === 'Escape' && onClose()} />
				<button type="button" className="wl-icon" aria-label="Close search" onClick={onClose}><X size={15} /></button>
			</label>
			<ul>
				{results.map((item) => {
					const added = existing.some((e) => e.symbol === item.symbol);
					return (
						<li key={item.symbol}>
							<span>{item.symbol}</span>
							<span className={item.pct >= 0 ? 'up' : 'down'}>{fmt(item.price)}</span>
							<button type="button" disabled={added} onClick={() => onAdd(item)}>{added ? 'Added' : <><Plus size={14} /> Add</>}</button>
						</li>
					);
				})}
				{results.length === 0 ? <li className="wl-none">No instruments match “{q}”.</li> : null}
			</ul>
		</div>
	);
}

function WatchRow({ item, selected, open, showAbs, onSelect, onToggle, onRemove }: {
	item: Item; selected: boolean; open: boolean; showAbs: boolean; onSelect: () => void; onToggle: () => void; onRemove: () => void;
}) {
	const candles = useMemo(() => makeCandles(item), [item]);
	const today = candles[candles.length - 1];
	const prevClose = item.price / (1 + item.pct / 100);
	const tone = item.pct >= 0 ? 'up' : 'down';
	return (
		<li className={`wl-row ${selected ? 'selected' : ''} ${open ? 'open' : ''}`}>
			<div className="wl-row-main">
				<button type="button" className="wl-icon" aria-label={open ? `Collapse ${item.symbol}` : `Expand ${item.symbol}`} aria-expanded={open} onClick={onToggle}>
					{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</button>
				<button type="button" className="wl-row-btn" onClick={onSelect}>
					<span className="wl-sym">{item.symbol}</span>
					<span className="wl-px">{fmt(item.price)}</span>
					<span className={`wl-pct ${tone}`}>{signed(item.pct, '%')}</span>
					{showAbs ? <span className="wl-abs">{signed(absChange(item))}</span> : null}
				</button>
				<span className="wl-row-actions">
					<Link to={`/tools/option-chain?symbol=${encodeURIComponent(item.symbol)}`} className="wl-icon" title="Option chain" aria-label={`${item.symbol} option chain`}><Network size={15} /></Link>
					<Link to={`/tools/strategy-builder?instrument_symbol=${encodeURIComponent(item.symbol)}`} className="wl-icon" title="Strategy builder" aria-label={`${item.symbol} strategy builder`}><PencilLine size={15} /></Link>
					<button type="button" className="wl-icon" title="Remove" aria-label={`Remove ${item.symbol}`} onClick={onRemove}><Trash2 size={15} /></button>
				</span>
			</div>
			{open ? (
				<div className="wl-row-detail">
					<dl>
						<div><dt>Open</dt><dd>{fmt(today.o)}</dd></div>
						<div><dt>High</dt><dd>{fmt(today.h)}</dd></div>
						<div><dt>Low</dt><dd>{fmt(today.l)}</dd></div>
						<div><dt>Close</dt><dd>{fmt(prevClose)}</dd></div>
					</dl>
					<div className="wl-bs">
						<button type="button" className="wl-buy" disabled title="Connect a broker to trade">B</button>
						<button type="button" className="wl-sell" disabled title="Connect a broker to trade">S</button>
					</div>
				</div>
			) : null}
		</li>
	);
}

export function WatchlistPage() {
	const desktop = useIsDesktop();
	const [lists, setLists] = useState<Lists>(() => (typeof window === 'undefined' ? { 1: DEFAULT_LIST } : readLists()));
	const [active, setActive] = useState(1);
	const [selected, setSelected] = useState('NIFTY');
	const [open, setOpen] = useState<string | null>(null);
	const [adding, setAdding] = useState(false);
	const [sort, setSort] = useState<SortMode>('default');
	const [menu, setMenu] = useState<'sort' | 'settings' | null>(null);
	const [showAbs, setShowAbs] = useState(true);
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		window.localStorage.setItem(STORE_KEY, JSON.stringify(lists));
	}, [lists]);

	const items = lists[active] ?? [];
	const sorted = useMemo(() => {
		const copy = [...items];
		if (sort === 'az') copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
		if (sort === 'gainers') copy.sort((a, b) => b.pct - a.pct);
		if (sort === 'losers') copy.sort((a, b) => a.pct - b.pct);
		return copy;
	}, [items, sort]);
	const chartItem = UNIVERSE.find((i) => i.symbol === selected) ?? items[0] ?? DEFAULT_LIST[0];

	const update = (next: Item[]) => setLists((prev) => ({ ...prev, [active]: next }));

	const panel = (
		<aside className={`wl-panel ${collapsed ? 'collapsed' : ''}`}>
			<div className="wl-lists" role="tablist" aria-label="Watchlists">
				{Array.from({ length: LIST_COUNT }, (_, i) => i + 1).map((n) => (
					<button key={n} type="button" role="tab" aria-selected={n === active} className={n === active ? 'on' : ''} onClick={() => { setActive(n); setOpen(null); setAdding(false); }}>{n}</button>
				))}
			</div>
			<div className="wl-actions">
				<button type="button" className="ac-btn grow" onClick={() => setAdding(!adding)}>Add Instrument/Stock</button>
				<Link to="/tools/strategy-builder" className="ac-btn grow">Add Strategy</Link>
				<span className="wl-menu-wrap">
					<button type="button" className={`ac-btn icon ${menu === 'sort' ? 'on' : ''}`} aria-label="Sort watchlist" aria-expanded={menu === 'sort'} onClick={() => setMenu(menu === 'sort' ? null : 'sort')}><ArrowUpDown size={15} /></button>
					{menu === 'sort' ? (
						<div className="wl-menu">
							{([['default', 'Default order'], ['az', 'Name A–Z'], ['gainers', 'Top gainers'], ['losers', 'Top losers']] as const).map(([id, label]) => (
								<button key={id} type="button" className={sort === id ? 'on' : ''} onClick={() => { setSort(id); setMenu(null); }}>{label}</button>
							))}
						</div>
					) : null}
				</span>
				<span className="wl-menu-wrap">
					<button type="button" className={`ac-btn icon ${menu === 'settings' ? 'on' : ''}`} aria-label="Watchlist settings" aria-expanded={menu === 'settings'} onClick={() => setMenu(menu === 'settings' ? null : 'settings')}><Settings size={15} /></button>
					{menu === 'settings' ? (
						<div className="wl-menu">
							<label><input type="checkbox" checked={showAbs} onChange={(e) => setShowAbs(e.target.checked)} /> Show absolute change</label>
							<button type="button" onClick={() => { update(DEFAULT_LIST); setMenu(null); }}>Reset this watchlist</button>
						</div>
					) : null}
				</span>
			</div>
			{adding ? <AddInstrument existing={items} onAdd={(item) => update([...items, item])} onClose={() => setAdding(false)} /> : null}
			<p className="wl-title">Watchlist {active}</p>
			{items.length === 0 ? (
				<div className="wl-empty">
					<Empty title="This watchlist is empty">Add instruments or stocks to track them here.</Empty>
					<button type="button" className="sb-btn-primary" onClick={() => setAdding(true)}>Add Instrument/Stock</button>
				</div>
			) : (
				<ul className="wl-rows">
					{sorted.map((item) => (
						<WatchRow
							key={item.symbol}
							item={item}
							selected={item.symbol === chartItem.symbol}
							open={open === item.symbol}
							showAbs={showAbs}
							onSelect={() => setSelected(item.symbol)}
							onToggle={() => setOpen(open === item.symbol ? null : item.symbol)}
							onRemove={() => update(items.filter((i) => i.symbol !== item.symbol))}
						/>
					))}
				</ul>
			)}
			<p className="wl-feedback">Like this feature? We would love to hear from you <Link to="/help">Give us Feedback</Link></p>
		</aside>
	);

	return (
		<TerminalPage title="Watchlist" active="watchlist" className="ac-app">
			<main className={desktop ? 'wl wl--desktop' : 'wl'}>
				{panel}
				{desktop ? (
					<section className="wl-main">
						<button type="button" className="wl-collapse" aria-label={collapsed ? 'Show watchlist' : 'Hide watchlist'} onClick={() => setCollapsed(!collapsed)}>
							<ChevronLeft size={15} className={collapsed ? 'flip' : ''} />
						</button>
						<PriceChart item={chartItem} height={typeof window !== 'undefined' ? Math.max(420, window.innerHeight - 64 - 130) : 600} />
					</section>
				) : (
					<section className="wl-main"><PriceChart item={chartItem} height={340} /></section>
				)}
			</main>
			<MobileTabBar active="watchlist" />
			<LoginModal />
		</TerminalPage>
	);
}
