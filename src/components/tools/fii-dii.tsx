import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, Info, PlayCircle, PauseCircle, TrendingUp } from 'lucide-react';
import '@/components/tools/fii-dii.css';
import { LoginBanner, TerminalPage } from '@/components/tools/terminal-chrome';
import { useWidth } from '@/components/tools/ts-chart';
import { seeded } from '@/lib/market-mock';

type Tab = 'summary' | 'fno' | 'cash' | 'history';
const TABS: [Tab, string][] = [['summary', 'Summary'], ['fno', 'Futures and Options'], ['cash', 'Cash Market'], ['history', 'FII History']];
const PARTICIPANTS = ['FII', 'Pro', 'Client', 'DII'] as const;
const SEGMENTS = ['Index Futures', 'Stock Futures', 'Index Options', 'Stocks'] as const;
type Participant = (typeof PARTICIPANTS)[number];
type Segment = (typeof SEGMENTS)[number];

/** Trading days 16 Sep → 16 Oct 2026 (weekends and 2 Oct holiday skipped). */
const DAYS = (() => {
	const out: { iso: string; short: string; long: string; dow: string; month: number }[] = [];
	const d = new Date(Date.UTC(2026, 7, 3));
	const end = new Date(Date.UTC(2026, 9, 16));
	const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	while (d <= end) {
		const wd = d.getUTCDay();
		const iso = d.toISOString().slice(0, 10);
		if (wd !== 0 && wd !== 6 && iso !== '2026-10-02') {
			const dd = String(d.getUTCDate()).padStart(2, '0');
			out.push({ iso, short: `${dd} ${MON[d.getUTCMonth()]}`, long: `${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}, ${DOW[wd]}`, dow: DOW[wd].slice(0, 3), month: d.getUTCMonth() });
		}
		d.setUTCDate(d.getUTCDate() + 1);
	}
	return out;
})();
const LAST = DAYS.length - 1;

function niftyClose(i: number) {
	if (i === LAST) return 23146.15;
	if (i === LAST - 1) return Math.round((23146.15 / 1.0065) * 100) / 100;
	const r = seeded('nifty-close', i)();
	return Math.round((23146.15 + Math.sin(i / 4) * 280 - (LAST - i) * 6 + (r - 0.5) * 180) * 100) / 100;
}
function bankClose(i: number) {
	if (i === LAST - 1) return Math.round(55844 / 1.0006);
	return i === LAST ? 55844 : Math.round(55844 + Math.sin(i / 5) * 650 + (seeded('bn', i)() - 0.5) * 400);
}
const NIFTY = DAYS.map((_, i) => niftyClose(i));
const BANK = DAYS.map((_, i) => bankClose(i));

type Row = { net: number; chg: number; detail: { label: string; net: number; chg: number }[] };
function rowFor(p: Participant, s: Segment, day: number): Row {
	const r = seeded('fii', p, s, day);
	const scale = s === 'Index Options' ? 6e5 : s === 'Index Futures' ? 2.2e5 : s === 'Stock Futures' ? 9e5 : 4e4;
	const bias = { FII: -0.7, Pro: 0.4, Client: 0.6, DII: 0.3 }[p] * (s === 'Index Futures' ? 0.8 : 1);
	const net = Math.round((bias + (r() - 0.5) * 1.1) * scale);
	const chg = Math.round((r() - 0.5) * scale * 0.35);
	const detail = s === 'Index Options'
		? [['Call Long', 0.6], ['Call Short', -0.9], ['Put Long', 0.7], ['Put Short', -0.5]].map(([label, m]) => ({ label: String(label), net: Math.round(Number(m) * scale * (0.6 + r())), chg: Math.round((r() - 0.5) * scale * 0.3) }))
		: [['Long', 1], ['Short', -1]].map(([label, m]) => ({ label: String(label), net: Math.round(Number(m) * scale * (0.8 + r())), chg: Math.round((r() - 0.5) * scale * 0.2) }));
	return { net, chg, detail };
}
function sentiment(row: Row, s: Segment): { side: 'bull' | 'bear' | 'none'; level: 'Strong' | 'Medium' | 'Mild' | null } {
	const scale = s === 'Index Options' ? 6e5 : s === 'Index Futures' ? 2.2e5 : s === 'Stock Futures' ? 9e5 : 4e4;
	const score = (row.net / scale) * 0.7 + (row.chg / scale) * 1.4;
	if (Math.abs(score) < 0.15) return { side: 'none', level: null };
	const level = Math.abs(score) > 0.75 ? 'Strong' : Math.abs(score) > 0.35 ? 'Medium' : 'Mild';
	return { side: score > 0 ? 'bull' : 'bear', level };
}
const fmtQty = (v: number) => {
	const a = Math.abs(v);
	if (a >= 1e7) return `${+(v / 1e7).toFixed(2)}Cr`;
	if (a >= 1e5) return `${+(v / 1e5).toFixed(2)}L`;
	return v.toLocaleString('en-IN');
};

export function FiiDii() {
	const [params, setParams] = useSearchParams();
	const tab = (TABS.find(([id]) => id === params.get('tab'))?.[0] ?? 'summary') as Tab;
	const setTab = (t: Tab) => setParams(t === 'summary' ? {} : { tab: t }, { replace: true });
	const [howOpen, setHowOpen] = useState(false);

	return (
		<TerminalPage title="FII DII Data" active="analyse" className="fd-page">
			<div className="fd-shell">
				<LoginBanner />
				<div className="fd-tabs">
					{TABS.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
				</div>
				{tab === 'summary' ? <Summary onHow={() => setHowOpen(true)} /> : null}
				{tab === 'fno' ? <Fno onHow={() => setHowOpen(true)} /> : null}
				{tab === 'cash' ? <Cash onHow={() => setHowOpen(true)} /> : null}
				{tab === 'history' ? <History /> : null}
			</div>
			{howOpen ? (
				<div className="sb-modal">
					<button type="button" className="sb-modal-back" aria-label="Close" onClick={() => setHowOpen(false)} />
					<div className="sb-modal-card fd-how">
						<strong>How to interpret this data?</strong>
						<p>NSE publishes participant-wise open interest every evening. FIIs, Pros (proprietary desks), Clients (retail and HNI) and DIIs each hold long and short positions.</p>
						<p><b className="fd-bull">Bullish</b> means the participant added net long exposure — more call longs or put shorts in options, or net long futures. <b className="fd-bear">Bearish</b> is the opposite. The bar length shows how strong the shift was.</p>
						<p>Numbers on this page are mock data.</p>
						<button type="button" className="sb-btn-primary" onClick={() => setHowOpen(false)}>Got it</button>
					</div>
				</div>
			) : null}
		</TerminalPage>
	);
}

function Summary({ onHow }: { onHow: () => void }) {
	const [parts, setParts] = useState<Participant[]>(['FII', 'Pro', 'Client']);
	const [segs, setSegs] = useState<Segment[]>(['Index Futures', 'Index Options']);
	const [labels, setLabels] = useState(true);
	const [day, setDay] = useState(LAST);
	const [open, setOpen] = useState<string | null>(null);
	const [replay, setReplay] = useState(false);
	const [dateOpen, setDateOpen] = useState(false);

	useEffect(() => {
		if (!replay) return;
		const id = window.setInterval(() => {
			setDay((d) => {
				if (d >= LAST) {
					setReplay(false);
					return LAST;
				}
				return d + 1;
			});
		}, 900);
		return () => window.clearInterval(id);
	}, [replay]);

	const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
	const reset = () => { setParts(['FII', 'Pro', 'Client']); setSegs(['Index Futures', 'Index Options']); setLabels(true); setDay(LAST); };
	const orderedSegs = SEGMENTS.filter((s) => segs.includes(s));

	return (
		<div className="fd-summary">
			<aside className="fd-filters">
				<div className="fd-filter-head"><p>Filters</p><button type="button" className="sb-link" onClick={reset}>Reset</button></div>
				<div className="fd-group">
					<p>Participant</p>
					{PARTICIPANTS.map((p) => <label key={p} className="lc-check fd-check"><input type="checkbox" checked={parts.includes(p)} onChange={() => setParts(toggle(parts, p))} /> {p}</label>)}
				</div>
				<div className="fd-group">
					<p>Segment</p>
					{SEGMENTS.map((s) => <label key={s} className="lc-check fd-check"><input type="checkbox" checked={segs.includes(s)} onChange={() => setSegs(toggle(segs, s))} /> {s}</label>)}
				</div>
				<label className="sb-toggle fd-labels">
					<input type="checkbox" checked={labels} onChange={() => setLabels(!labels)} />
					<i />
					<span>Show Labels<br /><small>(Strong/Medium/Mild)</small></span>
				</label>
			</aside>
			<div className="fd-main">
				<div className="fd-bar">
					<button type="button" className="sb-link fd-how-btn" onClick={onHow}><HelpCircle size={16} /> How to Interpret this data?</button>
					<div className="fd-date">
						<button type="button" className="sb-link" onClick={() => { if (!replay && day === LAST) setDay(LAST - 9); setReplay(!replay); }}>{replay ? <PauseCircle size={16} /> : <PlayCircle size={16} />} {replay ? 'Pause' : 'Replay'}</button>
						<Info size={15} className="fd-muted" />
						<button type="button" className="fd-arrow" aria-label="Previous day" disabled={day === 0} onClick={() => setDay(Math.max(0, day - 1))}><ChevronLeft size={16} /></button>
						<div className="fd-date-pick">
							<button type="button" onClick={() => setDateOpen(!dateOpen)}><Calendar size={16} /> {DAYS[day].short} 2026</button>
							{dateOpen ? (
								<div className="sb-pop fd-date-pop">
									{DAYS.slice(-22).map((d, i) => {
										const idx = DAYS.length - 22 + i;
										return <button key={d.iso} type="button" className={idx === day ? 'on' : ''} onClick={() => { setDay(idx); setDateOpen(false); }}><strong>{d.short}</strong><span>{d.dow}</span></button>;
									}).reverse()}
								</div>
							) : null}
						</div>
						<button type="button" className="fd-arrow" aria-label="Next day" disabled={day === LAST} onClick={() => setDay(Math.min(LAST, day + 1))}><ChevronRight size={16} /></button>
					</div>
				</div>
				<div className="fd-grid">
					<div className="fd-table-card">
						<table className="fd-table">
							<thead>
								<tr>
									<th>Participant</th><th>Segment</th>
									<th className="bear-h"><div><span>Bearish</span><Info size={14} /></div></th>
									<th className="bull-h"><div><span>Bullish</span><Info size={14} /></div></th>
									<th className="num"><div>Net OI <Info size={14} /></div></th>
									<th className="num"><div>Change <Info size={14} /></div></th>
								</tr>
							</thead>
							<tbody>
								{parts.length && orderedSegs.length ? PARTICIPANTS.filter((p) => parts.includes(p)).flatMap((p) =>
									orderedSegs.flatMap((s, si) => {
										const row = rowFor(p, s, day);
										const sent = sentiment(row, s);
										const key = `${p}-${s}`;
										const width = sent.level === 'Strong' ? 92 : sent.level === 'Medium' ? 58 : 30;
										const label = labels && sent.level ? `${sent.level} ${sent.side === 'bull' ? 'Bullish' : 'Bearish'}` : '';
										const rows = [
											<tr key={key} className={si === 0 ? 'first' : ''}>
												{si === 0 ? <td className="fd-part" rowSpan={orderedSegs.reduce((n, x) => n + 1 + (open === `${p}-${x}` ? (x === 'Index Options' ? 4 : 2) : 0), 0)}>{p}</td> : null}
												<td className="fd-seg"><button type="button" onClick={() => setOpen(open === key ? null : key)}>{s} <ChevronDown size={15} style={{ transform: open === key ? 'rotate(180deg)' : undefined }} /></button></td>
												{sent.side === 'none' ? (
													<td colSpan={2} className="fd-indecisive">Indecisive</td>
												) : (
													<>
														<td className={`fd-bear ${sent.side === 'bear' ? 'tint' : ''}`}>{sent.side === 'bear' ? <div className="fd-pill bear" style={{ width: `${width}%` }}><p>{label}</p></div> : null}</td>
														<td className={`fd-bull ${sent.side === 'bull' ? 'tint' : ''}`}>{sent.side === 'bull' ? <div className="fd-pill bull" style={{ width: `${width}%` }}><p>{label}</p></div> : null}</td>
													</>
												)}
												<td className="num">{fmtQty(row.net)}</td>
												<td className="num">{fmtQty(row.chg)}</td>
											</tr>,
										];
										if (open === key) row.detail.forEach((d) => rows.push(
											<tr key={`${key}-${d.label}`} className="fd-sub">
												<td className="fd-seg sub">{d.label}</td>
												<td colSpan={2}><div className="fd-sub-bar"><i className={d.net >= 0 ? 'bull' : 'bear'} style={{ width: `${Math.min(100, Math.abs(d.net) / 12000)}%` }} /></div></td>
												<td className="num">{fmtQty(d.net)}</td>
												<td className="num">{fmtQty(d.chg)}</td>
											</tr>,
										));
										return rows;
									}),
								) : (
									<tr><td colSpan={6} className="fd-empty">Pick at least one participant and one segment.</td></tr>
								)}
							</tbody>
						</table>
					</div>
					<div className="fd-cards">
						<div className="fd-card">
							<p className="fd-card-head">19 Oct 2026</p>
							<p className="fd-card-body">Market opens at 9:15am</p>
						</div>
						<div className="fd-card">
							<p className="fd-card-head">{DAYS[day].short.replace(/^0/, '')}, {DAYS[day].dow}</p>
							<IndexLine name="NIFTY" close={NIFTY[day]} prev={NIFTY[day - 1] ?? NIFTY[day]} />
							<IndexLine name="BANKNIFTY" close={BANK[day]} prev={BANK[day - 1] ?? BANK[day]} />
						</div>
					</div>
				</div>
			</div>
			{dateOpen ? <button type="button" className="lc-dismiss fd-dismiss" aria-label="Close" onClick={() => setDateOpen(false)} /> : null}
		</div>
	);
}

function IndexLine({ name, close, prev }: { name: string; close: number; prev: number }) {
	const pct = ((close - prev) / prev) * 100 || (name === 'NIFTY' ? 0.65 : 0.06);
	return (
		<div className="fd-index">
			<p>{name}</p>
			<p className="fd-index-v">{close.toFixed(name === 'NIFTY' ? 2 : 0)} <em className={pct >= 0 ? 'up' : 'down'}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</em> <span className="sb-chip"><TrendingUp size={13} /></span></p>
		</div>
	);
}

type BarDef = { key: string; label: string; color: string; values: number[] };
function DayChart({ days, bars, indexValues, indexName, axisTitle, summary }: { days: typeof DAYS; bars: BarDef[]; indexValues: number[]; indexName: string; axisTitle: string; summary: (i: number) => ReactNode }) {
	const [wrap, W] = useWidth<HTMLDivElement>();
	const [hover, setHover] = useState<number | null>(null);
	const H = 360;
	const pad = { l: 64, r: 70, t: 20, b: 34 };
	const pw = Math.max(10, W - pad.l - pad.r);
	const ph = H - pad.t - pad.b;
	const n = days.length;
	const vals = bars.flatMap((b) => b.values).concat(0);
	let lo = Math.min(...vals);
	let hi = Math.max(...vals);
	const span = hi - lo || 1;
	lo -= span * 0.1;
	hi += span * 0.1;
	const ilo = Math.min(...indexValues) - 120;
	const ihi = Math.max(...indexValues) + 120;
	const slot = pw / n;
	const x = (i: number) => pad.l + slot * (i + 0.5);
	const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * ph;
	const yi = (v: number) => pad.t + ((ihi - v) / (ihi - ilo)) * ph;
	const step = (() => { const raw = (hi - lo) / 6; const mag = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw) ?? raw; })();
	const yt: number[] = [];
	for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yt.push(v);
	const it: number[] = [];
	for (let v = Math.ceil(ilo / 200) * 200; v <= ihi; v += 200) it.push(v);
	const bw = Math.min(16, (slot * 0.7) / bars.length);
	const sel = hover ?? n - 1;
	const fmtAxis = (v: number) => (v === 0 ? '0' : Math.abs(v) >= 1e5 ? `${+(v / 1e5).toFixed(1)}L` : Math.abs(v) >= 1e3 ? `${+(v / 1e3).toFixed(0)}K` : `${v}`);
	return (
		<div className="fd-chart" ref={wrap}>
			<svg width={W} height={H} onMouseLeave={() => setHover(null)}>
				{it.map((v) => (
					<g key={`i${v}`}>
						<text x={pad.l - 10} y={yi(v) + 3} textAnchor="end" fontSize="10" fill="#868c98">{v.toLocaleString('en-IN')}</text>
					</g>
				))}
				<text transform={`translate(16 ${pad.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#868c98">{indexName}</text>
				{yt.map((v) => (
					<g key={`y${v}`}>
						<line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#2c333b" />
						<text x={W - pad.r + 10} y={y(v) + 3} fontSize="10" fill="#868c98">{fmtAxis(v)}</text>
					</g>
				))}
				<text transform={`translate(${W - 12} ${pad.t + ph / 2}) rotate(90)`} textAnchor="middle" fontSize="10" fill="#868c98">{axisTitle}</text>
				<line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#363d45" />
				{days.map((d, i) => (
					<g key={d.iso} onMouseEnter={() => setHover(i)}>
						<rect x={x(i) - slot / 2} y={pad.t} width={slot} height={ph} fill={i === sel ? 'rgba(255,255,255,0.05)' : 'transparent'} />
						{bars.map((b, bi) => (
							<rect key={b.key} x={x(i) - (bars.length * bw) / 2 + bi * bw} y={Math.min(y(b.values[i]), y(0))} width={bw - 2} height={Math.max(1, Math.abs(y(b.values[i]) - y(0)))} fill={b.color} />
						))}
						<text x={x(i)} y={H - 12} textAnchor="middle" fontSize="10" fill="#868c98">{d.short}</text>
					</g>
				))}
				<path d={indexValues.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${yi(v).toFixed(1)}`).join(' ')} fill="none" stroke="rgb(210,86,241)" strokeWidth="1.6" pointerEvents="none" />
				<circle cx={x(sel)} cy={yi(indexValues[sel])} r="4" fill="rgb(210,86,241)" pointerEvents="none" />
				<line x1={x(sel)} x2={x(sel)} y1={pad.t} y2={pad.t + ph} stroke="#ffffff" strokeDasharray="2 3" opacity="0.4" pointerEvents="none" />
			</svg>
			<div className="fd-tip" style={{ left: x(sel) + 300 > W ? x(sel) - 290 : x(sel) + 14 }}>
				<div className="fd-tip-date"><p>{days[sel].long}</p>{summary(sel)}</div>
			</div>
		</div>
	);
}

const tag = (v: number, invert = false) => {
	const bull = invert ? v < 0 : v > 0;
	return <span className={`fd-tag ${bull ? 'bull' : 'bear'}`}>{bull ? 'BULLISH' : 'BEARISH'}</span>;
};

function Fno({ onHow }: { onHow: () => void }) {
	const [who, setWho] = useState<Participant>('FII');
	const [month, setMonth] = useState(9);
	const [monthOpen, setMonthOpen] = useState(false);
	const [idx, setIdx] = useState<'Nifty' | 'Bank Nifty'>('Nifty');
	const [longShort, setLongShort] = useState(false);
	const days = (month === 9 ? DAYS.filter((d) => d.iso >= '2026-09-16') : DAYS.filter((d) => d.month === month));
	const offset = DAYS.indexOf(days[0]);
	const index = (idx === 'Nifty' ? NIFTY : BANK).slice(offset, offset + days.length);
	const series = (key: string, scale: number, bias = 0) => days.map((_, i) => Math.round(((seeded(key, who, idx, offset + i)() - 0.5) * 2 + bias) * scale));
	const callChg = series('cc', 1.1e5, -0.05);
	const putChg = series('pc', 1.0e5, 0.05);
	const callLong = series('cl', 6e4);
	const callShort = series('cs', 6e4);
	const fut = series('fut', 2.6e4, 0.1);
	let cum = 0;
	const callOi = series('coi', 1.5e5).map((v) => (cum += v * 0.25, Math.round(-2e5 + cum)));
	cum = 0;
	const putOi = series('poi', 1.5e5, 0.2).map((v) => (cum += v * 0.25, Math.round(3e5 + cum)));
	cum = 0;
	const futOi = series('foi', 3e4, -0.1).map((v) => (cum += v, Math.round(-2.2e5 + cum)));
	const idxLabel = idx === 'Nifty' ? 'NIFTY' : 'BANKNIFTY';
	const idxLine = (i: number) => {
		const v = index[i];
		const p = index[i - 1] ?? v;
		const pct = ((v - p) / p) * 100;
		return <span className="fd-tip-row"><span>{idxLabel}</span><b>{v.toFixed(2)} <em className={pct >= 0 ? "up" : "down"}>({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)</em></b></span>;
	};
	const IndexSelect = () => (
		<select className="sb-sel fd-idx" value={idx} onChange={(e) => setIdx(e.target.value as typeof idx)}><option>Nifty</option><option>Bank Nifty</option></select>
	);
	const Head = ({ title, legend, extra }: { title: string; legend: [string, string][]; extra?: ReactNode }) => (
		<div className="fd-sec-head">
			<div>
				<h3>{title}</h3>
				<button type="button" className="fd-read" onClick={onHow}>How to read this? <HelpCircle size={12} /></button>
			</div>
			<div className="fd-legend">
				{legend.map(([l, c]) => <span key={l}><i style={{ background: c }} /> {l}</span>)}
				<span><i className="ln" /> {idxLabel}</span>
				<IndexSelect />
				{extra}
			</div>
		</div>
	);
	return (
		<div className="fd-fno">
			<div className="fd-fno-bar">
				<div className="fd-seg-btns">{PARTICIPANTS.map((p) => <button key={p} type="button" className={who === p ? 'on' : ''} onClick={() => setWho(p)}>{p}</button>)}</div>
				<div className="fd-month">
					<button type="button" onClick={() => setMonthOpen(!monthOpen)}><Calendar size={16} /> <span>{month === 9 ? 'October' : month === 8 ? 'September' : 'August'} 2026</span> <ChevronDown size={15} /></button>
					{monthOpen ? (
						<div className="sb-pop fd-month-pop">
							{[9, 8, 7].map((m) => <button key={m} type="button" className={m === month ? 'on' : ''} onClick={() => { setMonth(m); setMonthOpen(false); }}><strong>{m === 9 ? 'October' : m === 8 ? 'September' : 'August'} 2026</strong></button>)}
						</div>
					) : null}
				</div>
			</div>

			<section className="fd-sec">
				<Head title={`Daily ${who} Buy/Sell in Index Options`} legend={longShort ? [[`${who} Call Long`, 'rgb(117,243,123)'], [`${who} Call Short`, 'rgb(242,110,110)']] : [[`${who} Call OI Change`, 'rgb(117,243,123)'], [`${who} Put OI Change`, 'rgb(242,110,110)']]}
					extra={<button type="button" className={`fd-ls ${longShort ? 'on' : ''}`} onClick={() => setLongShort(!longShort)}><span className="sb-toggle"><input type="checkbox" readOnly checked={longShort} /><i /></span> Show Long &amp; Short OI Change</button>} />
				<DayChart days={days} indexValues={index} indexName={idxLabel} axisTitle="Call/ Put Qty"
					bars={longShort ? [{ key: 'cl', label: 'Call Long', color: 'rgb(117,243,123)', values: callLong }, { key: 'cs', label: 'Call Short', color: 'rgb(242,110,110)', values: callShort }] : [{ key: 'c', label: 'Call', color: 'rgb(117,243,123)', values: callChg }, { key: 'p', label: 'Put', color: 'rgb(242,110,110)', values: putChg }]}
					summary={(i) => (
						<>
							<span className="fd-tag-wrap">{callChg[i] - putChg[i] > 0 ? <span className="fd-tag bull">NET BULLISH</span> : <span className="fd-tag bear">NET BEARISH</span>}</span>
							<span className="fd-tip-row"><span>{who} Call Change</span><b>{callChg[i].toLocaleString('en-IN')} {tag(callChg[i])}</b></span>
							<span className="fd-tip-row"><span>{who} Put Change</span><b>{putChg[i].toLocaleString('en-IN')} {tag(putChg[i], true)}</b></span>
							{idxLine(i)}
						</>
					)} />
			</section>

			<section className="fd-sec">
				<Head title={`Daily ${who} Buy/Sell in Index Futures`} legend={[[`${who} Index Futures`, 'rgb(121,117,234)']]} extra={<button type="button" className="fd-ls">Chart Settings <ChevronDown size={14} /></button>} />
				<DayChart days={days} indexValues={index} indexName={idxLabel} axisTitle="Qty" bars={[{ key: 'f', label: 'Fut', color: 'rgb(121,117,234)', values: fut }]}
					summary={(i) => (<><span className="fd-tip-row"><span>{who} Index Futures</span><b>{fut[i].toLocaleString('en-IN')} {tag(fut[i])}</b></span>{idxLine(i)}</>)} />
			</section>

			<section className="fd-sec">
				<Head title={`${who} OI in Index Options`} legend={[[`${who} Call OI`, 'rgb(117,243,123)'], [`${who} Put OI`, 'rgb(242,110,110)']]} />
				<DayChart days={days} indexValues={index} indexName={idxLabel} axisTitle="Index Qty" bars={[{ key: 'c', label: 'Call OI', color: 'rgb(117,243,123)', values: callOi }, { key: 'p', label: 'Put OI', color: 'rgb(242,110,110)', values: putOi }]}
					summary={(i) => (<><span className="fd-tip-row"><span>{who} Call OI</span><b>{fmtQty(callOi[i])}</b></span><span className="fd-tip-row"><span>{who} Put OI</span><b>{fmtQty(putOi[i])}</b></span>{idxLine(i)}</>)} />
			</section>

			<section className="fd-sec">
				<Head title={`${who} OI in Index Futures`} legend={[[`${who} Index Futures OI`, 'rgb(121,117,234)']]} />
				<DayChart days={days} indexValues={index} indexName={idxLabel} axisTitle="Index Qty" bars={[{ key: 'f', label: 'Fut OI', color: 'rgb(121,117,234)', values: futOi }]}
					summary={(i) => (<><span className="fd-tip-row"><span>{who} Futures OI</span><b>{fmtQty(futOi[i])}</b></span>{idxLine(i)}</>)} />
			</section>
			{monthOpen ? <button type="button" className="lc-dismiss fd-dismiss" aria-label="Close" onClick={() => setMonthOpen(false)} /> : null}
		</div>
	);
}

function cashFor(i: number) {
	const r = seeded('cash', i);
	const fii = Math.round((r() - 0.62) * 9000);
	const dii = Math.round((r() - 0.3) * 8000);
	return { fii, dii };
}

function Cash({ onHow }: { onHow: () => void }) {
	const days = DAYS.filter((d) => d.iso >= '2026-09-16');
	const offset = DAYS.indexOf(days[0]);
	const data = days.map((_, i) => cashFor(offset + i));
	const index = NIFTY.slice(offset);
	return (
		<div className="fd-fno">
			<section className="fd-sec">
				<div className="fd-sec-head">
					<div>
						<h3>FII &amp; DII Cash Market Activity</h3>
						<button type="button" className="fd-read" onClick={onHow}>How to read this? <HelpCircle size={12} /></button>
					</div>
					<div className="fd-legend">
						<span><i style={{ background: 'rgb(104,165,234)' }} /> FII Net Buy/Sell</span>
						<span><i style={{ background: 'rgb(241,184,81)' }} /> DII Net Buy/Sell</span>
						<span><i className="ln" /> NIFTY</span>
					</div>
				</div>
				<DayChart days={days} indexValues={index} indexName="NIFTY" axisTitle="₹ Crore" bars={[{ key: 'f', label: 'FII', color: 'rgb(104,165,234)', values: data.map((d) => d.fii) }, { key: 'd', label: 'DII', color: 'rgb(241,184,81)', values: data.map((d) => d.dii) }]}
					summary={(i) => (
						<>
							<span className="fd-tip-row"><span>FII Net</span><b className={data[i].fii >= 0 ? 'up' : 'down'}>{data[i].fii < 0 ? '-' : ''}₹{Math.abs(data[i].fii).toLocaleString('en-IN')} Cr</b></span>
							<span className="fd-tip-row"><span>DII Net</span><b className={data[i].dii >= 0 ? 'up' : 'down'}>{data[i].dii < 0 ? '-' : ''}₹{Math.abs(data[i].dii).toLocaleString('en-IN')} Cr</b></span>
							<span className="fd-tip-row"><span>NIFTY</span><b>{index[i].toFixed(2)}</b></span>
						</>
					)} />
			</section>
			<section className="fd-sec">
				<h3 className="fd-h3">Last 10 sessions</h3>
				<table className="fd-hist">
					<thead><tr><th>Date</th><th>FII Buy</th><th>FII Sell</th><th>FII Net</th><th>DII Buy</th><th>DII Sell</th><th>DII Net</th></tr></thead>
					<tbody>
						{data.slice(-10).reverse().map((d, j) => {
							const day = days[days.length - 1 - j];
							const fb = 14000 + (Math.abs(d.fii) % 3000);
							const db = 12000 + (Math.abs(d.dii) % 2500);
							return (
								<tr key={day.iso}>
									<td>{day.short} 2026</td>
									<td>{fb.toLocaleString('en-IN')}</td><td>{(fb - d.fii).toLocaleString('en-IN')}</td><td className={d.fii >= 0 ? 'up' : 'down'}>{d.fii.toLocaleString('en-IN')}</td>
									<td>{db.toLocaleString('en-IN')}</td><td>{(db - d.dii).toLocaleString('en-IN')}</td><td className={d.dii >= 0 ? 'up' : 'down'}>{d.dii.toLocaleString('en-IN')}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</section>
		</div>
	);
}

function History() {
	const [month, setMonth] = useState<'all' | 8 | 9>('all');
	const rows = useMemo(() => DAYS.map((d, i) => ({ d, i, cash: cashFor(i), fut: rowFor('FII', 'Index Futures', i), opt: rowFor('FII', 'Index Options', i) })).filter((r) => month === 'all' || r.d.month === month).reverse(), [month]);
	return (
		<div className="fd-fno">
			<section className="fd-sec">
				<div className="fd-sec-head">
					<div><h3>FII History</h3></div>
					<div className="fd-seg-btns">
						{([['all', 'All'], [9, 'October'], [8, 'September']] as const).map(([m, l]) => <button key={l} type="button" className={month === m ? 'on' : ''} onClick={() => setMonth(m)}>{l}</button>)}
					</div>
				</div>
				<table className="fd-hist">
					<thead><tr><th>Date</th><th>FII Cash (₹ Cr)</th><th>DII Cash (₹ Cr)</th><th>FII Index Fut Net</th><th>FII Index Opt Net</th><th>View</th><th>NIFTY</th></tr></thead>
					<tbody>
						{rows.map(({ d, i, cash, fut, opt }) => {
							const s = sentiment(opt, 'Index Options');
							return (
								<tr key={d.iso}>
									<td>{d.short} 2026 <span className="fd-muted">{d.dow}</span></td>
									<td className={cash.fii >= 0 ? 'up' : 'down'}>{cash.fii.toLocaleString('en-IN')}</td>
									<td className={cash.dii >= 0 ? 'up' : 'down'}>{cash.dii.toLocaleString('en-IN')}</td>
									<td>{fmtQty(fut.net)}</td>
									<td>{fmtQty(opt.net)}</td>
									<td>{s.side === 'none' ? <span className="fd-muted">Indecisive</span> : <span className={`fd-tag ${s.side}`}>{s.level?.toUpperCase()} {s.side === 'bull' ? 'BULLISH' : 'BEARISH'}</span>}</td>
									<td>{NIFTY[i].toFixed(2)}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</section>
		</div>
	);
}
