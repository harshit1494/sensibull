import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronDown, Lock, Minus, PencilRuler, Search, SlidersHorizontal, TrendingUp, X, ZoomIn, ZoomOut } from 'lucide-react';
import '@/components/tools/trade-pages.css';
import { LoginBanner, TerminalPage, openLogin } from '@/components/tools/terminal-chrome';
import { PayoffIcon } from '@/components/tools/strategy-builder';
import { seeded } from '@/lib/market-mock';
import { timeline, spotSeries } from '@/lib/intraday-mock';
import { EXPIRIES, INSTRUMENTS, PRESETS, atmStrike, buildPreset, formatInr, makeLeg, modelPrice, payoffAt, summarise, type Instrument, type Leg, type PresetId } from '@/lib/strategy-math';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const inr = (v: number) => formatInr(v);
const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const instBy = (s: string) => INSTRUMENTS.find((i) => i.symbol === s) ?? INSTRUMENTS[0];

function legText(l: Leg, symbol: string) {
	return `${l.side === 'B' ? 'BUY' : 'SELL'} ${l.lots > 1 ? `${l.lots}x ` : ''}${symbol} ${l.expiry} ${l.strike} ${l.right}`;
}

/** Shift a preset's strikes so its sweet spot sits around `target`. */
function presetAround(id: PresetId, inst: Instrument, target: number, expiry: string, shiftSteps = 0): Leg[] {
	const expIdx = Math.max(0, EXPIRIES.indexOf(expiry));
	const base = buildPreset(id, inst.spot, inst.step, expiry);
	const atm = atmStrike(inst.spot, inst.step);
	const anchor = atmStrike(target, inst.step) + shiftSteps * inst.step;
	const neutral = ['short-straddle', 'short-strangle', 'iron-fly', 'iron-condor'].includes(id);
	// Directional trades place the short / profit zone near the target, entry near spot.
	const shift = neutral ? anchor - atm : Math.round(((anchor - atm) * 0.5) / inst.step) * inst.step;
	return base.map((l) => {
		const strike = l.strike + shift;
		return makeLeg({ ...l, strike, price: modelPrice(inst.spot, strike, l.right, Math.max(expIdx, EXPIRIES.indexOf(l.expiry))) });
	});
}

/* ------------------------------------------------------------------ */
/* Ticker picker shared by Wizard                                      */
/* ------------------------------------------------------------------ */
function TickerBox({ inst, onPick }: { inst: Instrument; onPick: (s: string) => void }) {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState('');
	const list = INSTRUMENTS.filter((i) => i.symbol.includes(q.toUpperCase()) || i.name.toLowerCase().includes(q.toLowerCase()));
	return (
		<div className="sw-ticker">
			<button type="button" className="sw-ticker-main" onClick={() => setOpen(!open)}>
				<Search size={14} /> <strong>{inst.symbol}</strong> {inst.spot.toFixed(2)} <em className={inst.change >= 0 ? 'up' : 'down'}>{pct(inst.change)}</em>
			</button>
			<Link className="sb-chip" to={`/tools/live-options-charts?tradingsymbol=${inst.symbol}`} aria-label="Chart"><TrendingUp size={13} /></Link>
			{open ? (
				<>
					<button type="button" className="msd-back" aria-label="Close" onClick={() => setOpen(false)} />
					<div className="sb-pop">
						<input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stock / index" />
						{list.map((i) => (
							<button key={i.symbol} type="button" onClick={() => { onPick(i.symbol); setOpen(false); setQ(''); }}>
								<strong>{i.symbol}</strong><span>{i.spot.toFixed(2)}</span>
							</button>
						))}
					</div>
				</>
			) : null}
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Strategy Wizard                                                     */
/* ------------------------------------------------------------------ */
type Prediction = '' | 'above' | 'below' | 'between';
type WizResult = { id: PresetId; name: string; legs: Leg[]; atTarget: number; maxProfit: number | null; maxLoss: number | null; pop: number; premium: number; buyOnly: boolean };

const CANDIDATES: Record<Exclude<Prediction, ''>, PresetId[]> = {
	above: ['bull-call', 'buy-call', 'bull-put', 'call-ratio', 'bull-fly', 'bull-condor', 'sell-put', 'range-forward'],
	below: ['bear-put', 'buy-put', 'bear-call', 'put-ratio', 'bear-fly', 'bear-condor', 'sell-call'],
	between: ['iron-condor', 'iron-fly', 'short-strangle', 'short-straddle', 'bull-fly', 'bear-fly'],
};

export function StrategyWizard() {
	const [params, setParams] = useSearchParams();
	const navigate = useNavigate();
	const inst = instBy((params.get('tradingsymbol') ?? 'NIFTY').toUpperCase());
	const [pred, setPred] = useState<Prediction>('');
	const [target, setTarget] = useState(String(Math.round(inst.spot)));
	const [target2, setTarget2] = useState(String(Math.round(inst.spot * 1.01)));
	const [date, setDate] = useState(EXPIRIES[0]);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [maxLossCap, setMaxLossCap] = useState(0);
	const [buyOnly, setBuyOnly] = useState(false);
	const [minPop, setMinPop] = useState(0);
	const [ran, setRan] = useState<null | { pred: Exclude<Prediction, ''>; t1: number; t2: number; date: string }>(null);
	const [predOpen, setPredOpen] = useState(false);

	useEffect(() => { setTarget(String(Math.round(inst.spot))); setTarget2(String(Math.round(inst.spot * 1.01))); setRan(null); }, [inst.symbol, inst.spot]);

	const results = useMemo<WizResult[]>(() => {
		if (!ran) return [];
		const mid = ran.pred === 'between' ? (ran.t1 + ran.t2) / 2 : ran.t1;
		return CANDIDATES[ran.pred]
			.map((id) => {
				const legs = presetAround(id, inst, mid, ran.date);
				const s = summarise(legs, inst.spot, inst.step, inst.lot, 1);
				const atTarget = ran.pred === 'between'
					? Math.min(payoffAt(legs, ran.t1, inst.lot, 1), payoffAt(legs, ran.t2, inst.lot, 1), payoffAt(legs, mid, inst.lot, 1))
					: payoffAt(legs, ran.t1, inst.lot, 1);
				const premium = legs.reduce((a, l) => a + (l.side === 'B' ? 1 : -1) * l.price * l.lots * inst.lot, 0);
				return { id, name: PRESETS.find((p) => p.id === id)?.name ?? id, legs, atTarget, maxProfit: s.maxProfit, maxLoss: s.maxLoss, pop: s.pop, premium, buyOnly: legs.every((l) => l.side === 'B') };
			})
			.filter((r) => r.atTarget > 0)
			.filter((r) => !buyOnly || r.buyOnly)
			.filter((r) => r.pop >= minPop)
			.filter((r) => !maxLossCap || (r.maxLoss !== null && Math.abs(r.maxLoss) <= maxLossCap))
			.sort((a, b) => (b.atTarget / Math.abs(b.maxLoss ?? 1e7)) - (a.atTarget / Math.abs(a.maxLoss ?? 1e7)));
	}, [ran, inst, buyOnly, minPop, maxLossCap]);

	const t1 = Number(target), t2 = Number(target2);
	const canGo = pred !== '' && t1 > 0 && (pred !== 'between' || t2 > t1);
	const go = () => canGo && setRan({ pred: pred as Exclude<Prediction, ''>, t1, t2, date });
	const predLabel = { '': 'Select', above: 'Above', below: 'Below', between: 'Between' }[pred];
	const shown = results.slice(0, 4);
	const locked = results.length - shown.length;
	const openBuilder = (r: WizResult) => {
		try { sessionStorage.setItem('sb-wizard-legs', JSON.stringify({ symbol: inst.symbol, name: r.name, legs: r.legs })); } catch { /* ignore */ }
		navigate(`/tools/strategy-builder?instrument_symbol=${inst.symbol}&preset=${r.id}`);
	};

	return (
		<TerminalPage title="Strategy Wizard" active="trade" className="tp-page">
			<div className="tp-shell sw-shell">
				<div className="sw-bar">
					<label className="sw-field"><span>Stock Name</span><TickerBox inst={inst} onPick={(s) => setParams({ tradingsymbol: s }, { replace: true })} /></label>
					<div className="sw-field">
						<span>Prediction</span>
						<div className="sw-select">
							<button type="button" className={pred ? '' : 'ph'} onClick={() => setPredOpen(!predOpen)}>{predLabel} <ChevronDown size={15} /></button>
							{predOpen ? (
								<>
									<button type="button" className="msd-back" aria-label="Close" onClick={() => setPredOpen(false)} />
									<div className="sw-menu">
										{(['above', 'below', 'between'] as const).map((p) => (
											<button key={p} type="button" className={pred === p ? 'on' : ''} onClick={() => { setPred(p); setPredOpen(false); }}>
												{p === 'above' ? <ArrowUp size={15} className="up" /> : p === 'below' ? <ArrowDown size={15} className="down" /> : <Minus size={15} />}
												{p === 'above' ? 'Above' : p === 'below' ? 'Below' : 'Between'}
												{pred === p ? <Check size={15} className="sw-tick" /> : null}
											</button>
										))}
									</div>
								</>
							) : null}
						</div>
					</div>
					<label className="sw-field">
						<span>{inst.symbol} Target</span>
						<div className="sw-targets">
							<input type="number" step={inst.step} value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
							{pred === 'between' ? <><em>and</em><input type="number" step={inst.step} value={target2} onChange={(e) => setTarget2(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} /></> : null}
						</div>
					</label>
					<label className="sw-field">
						<span>Target Date</span>
						<select className="sb-sel sw-date" value={date} onChange={(e) => setDate(e.target.value)}>
							{EXPIRIES.slice(0, 5).map((e) => <option key={e}>{e}</option>)}
						</select>
					</label>
					<div className="sw-field sw-actions">
						<span>&nbsp;</span>
						<div>
							<div className="sw-filter-wrap">
								<button type="button" className="sw-filters" disabled={!pred} onClick={() => setFiltersOpen(!filtersOpen)}>
									<SlidersHorizontal size={14} /> Filters{buyOnly || minPop || maxLossCap ? <i className="sw-dot" /> : null}
								</button>
								{filtersOpen ? (
									<>
										<button type="button" className="msd-back" aria-label="Close" onClick={() => setFiltersOpen(false)} />
										<div className="sw-filter-pop">
											<p className="sw-pop-title">Filters</p>
											<label className="sw-row">Max loss up to
												<select className="sb-sel" value={maxLossCap} onChange={(e) => setMaxLossCap(Number(e.target.value))}>
													<option value={0}>Any</option>
													{[2500, 5000, 10000, 25000, 50000].map((v) => <option key={v} value={v}>{inr(v)}</option>)}
												</select>
											</label>
											<label className="sw-row">Probability of profit at least
												<select className="sb-sel" value={minPop} onChange={(e) => setMinPop(Number(e.target.value))}>
													{[0, 30, 40, 50, 60].map((v) => <option key={v} value={v}>{v ? `${v}%` : 'Any'}</option>)}
												</select>
											</label>
											<label className="sw-check"><input type="checkbox" checked={buyOnly} onChange={() => setBuyOnly(!buyOnly)} /> Only option buying (no margin)</label>
											<div className="msd-foot">
												<button type="button" className="sb-link" onClick={() => { setMaxLossCap(0); setMinPop(0); setBuyOnly(false); }}>Reset</button>
												<button type="button" className="msd-apply" onClick={() => { setFiltersOpen(false); go(); }}>Apply</button>
											</div>
										</div>
									</>
								) : null}
							</div>
							<button type="button" className="sw-go" disabled={!canGo} onClick={go}>Go</button>
						</div>
					</div>
				</div>

				{!ran ? (
					<div className="sw-empty">
						<svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
							<defs><linearGradient id="swg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b57cf6" /><stop offset="1" stopColor="#5e7bf0" /></linearGradient></defs>
							<rect x="10" y="14" width="54" height="54" rx="10" fill="url(#swg)" transform="rotate(-8 37 41)" />
							{[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={19 + c * 11} y={23 + r * 11} width="6" height="6" rx="1.5" fill="#2d1b55" opacity=".55" transform="rotate(-8 37 41)" />))}
							<circle cx="58" cy="50" r="12" fill="none" stroke="#6ad7f5" strokeWidth="5" />
							<path d="M66 59l9 9" stroke="#6ad7f5" strokeWidth="6" strokeLinecap="round" />
						</svg>
						<p>Tell us where a stock is going and we will give you smart option strategies to trade.</p>
					</div>
				) : (
					<div className="sw-results">
						<p className="sw-res-head">
							{results.length} trades for <b>{inst.symbol}</b> to close {ran.pred === 'between' ? <>between <b>{ran.t1}</b> and <b>{ran.t2}</b></> : <>{ran.pred} <b>{ran.t1}</b></>} on <b>{ran.date}</b>
						</p>
						{results.length === 0 ? <p className="sw-none">No trades match your filters. Try relaxing the max loss or probability filter.</p> : null}
						<div className="sw-list">
							{shown.map((r, i) => (
								<div key={r.id} className="sw-res">
									<div className="sw-res-top">
										<span className="sw-res-icon"><PayoffIcon id={r.id} /></span>
										<div className="sw-res-name">
											<strong>{r.name}</strong>{i === 0 ? <em className="mm-badge blue">Best match</em> : null}
											<p>{r.legs.map((l) => <span key={l.id} className={l.side === 'B' ? 'b' : 's'}>{legText(l, inst.symbol)} @ {l.price.toFixed(2)}</span>)}</p>
										</div>
										<div className="sw-res-btns">
											<button type="button" className="sb-link" onClick={() => openBuilder(r)}><PencilRuler size={14} /> Open in Builder</button>
											<button type="button" className="sw-trade" onClick={openLogin}>Trade</button>
										</div>
									</div>
									<dl className="sw-stats">
										<div><dt>Profit at target</dt><dd className="up">{inr(r.atTarget)}</dd></div>
										<div><dt>Max profit</dt><dd className="up">{r.maxProfit === null ? 'Unlimited' : inr(r.maxProfit)}</dd></div>
										<div><dt>Max loss</dt><dd className="down">{r.maxLoss === null ? 'Unlimited' : inr(Math.abs(r.maxLoss))}</dd></div>
										<div><dt>Prob. of profit</dt><dd>{r.pop}%</dd></div>
										<div><dt>{r.premium >= 0 ? 'Premium pay' : 'Premium get'}</dt><dd>{inr(Math.abs(r.premium))}</dd></div>
										<div><dt>Return on risk</dt><dd>{r.maxLoss ? `${Math.round((r.atTarget / Math.abs(r.maxLoss)) * 100)}%` : '∞'}</dd></div>
									</dl>
								</div>
							))}
						</div>
						{locked > 0 ? (
							<div className="sw-lock">
								<Lock size={18} />
								<div><strong>{locked} more trade{locked > 1 ? 's' : ''} found</strong><p>Login with your broker to see every trade the wizard found, with live prices and margin.</p></div>
								<button type="button" className="sb-btn-primary" onClick={openLogin}>Login to unlock</button>
							</div>
						) : null}
						<p className="sw-caution"><AlertTriangle size={14} /> Prices shown are indicative mock prices. Trades only make money if the stock behaves as you predicted — always check max loss before trading.</p>
					</div>
				)}
			</div>
		</TerminalPage>
	);
}

/* ------------------------------------------------------------------ */
/* Expiry Trades                                                       */
/* ------------------------------------------------------------------ */
const EXPIRY_INDICES: { symbol: string; expiry: string; available?: string; spot?: number; change?: number }[] = [
	{ symbol: 'NIFTY', expiry: 'Monday' },
	{ symbol: 'FINNIFTY', expiry: 'Tuesday', available: '23 Oct 9:15AM' },
	{ symbol: 'BANKNIFTY', expiry: 'Tuesday', available: '23 Oct 9:15AM' },
	{ symbol: 'BANKEX', expiry: 'Thursday', available: '27 Oct 9:15AM' },
	{ symbol: 'SENSEX', expiry: 'Thursday' },
];
type View = 'bullish' | 'bearish' | 'neutral';
const LEVELS: { name: string; tone: string; mult: number; emoji?: string }[] = [
	{ name: 'Defensive', tone: 'def', mult: -0.25 },
	{ name: 'Moderate', tone: 'mod', mult: 0.1 },
	{ name: 'Aggressive', tone: 'agg', mult: 0.35 },
	{ name: 'YOLO', tone: 'yolo', mult: 1.2, emoji: '🔥😎' },
];

function useCountdown(target: Date) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, []);
	let s = Math.max(0, Math.floor((target.getTime() - now) / 1000));
	if (s === 0) s = 24 * 3600 + 59 * 60 + 22; // mock data is frozen before expiry
	const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function ExpiryTrades() {
	const [symbol, setSymbol] = useState('NIFTY');
	const [view, setView] = useState<View>('bullish');
	const [zoom, setZoom] = useState(1);
	const [pick, setPick] = useState<number | null>(null);
	const [lots, setLots] = useState(1);
	const inst = instBy(symbol);
	const ticks = useMemo(() => timeline(5, 5), []);
	const series = useMemo(() => spotSeries(inst, ticks), [inst, ticks]);
	const left = useCountdown(new Date('2026-10-19T15:30:00+05:30'));

	const step = inst.step;
	const move = inst.spot * 0.0035;
	const levels = LEVELS.map((lv) => {
		const off = Math.max(step * 0.5, move * (1 + lv.mult * 2.2));
		if (view === 'bullish') return { ...lv, lo: Math.ceil((inst.spot + off - move * 1.1) / step) * step, hi: null as number | null };
		if (view === 'bearish') return { ...lv, lo: Math.floor((inst.spot - off + move * 1.1) / step) * step, hi: null };
		const w = Math.round((move * (2.2 - lv.mult * 1.4)) / step) * step;
		return { ...lv, lo: atmStrike(inst.spot, step) - Math.max(step, w), hi: atmStrike(inst.spot, step) + Math.max(step, w) };
	});
	useEffect(() => setPick(null), [view, symbol]);

	// chart geometry
	const W = 860, H = 420, L = 8, T = 14, B = 26;
	const futureFrac = 0.3;
	const iw = W - L - 8, ih = H - T - B;
	const visible = series.slice(Math.floor(series.length * (1 - 1 / zoom)));
	const vTicks = ticks.slice(Math.floor(ticks.length * (1 - 1 / zoom)));
	const lvVals = levels.flatMap((l) => [l.lo, l.hi ?? l.lo]);
	const lo = Math.min(...visible, ...lvVals) - move * 0.4, hi = Math.max(...visible, ...lvVals) + move * 0.4;
	const x = (i: number) => L + (iw * (1 - futureFrac) * i) / (visible.length - 1);
	const y = (v: number) => T + ih - ((v - lo) / (hi - lo)) * ih;
	const path = visible.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
	const expiryX = L + iw * 0.97;
	const dayStarts = vTicks.map((t, i) => (i === 0 || t.day !== vTicks[i - 1].day ? i : -1)).filter((i) => i >= 0);
	const sel = pick !== null ? levels[pick] : null;
	// Ladder labels follow their price level, but never overlap each other.
	const rungTops = (() => {
		const raw = levels.map((lv) => ((y(lv.lo) + (lv.hi !== null ? y(lv.hi) : y(lv.lo))) / 2 / H) * 100);
		const order = raw.map((v, i) => i).sort((a, b) => raw[a] - raw[b]);
		const out = [...raw];
		order.forEach((i, k) => { if (k) out[i] = Math.max(out[i], out[order[k - 1]] + 11); });
		const over = Math.max(...out) - 92;
		return over > 0 ? out.map((v) => v - over) : out;
	})();

	const trade = useMemo(() => {
		if (!sel) return null;
		const exp = EXPIRIES[0];
		let legs: Leg[];
		if (view === 'neutral') {
			const wing = step * 4;
			legs = [
				makeLeg({ side: 'B', right: 'PE', strike: sel.lo - wing, expiry: exp, lots, price: 0 }),
				makeLeg({ side: 'S', right: 'PE', strike: sel.lo, expiry: exp, lots, price: 0 }),
				makeLeg({ side: 'S', right: 'CE', strike: sel.hi ?? sel.lo, expiry: exp, lots, price: 0 }),
				makeLeg({ side: 'B', right: 'CE', strike: (sel.hi ?? sel.lo) + wing, expiry: exp, lots, price: 0 }),
			];
		} else {
			const right = view === 'bullish' ? 'CE' : 'PE';
			const d = view === 'bullish' ? 1 : -1;
			const buy = sel.lo - d * step * (sel.tone === 'yolo' ? 0 : 2);
			legs = sel.tone === 'yolo'
				? [makeLeg({ side: 'B', right, strike: sel.lo, expiry: exp, lots, price: 0 })]
				: [makeLeg({ side: 'B', right, strike: buy, expiry: exp, lots, price: 0 }), makeLeg({ side: 'S', right, strike: sel.lo + d * step * 2, expiry: exp, lots, price: 0 })];
		}
		legs = legs.map((l) => ({ ...l, price: modelPrice(inst.spot, l.strike, l.right, 0) }));
		const s = summarise(legs, inst.spot, step, inst.lot, 1);
		const premium = legs.reduce((a, l) => a + (l.side === 'B' ? 1 : -1) * l.price * l.lots * inst.lot, 0);
		return { legs, s, premium };
	}, [sel, view, lots, inst, step]);

	return (
		<TerminalPage title="Expiry Trades" active="trade" className="tp-page">
			<div className="tp-shell">
				<LoginBanner />
				<div className="et-head">
					<p>Where will {symbol} close on Expiry?</p>
					<div className="et-seg">
						{(['bullish', 'bearish', 'neutral'] as const).map((v) => <button key={v} type="button" className={view === v ? 'on' : ''} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
					</div>
					<div className="et-zoom">
						<button type="button" onClick={() => setZoom(Math.min(5, zoom + 1))} aria-label="Zoom in"><ZoomIn size={15} /></button>
						<button type="button" onClick={() => setZoom(Math.max(1, zoom - 1))} aria-label="Zoom out"><ZoomOut size={15} /></button>
					</div>
				</div>
				<div className="et-body">
					<aside className="et-list">
						{EXPIRY_INDICES.map((e) => {
							const i = INSTRUMENTS.find((x) => x.symbol === e.symbol);
							const disabled = Boolean(e.available);
							return (
								<button key={e.symbol} type="button" disabled={disabled} className={symbol === e.symbol ? 'on' : ''} onClick={() => setSymbol(e.symbol)}>
									<span className="et-name">{e.symbol} <em>Expiry: {e.expiry}</em></span>
									{disabled ? <small>(available from {e.available})</small> : i ? <small className="et-px">{i.spot.toFixed(2)} <b className={i.change >= 0 ? 'up' : 'down'}>{pct(i.change)}</b></small> : null}
								</button>
							);
						})}
					</aside>
					<div className="et-chart">
						<span className="et-left">⏰ Time left: {left}</span>
						<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
							{Array.from({ length: 8 }, (_, k) => <line key={k} x1={L} x2={W - 8} y1={T + (ih * k) / 7} y2={T + (ih * k) / 7} className="et-grid" />)}
							{dayStarts.map((i) => <line key={`v${i}`} x1={x(i)} x2={x(i)} y1={T} y2={T + ih} className="et-grid" />)}
							{levels.map((lv, k) => (
								<g key={lv.name} className={`et-lv ${lv.tone} ${pick === k ? 'on' : ''}`}>
									<line x1={L} x2={expiryX} y1={y(lv.lo)} y2={y(lv.lo)} />
									{lv.hi !== null ? <line x1={L} x2={expiryX} y1={y(lv.hi)} y2={y(lv.hi)} /> : null}
								</g>
							))}
							<line x1={x(visible.length - 1)} x2={expiryX} y1={y(inst.spot)} y2={y(inst.spot)} className="et-spot-dash" />
							<path d={path} className="et-line" />
							<circle cx={x(visible.length - 1)} cy={y(inst.spot)} r={3.5} className="et-dot" />
							<line x1={expiryX} x2={expiryX} y1={T} y2={T + ih} className="et-expiry" />
							{dayStarts.map((i) => <text key={`t${i}`} x={x(i) + 4} y={H - 8} className="et-ax">{vTicks[i].label.split(',')[0]}</text>)}
							<text x={expiryX - 4} y={H - 8} textAnchor="end" className="et-ax">19 Oct</text>
						</svg>
						<span className="et-expiry-tag" style={{ left: `${(expiryX / W) * 100}%` }}>Expiry 🏁</span>
					</div>
					<div className="et-ladder">
						{levels.map((lv, k) => (
							<button key={lv.name} type="button" className={`et-rung ${lv.tone} ${pick === k ? 'on' : ''}`} style={{ top: `${rungTops[k]}%` }} onClick={() => setPick(pick === k ? null : k)}>
								<span>{view === 'bullish' ? `Above ${lv.lo}` : view === 'bearish' ? `Below ${lv.lo}` : `${lv.lo} – ${lv.hi}`}</span>
								<b>{lv.name}{lv.emoji ? ` ${lv.emoji}` : ''}</b>
							</button>
						))}
						<i className={`et-bar ${view}`} />
					</div>
				</div>
				{trade && sel ? (
					<div className="et-trade">
						<div className="et-trade-head">
							<div>
								<p className="et-trade-title">{sel.name} trade · {view === 'bullish' ? `${symbol} above ${sel.lo}` : view === 'bearish' ? `${symbol} below ${sel.lo}` : `${symbol} between ${sel.lo} and ${sel.hi}`} on expiry</p>
								<p className="et-trade-legs">{trade.legs.map((l) => <span key={l.id} className={l.side === 'B' ? 'b' : 's'}>{legText(l, symbol)} @ {l.price.toFixed(2)}</span>)}</p>
							</div>
							<button type="button" className="et-x" onClick={() => setPick(null)} aria-label="Close"><X size={18} /></button>
						</div>
						<dl className="sw-stats">
							<div><dt>Max profit</dt><dd className="up">{trade.s.maxProfit === null ? 'Unlimited' : inr(trade.s.maxProfit)}</dd></div>
							<div><dt>Max loss</dt><dd className="down">{trade.s.maxLoss === null ? 'Unlimited' : inr(Math.abs(trade.s.maxLoss))}</dd></div>
							<div><dt>Prob. of profit</dt><dd>{trade.s.pop}%</dd></div>
							<div><dt>Breakeven</dt><dd>{trade.s.breakevens.map((b) => Math.round(b)).join(', ') || '—'}</dd></div>
							<div><dt>{trade.premium >= 0 ? 'Premium pay' : 'Premium get'}</dt><dd>{inr(Math.abs(trade.premium))}</dd></div>
						</dl>
						<div className="et-trade-foot">
							<div className="eo-lots"><button type="button" onClick={() => setLots(Math.max(1, lots - 1))}>−</button><span>{lots} lot{lots > 1 ? 's' : ''}</span><button type="button" onClick={() => setLots(lots + 1)}>+</button></div>
							<Link className="sb-link" to={`/tools/strategy-builder?instrument_symbol=${symbol}`}><PencilRuler size={14} /> Open in Builder</Link>
							<button type="button" className="sw-trade" onClick={openLogin}>Place Trade</button>
						</div>
					</div>
				) : (
					<p className="et-hint">Pick a target on the right — {view === 'neutral' ? 'a range' : 'how far'} you think {symbol} will {view === 'bullish' ? 'rise' : view === 'bearish' ? 'fall' : 'stay within'} by expiry — and we’ll show you a trade for it.</p>
				)}
			</div>
		</TerminalPage>
	);
}

/* ------------------------------------------------------------------ */
/* Easy Options                                                        */
/* ------------------------------------------------------------------ */
const EASY: { symbol: string; q: string; expiry: string; about: string; color: string; letter: string }[] = [
	{ symbol: 'NIFTY', q: 'tomorrow', expiry: 'Expiring tomorrow at 3:40 PM', about: 'NIFTY shows the average price of 50 top Indian companies. When people say the market is up or down, they usually mean NIFTY moved. It is similar to SENSEX.', color: '#f26b3a', letter: 'N' },
	{ symbol: 'BANKNIFTY', q: 'in 9 days', expiry: 'Expiring coming Tuesday at 3:40 PM', about: 'BANKNIFTY tracks India’s biggest and most traded bank stocks. It tends to move more than NIFTY on any given day.', color: '#3b7be8', letter: 'B' },
	{ symbol: 'FINNIFTY', q: 'in 9 days', expiry: 'Expiring coming Tuesday at 3:40 PM', about: 'FINNIFTY follows financial companies — banks, NBFCs and insurers. It moves very closely with BANKNIFTY.', color: '#2aa198', letter: 'F' },
	{ symbol: 'SENSEX', q: 'in 4 days', expiry: 'Expiring coming Thursday at 3:40 PM', about: 'SENSEX is BSE’s index of 30 large companies. Its options are cheap per lot, which makes it popular with new traders.', color: '#8b5cf6', letter: 'S' },
];

function dailyPath(inst: Instrument) {
	const rnd = seeded('easy', inst.symbol);
	const n = 19;
	const raw = [0];
	for (let i = 1; i < n; i++) raw.push(raw[i - 1] + (rnd() - 0.5) * 2.2);
	const start = inst.spot * (1 + (rnd() - 0.3) * 0.05);
	return raw.map((w, i) => {
		const t = i / (n - 1);
		return start + (inst.spot - start) * t + (w - t * raw[n - 1]) * inst.spot * 0.0045;
	});
}
const EASY_DATES = ['Sep 21', 'Sep 22', 'Sep 23', 'Sep 24', 'Sep 25', 'Sep 28', 'Sep 29', 'Sep 30', 'Oct 1', 'Oct 5', 'Oct 6', 'Oct 7', 'Oct 8', 'Oct 9', 'Oct 12', 'Oct 13', 'Oct 14', 'Oct 15', 'Oct 16'];

function EasyCard({ cfg }: { cfg: (typeof EASY)[number] }) {
	const inst = instBy(cfg.symbol);
	const pts = useMemo(() => dailyPath(inst), [inst]);
	const [dir, setDir] = useState<'up' | 'neutral' | 'down' | null>(null);
	const [lots, setLots] = useState(1);
	const [hover, setHover] = useState<number | null>(null);
	const W = 900, H = 200, R = 58, T = 10, B = 24;
	const lo = Math.min(...pts) * 0.998, hi = Math.max(...pts) * 1.002;
	const x = (i: number) => (i / (pts.length - 1)) * (W - R);
	const y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
	const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
	const yt = Array.from({ length: 6 }, (_, k) => lo + ((hi - lo) * k) / 5);
	const gid = `eog-${cfg.symbol}`;

	const trade = useMemo(() => {
		if (!dir) return null;
		const atm = atmStrike(inst.spot, inst.step);
		const exp = EXPIRIES[cfg.symbol === 'NIFTY' ? 0 : 1];
		const w = inst.step * 2;
		const legs = dir === 'up'
			? [makeLeg({ side: 'B', right: 'CE', strike: atm, expiry: exp, lots, price: 0 }), makeLeg({ side: 'S', right: 'CE', strike: atm + w * 2, expiry: exp, lots, price: 0 })]
			: dir === 'down'
				? [makeLeg({ side: 'B', right: 'PE', strike: atm, expiry: exp, lots, price: 0 }), makeLeg({ side: 'S', right: 'PE', strike: atm - w * 2, expiry: exp, lots, price: 0 })]
				: [makeLeg({ side: 'B', right: 'PE', strike: atm - w * 3, expiry: exp, lots, price: 0 }), makeLeg({ side: 'S', right: 'PE', strike: atm - w, expiry: exp, lots, price: 0 }), makeLeg({ side: 'S', right: 'CE', strike: atm + w, expiry: exp, lots, price: 0 }), makeLeg({ side: 'B', right: 'CE', strike: atm + w * 3, expiry: exp, lots, price: 0 })];
		const priced = legs.map((l) => ({ ...l, price: modelPrice(inst.spot, l.strike, l.right, EXPIRIES.indexOf(exp)) }));
		const s = summarise(priced, inst.spot, inst.step, inst.lot, 1);
		return { legs: priced, s };
	}, [dir, lots, inst, cfg.symbol]);

	return (
		<section className="eo-card">
			<div className="eo-q"><p>Where do you think {cfg.symbol} will go {cfg.q}?</p><span className="eo-exp">{cfg.expiry}</span></div>
			<div className="eo-main">
				<div className="eo-info">
					<div className="eo-id"><span className="eo-logo" style={{ background: cfg.color }}>{cfg.letter}</span><div><strong>{cfg.symbol}</strong><p>{inst.spot.toFixed(2)} <em className={inst.change >= 0 ? 'up' : 'down'}>{pct(inst.change)}</em></p></div></div>
					<p className="eo-about">{cfg.about}</p>
				</div>
				<div className="eo-chart">
					<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onMouseLeave={() => setHover(null)} onMouseMove={(e) => {
						const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
						const i = Math.round((((e.clientX - r.left) / r.width) * W / (W - R)) * (pts.length - 1));
						setHover(i >= 0 && i < pts.length ? i : null);
					}}>
						<defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#68a5ea" stopOpacity=".45" /><stop offset="1" stopColor="#68a5ea" stopOpacity="0" /></linearGradient></defs>
						{yt.map((v) => <g key={v}><line x1={0} x2={W - R} y1={y(v)} y2={y(v)} className="eo-grid" /><text x={W - R + 6} y={y(v) + 4} className="eo-ax">{Math.round(v).toLocaleString('en-IN')}</text></g>)}
						<path d={`${line}L${x(pts.length - 1)},${H - B}L0,${H - B}Z`} fill={`url(#${gid})`} />
						<path d={line} className="eo-line" />
						{EASY_DATES.map((d, i) => (i % 2 === 0 ? <text key={d} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : 'middle'} className="eo-ax">{d}</text> : null))}
						{hover !== null ? <g><line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="eo-cross" /><circle cx={x(hover)} cy={y(pts[hover])} r={4} className="eo-dot" /></g> : null}
					</svg>
					{hover !== null ? <div className="eo-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>{EASY_DATES[hover]} · {pts[hover].toFixed(2)}</div> : null}
				</div>
			</div>
			<div className="eo-btns">
				{(['up', 'neutral', 'down'] as const).map((d) => (
					<button key={d} type="button" className={`${d} ${dir === d ? 'on' : ''}`} onClick={() => setDir(dir === d ? null : d)}>
						{d === 'up' ? <ArrowUp size={15} /> : d === 'down' ? <ArrowDown size={15} /> : <Minus size={15} />} {d.toUpperCase()}
					</button>
				))}
			</div>
			{trade && dir ? (
				<div className="eo-trade">
					<p className="eo-trade-line">
						If {cfg.symbol} {dir === 'up' ? 'goes up' : dir === 'down' ? 'goes down' : 'stays in a range'} {cfg.q}, you can make up to <b className="up">{trade.s.maxProfit === null ? 'unlimited' : inr(trade.s.maxProfit)}</b>. The most you can lose is <b className="down">{trade.s.maxLoss === null ? 'unlimited' : inr(Math.abs(trade.s.maxLoss))}</b>.
					</p>
					<p className="eo-trade-legs">{trade.legs.map((l) => <span key={l.id} className={l.side === 'B' ? 'b' : 's'}>{legText(l, cfg.symbol)}</span>)}</p>
					<div className="et-trade-foot">
						<div className="eo-lots"><button type="button" onClick={() => setLots(Math.max(1, lots - 1))}>−</button><span>{lots} lot{lots > 1 ? 's' : ''}</span><button type="button" onClick={() => setLots(lots + 1)}>+</button></div>
						<span className="eo-pop">Chance of profit ~{trade.s.pop}%</span>
						<button type="button" className="sw-trade" onClick={openLogin}>Trade now</button>
					</div>
				</div>
			) : null}
		</section>
	);
}

export function EasyOptions() {
	return (
		<TerminalPage title="Easy Options" active="trade" className="tp-page">
			<div className="tp-shell">
				<LoginBanner />
				<div className="eo-wrap">
					<h2 className="eo-title">Simple, low-risk, and fun option trading</h2>
					{EASY.map((c) => <EasyCard key={c.symbol} cfg={c} />)}
				</div>
			</div>
		</TerminalPage>
	);
}

/* ------------------------------------------------------------------ */
/* Mindful Trading                                                     */
/* ------------------------------------------------------------------ */
function Meditator() {
	return (
		<svg className="mt-figure" width="150" height="150" viewBox="0 0 150 150" aria-hidden="true">
			<ellipse cx="75" cy="138" rx="52" ry="7" fill="#000" opacity=".25" />
			{/* legs */}
			<path d="M28 124c10-16 34-20 47-12 13-8 37-4 47 12-14 8-34 9-47 4-13 5-33 4-47-4z" fill="#26324a" />
			{/* body */}
			<path d="M52 118l4-46c2-10 10-14 19-14s17 4 19 14l4 46z" fill="#2f3e5c" />
			<path d="M68 60h14l-7 30z" fill="#e8ecf2" />
			<path d="M73 64h4l1 18-3 6-3-6z" fill="#e0533f" />
			{/* arms */}
			<path d="M56 74c-12 10-20 22-26 34l8 4c6-10 14-20 22-27z" fill="#2f3e5c" />
			<path d="M94 74c12 10 20 22 26 34l-8 4c-6-10-14-20-22-27z" fill="#2f3e5c" />
			<circle cx="31" cy="112" r="6" fill="#f0c19c" />
			<circle cx="119" cy="112" r="6" fill="#f0c19c" />
			{/* head */}
			<rect x="70" y="46" width="10" height="10" rx="3" fill="#e5b08a" />
			<circle cx="75" cy="36" r="15" fill="#f0c19c" />
			<path d="M60 34c0-12 8-18 16-18s15 6 15 16c-4-5-10-7-16-6-6 0-11 3-15 8z" fill="#3a2b22" />
			<path d="M64 42c3 8 8 11 11 11s9-3 11-11c-3 4-7 6-11 6s-8-2-11-6z" fill="#3a2b22" />
			<path d="M68 36q3 2 5 0M77 36q3 2 5 0" stroke="#3a2b22" strokeWidth="1.4" fill="none" strokeLinecap="round" />
		</svg>
	);
}

const RULE_DEFAULTS = { trades: 5, loss: 5000, pause: 2 };

export function MindfulTrading() {
	const [step, setStep] = useState<0 | 1 | 2>(0);
	const [rules, setRules] = useState(RULE_DEFAULTS);
	const [phase, setPhase] = useState(0);
	const [left, setLeft] = useState(0);
	useEffect(() => {
		if (step !== 2) return;
		setLeft(rules.pause * 60);
		const id = window.setInterval(() => { setPhase((p) => (p + 1) % 3); }, 4000);
		const tick = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
		return () => { window.clearInterval(id); window.clearInterval(tick); };
	}, [step, rules.pause]);
	const words = ['Stop', 'Breathe', 'Think'];

	return (
		<TerminalPage title="Mindful Trading" active="trade" className="tp-page">
			<div className="tp-shell">
				<LoginBanner />
				<div className="mt-hero">
					{step === 0 ? (
						<>
							<h2>Stop Impulsive Trading</h2>
							<p>Unplanned trades in the heat of the moment often lead to poor decisions and losses. Sensibull helps you control your impulsive trades.</p>
							<button type="button" className="mt-cta" onClick={() => setStep(1)}>Get Started</button>
							<Meditator />
							<p className="mt-tag"><b>Stop.</b> <b className="blue">Breathe.</b> <b>Think</b></p>
							<p className="mt-sub">And then decide to trade or not</p>
							<div className="mt-how">
								{[['Set your limits', 'Choose how many trades and how much loss is okay for one day.'], ['Get a nudge', 'When you cross a limit we pause you before the next order.'], ['Decide calmly', 'A short breathing break, then you choose — trade or walk away.']].map(([t, d], i) => (
									<div key={t}><span>{i + 1}</span><strong>{t}</strong><p>{d}</p></div>
								))}
							</div>
						</>
					) : null}
					{step === 1 ? (
						<div className="mt-setup">
							<h2>Set your daily limits</h2>
							<p>We’ll step in before you place a trade that breaks these.</p>
							<label>Max trades per day<div className="eo-lots"><button type="button" onClick={() => setRules({ ...rules, trades: Math.max(1, rules.trades - 1) })}>−</button><span>{rules.trades}</span><button type="button" onClick={() => setRules({ ...rules, trades: rules.trades + 1 })}>+</button></div></label>
							<label>Max loss per day
								<select className="sb-sel" value={rules.loss} onChange={(e) => setRules({ ...rules, loss: Number(e.target.value) })}>
									{[1000, 2500, 5000, 10000, 25000, 50000].map((v) => <option key={v} value={v}>{inr(v)}</option>)}
								</select>
							</label>
							<label>Cool-off break
								<select className="sb-sel" value={rules.pause} onChange={(e) => setRules({ ...rules, pause: Number(e.target.value) })}>
									{[1, 2, 5, 10, 15].map((v) => <option key={v} value={v}>{v} min</option>)}
								</select>
							</label>
							<div className="mt-setup-btns">
								<button type="button" className="sb-link" onClick={() => setStep(0)}>Back</button>
								<button type="button" className="mt-cta" onClick={() => setStep(2)}>Save &amp; try a break</button>
							</div>
						</div>
					) : null}
					{step === 2 ? (
						<div className="mt-break">
							<div className={`mt-orb p${phase}`}><span>{words[phase]}</span></div>
							<p className="mt-tag"><b className={phase === 0 ? 'blue' : ''}>Stop.</b> <b className={phase === 1 ? 'blue' : ''}>Breathe.</b> <b className={phase === 2 ? 'blue' : ''}>Think</b></p>
							<p className="mt-sub">Break ends in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>
							<p className="mt-rules">Your limits: {rules.trades} trades · {inr(rules.loss)} loss · {rules.pause} min break</p>
							<div className="mt-setup-btns">
								<button type="button" className="sb-link" onClick={() => setStep(1)}>Edit limits</button>
								<button type="button" className="mt-cta" onClick={openLogin}>Turn on for my account</button>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</TerminalPage>
	);
}

