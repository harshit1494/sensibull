import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowDown, ChevronRight, Eye, Info, LayoutGrid, PencilRuler, Plus, Search, TrendingUp, Wand2, BarChart2 } from 'lucide-react';
import '@/components/tools/analysis-pages.css';
import { LoginBanner, TerminalPage } from '@/components/tools/terminal-chrome';
import { CHAIN_EXPIRIES, buildChain, synthFuture } from '@/lib/market-mock';
import { FNO, SIGNALS, fnoBySymbol } from '@/lib/fno-stocks';
import { INSTRUMENTS, type Instrument } from '@/lib/strategy-math';

const tag = (bull: boolean) => <span className={`fd-tag ${bull ? 'bull' : 'bear'}`}>{bull ? 'BULLISH' : 'BEARISH'}</span>;

function toInstrument(symbol: string): Instrument {
	const known = INSTRUMENTS.find((i) => i.symbol === symbol);
	if (known) return known;
	const s = fnoBySymbol(symbol);
	const step = s.price > 10000 ? 100 : s.price > 2000 ? 50 : s.price > 500 ? 10 : s.price > 100 ? 5 : 2.5;
	return { symbol: s.symbol, name: s.symbol, spot: s.price, change: s.change, step, lot: Math.max(1, Math.round(150000 / s.price / 25) * 25) };
}

export function StockData() {
	const [params, setParams] = useSearchParams();
	const symbol = (params.get('tradingsymbol') ?? 'NIFTY').toUpperCase();
	const inst = toInstrument(symbol);
	const stock = fnoBySymbol(symbol);
	const [exp, setExp] = useState(0);
	const [searchOpen, setSearchOpen] = useState(false);
	const [q, setQ] = useState('');
	const [watch, setWatch] = useState(false);
	const [notes, setNotes] = useState<Record<string, string>>({});
	const [noteFor, setNoteFor] = useState<string | null>(null);
	const [sortAsc, setSortAsc] = useState(false);
	const [toast, setToast] = useState<string | null>(null);
	const flash = (t: string) => { setToast(t); window.setTimeout(() => setToast(null), 2200); };

	const chain = useMemo(() => buildChain(inst, exp, 5), [inst, exp]);
	const atmIdx = chain.findIndex((r) => r.strike > inst.spot) - 1;
	const maxOi = Math.max(...chain.flatMap((r) => [r.call.oi, r.put.oi]));
	const signals = SIGNALS.filter((s) => s.symbol === symbol).slice(0, 8);
	const sigRows = (signals.length ? signals : SIGNALS.slice(0, 5).map((s) => ({ ...s, symbol }))).slice().sort((a, b) => (sortAsc ? a.sort - b.sort : b.sort - a.sort));
	const atmIv = chain[Math.max(0, atmIdx)]?.iv ?? 10.7;
	const pcr = stock.pcr;
	const list = FNO.filter((s) => s.symbol.includes(q.toUpperCase())).slice(0, 12);
	const fmtOi = (v: number) => v.toFixed(1);

	return (
		<TerminalPage title="Stock Data" active="analyse" className="ap-page">
			<div className="ap-shell">
				<LoginBanner />
				<div className="sd-top">
					<div className="sd-ticker">
						<button type="button" className="sd-ticker-main" onClick={() => setSearchOpen(!searchOpen)}>
							<Search size={16} />
							<strong>{symbol}</strong>
							<span>{inst.spot.toFixed(2)}</span>
							<em className={inst.change >= 0 ? 'up' : 'down'}>{inst.change >= 0 ? '+' : ''}{inst.change.toFixed(2)}%</em>
						</button>
						<Link className="sb-chip" to={`/tools/live-options-charts?tradingsymbol=${symbol}`} aria-label="Charts"><TrendingUp size={15} /></Link>
						{searchOpen ? (
							<div className="sb-pop">
								<input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stock" />
								{list.map((s) => (
									<button key={s.symbol} type="button" onClick={() => { setParams({ tradingsymbol: s.symbol }, { replace: true }); setSearchOpen(false); setQ(''); }}>
										<strong>{s.symbol}</strong><span>{s.price.toFixed(2)}</span>
									</button>
								))}
							</div>
						) : null}
					</div>
					<div className="sd-links">
						<button type="button" onClick={() => { setWatch(!watch); flash(watch ? 'Removed from watchlist' : 'Added to watchlist'); }}>{watch ? <Eye size={16} /> : <Plus size={16} />} {watch ? 'In Watchlist' : 'Add to Watchlist'}</button>
						<Link to={`/tools/strategy-wizard?tradingsymbol=${symbol}`}><Wand2 size={16} /> Strategy Wizard</Link>
						<Link to="/tools/strategy-builder"><PencilRuler size={16} /> Builder</Link>
						<Link to={`/tools/open-interest?tradingsymbol=${symbol}`}><BarChart2 size={16} /> Open Interest</Link>
					</div>
				</div>

				<div className="sd-grid">
					<div className="sd-left">
						<section className="sd-sec">
							<div className="sd-sec-head"><p>Volume &amp; OI</p><Link className="sb-link" to="/tools/screener">Go to Screener <ChevronRight size={15} /></Link></div>
							<dl className="sd-dl">
								<dt>Fut OI change</dt><dd>{stock.futOiChg.toFixed(1)}% - {Math.abs(stock.futOiChg) > 8 ? 'High' : Math.abs(stock.futOiChg) > 3 ? 'Medium' : 'Low'}</dd>
								<dt>Volume</dt><dd>{symbol.includes('NIFTY') ? '--' : `${stock.volumeX}x of 20D avg`}</dd>
							</dl>
						</section>
						<section className="sd-sec">
							<div className="sd-sec-head">
								<p>Technical Signals <button type="button" className="sb-link" onClick={() => setNoteFor(sigRows[0] ? `${sigRows[0].date}${sigRows[0].name}` : null)}>Add a Note</button></p>
								<Link className="sb-link" to="/tools/technical-signals">See All Technical Signals <ChevronRight size={15} /></Link>
							</div>
							<div className="sd-table-card">
								<table className="sd-table">
									<thead><tr><th><button type="button" onClick={() => setSortAsc(!sortAsc)}>Date <ArrowDown size={13} style={{ transform: sortAsc ? 'rotate(180deg)' : undefined }} /></button></th><th>Signal</th><th>Note</th></tr></thead>
									<tbody>
										{sigRows.map((s) => {
											const key = `${s.date}${s.name}`;
											return (
												<tr key={key + s.time}>
													<td>{s.date.replace(/^0/, '')} {s.time}</td>
													<td>{s.name}</td>
													<td>
														{noteFor === key ? (
															<input autoFocus className="sd-note" defaultValue={notes[key] ?? ''} placeholder="Type a note and press Enter" onBlur={(e) => { setNotes({ ...notes, [key]: e.target.value }); setNoteFor(null); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
														) : (
															<button type="button" className="sd-note-btn" onClick={() => setNoteFor(key)}>{notes[key] || <span className="fd-muted">—</span>}</button>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</section>
					</div>

					<div className="sd-right">
						<div className="sd-sec-head"><p>Options Chain</p><Link className="sb-link" to={`/tools/option-chain?tradingsymbol=${INSTRUMENTS.some((i) => i.symbol === symbol) ? symbol : 'NIFTY'}&expiry=${CHAIN_EXPIRIES[exp].iso}`}>See Full Option Chain <ChevronRight size={15} /></Link></div>
						<div className="fd-seg-btns sd-exp">
							{CHAIN_EXPIRIES.map((e, i) => <button key={e.iso} type="button" className={exp === i ? 'on' : ''} onClick={() => setExp(i)}>{e.label}</button>)}
						</div>
						<dl className="sd-stats">
							<dt>Synth Fut Price <Info size={13} /></dt><dd>{synthFuture(inst, exp).toFixed(2)}</dd>
							<dt>ATM IV <Info size={13} /></dt><dd>{atmIv.toFixed(1)} <em className="down">{(-1.6 + exp * 0.3).toFixed(1)}</em></dd>
							<dt>IVP <LayoutGrid size={12} /></dt><dd>{stock.ivp || 38}</dd>
							<dt>Lot size</dt><dd>{inst.lot}</dd>
							<dt>PCR</dt><dd>{pcr.toFixed(1)} {tag(pcr >= 1)}</dd>
							<dt>Max pain</dt><dd>{chain[Math.max(0, atmIdx - 1)]?.strike ?? stock.maxPain} {tag(false)}</dd>
						</dl>
						<div className="sd-chain-card">
							<table className="sd-chain">
								<thead>
									<tr>
										<th className="l">Call LTP</th>
										<th className="oi-h call"><span>Call OI <i /></span></th>
										<th>Strike</th>
										<th className="oi-h put"><span>Put OI <i /></span></th>
										<th className="r">Put LTP</th>
									</tr>
								</thead>
								<tbody>
									{chain.map((r, i) => {
										const callItm = r.strike < inst.spot;
										const putItm = r.strike > inst.spot;
										const atm = i === atmIdx;
										return (
											<tr key={r.strike} className={atm ? 'atm' : ''}>
												<td className={`l ${callItm ? 'itm' : ''}`} colSpan={2}>
													<div className="sd-bar call"><span>{r.call.ltp.toFixed(2)}</span><i style={{ width: `${(r.call.oi / maxOi) * 62}%` }} title={`Call OI ${fmtOi(r.call.oi)}L`} /></div>
												</td>
												<td className="sd-strike"><span>{r.strike}</span></td>
												<td className={`r ${putItm ? 'itm' : ''}`} colSpan={2}>
													<div className="sd-bar put"><i style={{ width: `${(r.put.oi / maxOi) * 62}%` }} title={`Put OI ${fmtOi(r.put.oi)}L`} /><span>{r.put.ltp.toFixed(2)}</span></div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
			{toast ? <div className="sb-toast">{toast}</div> : null}
			{searchOpen ? <button type="button" className="lc-dismiss ap-dismiss" aria-label="Close" onClick={() => setSearchOpen(false)} /> : null}
		</TerminalPage>
	);
}
