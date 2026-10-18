import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CalendarDays, ChevronDown, Info, Search, X } from 'lucide-react';
import '@/components/tools/trade-pages.css';
import { LoginBanner, TerminalPage } from '@/components/tools/terminal-chrome';
import { FilterDropdown } from '@/components/tools/filter-dropdown';
import { seeded } from '@/lib/market-mock';
import { FNO } from '@/lib/fno-stocks';
import { INSTRUMENTS } from '@/lib/strategy-math';

/* ------------------------------------------------------------------ */
/* Economic / Results / Holiday calendar                               */
/* ------------------------------------------------------------------ */

type Impact = 'Low' | 'Medium' | 'High';
type EconEvent = { day: number; time: string; country: string; event: string; impact: Impact; expected: string; actual: string; previous: string; about: string };

const FLAGS: Record<string, string> = { USA: '🇺🇸', China: '🇨🇳', India: '🇮🇳', 'Euro Area': '🇪🇺', Japan: '🇯🇵', UK: '🇬🇧' };
const COUNTRIES = Object.keys(FLAGS);
const IMPACTS: Impact[] = ['Low', 'Medium', 'High'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// day = day-of-October 2026 (values > 31 roll into November)
const EVENTS: EconEvent[] = [
	{ day: 9, time: '6:00 PM', country: 'USA', event: 'Initial Jobless Claims OCT/03', impact: 'Medium', expected: '205K', actual: '201K', previous: '207K', about: 'Weekly count of people filing for unemployment benefit for the first time. A rising number points to a cooling job market.' },
	{ day: 13, time: '5:30 PM', country: 'India', event: 'Inflation Rate YoY SEP', impact: 'High', expected: '2.4%', actual: '2.3%', previous: '2.1%', about: 'Consumer price inflation for India. It feeds directly into how the RBI thinks about rates, so banks and rate-sensitive stocks react to it.' },
	{ day: 14, time: '6:00 PM', country: 'USA', event: 'Inflation Rate YoY SEP', impact: 'High', expected: '2.9%', actual: '3.0%', previous: '2.9%', about: 'US consumer price inflation. A hotter print usually means higher-for-longer US rates, which tends to weigh on emerging-market flows.' },
	{ day: 15, time: '12:00 PM', country: 'India', event: 'WPI Inflation YoY SEP', impact: 'Low', expected: '0.6%', actual: '0.5%', previous: '0.5%', about: 'Wholesale price inflation — the price change at the factory gate rather than at the shop.' },
	{ day: 16, time: '6:45 PM', country: 'USA', event: 'Industrial Production YoY SEP', impact: 'Low', expected: '--', actual: '2.2%', previous: '1.6%', about: 'Output of US factories, mines and utilities compared with a year ago.' },
	{ day: 19, time: '7:30 AM', country: 'China', event: 'GDP Growth Rate YoY Q3', impact: 'Medium', expected: '4.4%', actual: '--', previous: '4.3%', about: 'How fast the Chinese economy grew over the last year. Metal and commodity stocks watch this closely.' },
	{ day: 19, time: '7:30 AM', country: 'China', event: 'Industrial Production YoY SEP', impact: 'Medium', expected: '5.4%', actual: '--', previous: '5.2%', about: 'Year-on-year change in Chinese factory output.' },
	{ day: 20, time: '12:00 AM', country: 'India', event: 'Market Holiday - Dussehra', impact: 'Low', expected: '--', actual: '--', previous: '--', about: 'NSE and BSE are closed for the day. Equity, F&O and currency segments do not trade.' },
	{ day: 20, time: '6:00 PM', country: 'USA', event: 'Housing Starts SEP', impact: 'Medium', expected: '1.30M', actual: '--', previous: '1.275M', about: 'Number of new homes on which construction started in the month (annualised).' },
	{ day: 22, time: '6:00 PM', country: 'USA', event: 'Initial Jobless Claims OCT/17', impact: 'Medium', expected: '200K', actual: '--', previous: '199K', about: 'Weekly count of people filing for unemployment benefit for the first time.' },
	{ day: 23, time: '3:00 PM', country: 'UK', event: 'S&P Global Manufacturing PMI Flash OCT', impact: 'Low', expected: '47.9', actual: '--', previous: '47.6', about: 'Early survey of UK manufacturing activity. Above 50 means expansion, below 50 means contraction.' },
	{ day: 27, time: '7:30 PM', country: 'USA', event: 'New Home Sales SEP', impact: 'Medium', expected: '--', actual: '--', previous: '0.684M', about: 'Number of newly built homes sold during the month (annualised).' },
	{ day: 28, time: '4:00 PM', country: 'India', event: 'Industrial Production YoY SEP', impact: 'Medium', expected: '--', actual: '--', previous: '8%', about: 'India’s index of industrial production — a broad read on factory, mining and power output.' },
	{ day: 28, time: '11:30 PM', country: 'USA', event: 'Fed Interest Rate Decision', impact: 'High', expected: '--', actual: '--', previous: '4%', about: 'The US Federal Reserve’s policy rate decision. Usually the single biggest global event of the month for markets — expect a volatile next open.' },
	{ day: 29, time: '6:00 PM', country: 'USA', event: 'Initial Jobless Claims OCT/24', impact: 'Medium', expected: '--', actual: '--', previous: '--', about: 'Weekly count of people filing for unemployment benefit for the first time.' },
	{ day: 29, time: '6:45 PM', country: 'Euro Area', event: 'ECB Interest Rate Decision', impact: 'Medium', expected: '--', actual: '--', previous: '--', about: 'The European Central Bank’s policy rate decision.' },
	{ day: 30, time: '8:30 AM', country: 'Japan', event: 'BoJ Interest Rate Decision', impact: 'Medium', expected: '--', actual: '--', previous: '1.25%', about: 'The Bank of Japan’s policy rate decision. Shifts here move the yen and global carry trades.' },
	{ day: 31, time: '7:00 AM', country: 'China', event: 'NBS Manufacturing PMI OCT', impact: 'Low', expected: '--', actual: '--', previous: '50.1', about: 'Official survey of Chinese factory activity. Above 50 means expansion.' },
	{ day: 33, time: '8:00 PM', country: 'USA', event: 'ISM Manufacturing PMI OCT', impact: 'Medium', expected: '--', actual: '--', previous: '49.1', about: 'Survey of US purchasing managers at manufacturing companies.' },
	{ day: 37, time: '7:00 PM', country: 'USA', event: 'Non Farm Payrolls OCT', impact: 'High', expected: '--', actual: '--', previous: '142K', about: 'Number of jobs added in the US last month, excluding farm work. One of the most watched data points in the world.' },
];

const HOLIDAYS: [number, number, string][] = [
	[0, 26, 'Republic Day'], [2, 3, 'Holi'], [2, 26, 'Shri Ram Navami'], [2, 31, 'Shri Mahavir Jayanti'], [3, 3, 'Good Friday'], [3, 14, 'Dr. Baba Saheb Ambedkar Jayanti'],
	[4, 1, 'Maharashtra Day'], [4, 28, 'Bakri Id'], [5, 26, 'Muharram'], [8, 14, 'Ganesh Chaturthi'], [9, 2, 'Mahatma Gandhi Jayanti'], [9, 20, 'Dussehra'],
	[10, 10, 'Diwali Balipratipada'], [10, 24, 'Prakash Gurpurb Sri Guru Nanak Dev'], [11, 25, 'Christmas'],
];

function dateOf(day: number) {
	return new Date(2026, 9, day);
}
function fmtDay(d: Date) {
	return `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]}, ${DOW[d.getDay()]}`;
}

const RANGE_PRESETS: { label: string; from: number; to: number }[] = [
	{ label: 'This week', from: 12, to: 18 },
	{ label: 'Next week', from: 19, to: 25 },
	{ label: '16 Oct to 31 Oct', from: 16, to: 31 },
	{ label: 'Last 7 days', from: 9, to: 16 },
	{ label: 'Next 30 days', from: 16, to: 46 },
];

function RangePicker({ from, to, onChange }: { from: number; to: number; onChange: (f: number, t: number) => void }) {
	const [open, setOpen] = useState(false);
	const [a, setA] = useState(from);
	const [b, setB] = useState(to);
	const label = `${dateOf(from).getDate()} ${MON[dateOf(from).getMonth()]} to ${dateOf(to).getDate()} ${MON[dateOf(to).getMonth()]}`;
	const iso = (d: number) => {
		const x = dateOf(d);
		return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
	};
	const fromIso = (s: string) => Math.round((new Date(`${s}T00:00:00`).getTime() - new Date(2026, 9, 0).getTime()) / 864e5);
	return (
		<div className="ec-range">
			<button type="button" className="ec-range-btn" onClick={() => { setA(from); setB(to); setOpen(!open); }}>
				<CalendarDays size={15} /> {label}
			</button>
			{open ? (
				<>
					<button type="button" className="msd-back" aria-label="Close" onClick={() => setOpen(false)} />
					<div className="ec-range-pop">
						<div className="ec-range-presets">
							{RANGE_PRESETS.map((p) => (
								<button key={p.label} type="button" className={p.from === a && p.to === b ? 'on' : ''} onClick={() => { setA(p.from); setB(p.to); }}>{p.label}</button>
							))}
						</div>
						<div className="ec-range-inputs">
							<label>From<input type="date" value={iso(a)} onChange={(e) => e.target.value && setA(fromIso(e.target.value))} /></label>
							<label>To<input type="date" value={iso(b)} onChange={(e) => e.target.value && setB(fromIso(e.target.value))} /></label>
						</div>
						<div className="msd-foot">
							<button type="button" className="msd-cancel" onClick={() => setOpen(false)}>Cancel</button>
							<button type="button" className="msd-apply" onClick={() => { onChange(Math.min(a, b), Math.max(a, b)); setOpen(false); }}>Apply</button>
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}

function EventDetails({ ev, onClose }: { ev: EconEvent; onClose: () => void }) {
	const rnd = seeded('hist', ev.event);
	const base = parseFloat(ev.previous) || 0;
	const unit = ev.previous.replace(/[-\d.]/g, '');
	const hist = Array.from({ length: 5 }, (_, i) => {
		const v = base ? base * (1 + (rnd() - 0.5) * 0.12) : 0;
		const d = new Date(2026, 9 - i - 1, 10 + Math.floor(rnd() * 15));
		return { date: `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`, val: base ? `${v.toFixed(unit === '%' ? 1 : unit === 'M' ? 3 : 0)}${unit}` : '--' };
	});
	return (
		<div className="sb-modal">
			<button type="button" className="sb-modal-back" aria-label="Close" onClick={onClose} />
			<div className="sb-modal-card ec-detail">
				<div className="ec-detail-head">
					<span className="ec-flag">{FLAGS[ev.country]}</span>
					<div>
						<strong>{ev.event}</strong>
						<p>{ev.country} · {fmtDay(dateOf(ev.day))} {ev.time}</p>
					</div>
					<button type="button" className="ec-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
				</div>
				<p className="ec-about">{ev.about}</p>
				<dl className="ec-detail-dl">
					<div><dt>Impact</dt><dd><span className={`ec-impact ${ev.impact.toLowerCase()}`}>{ev.impact}</span></dd></div>
					<div><dt>Expected</dt><dd>{ev.expected}</dd></div>
					<div><dt>Actual</dt><dd>{ev.actual}</dd></div>
					<div><dt>Previous</dt><dd>{ev.previous}</dd></div>
				</dl>
				<p className="ec-hist-title">History</p>
				<table className="ec-hist">
					<thead><tr><th>Release date</th><th>Actual</th></tr></thead>
					<tbody>{hist.map((h) => <tr key={h.date}><td>{h.date}</td><td>{h.val}</td></tr>)}</tbody>
				</table>
			</div>
		</div>
	);
}

export function EconomicCalendar() {
	const [params, setParams] = useSearchParams();
	const tab = params.get('tab') ?? 'economic-calendar';
	const [countries, setCountries] = useState<string[]>(COUNTRIES);
	const [impacts, setImpacts] = useState<string[]>(IMPACTS);
	const [range, setRange] = useState<[number, number]>([16, 31]);
	const [detail, setDetail] = useState<EconEvent | null>(null);
	const [q, setQ] = useState('');
	const [resRange, setResRange] = useState<[number, number]>([14, 46]);

	const rows = EVENTS.filter((e) => countries.includes(e.country) && impacts.includes(e.impact) && e.day >= range[0] && e.day <= range[1]);
	const results = useMemo(() => {
		return FNO.filter((s) => s.sector !== 'Index' && s.result !== 'TBA' && s.result !== 'N/A')
			.map((s) => {
				const [dd, mm] = s.result.split(' ');
				const day = Number(dd) + (mm === 'Nov' ? 31 : 0);
				return { s, day };
			})
			.filter((r) => r.day >= resRange[0] && r.day <= resRange[1] && r.s.symbol.includes(q.toUpperCase()))
			.sort((a, b) => a.day - b.day || a.s.symbol.localeCompare(b.s.symbol));
	}, [q, resRange]);
	const setTab = (t: string) => setParams(t === 'economic-calendar' ? {} : { tab: t }, { replace: true });
	const today = new Date(2026, 9, 18);

	return (
		<TerminalPage title={tab === 'stock-results-calendar' ? 'Stock Results Calendar' : tab === 'holiday-calendar' ? 'Holiday Calendar' : 'Economic Calendar'} active="analyse" className="tp-page">
			<div className="tp-shell">
				<LoginBanner />
				<div className="ec-card">
					<div className="ec-tabs">
						{[['economic-calendar', 'Economic Calendar'], ['stock-results-calendar', 'Stock Results Calendar'], ['holiday-calendar', 'Holiday Calendar']].map(([id, label]) => (
							<button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
						))}
					</div>

					{tab === 'economic-calendar' ? (
						<>
							<div className="ec-filters">
								<strong>Filters</strong>
								<FilterDropdown label="Country" options={COUNTRIES} value={countries} onApply={setCountries} align="left" />
								<FilterDropdown label="Impact" options={IMPACTS} value={impacts} onApply={setImpacts} align="left" />
								<RangePicker from={range[0]} to={range[1]} onChange={(a, b) => setRange([a, b])} />
							</div>
							<div className="ec-table-wrap">
								<table className="ec-table">
									<thead><tr><th>Date</th><th>Country</th><th>Event</th><th className="c">Impact</th><th className="r">Expected</th><th className="r">Actual</th><th className="r">Previous</th><th>More</th></tr></thead>
									<tbody>
										{rows.map((e) => (
											<tr key={e.event + e.day} className={e.day < 18 ? 'past' : ''}>
												<td>{fmtDay(dateOf(e.day)).replace(/^0/, '')} {e.time}</td>
												<td><span className="ec-country"><span className="ec-flag">{FLAGS[e.country]}</span>{e.country}</span></td>
												<td>{e.event}</td>
												<td className="c"><span className={`ec-impact ${e.impact.toLowerCase()}`}>{e.impact}</span></td>
												<td className="r">{e.expected}</td>
												<td className="r">{e.actual}</td>
												<td className="r">{e.previous}</td>
												<td><button type="button" className="sb-link" onClick={() => setDetail(e)}>View Details</button></td>
											</tr>
										))}
										{rows.length === 0 ? <tr><td colSpan={8} className="ec-empty">No events for these filters.</td></tr> : null}
									</tbody>
								</table>
							</div>
						</>
					) : null}

					{tab === 'stock-results-calendar' ? (
						<>
							<div className="ec-filters">
								<strong>Filters</strong>
								<label className="ec-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stock" /></label>
								<RangePicker from={resRange[0]} to={resRange[1]} onChange={(a, b) => setResRange([a, b])} />
							</div>
							<div className="ec-table-wrap">
								<table className="ec-table">
									<thead><tr><th>Result Date</th><th>Stock</th><th>Sector</th><th className="r">LTP</th><th className="r">ATM IV</th><th className="r">IVP</th><th>Period</th></tr></thead>
									<tbody>
										{results.map(({ s, day }) => (
											<tr key={s.symbol} className={day < 18 ? 'past' : ''}>
												<td>{fmtDay(dateOf(day))}</td>
												<td><strong>{s.symbol}</strong></td>
												<td>{s.sector}</td>
												<td className="r">{s.price.toFixed(2)} <em className={s.change >= 0 ? 'up' : 'down'}>{s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%</em></td>
												<td className="r">{s.atmIv.toFixed(1)}</td>
												<td className="r">{s.ivp}</td>
												<td>Q2 FY27</td>
											</tr>
										))}
										{results.length === 0 ? <tr><td colSpan={7} className="ec-empty">No results in this range.</td></tr> : null}
									</tbody>
								</table>
							</div>
						</>
					) : null}

					{tab === 'holiday-calendar' ? (
						<div className="ec-table-wrap">
							<p className="ec-note"><Info size={14} /> Trading holidays for NSE &amp; BSE (Equity, F&amp;O) in 2026. Muhurat trading on Diwali, Sun 08 Nov — timings will be announced by the exchange.</p>
							<table className="ec-table">
								<thead><tr><th>#</th><th>Date</th><th>Day</th><th>Holiday</th><th>Status</th></tr></thead>
								<tbody>
									{HOLIDAYS.map(([m, d, name], i) => {
										const dt = new Date(2026, m, d);
										const past = dt < today;
										return (
											<tr key={name} className={past ? 'past' : ''}>
												<td>{i + 1}</td>
												<td>{String(d).padStart(2, '0')} {MON[m]} 2026</td>
												<td>{DOW[dt.getDay()]}</td>
												<td>{name}</td>
												<td>{past ? <span className="fd-muted">Gone</span> : <span className="ec-up">Upcoming</span>}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : null}
				</div>
			</div>
			{detail ? <EventDetails ev={detail} onClose={() => setDetail(null)} /> : null}
		</TerminalPage>
	);
}

/* ------------------------------------------------------------------ */
/* IV Chart                                                            */
/* ------------------------------------------------------------------ */

type Bar = { date: Date; o: number; h: number; l: number; c: number; iv: number };

function ivBars(symbol: string, spot: number): Bar[] {
	const days: Date[] = [];
	for (let d = new Date(2026, 8, 3); d <= new Date(2026, 9, 16); d.setDate(d.getDate() + 1)) {
		if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
	}
	const rnd = seeded('ivbars', symbol);
	const n = days.length;
	// Brownian bridge from a start ~4% away to the current spot.
	const walk: number[] = [0];
	for (let i = 1; i < n; i++) walk.push(walk[i - 1] + (rnd() - 0.5) * 2);
	const startTarget = spot * (1 + (rnd() > 0.5 ? 0.035 : -0.04));
	const closes = walk.map((w, i) => {
		const t = i / (n - 1);
		const bridge = w - t * walk[n - 1];
		return startTarget + (spot - startTarget) * t + bridge * spot * 0.006;
	});
	closes[n - 1] = spot;
	const baseIv = symbol === 'NIFTY' ? 12.5 : symbol === 'BANKNIFTY' ? 14 : symbol === 'SENSEX' ? 12 : 24;
	return days.map((date, i) => {
		const c = closes[i];
		const o = i ? closes[i - 1] * (1 + (rnd() - 0.5) * 0.004) : c * 0.998;
		const h = Math.max(o, c) * (1 + rnd() * 0.004);
		const l = Math.min(o, c) * (1 - rnd() * 0.004);
		const expiryBump = date.getDay() === 1 ? -2.4 : date.getDay() === 4 ? 1.6 : 0;
		const iv = Math.max(8.5, baseIv + Math.sin(i / 2.2) * 1.8 + (rnd() - 0.5) * 3 + expiryBump + (i > n - 6 ? -1 : 0));
		return { date, o, h, l, c, iv };
	});
}

function niceTicks(lo: number, hi: number, count: number) {
	const span = hi - lo;
	const raw = span / count;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
	const out: number[] = [];
	for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
	return out;
}

function IvPlot({ bars, mode, symbol }: { bars: Bar[]; mode: 'line' | 'candle'; symbol: string }) {
	const [hover, setHover] = useState<number | null>(null);
	const W = 1340, H = 320, L = 46, R = 70, T = 16, B = 34;
	const iw = W - L - R, ih = H - T - B;
	const ivLo = Math.floor(Math.min(...bars.map((b) => b.iv)) - 0.5), ivHi = Math.ceil(Math.max(...bars.map((b) => b.iv)) + 0.5);
	const pLo = Math.min(...bars.map((b) => b.l)) * 0.997, pHi = Math.max(...bars.map((b) => b.h)) * 1.003;
	const x = (i: number) => L + (iw * (i + 0.5)) / bars.length;
	const yIv = (v: number) => T + ih - ((v - ivLo) / (ivHi - ivLo)) * ih;
	const yP = (v: number) => T + ih - ((v - pLo) / (pHi - pLo)) * ih;
	const cw = Math.max(3, (iw / bars.length) * 0.55);
	const ivPath = bars.map((b, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yIv(b.iv).toFixed(1)}`).join('');
	const pricePath = bars.map((b, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yP(b.c).toFixed(1)}`).join('');
	const labelEvery = Math.ceil(bars.length / 9);
	const hb = hover !== null ? bars[hover] : null;
	return (
		<div className="iv-plot">
			<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onMouseLeave={() => setHover(null)} onMouseMove={(e) => {
				const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
				const px = ((e.clientX - r.left) / r.width) * W;
				const i = Math.floor(((px - L) / iw) * bars.length);
				setHover(i >= 0 && i < bars.length ? i : null);
			}}>
				{niceTicks(ivLo, ivHi, 8).map((v) => (
					<g key={`iv${v}`}>
						<line x1={L} x2={W - R} y1={yIv(v)} y2={yIv(v)} className="iv-grid" />
						<text x={L - 8} y={yIv(v) + 4} textAnchor="end" className="iv-ax">{v}</text>
					</g>
				))}
				{niceTicks(pLo, pHi, 12).map((v) => <text key={`p${v}`} x={W - R + 8} y={yP(v) + 4} className="iv-ax">{v}</text>)}
				<text transform={`translate(12 ${T + ih / 2}) rotate(-90)`} textAnchor="middle" className="iv-ax">ATM IV</text>
				<text transform={`translate(${W - 10} ${T + ih / 2}) rotate(90)`} textAnchor="middle" className="iv-ax">{symbol}</text>
				{bars.map((b, i) => (i % labelEvery === 0 ? <text key={`d${i}`} x={x(i)} y={H - 14} textAnchor="middle" className="iv-ax">{MON[b.date.getMonth()]} {String(b.date.getDate()).padStart(2, '0')}</text> : null))}
				<text x={L + iw / 2} y={H - 1} textAnchor="middle" className="iv-ax">2026</text>
				{mode === 'candle'
					? bars.map((b, i) => {
							const up = b.c >= b.o;
							return (
								<g key={`c${i}`} className={up ? 'iv-up' : 'iv-down'}>
									<line x1={x(i)} x2={x(i)} y1={yP(b.h)} y2={yP(b.l)} />
									<rect x={x(i) - cw / 2} width={cw} y={yP(Math.max(b.o, b.c))} height={Math.max(1.5, Math.abs(yP(b.o) - yP(b.c)))} />
								</g>
							);
						})
					: <path d={pricePath} className="iv-price-line" />}
				<path d={ivPath} className="iv-line" />
				{bars.map((b, i) => (b.date.getDay() === 5 ? <circle key={`f${i}`} cx={x(i)} cy={yIv(b.iv)} r={3.5} className="iv-fri" /> : null))}
				{hb && hover !== null ? (
					<g>
						<line x1={x(hover)} x2={x(hover)} y1={T} y2={T + ih} className="iv-cross" />
						<circle cx={x(hover)} cy={yIv(hb.iv)} r={4} className="iv-fri" />
					</g>
				) : null}
			</svg>
			{hb && hover !== null ? (
				<div className="iv-tip" style={{ left: `${Math.min(80, (x(hover) / W) * 100)}%` }}>
					<strong>{DOW[hb.date.getDay()]}, {hb.date.getDate()} {MON[hb.date.getMonth()]} 2026</strong>
					<span><i className="iv-k iv" />ATM IV <b>{hb.iv.toFixed(1)}</b></span>
					<span><i className="iv-k px" />{symbol} O {hb.o.toFixed(1)} H {hb.h.toFixed(1)} L {hb.l.toFixed(1)} C <b>{hb.c.toFixed(1)}</b></span>
				</div>
			) : null}
		</div>
	);
}

export function IvChart() {
	const [params, setParams] = useSearchParams();
	const symbol = (params.get('underlying') ?? 'NIFTY').toUpperCase();
	const known = INSTRUMENTS.find((i) => i.symbol === symbol);
	const fno = FNO.find((s) => s.symbol === symbol);
	const spot = known?.spot ?? fno?.price ?? 23146.15;
	const change = known?.change ?? fno?.change ?? 0;
	const [mode, setMode] = useState<'line' | 'candle'>('candle');
	const [pick, setPick] = useState(false);
	const [q, setQ] = useState('');
	const [learn, setLearn] = useState(false);
	const [info, setInfo] = useState(false);
	const bars = useMemo(() => ivBars(symbol, spot), [symbol, spot]);
	const list = FNO.filter((s) => s.symbol.includes(q.toUpperCase())).slice(0, 12);
	const cur = bars[bars.length - 1];
	const ivp = fno?.ivp ?? 38;

	return (
		<TerminalPage title="IV Chart" active="analyse" className="tp-page">
			<div className="tp-shell">
				<LoginBanner />
				<div className="iv-controls">
					<div className="iv-field">
						<span>Stock Name</span>
						<div className="iv-ticker">
							<button type="button" className="iv-ticker-main" onClick={() => setPick(!pick)}>
								<Search size={14} /> <strong>{symbol}</strong> {spot.toFixed(2)} <em className={change >= 0 ? 'up' : 'down'}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</em>
							</button>
							<button type="button" className="sb-chip" onClick={() => setInfo(!info)} aria-label="Info"><Info size={13} /></button>
							{pick ? (
								<div className="sb-pop">
									<input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stock" />
									{list.map((s) => (
										<button key={s.symbol} type="button" onClick={() => { setParams({ underlying: s.symbol }, { replace: true }); setPick(false); setQ(''); }}>
											<strong>{s.symbol}</strong><span>{s.price.toFixed(2)}</span>
										</button>
									))}
								</div>
							) : null}
							{info ? (
								<div className="sb-pop iv-info">
									<p><span>Current ATM IV</span><b>{cur.iv.toFixed(1)}</b></p>
									<p><span>IV Percentile</span><b>{ivp}</b></p>
									<p><span>30D High / Low</span><b>{Math.max(...bars.slice(-22).map((b) => b.iv)).toFixed(1)} / {Math.min(...bars.slice(-22).map((b) => b.iv)).toFixed(1)}</b></p>
								</div>
							) : null}
						</div>
					</div>
					<div className="iv-field">
						<span>Graph</span>
						<div className="iv-radios">
							<label><input type="radio" checked={mode === 'line'} onChange={() => setMode('line')} /> Line</label>
							<label><input type="radio" checked={mode === 'candle'} onChange={() => setMode('candle')} /> Candle</label>
						</div>
					</div>
					<div className="iv-field">
						<span>ATM IV from</span>
						<div className="iv-range"><CalendarDays size={14} /> 03 Sep to 16 Oct</div>
					</div>
				</div>
				<p className="iv-title">IV Chart</p>
				<IvPlot bars={bars} mode={mode} symbol={symbol} />
				<div className="iv-legend">
					<span><i className={mode === 'candle' ? 'iv-k candle' : 'iv-k px'} />{symbol}</span>
					<span><i className="iv-k iv" />ATM IV</span>
					<span><i className="iv-k fri" />Friday</span>
				</div>
				<div className={`iv-learn ${learn ? 'open' : ''}`}>
					<button type="button" onClick={() => setLearn(!learn)}>Learn more <ChevronDown size={18} /></button>
					{learn ? (
						<div className="iv-learn-body">
							<p><b>What is implied volatility?</b> IV is the market’s guess of how much a stock will move, worked backwards from option prices. Expensive options mean high IV — traders expect a bigger move.</p>
							<p><b>Why ATM IV?</b> At-the-money options are the most traded, so their IV is the cleanest single number for “how nervous is the market right now”.</p>
							<p><b>How to use this chart.</b> IV usually rises before events (results, budget, policy meets) and falls right after. Selling options when IV is high and buying when IV is low tilts the odds in your favour. Fridays are marked so you can compare the same day across weeks without weekday effects.</p>
						</div>
					) : null}
				</div>
			</div>
			{pick || info ? <button type="button" className="lc-dismiss ap-dismiss" aria-label="Close" onClick={() => { setPick(false); setInfo(false); }} /> : null}
		</TerminalPage>
	);
}
