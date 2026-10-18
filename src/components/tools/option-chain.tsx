import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowDown, BarChart3, ChevronDown, Info, LineChart, Search, Settings, TrendingUp, Waves } from 'lucide-react';
import '@/components/tools/option-chain.css';
import { LoginBanner, TerminalPage, openLogin } from '@/components/tools/terminal-chrome';
import { CHAIN_EXPIRIES, buildChain, instrumentBySymbol, synthFuture, type ChainRow } from '@/lib/market-mock';
import { INSTRUMENTS } from '@/lib/strategy-math';

type View = 'ltp' | 'greeks' | 'all';
type Col = { key: string; label: string; width: number; render: (row: ChainRow, side: 'call' | 'put') => ReactNode; bar?: boolean };

const fmt = (v: number, d = 2) => v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

export function OptionChain() {
	const [params, setParams] = useSearchParams();
	const inst = instrumentBySymbol(params.get('tradingsymbol'));
	const expiryIndex = Math.max(0, CHAIN_EXPIRIES.findIndex((e) => e.iso === params.get('expiry')));
	const [view, setView] = useState<View>('ltp');
	const [viewMenu, setViewMenu] = useState<View | null>(null);
	const [perLot, setPerLot] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [expOpen, setExpOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [shadeItm, setShadeItm] = useState(true);
	const [showBars, setShowBars] = useState(true);
	const [range, setRange] = useState(30);
	const [sortDesc, setSortDesc] = useState(false);
	const [toast, setToast] = useState<string | null>(null);
	const scroller = useRef<HTMLDivElement>(null);

	const chain = useMemo(() => buildChain(inst, expiryIndex, range), [inst, expiryIndex, range]);
	const rows = sortDesc ? [...chain].reverse() : chain;
	const atmBelow = chain.filter((r) => r.strike <= inst.spot).at(-1)?.strike;
	const maxCallOi = Math.max(...chain.map((r) => r.call.oi));
	const maxPutOi = Math.max(...chain.map((r) => r.put.oi));
	const fut = synthFuture(inst, expiryIndex);
	const ivp = Math.round(30 + ((inst.spot * 7) % 25));
	const mult = perLot ? inst.lot : 1;

	useEffect(() => {
		const el = scroller.current;
		const row = el?.querySelector<HTMLElement>('tr.oc-atm');
		if (el && row) el.scrollTop = row.offsetTop - el.clientHeight / 2 + 12;
	}, [inst.symbol, expiryIndex, view, sortDesc]);

	function setQueryParams(symbol: string, iso: string) {
		setParams({ tradingsymbol: symbol, expiry: iso }, { replace: true });
	}

	function flash(text: string) {
		setToast(text);
		window.setTimeout(() => setToast(null), 2200);
	}

	const oiCell = (row: ChainRow, side: 'call' | 'put') => {
		const v = row[side].oi;
		const pct = (v / (side === 'call' ? maxCallOi : maxPutOi)) * 100;
		return (
			<div className={`oc-oi ${side}`}>
				<span>{fmt(v, 1)}</span>
				{showBars ? <i style={{ width: `${Math.max(1, pct)}%` }} /> : null}
			</div>
		);
	};
	const chgCell = (row: ChainRow, side: 'call' | 'put') => {
		const v = row[side].oiChgPct;
		const text = Math.abs(v) < 10 && v % 1 !== 0 ? `${v.toFixed(1)}%` : `${Math.round(v)}%`;
		return <span className={v >= 0 ? 'oc-up' : 'oc-down'}>{text}</span>;
	};
	const ltpCell = (row: ChainRow, side: 'call' | 'put') => (
		<div className="oc-ltp">
			<span>{fmt(row[side].ltp * mult)}</span>
			<div className="oc-bs">
				<button type="button" className="b" onClick={() => flash(`Buy ${inst.symbol} ${row.strike} ${side === 'call' ? 'CE' : 'PE'} — login with your broker to trade`)}>B</button>
				<button type="button" className="s" onClick={() => flash(`Sell ${inst.symbol} ${row.strike} ${side === 'call' ? 'CE' : 'PE'} — login with your broker to trade`)}>S</button>
			</div>
		</div>
	);
	const num = (key: 'delta' | 'gamma' | 'vega' | 'theta', d: number) => (row: ChainRow, side: 'call' | 'put') => fmt(row[side][key] * (key === 'delta' ? 1 : mult), d);
	const volCell = (row: ChainRow, side: 'call' | 'put') => fmt(row[side].volume / 10, 1);

	const COLS: Record<View, Col[]> = {
		ltp: [
			{ key: 'chg', label: 'OI Chg%', width: 72, render: chgCell },
			{ key: 'oi', label: 'OI-lakh', width: 200, render: oiCell, bar: true },
			{ key: 'ltp', label: 'LTP', width: 92, render: ltpCell },
		],
		greeks: [
			{ key: 'gamma', label: 'Gamma', width: 72, render: num('gamma', 4) },
			{ key: 'vega', label: 'Vega', width: 62, render: num('vega', 2) },
			{ key: 'theta', label: 'Theta', width: 62, render: num('theta', 2) },
			{ key: 'delta', label: 'Delta', width: 62, render: num('delta', 2) },
			{ key: 'ltp', label: 'LTP', width: 92, render: ltpCell },
		],
		all: [
			{ key: 'chg', label: 'OI Chg%', width: 60, render: chgCell },
			{ key: 'oi', label: 'OI-lakh', width: 110, render: oiCell, bar: true },
			{ key: 'vol', label: 'Vol-lakh', width: 64, render: volCell },
			{ key: 'delta', label: 'Delta', width: 52, render: num('delta', 2) },
			{ key: 'ltp', label: 'LTP', width: 78, render: ltpCell },
		],
	};
	const callCols = COLS[view];
	const putCols = [...COLS[view]].reverse();
	const filtered = INSTRUMENTS.filter((i) => i.symbol.includes(query.toUpperCase()) || i.name.toLowerCase().includes(query.toLowerCase()));

	return (
		<TerminalPage title="Option Chain" active="analyse" className="oc-page">
			<div className="oc-shell">
				<LoginBanner />
				<div className="oc-bar">
					<div className="oc-ticker">
						<button type="button" className="oc-ticker-main" onClick={() => setSearchOpen(!searchOpen)}>
							<Search size={16} />
							<strong>{inst.symbol}</strong>
							<span>{inst.spot.toFixed(2)}</span>
							<em className={inst.change >= 0 ? 'oc-up' : 'oc-down'}>{inst.change >= 0 ? '+' : ''}{inst.change.toFixed(2)}%</em>
						</button>
						<Link className="sb-chip" to={`/tools/open-interest?tradingsymbol=${inst.symbol}`} aria-label="Open interest chart"><TrendingUp size={15} /></Link>
						<button type="button" className="sb-chip" onClick={() => flash(`${inst.name} · lot ${inst.lot} · strike step ${inst.step}. Mock data.`)}>Info</button>
						{searchOpen ? (
							<div className="sb-pop">
								<input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol" />
								{filtered.map((item) => (
									<button key={item.symbol} type="button" onClick={() => { setQueryParams(item.symbol, CHAIN_EXPIRIES[expiryIndex].iso); setSearchOpen(false); setQuery(''); }}>
										<strong>{item.symbol}</strong>
										<span>{item.name}</span>
									</button>
								))}
							</div>
						) : null}
					</div>
					<div className="oc-sep" />
					<div className="oc-exp">
						<span>Expiry</span>
						<button type="button" onClick={() => setExpOpen(!expOpen)}>{CHAIN_EXPIRIES[expiryIndex].label} <ChevronDown size={16} /></button>
						{expOpen ? (
							<div className="sb-pop oc-exp-pop">
								{CHAIN_EXPIRIES.map((e, i) => (
									<button key={e.iso} type="button" className={i === expiryIndex ? 'on' : ''} onClick={() => { setQueryParams(inst.symbol, e.iso); setExpOpen(false); }}>
										<strong>{e.label}</strong>
										<span>{e.days}d</span>
									</button>
								))}
							</div>
						) : null}
					</div>
					<div className="oc-sep" />
					<p className="oc-fut">Synth Fut Price <b>{fut.toFixed(2)}</b> <Info size={13} /></p>
					<div className="oc-sep" />
					<p className="oc-ivp">IVP <b>{ivp}</b></p>
					<div className="oc-sep" />
					<label className="sb-toggle">
						<input type="checkbox" checked={perLot} onChange={() => setPerLot(!perLot)} />
						<i />
						Per Lot
					</label>
				</div>

				<div className="oc-table-wrap" ref={scroller}>
					<table className="oc-table">
						<colgroup>
							{callCols.map((c) => <col key={`c-${c.key}`} style={{ width: c.width }} />)}
							<col style={{ width: 112 }} />
							<col style={{ width: 52 }} />
							{putCols.map((c) => <col key={`p-${c.key}`} style={{ width: c.width }} />)}
						</colgroup>
						<thead>
							<tr className="oc-side-head">
								<th colSpan={callCols.length} className="calls">CALLS</th>
								<th colSpan={2} className="mid" />
								<th colSpan={putCols.length} className="puts">PUTS</th>
							</tr>
							<tr className="oc-col-head">
								{callCols.map((c) => (
									<th key={`c-${c.key}`}>
										{c.bar ? <div className="oc-oi-head call"><span>{c.label}</span><em>Call OI <i /></em></div> : c.label}
									</th>
								))}
								<th className="oc-strike-h"><button type="button" onClick={() => setSortDesc(!sortDesc)}>Strike <ArrowDown size={13} style={{ transform: sortDesc ? 'rotate(180deg)' : undefined }} /></button></th>
								<th>IV</th>
								{putCols.map((c) => (
									<th key={`p-${c.key}`}>
										{c.bar ? <div className="oc-oi-head put"><em>Put OI <i /></em><span>{c.label}</span></div> : c.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const atm = row.strike === atmBelow;
								const callItm = shadeItm && row.strike < inst.spot && !atm;
								const putItm = shadeItm && row.strike > inst.spot;
								return (
									<tr key={row.strike} className={atm ? 'oc-atm' : ''}>
										{callCols.map((c) => <td key={`c-${c.key}`} className={`${callItm ? 'itm' : ''} col-${c.key}`}>{c.render(row, 'call')}</td>)}
										<td className="oc-strike"><span>{row.strike}</span></td>
										<td className="oc-iv">{row.iv.toFixed(1)}</td>
										{putCols.map((c) => <td key={`p-${c.key}`} className={`${putItm ? 'itm' : ''} col-${c.key} put`}>{c.render(row, 'put')}</td>)}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			<footer className="oc-footer">
				<div className="oc-views">
					{([['ltp', 'LTP View'], ['greeks', 'Greeks View'], ['all', 'All Column View']] as const).map(([id, label]) => (
						<div key={id} className="oc-view-wrap">
							<button type="button" className={view === id ? 'on' : ''} onClick={() => { setView(id); setViewMenu(null); }}>
								<p>{label}</p> <span className="oc-caret" role="button" aria-label={`${label} options`} onClick={(e) => { e.stopPropagation(); setView(id); setViewMenu(viewMenu === id ? null : id); }}><ChevronDown size={14} /></span>
							</button>
							{viewMenu === id ? (
								<div className="sb-pop oc-view-pop">
									<p>{id === 'ltp' ? 'OI change %, OI with bars and LTP on each side.' : id === 'greeks' ? 'Delta, theta, vega and gamma for every strike.' : 'OI, volume, delta and LTP together.'}</p>
									<button type="button" onClick={() => setViewMenu(null)}>Done</button>
								</div>
							) : null}
						</div>
					))}
				</div>
				<div className="oc-open">
					<p>Open with</p>
					<Link to={`/tools/open-interest?tradingsymbol=${inst.symbol}`}><BarChart3 size={15} /> OI</Link>
					<button type="button" onClick={() => setView('greeks')}><Waves size={15} /> IV</button>
					<Link to={`/tools/strategy-builder`}><LineChart size={15} /> Live Charts</Link>
				</div>
				<button type="button" className="oc-settings" onClick={() => setSettingsOpen(!settingsOpen)}><Settings size={16} /> Settings</button>
				{settingsOpen ? (
					<div className="sb-pop oc-settings-pop">
						<label className="sb-toggle"><input type="checkbox" checked={shadeItm} onChange={() => setShadeItm(!shadeItm)} /><i />Highlight ITM</label>
						<label className="sb-toggle"><input type="checkbox" checked={showBars} onChange={() => setShowBars(!showBars)} /><i />Show OI bars</label>
						<label className="oc-range">Strikes around ATM
							<select className="sb-sel" value={range} onChange={(e) => setRange(Number(e.target.value))}>
								{[10, 20, 30, 40].map((n) => <option key={n} value={n}>±{n}</option>)}
							</select>
						</label>
						<button type="button" className="sb-btn-primary" onClick={openLogin}>Login for live data</button>
					</div>
				) : null}
			</footer>
			{toast ? <div className="sb-toast oc-toast">{toast}</div> : null}
			{viewMenu || settingsOpen || expOpen || searchOpen ? (
				<button type="button" className="oc-dismiss" aria-label="Close" onClick={() => { setViewMenu(null); setSettingsOpen(false); setExpOpen(false); setSearchOpen(false); }} />
			) : null}
		</TerminalPage>
	);
}
