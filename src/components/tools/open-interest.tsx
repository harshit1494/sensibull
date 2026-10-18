import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Check, ChevronDown, HelpCircle, Minus, Plus, RotateCcw, Search, TrendingUp } from 'lucide-react';
import { TsChart, type Series } from '@/components/tools/ts-chart';
import { futureSeries, oiSeries, spotSeries, timeline, type Tf } from '@/lib/intraday-mock';
import '@/components/tools/live-charts.css';
import '@/components/tools/fii-dii.css';
import '@/components/tools/open-interest.css';
import { LoginBanner, TerminalPage } from '@/components/tools/terminal-chrome';
import { CHAIN_EXPIRIES, SESSION_TIMES, buildOiProfile, buildOiTimeline, instrumentBySymbol, lakh, type OiPoint } from '@/lib/market-mock';
import { INSTRUMENTS, type Instrument } from '@/lib/strategy-math';

type Tab = 'change' | 'oi' | 'multi' | 'option-time' | 'fut-time';
const TABS: [Tab, string][] = [
	['change', 'OI Change'],
	['oi', 'Open Interest'],
	['multi', 'Multistrike OI'],
	['option-time', 'Option OI vs Time'],
	['fut-time', 'Fut OI vs Time'],
];
const WINDOWS: [string, number | null][] = [
	['Last 5 mins', 5], ['Last 10 mins', 10], ['Last 15 mins', 15], ['Last 30 mins', 30], ['Last 1 Hr', 60], ['Last 2 Hrs', 120], ['Last 3 Hrs', 180], ['Full Day', null],
];
const DAY = 'Fri, 16 Oct';
const OI_EXPIRIES = [1, 4]; // indexes into CHAIN_EXPIRIES shown as "Expiries Included"

export function OpenInterest() {
	const [params, setParams] = useSearchParams();
	const inst = instrumentBySymbol(params.get('tradingsymbol') ?? 'RELIANCE');
	const tab = (TABS.find(([id]) => id === params.get('tab'))?.[0] ?? 'change') as Tab;
	const [mode, setMode] = useState<'intraday' | 'custom'>('intraday');
	const [fromDate, setFromDate] = useState('2026-10-12');
	const [toDate, setToDate] = useState('2026-10-16');
	const [expiries, setExpiries] = useState<number[]>([0]);
	const [around, setAround] = useState<number | 'all'>(10);
	const [minStrike, setMinStrike] = useState<number | null>(null);
	const [maxStrike, setMaxStrike] = useState<number | null>(null);
	const [showOi, setShowOi] = useState(false);
	const [timeIdx, setTimeIdx] = useState(SESSION_TIMES.length - 1);
	const [windowMins, setWindowMins] = useState<number | null>(null);
	const [searchOpen, setSearchOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [howOpen, setHowOpen] = useState(false);
	const [optStrike, setOptStrike] = useState<number | null>(null);
	const [msSel, setMsSel] = useState<string[]>(['0', '3']);

	const atm = Math.round(inst.spot / inst.step) * inst.step;
	const span = around === 'all' ? 25 : around;
	const lo = minStrike ?? atm - span * inst.step;
	const hi = maxStrike ?? atm + span * inst.step;
	const progress = (timeIdx + 1) / SESSION_TIMES.length;
	const profile = useMemo(
		() => buildOiProfile(inst, expiries.length ? expiries : [0], progress, windowMins).filter((p) => p.strike >= lo && p.strike <= hi),
		[inst, expiries, progress, windowMins, lo, hi],
	);
	const callChg = profile.reduce((s, p) => s + p.callChg, 0);
	const putChg = profile.reduce((s, p) => s + p.putChg, 0);
	const callOi = profile.reduce((s, p) => s + p.callOi, 0);
	const putOi = profile.reduce((s, p) => s + p.putOi, 0);
	const openPx = inst.spot * 1.0031;
	const pcr = putOi / (callOi || 1);

	function setSymbol(symbol: string) {
		setParams({ tradingsymbol: symbol, ...(tab !== 'change' ? { tab } : {}) }, { replace: true });
		setMinStrike(null);
		setMaxStrike(null);
		setOptStrike(null);
	}
	function setTab(next: Tab) {
		setParams({ tradingsymbol: inst.symbol, ...(next !== 'change' ? { tab: next } : {}) }, { replace: true });
	}
	const filtered = INSTRUMENTS.filter((i) => i.symbol.includes(query.toUpperCase()) || i.name.toLowerCase().includes(query.toLowerCase()));
	const title = tab === 'change' ? `OI Change on ${DAY}` : tab === 'oi' ? `Open Interest on ${DAY}` : tab === 'multi' ? 'Multistrike OI' : tab === 'option-time' ? 'Option OI vs Time' : 'Futures OI vs Time';

	return (
		<TerminalPage title="Open Interest" active="analyse" className="oi-page">
			<div className="oi-shell">
				<LoginBanner />
				<div className="oi-frame">
					<div className="oi-tabs">
						<div className="oi-tab-list">
							{TABS.map(([id, label]) => (
								<button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
							))}
						</div>
						<div className="oi-stats">
							<p>INDIAVIX <b>14.1</b> <span className="oi-up">0.0</span></p>
							<p>PCR <b>{pcr.toFixed(1)}</b> <HelpCircle size={13} /></p>
						</div>
					</div>

					<div className="oi-body">
						<aside className="oi-side">
							<section className="oi-card">
								<div className="oi-ticker">
									<button type="button" className="oi-ticker-main" onClick={() => setSearchOpen(!searchOpen)}>
										<Search size={16} />
										<strong>{inst.symbol}</strong>
										<span>{inst.spot.toFixed(2)}</span>
										<em className={inst.change >= 0 ? 'oi-up' : 'oi-down'}>{inst.change >= 0 ? '+' : ''}{inst.change.toFixed(2)}%</em>
									</button>
									<button type="button" className="sb-chip" aria-label="Chart" onClick={() => setTab('fut-time')}><TrendingUp size={15} /></button>
									<button type="button" className="sb-chip" onClick={() => setHowOpen(true)}>Info</button>
									{searchOpen ? (
										<div className="sb-pop">
											<input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol" />
											{filtered.map((item) => (
												<button key={item.symbol} type="button" onClick={() => { setSymbol(item.symbol); setSearchOpen(false); setQuery(''); }}>
													<strong>{item.symbol}</strong><span>{item.name}</span>
												</button>
											))}
										</div>
									) : null}
								</div>
								{tab === 'multi' ? null : (<>
								<div className="oi-radios">
									<label><input type="radio" name="oi-mode" checked={mode === 'intraday'} onChange={() => setMode('intraday')} /> Intraday</label>
									<label><input type="radio" name="oi-mode" checked={mode === 'custom'} onChange={() => setMode('custom')} /> Custom Range</label>
								</div>
								{mode === 'custom' ? (
									<div className="oi-dates">
										<label>From<input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
										<label>To<input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
									</div>
								) : null}
								<div className="oi-expiries">
									<p>Expiries Included</p>
									{OI_EXPIRIES.map((ci, i) => {
										const e = CHAIN_EXPIRIES[ci];
										return (
											<label key={e.iso}>
												<input
													type="checkbox"
													checked={expiries.includes(i)}
													onChange={() => setExpiries((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))}
												/>
												{e.label} ({e.days} days)
											</label>
										);
									})}
								</div>
								</>)}
								{tab === 'multi' ? <MultiStrikeList inst={inst} selected={msSel} onChange={setMsSel} /> : null}
								</section>

								{tab === 'multi' ? null : (
							<section className="oi-card oi-range">
								<div className="oi-range-head">
									<p>Strike Range</p>
									<button type="button" className="sb-link" onClick={() => { setMinStrike(null); setMaxStrike(null); setAround(10); }}><RotateCcw size={15} /> Reset</button>
								</div>
								<div className="oi-minmax">
									<StrikeStepper label="Min" value={lo} onChange={(v) => setMinStrike(Math.min(v, hi - inst.step))} step={inst.step} />
									<StrikeStepper label="Max" value={hi} onChange={(v) => setMaxStrike(Math.max(v, lo + inst.step))} step={inst.step} />
								</div>
								<p className="oi-sub">Strikes above and below ATM</p>
								<div className="oi-chips">
									{(['all', 5, 10, 15, 20, 25] as const).map((n) => (
										<button key={n} type="button" className={around === n && minStrike === null && maxStrike === null ? 'on' : ''} onClick={() => { setAround(n); setMinStrike(null); setMaxStrike(null); }}>
											{n === 'all' ? 'Show All' : n}
										</button>
									))}
								</div>
							</section>
								)}
						</aside>

						<div className="oi-main">
							{tab === 'multi' ? <MultiStrikeCard inst={inst} selected={msSel} /> : (
							<section className="oi-card oi-chart-card">
								<div className="oi-chart-head">
									<div>
										<p>{title}</p>
										<button type="button" className="sb-link" onClick={() => setHowOpen(true)}>How to read this?</button>
									</div>
									{tab === 'change' || tab === 'oi' ? (
										<label className="sb-toggle">
											<input type="checkbox" checked={showOi} onChange={() => setShowOi(!showOi)} />
											<i />
											{tab === 'change' ? 'Show OI' : 'Show OI Change'} <span className="oi-new">New</span>
										</label>
									) : null}
									{tab === 'option-time' ? (
										<label className="oi-strike-pick">Strike
											<select className="sb-sel" value={optStrike ?? atm} onChange={(e) => setOptStrike(Number(e.target.value))}>
												{profile.map((p) => <option key={p.strike} value={p.strike}>{p.strike}</option>)}
											</select>
										</label>
									) : null}
								</div>

								{tab === 'change' || tab === 'oi' ? (
									<StrikeBars inst={inst} data={profile} mode={tab} showOther={showOi} />
								) : (
									<TimeChart inst={inst} tab={tab} strike={optStrike ?? atm} strikes={profile.map((p) => p.strike)} />
								)}

								{tab === 'change' || tab === 'oi' ? (
									<>
										<div className="oi-time">
											<span>9:15 AM</span>
											<input
												type="range"
												className="sb-range"
												min={0}
												max={SESSION_TIMES.length - 1}
												value={timeIdx}
												onChange={(e) => { setTimeIdx(Number(e.target.value)); setWindowMins(null); }}
												style={{ '--p': `${(timeIdx / (SESSION_TIMES.length - 1)) * 100}%` } as CSSProperties}
											/>
											<span>{SESSION_TIMES[timeIdx]}</span>
											<HelpCircle size={14} />
										</div>
										<div className="oi-windows">
											{WINDOWS.map(([label, mins]) => (
												<button key={label} type="button" className={windowMins === mins && (mins !== null || timeIdx === SESSION_TIMES.length - 1) ? 'on' : ''} onClick={() => { setWindowMins(mins); setTimeIdx(SESSION_TIMES.length - 1); }}>
													{label}
												</button>
											))}
										</div>
										<div className="oi-summary">
											<div className="oi-day">{tab === 'change' ? 'Change' : 'OI'} on {DAY}</div>
											<div className="oi-sum-grid">
												<span>{tab === 'change' ? 'Call OI change' : 'Total Call OI'}</span>
												<b className={tab === 'change' ? (callChg >= 0 ? 'oi-up' : 'oi-down') : ''}>{tab === 'change' && callChg >= 0 ? '+' : ''}{lakh(tab === 'change' ? callChg : callOi)}</b>
												<span>{tab === 'change' ? 'Put OI change' : 'Total Put OI'}</span>
												<b className={tab === 'change' ? (putChg >= 0 ? 'oi-up' : 'oi-down') : ''}>{tab === 'change' && putChg >= 0 ? '+' : ''}{lakh(tab === 'change' ? putChg : putOi)}</b>
											</div>
											<div className="oi-sum-grid">
												<span>{inst.symbol} at 9:15 AM</span>
												<b>{Math.round(openPx * 100) / 100}</b>
												<span>{inst.symbol} at {SESSION_TIMES[timeIdx]}</span>
												<b>{(openPx + (inst.spot - openPx) * progress).toFixed(1)}</b>
											</div>
										</div>
									</>
								) : null}
							</section>
)}
							{tab === 'multi' ? null : (
							<section className="oi-note">
								<p><b>OI last refreshed time - 16 Oct, 3:30 PM</b></p>
								<p>Data is refreshed every minute. Open Interest data is updated by the exchange every 3 minutes in many strikes, and every minute in some strikes. Real-time data on OI is not released by the exchange and no vendor or broker has real-time OI data. Numbers on this page are mock data.</p>
							</section>
							)}
						</div>
					</div>
				</div>
			</div>
			{howOpen ? (
				<div className="sb-modal">
					<button type="button" className="sb-modal-back" aria-label="Close" onClick={() => setHowOpen(false)} />
					<div className="sb-modal-card oi-how">
						<strong>How to read this?</strong>
						<p>Red bars are calls, green bars are puts. A tall red bar above zero means call writers added positions at that strike — it often acts as resistance. A tall green bar means put writers added positions — often support.</p>
						<p>Bars below zero show positions being closed. Use the time slider or the quick buttons to see how OI changed over a part of the day.</p>
						<button type="button" className="sb-btn-primary" onClick={() => setHowOpen(false)}>Got it</button>
					</div>
				</div>
			) : null}
			{searchOpen ? <button type="button" className="oc-dismiss oi-dismiss" aria-label="Close" onClick={() => setSearchOpen(false)} /> : null}
		</TerminalPage>
	);
}

function StrikeStepper({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
	return (
		<label className="oi-stepper-wrap">
			{label}
			<div className="sb-stepper">
				<button type="button" aria-label={`Lower ${label}`} onClick={() => onChange(value - step)}><Minus size={14} /></button>
				<input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || value)} />
				<button type="button" aria-label={`Raise ${label}`} onClick={() => onChange(value + step)}><Plus size={14} /></button>
			</div>
		</label>
	);
}

function niceStep(span: number, parts = 6) {
	const raw = span / parts;
	const mag = 10 ** Math.floor(Math.log10(raw || 1));
	return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw) ?? raw;
}

function StrikeBars({ inst, data, mode, showOther }: { inst: Instrument; data: OiPoint[]; mode: 'change' | 'oi'; showOther: boolean }) {
	const W = 958;
	const H = 408;
	const pad = { l: 64, r: 24, t: 24, b: 52 };
	const pw = W - pad.l - pad.r;
	const ph = H - pad.t - pad.b;
	const callV = data.map((d) => (mode === 'change' ? d.callChg : d.callOi));
	const putV = data.map((d) => (mode === 'change' ? d.putChg : d.putOi));
	const ghostC = data.map((d) => (mode === 'change' ? d.callOi : d.callChg));
	const ghostP = data.map((d) => (mode === 'change' ? d.putOi : d.putChg));
	const all = [...callV, ...putV, 0, ...(showOther ? [...ghostC, ...ghostP].map((v) => v * (mode === 'change' ? 0.25 : 1)) : [])];
	let lo = Math.min(...all);
	let hi = Math.max(...all);
	const st = niceStep(hi - lo);
	lo = Math.floor(lo / st) * st;
	hi = Math.ceil(hi / st) * st;
	const y = (v: number) => pad.t + ((hi - v) / (hi - lo || 1)) * ph;
	const slot = pw / data.length;
	const bw = Math.min(13, slot * 0.32);
	const x = (i: number) => pad.l + slot * (i + 0.5);
	const ticks: number[] = [];
	for (let v = lo; v <= hi + 1e-6; v += st) ticks.push(v);
	const spotIdx = data.findIndex((d) => d.strike >= inst.spot);
	const spotX = spotIdx <= 0 ? x(0) : x(spotIdx - 1) + ((inst.spot - data[spotIdx - 1].strike) / (data[spotIdx].strike - data[spotIdx - 1].strike)) * slot;
	const fmtL = (v: number) => (v === 0 ? '0' : Math.abs(v) >= 1e7 ? `${+(v / 1e7).toFixed(1)}Cr` : `${+(v / 1e5).toFixed(1)}L`);
	const [hover, setHover] = useState<number | null>(null);

	return (
		<div className="oi-plot">
			<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={mode === 'change' ? 'OI change by strike' : 'Open interest by strike'}>
				{ticks.map((t) => (
					<g key={t}>
						<line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#2c333b" />
						<text x={pad.l - 10} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#868c98">{fmtL(t)}</text>
					</g>
				))}
				<text transform={`translate(18 ${pad.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#868c98">{mode === 'change' ? 'Call / Put OI Change' : 'Call / Put Open Interest'}</text>
				{data.map((d, i) => {
					const cx = x(i);
					const bar = (v: number, x0: number, fill: string, op = 1) => <rect x={x0} y={Math.min(y(v), y(0))} width={bw} height={Math.max(1, Math.abs(y(v) - y(0)))} fill={fill} opacity={op} />;
					return (
						<g key={d.strike} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
							<rect x={cx - slot / 2} y={pad.t} width={slot} height={ph} fill={hover === i ? 'rgba(255,255,255,0.04)' : 'transparent'} />
							{showOther ? (
								<>
									{bar(ghostP[i] * (mode === 'change' ? 0.25 : 1), cx - bw - 1, 'rgb(117,243,123)', 0.22)}
									{bar(ghostC[i] * (mode === 'change' ? 0.25 : 1), cx + 1, 'rgb(233,103,103)', 0.22)}
								</>
							) : null}
							{bar(putV[i], cx - bw - 1, 'rgb(117,243,123)')}
							{bar(callV[i], cx + 1, 'rgb(233,103,103)')}
							<text transform={`rotate(-45 ${cx} ${H - pad.b + 18})`} x={cx} y={H - pad.b + 22} textAnchor="end" fontSize="10" fill="#868c98">{d.strike}</text>
						</g>
					);
				})}
				<line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#4a515a" />
				<line x1={spotX} x2={spotX} y1={pad.t + 6} y2={pad.t + ph} stroke="#d0d1d2" strokeDasharray="3 3" opacity="0.7" />
				<g transform={`translate(${spotX} ${pad.t - 2})`}>
					<rect x={-57} y={-12} width="114" height="22" rx="4" fill="#111111" />
					<text x={0} y={3} textAnchor="middle" fontSize="11" fill="#d0d1d2">{inst.symbol} {+inst.spot.toFixed(2)}</text>
				</g>
				{hover !== null ? (
					<g transform={`translate(${Math.min(x(hover) + 12, W - 170)} ${pad.t + 18})`}>
						<rect width="150" height="58" rx="4" fill="#111111" stroke="#363d45" />
						<text x="10" y="18" fontSize="11" fill="#d0d1d2" fontWeight="500">Strike {data[hover].strike}</text>
						<text x="10" y="34" fontSize="10" fill="rgb(233,103,103)">Call {mode === 'change' ? 'OI chg' : 'OI'}: {lakh(callV[hover])}</text>
						<text x="10" y="49" fontSize="10" fill="rgb(117,243,123)">Put {mode === 'change' ? 'OI chg' : 'OI'}: {lakh(putV[hover])}</text>
					</g>
				) : null}
			</svg>
			<div className="oi-legend">
				<span><i className="put" /> Put {mode === 'change' ? 'OI chg' : 'OI'}</span>
				<span><i className="call" /> Call {mode === 'change' ? 'OI chg' : 'OI'}</span>
			</div>
		</div>
	);
}

function TimeChart({ inst, tab, strike, strikes }: { inst: Instrument; tab: Tab; strike: number; strikes: number[] }): ReactNode {
	const W = 958;
	const H = 408;
	const pad = { l: 64, r: 64, t: 24, b: 40 };
	const pw = W - pad.l - pad.r;
	const ph = H - pad.t - pad.b;
	const series = useMemo(() => {
		if (tab === 'multi') {
			const parts = strikes.filter((_, i) => i % 3 === 0).map((s) => buildOiTimeline(inst, s, 'option'));
			return parts[0].map((p, i) => ({ ...p, call: parts.reduce((sum, s) => sum + s[i].call, 0), put: parts.reduce((sum, s) => sum + s[i].put, 0) }));
		}
		return buildOiTimeline(inst, tab === 'fut-time' ? null : strike, tab === 'fut-time' ? 'future' : 'option');
	}, [inst, tab, strike, strikes]);
	const isFut = tab === 'fut-time';
	const vals = series.flatMap((p) => (isFut ? [p.call + p.put] : [p.call, p.put]));
	const lo = Math.min(...vals) * 0.95;
	const hi = Math.max(...vals) * 1.05;
	const plo = Math.min(...series.map((p) => p.price));
	const phi = Math.max(...series.map((p) => p.price));
	const x = (i: number) => pad.l + (i / (series.length - 1)) * pw;
	const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * ph;
	const yp = (v: number) => pad.t + ((phi - v) / (phi - plo || 1)) * ph;
	const path = (get: (p: (typeof series)[number]) => number, scale = y) => series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${scale(get(p)).toFixed(1)}`).join(' ');
	const ticks = Array.from({ length: 6 }, (_, i) => lo + ((hi - lo) * i) / 5);
	return (
		<div className="oi-plot">
			<svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="OI over time">
				{ticks.map((t) => (
					<g key={t}>
						<line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#2c333b" />
						<text x={pad.l - 10} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#868c98">{t.toFixed(0)}L</text>
					</g>
				))}
				{[plo, (plo + phi) / 2, phi].map((v) => (
					<text key={v} x={W - pad.r + 8} y={yp(v) + 3} fontSize="10" fill="#868c98">{v.toFixed(1)}</text>
				))}
				{series.map((p, i) => (i % 4 === 0 ? <text key={p.t} x={x(i)} y={H - 14} textAnchor="middle" fontSize="10" fill="#868c98">{p.t}</text> : null))}
				{isFut ? (
					<path d={path((p) => p.call + p.put)} fill="none" stroke="#68a5ea" strokeWidth="2" />
				) : (
					<>
						<path d={path((p) => p.call)} fill="none" stroke="rgb(233,103,103)" strokeWidth="2" />
						<path d={path((p) => p.put)} fill="none" stroke="rgb(117,243,123)" strokeWidth="2" />
					</>
				)}
				<path d={path((p) => p.price, yp)} fill="none" stroke="#d0d1d2" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.8" />
			</svg>
			<div className="oi-legend">
				{isFut ? <span><i className="fut" /> Futures OI</span> : (<><span><i className="call" /> Call OI{tab === 'option-time' ? ` ${strike} CE` : ''}</span><span><i className="put" /> Put OI{tab === 'option-time' ? ` ${strike} PE` : ''}</span></>)}
				<span><i className="px" /> {inst.symbol} price</span>
			</div>
		</div>
	);
}

const MS_COLORS = ['#e96767', '#f1934c', '#e36bd0', '#4f6ff0', '#2ecb71', '#36d6d6'];
function activeStrikes(inst: Instrument) {
	const a = Math.round(inst.spot / inst.step) * inst.step;
	const s = inst.step;
	return [
		{ strike: a, right: 'CE' }, { strike: a + 2 * s, right: 'CE' }, { strike: a + s, right: 'CE' },
		{ strike: a - 2 * s, right: 'PE' }, { strike: a, right: 'PE' }, { strike: a - 4 * s, right: 'PE' },
	].map((x, i) => ({ ...x, id: String(i), color: MS_COLORS[i], label: `${CHAIN_EXPIRIES[0].label} ${x.strike} ${x.right}` }));
}

function MultiStrikeList({ inst, selected, onChange }: { inst: Instrument; selected: string[]; onChange: (v: string[]) => void }) {
	const [open, setOpen] = useState(true);
	const [onlySel, setOnlySel] = useState(false);
	const list = activeStrikes(inst).filter((s) => !onlySel || selected.includes(s.id));
	const all = activeStrikes(inst).every((s) => selected.includes(s.id));
	return (
		<div className="ms-oi-list">
			<div className="ms-oi-head">
				<button type="button" className="ms-oi-toggle" onClick={() => setOpen(!open)}><ChevronDown size={16} style={{ transform: open ? undefined : 'rotate(-90deg)' }} /> Most Active Strikes</button>
				<button type="button" className={`ms-oi-sel ${onlySel ? 'on' : ''}`} onClick={() => setOnlySel(!onlySel)}><Check size={13} /> Selected</button>
			</div>
			{open ? (
				<div className="ms-oi-items">
					<label><input type="checkbox" checked={all} onChange={() => onChange(all ? [] : activeStrikes(inst).map((s) => s.id))} /> Select All</label>
					{list.map((s) => (
						<label key={s.id}>
							<input type="checkbox" checked={selected.includes(s.id)} onChange={() => onChange(selected.includes(s.id) ? selected.filter((x) => x !== s.id) : [...selected, s.id])} />
							<i style={{ background: s.color }} /> {s.label}
						</label>
					))}
				</div>
			) : null}
		</div>
	);
}

function MultiStrikeCard({ inst, selected }: { inst: Instrument; selected: string[] }) {
	const [tf, setTf] = useState<5 | 15 | 30 | 1440>(5);
	const [basis, setBasis] = useState<'spot' | 'future'>('spot');
	const ticks = useMemo(() => timeline(tf as Tf, tf === 1440 ? 5 : 3), [tf]);
	const price = useMemo(() => (basis === 'spot' ? spotSeries(inst, ticks) : futureSeries(inst, ticks)), [inst, ticks, basis]);
	const strikes = activeStrikes(inst).filter((s) => selected.includes(s.id));
	const isIndex = inst.symbol.includes('NIFTY') || inst.symbol === 'SENSEX';
	const series: Series[] = [
		{ key: 'px', label: `${inst.symbol}${basis === 'future' ? ' FUT' : ''}`, color: '#ffffff', values: price, axis: 'price', fmt: (v) => v.toFixed(2) },
		...strikes.map((s) => ({ key: s.id, label: s.label, color: s.color, values: oiSeries(inst, ticks, `ms${s.id}`, (isIndex ? 6e6 : 4e5) * (1 + Number(s.id) * 0.15), 0.8) })),
	];
	return (
		<section className="oi-card oi-chart-card ms-oi-card">
			<div className="oi-chart-head"><div><p>Multi Strike OI</p></div></div>
			<div className="ms-oi-tools">
				<div className="fd-seg-btns">
					{([[5, '5 min'], [15, '15 min'], [30, '30 min'], [1440, 'Day']] as const).map(([v, l]) => <button key={v} type="button" className={tf === v ? 'on' : ''} onClick={() => setTf(v)}>{l}</button>)}
				</div>
				<div className="fd-seg-btns">
					{(['spot', 'future'] as const).map((b) => <button key={b} type="button" className={basis === b ? 'on' : ''} onClick={() => setBasis(b)}>{b === 'spot' ? 'Spot' : 'Future'}</button>)}
				</div>
			</div>
			<TsChart ticks={ticks} series={series} height={420} leftTitle={inst.symbol} rightTitle="Open Interest" />
			<p className="ms-oi-note">OI Data is refreshed on this page every 5 mins</p>
		</section>
	);
}
