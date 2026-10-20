import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import '@/components/tools/strategy-builder.css';
import { Link } from 'react-router';
import { AlignJustify, BookOpen, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, Info, LogIn, Minus, Plus, RefreshCw, Search, Settings, Trash2, TrendingUp, UserRound, ZoomOut } from 'lucide-react';
import { readSession, writeSession, type Session } from '@/lib/session';
import { MegaNav } from '@/components/tools/terminal-chrome';
import { BrandLockup } from '@/components/brand-logo';
import {
	EXPIRIES,
	INSTRUMENTS,
	LOT_CHOICES,
	PRESETS,
	atmStrike,
	buildPreset,
	callOi,
	formatInr,
	formatPx,
	legGreeks,
	makeLeg,
	modelPrice,
	payoffAt,
	putOi,
	samplePrices,
	summarise,
	targetPayoff,
	type Instrument,
	type Leg,
	type PresetGroup,
	type PresetId,
	type Right,
	type Side,
} from '@/lib/strategy-math';

const GROUPS: PresetGroup[] = ['Bullish', 'Bearish', 'Neutral', 'Others'];
const DAY_LABELS = ['Fri, 16 Oct 3:40 PM', 'Sat, 17 Oct 9:15 AM', 'Sun, 18 Oct 9:15 AM', 'Mon, 19 Oct 3:30 PM'];

type Draft = { id: string; name: string; symbol: string; legs: number };
type Saved = { id: string; name: string; symbol: string };

export function StrategyBuilder({ embedded = false }: { embedded?: boolean } = {}) {
	const [session, setSession] = useState<Session | null>(null);
	const [instrument, setInstrument] = useState<Instrument>(INSTRUMENTS[0]);
	const [spot, setSpot] = useState(INSTRUMENTS[0].spot);
	const [tickerOpen, setTickerOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [infoOpen, setInfoOpen] = useState(false);
	const [addOpen, setAddOpen] = useState(false);
	const [manualOn, setManualOn] = useState(false);
	const [manual, setManual] = useState(0);
	const [multiplier, setMultiplier] = useState(1);
	const [hedge, setHedge] = useState(200);
	const [group, setGroup] = useState<PresetGroup>('Bullish');
	const [presetExpiry, setPresetExpiry] = useState(EXPIRIES[0]);
	const [presetId, setPresetId] = useState<PresetId>('bull-call');
	const [strategyName, setStrategyName] = useState('Bull Call Spread');
	const [customName, setCustomName] = useState('New Strategy');
	const [legs, setLegs] = useState<Leg[]>(() => buildPreset('bull-call', INSTRUMENTS[0].spot, INSTRUMENTS[0].step, EXPIRIES[0]));
	const [tab, setTab] = useState<'ready' | 'positions' | 'saved' | 'drafts'>('ready');
	const [chartTab, setChartTab] = useState<'graph' | 'table' | 'greeks' | 'chart'>('graph');
	const [graphMode, setGraphMode] = useState<'graph' | 'table'>('graph');
	const [beMode, setBeMode] = useState<'target' | 'expiry'>('expiry');
	const [booked, setBooked] = useState(true);
	const [showSd, setShowSd] = useState(true);
	const [showOi, setShowOi] = useState(true);
	const [zoom, setZoom] = useState(1);
	const [dayIndex, setDayIndex] = useState(0);
	const [targetPct, setTargetPct] = useState(0);
	const [drafts, setDrafts] = useState<Draft[]>([]);
	const [saved, setSaved] = useState<Saved[]>([]);
	const [notice, setNotice] = useState<string | null>(null);
	const [updatedAt, setUpdatedAt] = useState(() => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }));
	const [ivOffset, setIvOffset] = useState(0);
	const [multiplyLots, setMultiplyLots] = useState(false);
	const [learnOpen, setLearnOpen] = useState(false);
	const [accountOpen, setAccountOpen] = useState(false);
	const [view, setView] = useState<'builder' | 'watchlist' | 'positions' | 'orders'>(() => {
		if (embedded || typeof window === 'undefined') return 'builder';
		const v = new URLSearchParams(window.location.search).get('view');
		return v === 'watchlist' || v === 'positions' || v === 'orders' ? v : 'builder';
	});

	useEffect(() => {
		const sync = () => setSession(readSession());
		sync();
		window.addEventListener('tigerbull-session', sync);
		return () => window.removeEventListener('tigerbull-session', sync);
	}, []);

	// Deep links from Strategy Wizard / Learn pages: ?instrument_symbol=NIFTY&preset=bull-call
	useEffect(() => {
		if (embedded) return;
		const qs = new URLSearchParams(window.location.search);
		const inst = INSTRUMENTS.find((i) => i.symbol === (qs.get('instrument_symbol') ?? '').toUpperCase());
		const pid = qs.get('preset') as PresetId | null;
		const base = inst ?? INSTRUMENTS[0];
		if (inst) { setInstrument(inst); setSpot(inst.spot); }
		let fromWizard: { symbol: string; name: string; legs: Leg[] } | null = null;
		try {
			const raw = sessionStorage.getItem('sb-wizard-legs');
			if (raw) { fromWizard = JSON.parse(raw); sessionStorage.removeItem('sb-wizard-legs'); }
		} catch { /* ignore */ }
		if (fromWizard && fromWizard.symbol === base.symbol && fromWizard.legs?.length) {
			setLegs(fromWizard.legs);
			setStrategyName(fromWizard.name);
			if (pid) setPresetId(pid);
		} else if (pid && PRESETS.some((p) => p.id === pid)) {
			const preset = PRESETS.find((p) => p.id === pid);
			setPresetId(pid);
			setGroup(preset?.group ?? 'Bullish');
			setStrategyName(preset?.name ?? 'Custom');
			setLegs(buildPreset(pid, base.spot, base.step, EXPIRIES[0]));
		}
	}, [embedded]);

	const summary = useMemo(
		() => summarise(legs, spot, instrument.step, instrument.lot, multiplier, manualOn ? manual : 0),
		[legs, spot, instrument, multiplier, manualOn, manual],
	);
	const activeCount = legs.filter((leg) => leg.on).length;
	const allOn = legs.length > 0 && activeCount === legs.length;
	const targetPrice = spot * (1 + targetPct / 100);
	const daysLeft = 3 - dayIndex;
	const pricePay = legs
		.filter((leg) => leg.on)
		.reduce((sum, leg) => sum + (leg.side === 'B' ? 1 : -1) * leg.price * leg.lots, 0);
	const premium = pricePay * instrument.lot * multiplier;

	function flash(message: string) {
		setNotice(message);
		window.setTimeout(() => setNotice(null), 2400);
	}

	function loadPreset(id: PresetId) {
		const preset = PRESETS.find((item) => item.id === id);
		setPresetId(id);
		setStrategyName(preset?.name ?? 'Custom');
		setLegs(buildPreset(id, spot, instrument.step, presetExpiry));
		setCustomName('New Strategy');
		const gap = instrument.step * 4;
		setHedge(gap);
	}

	function shiftStrikes(dir: number) {
		setLegs((current) => current.map((leg) => ({ ...leg, strike: leg.strike + dir * instrument.step })));
		setStrategyName('Custom');
	}

	function nudgeHedge(dir: number) {
		const next = Math.max(instrument.step, hedge + dir * instrument.step);
		setHedge(next);
		setLegs((current) => {
			if (current.length < 2) return current;
			const anchor = current[0].strike;
			return current.map((leg, index) => (index === 0 ? leg : { ...leg, strike: anchor + Math.sign(leg.strike - anchor || 1) * next }));
		});
	}

	function resetPrices() {
		setLegs((current) =>
			current.map((leg) => ({
				...leg,
				price: modelPrice(spot, leg.strike, leg.right, Math.max(0, EXPIRIES.indexOf(leg.expiry))),
			})),
		);
		flash('Prices reset to the model');
	}

	function openLogin() {
		window.dispatchEvent(new Event('tigerbull-open-login'));
	}

	const filtered = INSTRUMENTS.filter((item) => item.symbol.includes(query.toUpperCase()) || item.name.toLowerCase().includes(query.toLowerCase()));

	const beValue = summary.breakevens.length
		? summary.breakevens.map((value) => `${Math.round(beMode === 'target' ? value - instrument.step * 0.1 : value)} (${(((value - spot) / spot) * 100) >= 0 ? '+' : ''}${(((value - spot) / spot) * 100).toFixed(1)}%)`).join(', ')
		: '—';
	const rewardRisk = summary.maxProfit === null || summary.maxLoss === null || summary.maxLoss === 0 ? '∞' : (summary.maxProfit / Math.abs(summary.maxLoss)).toFixed(1);
	const futPrice = spot - spot * 0.0024;
	const sd1 = spot * 0.01478;

	return (
		<div className={embedded ? 'sb-app sb-app--embed' : 'sb-app'}>
			<header className="sb-top">
				<div className="sb-brand">
					<Link to={session ? '/home' : '/'} className="sb-logo" aria-label="TIGERBULL home">
						<BrandLockup size={24} />
					</Link>
					<em>/</em>
					{embedded ? <span className="sb-crumb">Strategy Builder</span> : <h1>Strategy Builder</h1>}
				</div>
				<MegaNav active="trade" />
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
							<button type="button" onClick={() => { writeSession(null); setSession(null); setAccountOpen(false); }}>Log out</button>
						</div>
					) : null}
				</div>
			</header>

			{view !== 'builder' ? (
				<AltView view={view} session={session} onLogin={openLogin} onBack={() => setView('builder')} instrument={instrument} />
			) : (
				<div className="sb-shell">
					{session || embedded ? null : (
						<div className="sb-banner">
							<p>Login with your broker for real-time prices and trading.</p>
							<button type="button" onClick={openLogin}>Login</button>
						</div>
					)}
					<div className="sb-grid">
						<div className="sb-left">
							<div className="sb-ticker-row">
								<div className="sb-ticker">
									<button type="button" className="sb-ticker-main" onClick={() => setTickerOpen(!tickerOpen)}>
										<Search size={16} />
										<strong>{instrument.symbol}</strong>
										<span>{spot.toFixed(2)}</span>
										<em className={instrument.change >= 0 ? 'up' : 'down'}>
											{instrument.change >= 0 ? '+' : ''}{instrument.change.toFixed(2)}%
										</em>
									</button>
									<button type="button" className="sb-chip" onClick={() => setInfoOpen(!infoOpen)} aria-label="Chart">
										<TrendingUp size={15} />
									</button>
									<button type="button" className="sb-chip" onClick={() => setInfoOpen(!infoOpen)}>Info</button>
									{tickerOpen ? (
										<div className="sb-pop">
											<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol" autoFocus />
											{filtered.map((item) => (
												<button
													key={item.symbol}
													type="button"
													onClick={() => {
														setInstrument(item);
														setSpot(item.spot);
														setLegs(buildPreset(presetId, item.spot, item.step, presetExpiry));
														setTickerOpen(false);
														setHedge(item.step * 4);
													}}
												>
													<strong>{item.symbol}</strong>
													<span>{item.name}</span>
												</button>
											))}
										</div>
									) : null}
									{infoOpen ? (
										<div className="sb-pop sb-info">
											<strong>{instrument.name}</strong>
											<p>Lot size {instrument.lot} · strike step {instrument.step} · tick 0.05</p>
											<p>Mock prices for this recreation, not a live exchange feed.</p>
										</div>
									) : null}
								</div>
								<button type="button" className="sb-settings" onClick={() => setSettingsOpen(!settingsOpen)}>
									<Settings size={17} /> Settings
								</button>
								{settingsOpen ? (
									<div className="sb-pop sb-settings-pop">
										<label>
											Spot override
											<input type="number" value={spot} onChange={(e) => setSpot(Number(e.target.value) || spot)} />
										</label>
										<label>
											Manual P/L default
											<input type="number" value={manual} onChange={(e) => setManual(Number(e.target.value) || 0)} />
										</label>
										<button type="button" onClick={() => { setSaved((list) => [{ id: `s-${list.length + 1}`, name: strategyName, symbol: instrument.symbol }, ...list]); setSettingsOpen(false); flash('Strategy saved'); }}>
											Save strategy
										</button>
									</div>
								) : null}
							</div>

							<section className="sb-card sb-new">
								<div className="sb-pad">
									<div className="sb-card-head">
										<strong>{customName}</strong>
										<button type="button" className="sb-link" onClick={() => { setLegs([]); setStrategyName('Custom'); }}>Clear New Trades</button>
									</div>
									<div className="sb-card-head">
										<label className="sb-checkline">
											<input type="checkbox" checked={allOn} onChange={() => setLegs((current) => current.map((leg) => ({ ...leg, on: !allOn })))} />
											{activeCount} selected - {strategyName}
										</label>
										<button type="button" className="sb-link" onClick={resetPrices}>
											<RefreshCw size={15} /> Reset Prices
										</button>
									</div>
									<div className="sb-legs">
										<div className="sb-leg-labels">
											<span />
											<span>B/S</span><span>Expiry</span><span>Strike</span><span>Type</span><span>Lots</span><span>Price</span><span />
										</div>
										{legs.map((leg) => (
											<div className="sb-leg" key={leg.id}>
												<input type="checkbox" checked={leg.on} onChange={() => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, on: !item.on } : item))} />
												<button
													type="button"
													className={leg.side === 'B' ? 'sb-side buy' : 'sb-side sell'}
													onClick={() => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, side: item.side === 'B' ? 'S' : 'B' } : item))}
												>
													{leg.side}
												</button>
												<select className="sb-sel" value={leg.expiry} onChange={(e) => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, expiry: e.target.value } : item))}>
													{EXPIRIES.map((expiry) => <option key={expiry}>{expiry}</option>)}
												</select>
												<div className="sb-stepper">
													<button type="button" aria-label="Decrement strike" onClick={() => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, strike: item.strike - instrument.step } : item))}><Minus size={14} /></button>
													<input type="number" value={leg.strike} onChange={(e) => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, strike: Number(e.target.value) || item.strike } : item))} />
													<button type="button" aria-label="Increment strike" onClick={() => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, strike: item.strike + instrument.step } : item))}><Plus size={14} /></button>
												</div>
												<button
													type="button"
													className="sb-right-btn"
													onClick={() => {
														const right: Right = leg.right === 'CE' ? 'PE' : 'CE';
														setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, right, price: modelPrice(spot, item.strike, right, Math.max(0, EXPIRIES.indexOf(item.expiry))) } : item));
													}}
												>
													{leg.right}
												</button>
												<select className="sb-sel sb-lots" value={leg.lots} onChange={(e) => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, lots: Number(e.target.value) } : item))}>
													{LOT_CHOICES.map((lots) => <option key={lots} value={lots}>{lots}</option>)}
												</select>
												<input className="sb-price" type="number" step="0.05" value={Number(leg.price.toFixed(2))} onChange={(e) => setLegs((current) => current.map((item) => item.id === leg.id ? { ...item, price: Number(e.target.value) || 0 } : item))} />
												<div className="sb-leg-icons">
													<button type="button" className="sb-icon" aria-label="Leg options" onClick={() => flash(`${leg.side === 'B' ? 'Buy' : 'Sell'} ${leg.lots} x ${leg.expiry} ${leg.strike} ${leg.right}`)}><AlignJustify size={16} /></button>
													<button type="button" className="sb-icon" aria-label="Delete leg" onClick={() => setLegs((current) => current.filter((item) => item.id !== leg.id))}><Trash2 size={16} /></button>
												</div>
											</div>
										))}
										{legs.length === 0 ? <p className="sb-empty">No legs. Load a ready-made strategy or add one.</p> : null}
									</div>
								</div>
								<div className="sb-controls">
									<Stepper label="Shift" value="-" onDec={() => shiftStrikes(-1)} onInc={() => shiftStrikes(1)} />
									<Stepper label="Width" value="-" disabled onDec={() => undefined} onInc={() => undefined} />
									<Stepper label="Hedge" value={String(hedge)} onDec={() => nudgeHedge(-1)} onInc={() => nudgeHedge(1)} />
								</div>
								<div className="sb-pad">
									<div className="sb-mult">
										<label>
											Multiplier
											<select className="sb-sel" value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))}>
												{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
											</select>
										</label>
										<span className="sb-pay">
											Price <b>{pricePay >= 0 ? 'Pay' : 'Get'} {Math.abs(pricePay).toFixed(1)}</b>
										</span>
										<span className="sb-pay">
											Premium <b>{premium >= 0 ? 'Pay' : 'Get'} {formatInr(Math.abs(premium))}</b>
										</span>
									</div>
									<div className="sb-actions">
										<button type="button" onClick={() => setAddOpen(true)}>Add/Edit</button>
										<button type="button" onClick={() => { setDrafts((list) => [{ id: `d-${list.length + 1}`, name: strategyName, symbol: instrument.symbol, legs: activeCount }, ...list]); flash('Added to draft portfolios'); }}>Add to Drafts</button>
										<button type="button" className="sb-trade" disabled={!session} onClick={() => flash('Order preview saved. This recreation does not send orders to a broker.')}>Trade All</button>
									</div>
								</div>
								<div className="sb-manual">
									<label>
										<input type="checkbox" checked={manualOn} onChange={() => setManualOn(!manualOn)} /> Manual P/L <HelpCircle size={15} />
									</label>
									{manualOn ? <input type="number" value={manual} onChange={(e) => setManual(Number(e.target.value) || 0)} /> : <button type="button" className="sb-link sb-link-lg" onClick={() => setManualOn(true)}>Add Manual P/L</button>}
								</div>
							</section>

							<section className="sb-card sb-ready">
								<div className="sb-tabs">
									{([['ready', 'Ready-made'], ['positions', 'Positions'], ['saved', 'Saved Strategies'], ['drafts', 'Draft Portfolios']] as const).map(([id, label]) => (
										<button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
									))}
								</div>
								<div className="sb-pad">
									{tab === 'ready' ? (
										<>
											<div className="sb-ready-head">
												<p>Please click on a ready-made strategy to load it</p>
												<button type="button" className="sb-link" onClick={() => setLearnOpen(!learnOpen)}><BookOpen size={15} /> Learn Options Strategies</button>
											</div>
											{learnOpen ? <p className="sb-note">A debit spread caps both profit and loss. A credit spread collects premium and risks the width. Straddles win from a large move either way.</p> : null}
											<div className="sb-ready-tools">
												<div className="sb-pills">
													{GROUPS.map((item) => (
														<button key={item} type="button" className={group === item ? 'on' : ''} onClick={() => setGroup(item)}>{item}</button>
													))}
												</div>
												<label className="sb-exp">
													Expiry
													<select className="sb-sel" value={presetExpiry} onChange={(e) => setPresetExpiry(e.target.value)}>
														{EXPIRIES.map((expiry) => <option key={expiry}>{expiry}</option>)}
													</select>
												</label>
											</div>
											<div className="sb-presets">
												{PRESETS.filter((preset) => preset.group === group).map((preset) => (
													<button key={preset.id} type="button" className={preset.id === presetId ? 'on' : ''} onClick={() => loadPreset(preset.id)}>
														<PayoffIcon id={preset.icon} />
														<span>{preset.name}</span>
													</button>
												))}
											</div>
										</>
									) : null}
									{tab === 'positions' ? (
										<div className="sb-blank">
											{session ? <p>No open {instrument.symbol} positions.</p> : <><p>Login with your broker to see your positions here.</p><button type="button" className="sb-btn-primary" onClick={openLogin}>Login</button></>}
										</div>
									) : null}
									{tab === 'saved' ? (
										<div className="sb-blank">
											{saved.length === 0 ? <p>No saved strategies yet. Use Settings → Save strategy.</p> : saved.map((item) => <p key={item.id}><strong>{item.name}</strong> · {item.symbol}</p>)}
										</div>
									) : null}
									{tab === 'drafts' ? (
										<div className="sb-blank">
											{drafts.length === 0 ? <p>Draft portfolios you add will show up here.</p> : drafts.map((item) => <p key={item.id}><strong>{item.name}</strong> · {item.symbol} · {item.legs} legs</p>)}
										</div>
									) : null}
								</div>
							</section>
							<p className="sb-updated">Prices last updated at {updatedAt}. (Prices are auto-refreshed every 30 seconds)</p>
							<button type="button" className="sb-important"><Info size={15} /> Important info</button>
						</div>

						<div className="sb-right">
							<section className="sb-card sb-summary">
								<div className="sb-sum-col">
									<div className="sb-sum-pair">
										<div>
											<span>Max Profit</span>
											<strong className="sb-val up">{summary.maxProfit === null ? 'Unlimited' : formatInr(summary.maxProfit, true)}</strong>
										</div>
										<div>
											<span>Max Loss <HelpCircle size={13} /></span>
											<strong className="sb-val down">{summary.maxLoss === null ? 'Unlimited' : formatInr(summary.maxLoss, true)}</strong>
										</div>
									</div>
									<div className="sb-be">
										<div className="sb-be-head">
											<span>Breakeven</span>
											<div className="sb-mini-tabs">
												<button type="button" className={beMode === 'target' ? 'on' : ''} onClick={() => setBeMode('target')}>Target</button>
												<button type="button" className={beMode === 'expiry' ? 'on' : ''} onClick={() => setBeMode('expiry')}>Expiry</button>
											</div>
											<HelpCircle size={13} />
										</div>
										<strong>{beValue}</strong>
									</div>
								</div>
								<div className="sb-sum-col sb-metrics">
									<p><span>Reward / Risk <button type="button" className="sb-tiny" onClick={() => flash('Reward / risk is max profit divided by max loss.')}>1/x</button></span><b>{rewardRisk}</b></p>
									<p><span>POP <HelpCircle size={13} /></span><b>{summary.pop}%</b></p>
									<p><span>Time Value <HelpCircle size={13} /></span><b>{formatInr(summary.timeValue)}</b></p>
									<p><span>Intrinsic Value <HelpCircle size={13} /></span><b>{formatInr(summary.intrinsicValue)}</b></p>
								</div>
								<div className="sb-sum-col sb-metrics">
									<p className="sb-fm">Funds &amp; Margins</p>
									<p><span>Standalone Funds <HelpCircle size={13} /></span><b>{session ? formatInr(250000) : '--'}</b></p>
									<p><span>Standalone Margin <HelpCircle size={13} /></span><b>{session ? formatInr(Math.abs(summary.maxLoss ?? summary.debit)) : '--'}</b></p>
								</div>
							</section>

							<section className="sb-card sb-chart-card">
								<div className="sb-chart-top">
									<div className="sb-seg">
										{([['graph', 'Payoff Graph'], ['table', 'P&L Table'], ['greeks', 'Greeks'], ['chart', 'Strategy Chart']] as const).map(([id, label]) => (
											<button key={id} type="button" className={chartTab === id ? 'on' : ''} onClick={() => setChartTab(id)}>{label}</button>
										))}
									</div>
									<label className="sb-toggle">
										<input type="checkbox" checked={booked} onChange={() => setBooked(!booked)} />
										<i />
										Add Booked P&amp;L
									</label>
								</div>
								{chartTab === 'graph' ? (
									<>
										<div className="sb-subtabs">
											<button type="button" className={graphMode === 'graph' ? 'on' : ''} onClick={() => setGraphMode('graph')}>Payoff Graph</button>
											<button type="button" className={graphMode === 'table' ? 'on' : ''} onClick={() => setGraphMode('table')}>Payoff Table</button>
											<div className="sb-sub-right">
												<button type="button" onClick={() => setShowSd(!showSd)}><span>SD</span> {showSd ? 'Fixed' : 'Off'} <ChevronDown size={14} /></button>
												<button type="button" onClick={() => setShowOi(!showOi)}>{showOi ? 'Open Interest' : 'No OI'} <ChevronDown size={14} /></button>
											</div>
										</div>
										{graphMode === 'graph' ? (
											<PayoffChart
												legs={legs}
												spot={spot}
												targetPrice={targetPrice}
												step={instrument.step}
												lot={instrument.lot}
												multiplier={multiplier}
												manual={manualOn && booked ? manual : 0}
												daysLeft={daysLeft}
												showOi={showOi}
												showSd={showSd}
												zoom={zoom}
												onZoom={() => setZoom(zoom === 1 ? 2 : 1)}
											/>
										) : (
											<PnlTable legs={legs} spot={spot} step={instrument.step} lot={instrument.lot} multiplier={multiplier} manual={manualOn ? manual : 0} daysLeft={daysLeft} />
										)}
										<div className="sb-sliders">
											<div>
												<div className="sb-slider-head">
													<div>
														<span>{instrument.symbol} Target</span>
														<button type="button" className="sb-link" onClick={() => setTargetPct(0)}>Reset</button>
													</div>
													<div className="sb-target-box">
														<em>{targetPct.toFixed(1)}%</em>
														<div className="sb-stepper sm">
															<button type="button" aria-label="Decrease target" onClick={() => setTargetPct(Math.round((targetPct - 0.1) * 10) / 10)}><Minus size={13} /></button>
															<input readOnly value={targetPrice.toFixed(2)} />
															<button type="button" aria-label="Increase target" onClick={() => setTargetPct(Math.round((targetPct + 0.1) * 10) / 10)}><Plus size={13} /></button>
														</div>
													</div>
												</div>
												<input className="sb-range" type="range" min={-8} max={8} step={0.1} value={targetPct} onChange={(e) => setTargetPct(Number(e.target.value))} style={{ '--p': `${((targetPct + 8) / 16) * 100}%` } as CSSProperties} />
											</div>
											<div>
												<div className="sb-slider-head">
													<div>
														<span>Date: {daysLeft}D to expiry <HelpCircle size={13} /></span>
														<button type="button" className="sb-link" onClick={() => setDayIndex(0)}>Reset</button>
													</div>
													<div className="sb-date-box">
														<button type="button" aria-label="Previous date" onClick={() => setDayIndex(Math.max(0, dayIndex - 1))}><ChevronLeft size={14} /></button>
														<em>{DAY_LABELS[dayIndex]}</em>
														<button type="button" aria-label="Next date" onClick={() => setDayIndex(Math.min(DAY_LABELS.length - 1, dayIndex + 1))}><ChevronRight size={14} /></button>
													</div>
												</div>
												<input className="sb-range" type="range" min={0} max={3} value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))} style={{ '--p': `${(dayIndex / 3) * 100}%` } as CSSProperties} />
												<div className="sb-date-scale"><span>16 Oct</span><span>19 Oct</span></div>
											</div>
										</div>
									</>
								) : null}
								{chartTab === 'table' ? <PnlTable legs={legs} spot={spot} step={instrument.step} lot={instrument.lot} multiplier={multiplier} manual={manualOn ? manual : 0} daysLeft={daysLeft} /> : null}
								{chartTab === 'greeks' ? <GreeksBlock legs={legs} spot={spot} lot={instrument.lot} multiplyLots={multiplyLots} /> : null}
								{chartTab === 'chart' ? <StrategyChart spot={spot} legs={legs} /> : null}
							</section>

							<section className="sb-card sb-bottom">
								<div className="sb-b-col">
									<div className="sb-b-head">
										<strong>Strikewise IVs</strong>
										<button type="button" className="sb-link" onClick={() => setIvOffset(0)}>Reset IVs</button>
									</div>
									<div className="sb-offset">
										<span>Offset</span>
										<div className="sb-stepper sm">
											<button type="button" aria-label="Decrease IV offset" onClick={() => setIvOffset(ivOffset - 1)}><Minus size={13} /></button>
											<input readOnly value={ivOffset} />
											<button type="button" aria-label="Increase IV offset" onClick={() => setIvOffset(ivOffset + 1)}><Plus size={13} /></button>
										</div>
									</div>
									<table className="sb-iv">
										<thead><tr><th>Strike</th><th>Expiry</th><th>IV</th><th>Chg</th></tr></thead>
										<tbody>
											{legs.map((leg) => {
												const iv = 10.6 + (Math.abs(leg.strike - atmStrike(spot, instrument.step)) / instrument.step) * 0.15 + ivOffset;
												const chg = -0.4 - (leg.right === 'CE' && leg.side === 'B' ? 0.4 : 0) + ivOffset;
												return (
													<tr key={leg.id}>
														<td>{leg.strike} <HelpCircle size={12} /></td>
														<td>{leg.expiry}</td>
														<td>
															<div className="sb-stepper xs">
																<button type="button" aria-label="Lower IV" onClick={() => setIvOffset(ivOffset - 1)}><Minus size={12} /></button>
																<input readOnly value={iv.toFixed(1)} />
																<button type="button" aria-label="Raise IV" onClick={() => setIvOffset(ivOffset + 1)}><Plus size={12} /></button>
															</div>
														</td>
														<td className={chg >= 0 ? 'up' : 'down'}>({chg >= 0 ? '+' : ''}{chg.toFixed(1)})</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
								<div className="sb-b-col">
									<div className="sb-b-head"><strong>Greeks</strong></div>
									<label className="sb-toggle"><input type="checkbox" checked={multiplyLots} onChange={() => setMultiplyLots(!multiplyLots)} /><i />Multiply by Lot Size</label>
									<label className="sb-toggle"><input type="checkbox" checked={multiplier > 1} onChange={() => setMultiplier(multiplier > 1 ? 1 : 2)} /><i />Multiply by Number of Lots</label>
									<GreeksBlock legs={legs} spot={spot} lot={instrument.lot} multiplyLots={multiplyLots} compact />
								</div>
								<div className="sb-b-col">
									<div className="sb-b-head"><strong>Target Day Futures Prices <HelpCircle size={13} /></strong></div>
									<p className="sb-fut"><span>{presetExpiry} FUT</span><b>{futPrice.toFixed(2)}</b></p>
									<div className="sb-b-head sb-sd-head"><strong>Standard Deviation <HelpCircle size={13} /></strong></div>
									<table className="sb-sd">
										<thead><tr><th>SD</th><th>Points</th><th>Price</th></tr></thead>
										<tbody>
											<tr><td>1 SD</td><td>{sd1.toFixed(1)} (1.5%)</td><td>{(spot - sd1).toFixed(1)}<br />{(spot + sd1).toFixed(1)}</td></tr>
											<tr><td>2 SD</td><td>{(sd1 * 2).toFixed(1)} (3%)</td><td>{(spot - sd1 * 2).toFixed(1)}<br />{(spot + sd1 * 2).toFixed(1)}</td></tr>
										</tbody>
									</table>
								</div>
							</section>
						</div>
					</div>
				</div>
			)}

			<button type="button" className="sb-fab" aria-label="Refresh prices" onClick={() => { resetPrices(); setUpdatedAt(new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })); }}>
				<RefreshCw size={20} />
			</button>
			{notice ? <div className="sb-toast">{notice}</div> : null}
			{addOpen ? (
				<AddLeg
					spot={spot}
					step={instrument.step}
					onClose={() => setAddOpen(false)}
					onAdd={(leg) => { setLegs((current) => [...current, leg]); setStrategyName('Custom'); setAddOpen(false); }}
				/>
			) : null}
		</div>
	);
}

function Stepper({ label, value, onDec, onInc, disabled }: { label: string; value: string; onDec: () => void; onInc: () => void; disabled?: boolean }) {
	return (
		<div className={disabled ? 'sb-ctrl off' : 'sb-ctrl'}>
			<span>{label}</span>
			<div>
				<button type="button" disabled={disabled} aria-label={`Decrease ${label}`} onClick={onDec}><Minus size={12} /></button>
				<input readOnly value={value} />
				<button type="button" disabled={disabled} aria-label={`Increase ${label}`} onClick={onInc}><Plus size={12} /></button>
			</div>
		</div>
	);
}

function AddLeg({ spot, step, onAdd, onClose }: { spot: number; step: number; onAdd: (leg: Leg) => void; onClose: () => void }) {
	const [side, setSide] = useState<Side>('B');
	const [right, setRight] = useState<Right>('CE');
	const [expiry, setExpiry] = useState(EXPIRIES[0]);
	const [strike, setStrike] = useState(atmStrike(spot, step));
	const [lots, setLots] = useState(1);
	return (
		<div className="sb-modal">
			<button type="button" className="sb-modal-back" aria-label="Close" onClick={onClose} />
			<form
				className="sb-modal-card"
				onSubmit={(event) => {
					event.preventDefault();
					onAdd(makeLeg({ side, right, expiry, strike, lots, price: modelPrice(spot, strike, right, Math.max(0, EXPIRIES.indexOf(expiry))) }));
				}}
			>
				<strong>Add leg</strong>
				<label>Side<select value={side} onChange={(e) => setSide(e.target.value as Side)}><option value="B">Buy</option><option value="S">Sell</option></select></label>
				<label>Expiry<select value={expiry} onChange={(e) => setExpiry(e.target.value)}>{EXPIRIES.map((item) => <option key={item}>{item}</option>)}</select></label>
				<label>Strike<input type="number" value={strike} onChange={(e) => setStrike(Number(e.target.value) || strike)} /></label>
				<label>Type<select value={right} onChange={(e) => setRight(e.target.value as Right)}><option>CE</option><option>PE</option></select></label>
				<label>Lots<input type="number" min={1} value={lots} onChange={(e) => setLots(Math.max(1, Number(e.target.value) || 1))} /></label>
				<div className="sb-actions">
					<button type="button" onClick={onClose}>Cancel</button>
					<button type="submit" className="on">Add leg</button>
				</div>
			</form>
		</div>
	);
}

export function PayoffIcon({ id }: { id: PresetId }) {
	const paths: Record<string, [string, string]> = {
		'buy-call': ['M2 32H30L38 24', 'M38 24L56 8'],
		'sell-put': ['M2 38L16 24', 'M16 24L32 8H56'],
		'bull-call': ['M2 32H16L26 24', 'M26 24L46 8H60'],
		'bull-put': ['M2 40H14L32 24', 'M32 24L40 17H56'],
		'call-ratio': ['M2 30H22L34 24', 'M34 24L56 6'],
		'calendar-call': ['M4 30H20L30 22', 'M30 22L48 12H58'],
		'bull-condor': ['M2 34H14L24 24L36 16H48L56 24', 'M24 24L36 16'],
		'bull-fly': ['M2 32H18L28 24', 'M28 24L36 8L46 24H58'],
		'range-forward': ['M2 34L24 24', 'M24 24L56 10'],
		synthetic: ['M2 32L30 24', 'M30 24L60 16'],
		'buy-put': ['M6 8L24 24', 'M24 24H58'],
		'sell-call': ['M4 16H28L40 24', 'M40 24L58 36'],
		'bear-put': ['M4 10H20L32 24', 'M32 24H58'],
		'bear-call': ['M4 14H22L34 24', 'M34 24H58'],
		'put-ratio': ['M6 8L20 24', 'M20 24H58'],
		'calendar-put': ['M6 12L22 22', 'M22 22H56'],
		'bear-condor': ['M4 12H16L26 24L38 30H58', 'M16 12L26 24'],
		'bear-fly': ['M4 14L16 24L28 8L40 24H56', 'M16 24L28 8'],
		'short-straddle': ['M4 10L20 24L40 10', 'M20 24H56'],
		'short-strangle': ['M4 12H16L24 24L40 24L48 12H58', 'M24 24H40'],
		'iron-fly': ['M4 30H16L28 16L40 30H56', 'M16 30L28 16'],
		'iron-condor': ['M4 30H12L20 18H40L48 30H58', 'M12 30L20 18'],
		'long-straddle': ['M4 30L22 12', 'M22 30L42 12H58'],
		'long-strangle': ['M4 28L16 14H28', 'M34 28L48 14H58'],
	};
	const [loss, profit] = paths[id] ?? paths['buy-call'];
	return (
		<svg viewBox="0 0 62 45" className="sb-icon-svg" aria-hidden="true">
			<line x1="2" y1="24" x2="60" y2="24" strokeDasharray="3 3" />
			<path d={loss} />
			<path d={profit} className="profit" />
		</svg>
	);
}

function PayoffChart({
	legs, spot, targetPrice, step, lot, multiplier, manual, daysLeft, showOi, showSd, zoom, onZoom,
}: {
	legs: Leg[]; spot: number; targetPrice: number; step: number; lot: number; multiplier: number; manual: number; daysLeft: number; showOi: boolean; showSd: boolean; zoom: number; onZoom: () => void;
}) {
	const width = 772;
	const height = 350;
	const pad = { l: 58, r: 58, t: 34, b: 30 };
	const plotW = width - pad.l - pad.r;
	const plotH = height - pad.t - pad.b;
	const sd = spot * 0.01478;
	const half = (sd * 2.75) / zoom;
	const minX = spot - half;
	const maxX = spot + half;
	const N = 160;
	const xs = Array.from({ length: N }, (_, i) => minX + ((maxX - minX) * i) / (N - 1));
	const expiry = xs.map((price) => payoffAt(legs, price, lot, multiplier, manual));
	// Mock target-day curve: expiry payoff smoothed by the remaining-time price distribution.
	const sigma = Math.max(spot * 0.12 * Math.sqrt(Math.max(daysLeft, 0.05) / 365), step * 0.2);
	const nodes = [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];
	const weights = nodes.map((z) => Math.exp(-(z * z) / 2));
	const wSum = weights.reduce((a, b) => a + b, 0);
	const smooth = (price: number) => nodes.reduce((sum, z, i) => sum + weights[i] * payoffAt(legs, price + z * sigma, lot, multiplier, manual), 0) / wSum;
	const target = xs.map(smooth);
	const lo = Math.min(...expiry, ...target, 0);
	const hi = Math.max(...expiry, ...target, 0);
	const range = hi - lo || 1;
	const minY = lo - range * 0.08;
	const maxY = hi + range * 0.12;
	const xScale = (price: number) => pad.l + ((price - minX) / (maxX - minX)) * plotW;
	const yScale = (value: number) => pad.t + ((maxY - value) / (maxY - minY)) * plotH;
	const zeroY = yScale(0);
	const pathOf = (series: number[]) => xs.map((price, i) => `${i === 0 ? 'M' : 'L'}${xScale(price).toFixed(1)} ${yScale(series[i]).toFixed(1)}`).join(' ');
	const areaOf = (clip: (v: number) => number) => `M${xScale(xs[0]).toFixed(1)} ${zeroY.toFixed(1)} ` + xs.map((price, i) => `L${xScale(price).toFixed(1)} ${yScale(clip(expiry[i])).toFixed(1)}`).join(' ') + ` L${xScale(xs[N - 1]).toFixed(1)} ${zeroY.toFixed(1)} Z`;
	const niceStep = (span: number) => {
		const raw = span / 5;
		const mag = 10 ** Math.floor(Math.log10(raw));
		return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw) ?? raw;
	};
	const yStep = niceStep(maxY - minY);
	const yTicks: number[] = [];
	for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) yTicks.push(Math.round(v) || 0);
	const xStep = niceStep(maxX - minX) >= 150 ? 200 : 100;
	const xTicks: number[] = [];
	for (let v = Math.ceil(minX / xStep) * xStep; v <= maxX; v += xStep) xTicks.push(v);
	const strikes: number[] = [];
	for (let strike = Math.ceil(minX / step) * step; strike <= maxX; strike += step) strikes.push(strike);
	const oiMax = 2.2; // crore, right axis top
	const oiToY = (lakh: number) => zeroY - (lakh / 100 / oiMax) * (zeroY - pad.t);
	const oiTicks = [-0.5, 0, 0.5, 1, 1.5, 2];
	const projected = smooth(targetPrice);
	const curX = xScale(targetPrice);
	const projLabel = `Projected ${projected >= 0 ? 'profit' : 'loss'}: ${formatInr(projected)}`;
	const atm = atmStrike(spot, step);
	const sdLines = [-2, -1, 1, 2].map((k) => ({ k, x: xScale(spot + k * sd) }));
	const barW = Math.max(3, Math.min(7, (plotW / strikes.length) * 0.32));

	return (
		<div className="sb-chart">
			<div className="sb-legend">
				<span className="sb-leg-oi">OI data <small>at {atm}</small></span>
				<span><i className="call" /> Call OI <b>{(callOi(atm, spot, step) * 0.91).toFixed(2)}L</b></span>
				<span><i className="put" /> Put OI <b>{(putOi(atm, spot, step) * 0.71).toFixed(2)}L</b></span>
				<span className="sb-leg-right"><em className="exp" /> On Expiry <em className="tgt" /> On Target Date</span>
			</div>
			<button type="button" className="sb-zoom" onClick={onZoom}><ZoomOut size={15} /> {zoom === 1 ? 'Zoom In' : 'Zoom Out'}</button>
			<svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Payoff graph">
				<defs>
					<pattern id="sb-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#2c333b" strokeWidth="2" /></pattern>
					<linearGradient id="sb-exp-grad" x1="0" y1={pad.t} x2="0" y2={height - pad.b} gradientUnits="userSpaceOnUse">
						<stop offset={`${((zeroY - pad.t) / plotH) * 100}%`} stopColor="#32d583" />
						<stop offset={`${((zeroY - pad.t) / plotH) * 100}%`} stopColor="#f68663" />
					</linearGradient>
					<clipPath id="sb-plot"><rect x={pad.l} y={pad.t} width={plotW} height={plotH} /></clipPath>
				</defs>
				{showSd ? (
					<g>
						<rect x={sdLines[0].x} y={pad.t} width={sdLines[3].x - sdLines[0].x} height={plotH} fill="url(#sb-hatch)" opacity="0.55" />
						<rect x={sdLines[1].x} y={pad.t} width={sdLines[2].x - sdLines[1].x} height={plotH} fill="#25282b" opacity="0.55" />
						{sdLines.map(({ k, x }) => (
							<g key={k}>
								<line x1={x} x2={x} y1={pad.t} y2={height - pad.b} stroke="#363d45" strokeDasharray="2 3" />
								<text x={x} y={pad.t - 6} textAnchor="middle" fontSize="10" fill="#868c98">{k > 0 ? `${k}SD` : `${k}SD`}</text>
							</g>
						))}
					</g>
				) : null}
				{yTicks.map((tick) => (
					<g key={tick}>
						<line x1={pad.l} x2={width - pad.r} y1={yScale(tick)} y2={yScale(tick)} stroke="#2c333b" strokeDasharray={tick === 0 ? undefined : '0'} />
						<text x={pad.l - 8} y={yScale(tick) + 3} textAnchor="end" fontSize="10" fill="#868c98">{tick.toLocaleString('en-IN')}</text>
					</g>
				))}
				<text transform={`translate(14 ${pad.t + plotH / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#868c98">Profit / loss</text>
				{showOi ? (
					<g>
						{oiTicks.map((t) => (
							<text key={t} x={width - pad.r + 8} y={oiToY(t * 100) + 3} fontSize="10" fill="#868c98">{t === 0 ? '0' : Math.abs(t) < 1 ? `${t * 100}L` : `${t}Cr`}</text>
						))}
						<text transform={`translate(${width - 10} ${pad.t + plotH / 2}) rotate(90)`} textAnchor="middle" fontSize="10" fill="#868c98">Open Interest</text>
					</g>
				) : null}
				<g clipPath="url(#sb-plot)">
					<path d={areaOf((v) => Math.max(v, 0))} fill="rgba(50,213,131,0.14)" />
					<path d={areaOf((v) => Math.min(v, 0))} fill="rgba(246,134,99,0.14)" />
					{showOi ? strikes.map((strike) => {
						const call = callOi(strike, spot, step) * 1.7;
						const put = putOi(strike, spot, step) * 2.0;
						const x = xScale(strike);
						return (
							<g key={strike}>
								<rect x={x - barW} y={oiToY(put)} width={barW} height={zeroY - oiToY(put)} fill="rgba(91,197,96,0.7)" />
								<rect x={x} y={oiToY(call)} width={barW} height={zeroY - oiToY(call)} fill="rgba(190,68,68,0.7)" />
							</g>
						);
					}) : null}
					<line x1={pad.l} x2={width - pad.r} y1={zeroY} y2={zeroY} stroke="#707984" />
					<path d={pathOf(expiry)} fill="none" stroke="url(#sb-exp-grad)" strokeWidth="1.6" />
					<path d={pathOf(target)} fill="none" stroke="#68a5ea" strokeWidth="1.6" />
					<line x1={curX} x2={curX} y1={pad.t} y2={height - pad.b} stroke="#c06767" strokeWidth="1" />
				</g>
				<rect x={curX - 66} y={pad.t + 2} width="132" height="18" rx="3" fill="#1e2124" stroke="#363d45" />
				<text x={curX} y={pad.t + 14} textAnchor="middle" fontSize="10" fill="#d0d1d2">Current price: {targetPrice.toFixed(2)}</text>
				<g transform={`translate(${curX} ${height - pad.b - 14})`}>
					<rect x={-(projLabel.length * 2.9 + 10)} y={-9} width={projLabel.length * 5.8 + 20} height="18" rx="4" fill={projected >= 0 ? '#32d583' : '#f68663'} />
					<text x={0} y={4} textAnchor="middle" fontSize="10" fill="#1e2124" fontWeight="500">{projLabel}</text>
				</g>
				{xTicks.map((price) => (
					<text key={price} x={xScale(price)} y={height - 10} textAnchor="middle" fontSize="10" fill="#868c98">{Math.round(price).toLocaleString('en-IN')}</text>
				))}
			</svg>
		</div>
	);
}

function PnlTable({ legs, spot, step, lot, multiplier, manual, daysLeft }: { legs: Leg[]; spot: number; step: number; lot: number; multiplier: number; manual: number; daysLeft: number }) {
	const start = atmStrike(spot, step) - step * 6;
	const rows = Array.from({ length: 13 }, (_, i) => start + i * step);
	return (
		<div className="sb-table-wrap">
			<table>
				<thead><tr><th>Price</th><th>On expiry</th><th>On target</th></tr></thead>
				<tbody>
					{rows.map((price) => {
						const expiry = payoffAt(legs, price, lot, multiplier, manual);
						const target = targetPayoff(expiry, daysLeft, 3);
						return (
							<tr key={price}>
								<td>{formatPx(price)}</td>
								<td className={expiry >= 0 ? 'up' : 'down'}>{formatInr(expiry, true)}</td>
								<td className={target >= 0 ? 'up' : 'down'}>{formatInr(target, true)}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function GreeksBlock({ legs, spot, lot, multiplyLots, compact }: { legs: Leg[]; spot: number; lot: number; multiplyLots: boolean; compact?: boolean }) {
	const totals = legs.filter((leg) => leg.on).reduce(
		(sum, leg) => {
			const g = legGreeks(leg, spot, lot, multiplyLots);
			return { delta: sum.delta + g.delta, theta: sum.theta + g.theta, gamma: sum.gamma + g.gamma, vega: sum.vega + g.vega };
		},
		{ delta: 0, theta: 0, gamma: 0, vega: 0 },
	);
	return (
		<div className={compact ? 'sb-greek-list' : 'sb-greek-list padded'}>
			<p><span>Delta</span><strong>{totals.delta.toFixed(2)}</strong></p>
			<p><span>Theta</span><strong>{totals.theta.toFixed(1)}</strong></p>
			<p><span>Decay</span><strong>{Math.round(totals.theta * 8)}</strong></p>
			<p><span>Gamma</span><strong>{totals.gamma.toFixed(4)}</strong></p>
			<p><span>Vega</span><strong>{totals.vega.toFixed(1)}</strong></p>
		</div>
	);
}

function StrategyChart({ spot, legs }: { spot: number; legs: Leg[] }) {
	const points = Array.from({ length: 40 }, (_, i) => {
		const wave = Math.sin(i / 3.2) * spot * 0.004 + Math.cos(i / 7) * spot * 0.002;
		return spot * 0.985 + wave + i * spot * 0.0004;
	});
	const min = Math.min(...points);
	const max = Math.max(...points);
	const d = points.map((price, i) => `${i === 0 ? 'M' : 'L'} ${20 + i * 16} ${150 - ((price - min) / (max - min || 1)) * 120}`).join(' ');
	return (
		<div className="sb-strategy-chart">
			<svg viewBox="0 0 680 180" role="img" aria-label="Strategy chart">
				<path d={d} fill="none" stroke="#68a5ea" strokeWidth="2" />
				{legs.map((leg) => (
					<line key={leg.id} x1="20" x2="660" y1={150 - ((leg.strike - min) / (max - min || 1)) * 120} y2={150 - ((leg.strike - min) / (max - min || 1)) * 120} stroke={leg.side === 'B' ? '#68a5ea' : '#f68663'} strokeDasharray="4 4" />
				))}
			</svg>
			<p>Strike lines sit on a model path of {formatPx(spot)}. Not a live chart.</p>
		</div>
	);
}

function AltView({ view, session, onLogin, onBack, instrument }: { view: 'watchlist' | 'positions' | 'orders'; session: Session | null; onLogin: () => void; onBack: () => void; instrument: Instrument }) {
	return (
		<div className="sb-alt">
			<button type="button" className="sb-link" onClick={onBack}>Back to Strategy Builder</button>
			<h1>{view === 'watchlist' ? 'Watchlist' : view === 'positions' ? 'Positions' : 'Orders'}</h1>
			{view === 'watchlist' ? (
				<table>
					<thead><tr><th>Symbol</th><th>LTP</th><th>Change</th></tr></thead>
					<tbody>
						{INSTRUMENTS.map((item) => (
							<tr key={item.symbol}><td>{item.symbol}</td><td>{formatPx(item.spot)}</td><td className={item.change >= 0 ? 'up' : 'down'}>{item.change.toFixed(2)}%</td></tr>
						))}
					</tbody>
				</table>
			) : null}
			{view !== 'watchlist' && !session ? <button type="button" className="sb-login" onClick={onLogin}>Login to view {view}</button> : null}
			{view === 'positions' && session ? <p>No open positions in {instrument.symbol}.</p> : null}
			{view === 'orders' && session ? <p>No orders today.</p> : null}
		</div>
	);
}
