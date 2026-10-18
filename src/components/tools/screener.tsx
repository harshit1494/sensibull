import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, HelpCircle, Search, TrendingUp, TriangleAlert } from 'lucide-react';
import '@/components/tools/analysis-pages.css';
import { LoginBanner, TerminalPage } from '@/components/tools/terminal-chrome';
import { FNO, SECTORS, type FnoStock } from '@/lib/fno-stocks';

type SortKey = 'symbol' | 'fut' | 'atmIv' | 'ivChg' | 'ivp' | 'result' | 'oiChg' | 'pcr' | 'maxPain';
const COLS: [SortKey, string, string?][] = [
	['symbol', 'Stock'], ['fut', 'Fut Price'], ['atmIv', 'ATM IV', 'Implied volatility of the at-the-money option'], ['ivChg', 'IV Chg', 'Change in ATM IV since yesterday'],
	['ivp', 'IVP', 'IV percentile over the last year'], ['result', 'Result'], ['oiChg', 'OI % Chg.', 'Change in futures open interest today'], ['pcr', 'PCR', 'Put-call ratio of open interest'], ['maxPain', 'Max Pain'],
];
const ACTIONS = ['Long buildup', 'Short cover', 'Long unwind', 'Short buildup'] as const;
type Range = { min: string; max: string };
const RANGES: [keyof FnoStock, string, string][] = [['atmIv', 'IV range', 'IV'], ['ivp', 'IVP range', 'IVP'], ['pcr', 'PCR range', 'PCR'], ['futChg', 'Future % change', 'Fut%'], ['oiChg', 'OI % change', 'OI%']];

export function Screener() {
	const [params, setParams] = useSearchParams();
	const view = params.get('view') === 'heatmap' ? 'heatmap' : 'table';
	const [stockQ, setStockQ] = useState('');
	const [sector, setSector] = useState('ALL');
	const [expiry, setExpiry] = useState('October');
	const [liquid, setLiquid] = useState(true);
	const [events, setEvents] = useState(false);
	const [actions, setActions] = useState<string[]>([]);
	const [ranges, setRanges] = useState<Record<string, Range>>({});
	const [sort, setSort] = useState<{ key: SortKey; asc: boolean } | null>(null);
	const [rows, setRows] = useState(20);
	const [page, setPage] = useState(1);
	const [caution, setCaution] = useState(false);
	const [expMissing, setExpMissing] = useState(false);

	const list = useMemo(() => {
		let out = FNO.filter((s) => {
			if (stockQ && !s.symbol.includes(stockQ.toUpperCase())) return false;
			if (sector !== 'ALL' && s.sector !== sector) return false;
			if (liquid && !s.liquid) return false;
			if (events && (s.result === 'N/A' || s.result === 'TBA')) return false;
			if (actions.length && !actions.includes(s.action)) return false;
			for (const [key] of RANGES) {
				const r = ranges[key as string];
				const v = Number(s[key]);
				if (r?.min !== undefined && r.min !== '' && v < Number(r.min)) return false;
				if (r?.max !== undefined && r.max !== '' && v > Number(r.max)) return false;
			}
			return true;
		});
		// Sensibull pins index futures first, then alphabetical.
		out = out.sort((a, b) => {
			if (sort) {
				const av = a[sort.key];
				const bv = b[sort.key];
				const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
				return sort.asc ? cmp : -cmp;
			}
			const ai = a.sector === 'Index' ? 0 : 1;
			const bi = b.sector === 'Index' ? 0 : 1;
			return ai - bi || (a.sector === 'Index' ? 0 : a.symbol.localeCompare(b.symbol));
		});
		return out;
	}, [stockQ, sector, liquid, events, actions, ranges, sort]);
	const pages = Math.max(1, Math.ceil(list.length / rows));
	const cur = Math.min(page, pages);
	const shown = list.slice((cur - 1) * rows, cur * rows);
	const setRange = (k: string, side: 'min' | 'max', v: string) => { setRanges({ ...ranges, [k]: { ...(ranges[k] ?? { min: '', max: '' }), [side]: v } }); setPage(1); };
	const label = (s: FnoStock) => (s.sector === 'Index' ? `${s.symbol} (Monthly)` : s.symbol);

	function download() {
		const head = ['Stock', 'Fut Price', 'Fut %', 'ATM IV', 'IV Chg', 'IVP', 'Result', 'OI % Chg', 'PCR', 'Max Pain'];
		const body = list.map((s) => [label(s), s.fut, s.futChg, s.atmIv, s.ivChg, s.ivp, s.result, s.oiChg, s.pcr, s.maxPain].join(','));
		const blob = new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'options-screener.csv';
		a.click();
		URL.revokeObjectURL(a.href);
	}

	return (
		<TerminalPage title="Screener" active="analyse" className="ap-page">
			<div className="ap-shell">
				<LoginBanner />
				<div className="sc-body">
					<aside className="sc-side">
						<div className="sc-ticker"><Search size={16} /><strong>NIFTY</strong> <span>23146.15</span> <em className="up">+0.65%</em><Link className="sb-chip" to="/tools/live-options-charts?tradingsymbol=NIFTY" aria-label="Charts"><TrendingUp size={15} /></Link></div>
						<div className="sc-filters">
							<label className="sc-field">Stock<input value={stockQ} onChange={(e) => { setStockQ(e.target.value); setPage(1); }} placeholder="Eg: HDFCBANK" /></label>
							<label className="sc-field">Sector
								<select className="sb-sel" value={sector} onChange={(e) => { setSector(e.target.value); setPage(1); }}>
									<option>ALL</option>
									{SECTORS.map((s) => <option key={s}>{s}</option>)}
								</select>
							</label>
							<label className="sc-field">Expiry
								<select className="sb-sel" value={expiry} onChange={(e) => setExpiry(e.target.value)}><option>October</option><option>November</option><option>December</option></select>
							</label>
							<button type="button" className="sc-missing" onClick={() => setExpMissing(!expMissing)}><TriangleAlert size={15} /> Expiry missing?</button>
							{expMissing ? <p className="sc-hint">Only monthly expiries are listed. Weekly index expiries roll into the nearest monthly contract.</p> : null}
							<label className="sc-switch"><span>Liquid only <HelpCircle size={13} /></span><span className="sb-toggle"><input type="checkbox" checked={liquid} onChange={() => { setLiquid(!liquid); setPage(1); }} /><i /></span></label>
							<label className="sc-switch"><span>Upcoming events</span><span className="sb-toggle"><input type="checkbox" checked={events} onChange={() => { setEvents(!events); setPage(1); }} /><i /></span></label>
							<p className="sc-label">OI action <HelpCircle size={13} /></p>
							<p className="sc-group"><span className="sc-dot bull" /> Bullish</p>
							{ACTIONS.slice(0, 2).map((a) => <ActionSwitch key={a} a={a} actions={actions} setActions={(v) => { setActions(v); setPage(1); }} />)}
							<p className="sc-group"><span className="sc-dot bear" /> Bearish</p>
							{ACTIONS.slice(2).map((a) => <ActionSwitch key={a} a={a} actions={actions} setActions={(v) => { setActions(v); setPage(1); }} />)}
							{RANGES.map(([key, title, short]) => (
								<div key={key as string} className="sc-range">
									<p className="sc-label">{title}</p>
									<div>
										<label>Min {short}<input type="number" value={ranges[key as string]?.min ?? ''} onChange={(e) => setRange(key as string, 'min', e.target.value)} /></label>
										<span>to</span>
										<label>Max {short}<input type="number" value={ranges[key as string]?.max ?? ''} onChange={(e) => setRange(key as string, 'max', e.target.value)} /></label>
									</div>
								</div>
							))}
							<p className="sc-feedback">Got a question? Have some feedback? Found a bug? Please email us with your broker name and client ID at <a href="mailto:help@sensibull.com">help@sensibull.com</a></p>
						</div>
					</aside>

					<div className="sc-main">
						<div className="fd-seg-btns">
							<button type="button" className={view === 'table' ? 'on' : ''} onClick={() => setParams({ view: 'table' }, { replace: true })}>Table</button>
							<button type="button" className={view === 'heatmap' ? 'on' : ''} onClick={() => setParams({ view: 'heatmap' }, { replace: true })}>Heat Map</button>
						</div>

						{view === 'table' ? (
							<>
								<div className="sc-table-wrap">
									<table className="sc-table">
										<thead>
											<tr>
												{COLS.map(([key, title, tip]) => (
													<th key={key}>
														<button type="button" onClick={() => setSort(sort?.key === key ? (sort.asc ? { key, asc: false } : null) : { key, asc: true })} className={sort?.key === key ? 'on' : ''}>
															{title} {tip ? <span title={tip}><HelpCircle size={13} /></span> : null}
															{sort?.key === key ? (sort.asc ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ArrowUp size={13} className="sc-sort-idle" />}
														</button>
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{shown.map((s) => (
												<tr key={s.symbol}>
													<td><Link to={`/tools/stock-data?tradingsymbol=${s.symbol}`}>{label(s)}</Link></td>
													<td>{s.fut.toFixed(2)} <em className={s.futChg >= 0 ? 'up' : 'down'}>{s.futChg >= 0 ? '+' : ''}{s.futChg.toFixed(2)}%</em></td>
													<td>{s.atmIv.toFixed(1)}</td>
													<td>{s.ivChg >= 0 ? '+' : ''}{s.ivChg.toFixed(1)}</td>
													<td>{s.ivp}</td>
													<td>{s.result}</td>
													<td>{s.oiChg.toFixed(1)}</td>
													<td><span className="sc-pcr">{s.pcr.toFixed(2)} <HelpCircle size={12} /></span></td>
													<td>{s.maxPain}</td>
												</tr>
											))}
											{shown.length === 0 ? <tr><td colSpan={9} className="sc-empty">No stocks match these filters.</td></tr> : null}
										</tbody>
									</table>
								</div>
								<div className="sc-pager">
									<label>Show <select className="sb-sel" value={rows} onChange={(e) => { setRows(Number(e.target.value)); setPage(1); }}>{[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} rows</option>)}</select></label>
									<div className="sc-pages">
										<button type="button" disabled={cur === 1} onClick={() => setPage(1)} aria-label="First page"><ChevronsLeft size={16} /></button>
										<button type="button" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
										<span>Page <input type="number" min={1} max={pages} value={cur} onChange={(e) => setPage(Math.min(pages, Math.max(1, Number(e.target.value) || 1)))} /> of {pages}</span>
										<button type="button" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
										<button type="button" disabled={cur === pages} onClick={() => setPage(pages)} aria-label="Last page"><ChevronsRight size={16} /></button>
									</div>
								</div>
							</>
						) : (
							<div className="sc-heat">
								{list.map((s) => {
									const a = Math.min(1, Math.abs(s.futChg) / 3);
									return (
										<Link key={s.symbol} to={`/tools/stock-data?tradingsymbol=${s.symbol}`} className="sc-tile" style={{ background: s.futChg >= 0 ? `rgba(50,213,131,${0.12 + a * 0.55})` : `rgba(233,103,103,${0.12 + a * 0.55})` }}>
											<strong>{label(s)}</strong>
											<span>{s.futChg >= 0 ? '+' : ''}{s.futChg.toFixed(2)}%</span>
											<small>IV {s.atmIv.toFixed(1)} · OI {s.oiChg.toFixed(1)}%</small>
										</Link>
									);
								})}
							</div>
						)}

						<button type="button" className="sc-download" onClick={download}><Download size={16} /> Download as Excel</button>
						<div className="sc-caution">
							<button type="button" className="sb-link" onClick={() => setCaution(!caution)}>Caution: Do not trade without reading this completely</button>
							{caution ? <p>Screener values are mock data for this recreation. OI action labels are derived from futures price and OI change only, and say nothing about options positioning. Always confirm on the option chain before trading.</p> : null}
						</div>
					</div>
				</div>
			</div>
		</TerminalPage>
	);
}

function ActionSwitch({ a, actions, setActions }: { a: string; actions: string[]; setActions: (v: string[]) => void }) {
	const on = actions.includes(a);
	return (
		<label className="sc-switch">
			<span>{a}</span>
			<span className="sb-toggle"><input type="checkbox" checked={on} onChange={() => setActions(on ? actions.filter((x) => x !== a) : [...actions, a])} /><i /></span>
		</label>
	);
}
