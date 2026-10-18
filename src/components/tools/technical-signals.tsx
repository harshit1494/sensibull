import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import '@/components/tools/analysis-pages.css';
import { LoginBanner, TerminalPage } from '@/components/tools/terminal-chrome';
import { FilterDropdown } from '@/components/tools/filter-dropdown';
import { FNO, SECTORS, SIGNALS, fnoBySymbol } from '@/lib/fno-stocks';

const ALL_SYMBOLS = FNO.map((s) => s.symbol);
const PAGE = 20;

export function TechnicalSignals() {
	const [tfs, setTfs] = useState<string[]>(['D']);
	const [candles, setCandles] = useState(true);
	const [ma, setMa] = useState(true);
	const [bull, setBull] = useState(true);
	const [bear, setBear] = useState(true);
	const [stocks, setStocks] = useState<string[]>(ALL_SYMBOLS);
	const [sectors, setSectors] = useState<string[]>(SECTORS);
	const [open, setOpen] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [asc, setAsc] = useState(false);
	const [sortUnd, setSortUnd] = useState<null | boolean>(null);

	const list = useMemo(() => {
		const out = SIGNALS.filter((s) => {
			if (!tfs.includes(s.tf)) return false;
			if (s.kind === 'Candle' && !candles) return false;
			if (s.kind === 'MA' && !ma) return false;
			if (s.bullish === true && !bull) return false;
			if (s.bullish === false && !bear) return false;
			if (!stocks.includes(s.symbol)) return false;
			if (!sectors.includes(fnoBySymbol(s.symbol).sector)) return false;
			return true;
		});
		if (sortUnd !== null) return out.slice().sort((a, b) => (sortUnd ? 1 : -1) * a.symbol.localeCompare(b.symbol));
		return asc ? out.slice().reverse() : out;
	}, [tfs, candles, ma, bull, bear, stocks, sectors, asc, sortUnd]);
	const pages = Math.max(1, Math.ceil(list.length / PAGE));
	const cur = Math.min(page, pages);
	const toggleTf = (t: string) => { setTfs(tfs.includes(t) ? tfs.filter((x) => x !== t) : [...tfs, t]); setPage(1); };
	const Check = ({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) => (
		<label className="ts-check"><input type="checkbox" checked={on} onChange={() => { set(!on); setPage(1); }} /> {label}</label>
	);

	return (
		<TerminalPage title="Technical Signals" active="analyse" className="ap-page">
			<div className="ap-shell">
				<LoginBanner />
				<div className="ts-bar">
					<div className="ts-group">
						{(['H', 'D', 'W', 'M'] as const).map((t) => <label key={t} className="ts-check" title={{ H: 'Hourly', D: 'Daily', W: 'Weekly', M: 'Monthly' }[t]}><input type="checkbox" checked={tfs.includes(t)} onChange={() => toggleTf(t)} /> {t}</label>)}
					</div>
					<div className="ts-group"><Check label="Candles" on={candles} set={setCandles} /><Check label="MA" on={ma} set={setMa} /></div>
					<div className="ts-group"><Check label="Bullish" on={bull} set={setBull} /><Check label="Bearish" on={bear} set={setBear} /></div>
					<div className="ts-group ts-drops">
						<FilterDropdown label="Stock" options={ALL_SYMBOLS} value={stocks} onApply={(v) => { setStocks(v); setPage(1); }} />
						<FilterDropdown label="Sector" options={SECTORS} value={sectors} onApply={(v) => { setSectors(v); setPage(1); }} />
					</div>
				</div>

				<div className="ts-card">
					<table className="ts-table">
						<thead>
							<tr>
								<th className="c-date"><button type="button" onClick={() => { setAsc(!asc); setSortUnd(null); }}>Date {asc ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</button></th>
								<th className="c-sig">Signal</th>
								<th className="c-und"><button type="button" onClick={() => setSortUnd(sortUnd === null ? true : sortUnd ? false : null)}>Underlying {sortUnd === null ? <ArrowDown size={14} className="sc-sort-idle" /> : sortUnd ? <ArrowDown size={14} /> : <ArrowUp size={14} />}</button></th>
								<th className="c-more">More</th>
							</tr>
						</thead>
						<tbody>
							{list.slice((cur - 1) * PAGE, cur * PAGE).map((s, i) => {
								const st = fnoBySymbol(s.symbol);
								const key = `${s.date}-${s.symbol}-${s.name}-${i}`;
								const isOpen = open === key;
								return (
									<Fragment key={key}>
										<tr className={isOpen ? 'open' : ''}>
											<td>{s.date} {s.time}</td>
											<td><span className="ts-sig">{s.name}{s.bullish === false ? <ArrowDown size={16} className="down" /> : s.bullish === true ? <ArrowUp size={16} className="up" /> : null}</span></td>
											<td><span className="ts-und"><strong>{s.symbol}</strong> {st.price.toFixed(2)} <em className={st.change >= 0 ? 'up' : 'down'}>{st.change >= 0 ? '+' : ''}{st.change.toFixed(2)}%</em><Link className="sb-chip" to={`/tools/live-options-charts?tradingsymbol=${['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'RELIANCE'].includes(s.symbol) ? s.symbol : 'NIFTY'}`} aria-label="Chart"><TrendingUp size={13} /></Link></span></td>
											<td><button type="button" className="sb-link" onClick={() => setOpen(isOpen ? null : key)}>{isOpen ? 'Show Less' : 'Show More'}</button></td>
										</tr>
										{isOpen ? (
											<tr className="ts-more">
												<td colSpan={4}>
													<div className="ts-more-grid">
														<dl><dt>PCR</dt><dd>{st.pcr.toFixed(2)}</dd></dl>
														<dl><dt>Daily Volume</dt><dd>{st.volumeX}x</dd></dl>
														<dl><dt>Daily Fut OI change</dt><dd>{st.futOiChg.toFixed(1)}</dd></dl>
														<dl><dt>ATM IV</dt><dd>{st.atmIv.toFixed(1)} ({st.ivChg >= 0 ? '+' : ''}{st.ivChg.toFixed(1)})</dd></dl>
														<dl><dt>IVP</dt><dd>{st.ivp}</dd></dl>
														<dl><dt>Result Date</dt><dd>{st.result === 'N/A' || st.result === 'TBA' ? st.result : `${st.result} 2026`}</dd></dl>
													</div>
													<div className="ts-more-links">
														<Link to={`/tools/option-chain?tradingsymbol=${['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'RELIANCE', 'SENSEX'].includes(s.symbol) ? s.symbol : 'NIFTY'}`}>Option Chain</Link>
														<Link to={`/tools/strategy-wizard?tradingsymbol=${s.symbol}`}>Strategies</Link>
														<Link to="/tools/strategy-builder">Builder</Link>
														<Link to={`/tools/open-interest?tradingsymbol=${s.symbol}`}>OI Graph</Link>
														<Link to={`/tools/stock-data?tradingsymbol=${s.symbol}`}>Stock Data</Link>
													</div>
												</td>
											</tr>
										) : null}
									</Fragment>
								);
							})}
							{list.length === 0 ? <tr><td colSpan={4} className="sc-empty">No signals for these filters. Try ticking D or W.</td></tr> : null}
						</tbody>
						<tfoot>
							<tr>
								<td colSpan={4}>
									<div className="sc-pages ts-pages">
										<button type="button" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
										<span>Page <input type="number" min={1} max={pages} value={cur} onChange={(e) => setPage(Math.min(pages, Math.max(1, Number(e.target.value) || 1)))} /> of {pages}</span>
										<button type="button" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
									</div>
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		</TerminalPage>
	);
}
