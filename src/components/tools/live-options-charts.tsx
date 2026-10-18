import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Info, MoreVertical, Plus, X } from 'lucide-react';
import '@/components/tools/live-charts.css';
import { LoginBanner, TerminalPage } from '@/components/tools/terminal-chrome';
import { ChartsToolbar } from '@/components/tools/charts-toolbar';
import { TsChart, fmtCompact, type Series } from '@/components/tools/ts-chart';
import { AddStrategyModal } from '@/components/tools/multi-straddle';
import { CHAIN_EXPIRIES, instrumentBySymbol } from '@/lib/market-mock';
import {
	changeOf, defaultStrategies, futureSeries, noisy, oiSeries, spotSeries, stepSeries, strategySeries, timeline,
	RANGES, STRATEGY_COLORS, type RangeId, type StrategyDef, type Tf,
} from '@/lib/intraday-mock';

const PANELS = [
	['atm', 'Auto ATM Straddle'],
	['multi', 'Multi Straddle-Strangle'],
	['oi', 'Open Interest - Options'],
	['oichg', 'Open Interest Change - Options'],
	['pcr', 'Put-Call Ratio'],
	['maxpain', 'Max Pain'],
	['futoi', 'Open Interest - Futures'],
	['futoichg', 'Open Interest Change - Futures'],
	['iv', 'Option IV'],
	['vix', 'INDIAVIX'],
	['ivp', 'IV Percentile'],
] as const;
type PanelId = (typeof PANELS)[number][0];
const EXP = CHAIN_EXPIRIES.slice(0, 6);
const AROUND = ['All', '5', '10', '15', '20'];

export function LiveOptionsCharts() {
	const [params, setParams] = useSearchParams();
	const inst = instrumentBySymbol(params.get('tradingsymbol'));
	const [tf, setTf] = useState<Tf>(5);
	const [range, setRange] = useState<RangeId>('intraday');
	const [hover, setHover] = useState<number | null>(null);
	const [hidden, setHidden] = useState<PanelId[]>([]);
	const [showPrice, setShowPrice] = useState<Record<string, boolean>>({});
	const [ltpOn, setLtpOn] = useState(true);
	const [vwapOn, setVwapOn] = useState(true);
	const [atmExpiry, setAtmExpiry] = useState(0);
	const [strategies, setStrategies] = useState<StrategyDef[]>(() => defaultStrategies(inst).slice(1));
	const [addOpen, setAddOpen] = useState(false);
	const [oiExp, setOiExp] = useState<number[]>([0]);
	const [oiChgExp, setOiChgExp] = useState<number[]>([0]);
	const [pcrExp, setPcrExp] = useState<number[]>([0]);
	const [futExp, setFutExp] = useState<number[]>([0]);
	const [around, setAround] = useState<Record<string, string>>({});
	const [auto, setAuto] = useState<Record<string, boolean>>({ pcr: false, maxpain: false, iv: false, ivp: false });
	const [single, setSingle] = useState<Record<string, number>>({ maxpain: 0, iv: 0, ivp: 0 });
	const [ivMode, setIvMode] = useState<'atm' | 'custom'>('atm');
	const [toast, setToast] = useState<string | null>(null);

	const days = RANGES.find((r) => r.id === range)?.days ?? 1;
	const ticks = useMemo(() => timeline(tf, days), [tf, days]);
	const spot = useMemo(() => spotSeries(inst, ticks), [inst, ticks]);
	const atmStrike = Math.round(inst.spot / inst.step) * inst.step;
	const priceOn = (id: string) => showPrice[id] ?? true;
	const priceSeries = (id: string): Series[] =>
		priceOn(id) ? [{ key: 'spot', label: inst.symbol, color: '#e16bff', values: spot, dashed: true, axis: 'price', fmt: (v) => v.toFixed(2), change: inst.change, changePct: true }] : [];
	const flash = (t: string) => { setToast(t); window.setTimeout(() => setToast(null), 2200); };
	const isIndex = inst.symbol.includes('NIFTY') || inst.symbol === 'SENSEX';
	const oiScale = isIndex ? 1.6e8 : 2.2e6;

	const atmDef: StrategyDef = { id: `auto-${atmExpiry}`, name: 'Auto ATM Straddle', kind: 'Straddle', expiry: atmExpiry, ce: null, pe: null, color: STRATEGY_COLORS[0], visible: true, auto: true };
	const atmData = useMemo(() => strategySeries(inst, ticks, atmDef), [inst, ticks, atmExpiry]); // eslint-disable-line react-hooks/exhaustive-deps
	const multiData = useMemo(() => strategies.map((s) => ({ def: s, data: strategySeries(inst, ticks, s) })), [inst, ticks, strategies]);
	const sumExp = (list: number[]) => list.reduce((a, e) => a + (e === 0 ? 1 : 0.55 / e), 0) || 1;
	const callOi = useMemo(() => oiSeries(inst, ticks, 'call', oiScale * 0.11, 0.6).map((v) => v * sumExp(oiExp)), [inst, ticks, oiScale, oiExp]);
	const putOi = useMemo(() => oiSeries(inst, ticks, 'put', oiScale * 0.15, 0.9).map((v) => v * sumExp(oiExp)), [inst, ticks, oiScale, oiExp]);
	const diff = (arr: number[]) => {
		const d = arr.map((v, i) => (i && ticks[i - 1].day === ticks[i].day ? v - arr[i - 1] : 0));
		const avg = d.reduce((a, b) => a + b, 0) / (d.length || 1);
		return d.map((v, i) => (v - avg * 0.75) * (1 + Math.sin(i * 0.9) * 0.6));
	};
	const callChg = useMemo(() => diff(oiSeries(inst, ticks, 'call', oiScale * 0.11, 0.6)).map((v) => v * sumExp(oiChgExp)), [inst, ticks, oiScale, oiChgExp]); // eslint-disable-line react-hooks/exhaustive-deps
	const putChg = useMemo(() => diff(oiSeries(inst, ticks, 'put', oiScale * 0.15, 0.9)).map((v) => v * sumExp(oiChgExp)), [inst, ticks, oiScale, oiChgExp]); // eslint-disable-line react-hooks/exhaustive-deps
	const pcr = useMemo(() => {
		const c = oiSeries(inst, ticks, 'call', 1, 0.6);
		const p = oiSeries(inst, ticks, 'put', 1.32, 0.9 + pcrExp.length * 0.1);
		return p.map((v, i) => v / c[i]);
	}, [inst, ticks, pcrExp]);
	const maxPain = useMemo(() => stepSeries(inst, ticks, `mp${single.maxpain}`, atmStrike - inst.step * 2 + single.maxpain * inst.step, inst.step), [inst, ticks, atmStrike, single.maxpain]);
	const futOi = useMemo(() => oiSeries(inst, ticks, 'fut', (isIndex ? 1.6e7 : 1.4e7) * sumExp(futExp), -0.2), [inst, ticks, isIndex, futExp]);
	const futOiChg = useMemo(() => diff(futOi), [futOi]); // eslint-disable-line react-hooks/exhaustive-deps
	const iv = useMemo(() => noisy(inst, ticks, `iv${single.iv}${ivMode}`, (isIndex ? 11.4 : 24) + single.iv * 0.6, 1.8, (isIndex ? 10.6 : 23) + single.iv * 0.6), [inst, ticks, isIndex, single.iv, ivMode]);
	const vix = useMemo(() => noisy(inst, ticks, 'vix', 14.6, 1.4, 14.1), [inst, ticks]);
	const ivp = useMemo(() => noisy(inst, ticks, `ivp${single.ivp}`, 44, 14, 38), [inst, ticks, single.ivp]);
	const fut = useMemo(() => futureSeries(inst, ticks), [inst, ticks]);
	const last = (a: number[]) => a[a.length - 1];

	const ExpiryChecks = ({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) => (
		<div className="lc-field">
			<p>Expiries Included</p>
			{EXP.map((e, i) => (
				<label key={e.iso} className="lc-check">
					<input type="checkbox" checked={value.includes(i)} onChange={() => onChange(value.includes(i) ? value.filter((x) => x !== i) : [...value, i].sort())} /> {e.label}
				</label>
			))}
		</div>
	);
	const ExpiryRadios = ({ id }: { id: string }) => (
		<div className="lc-field">
			<p>{id === 'maxpain' ? 'Expiry Used' : 'Expiry used'}</p>
			{EXP.map((e, i) => (
				<label key={e.iso} className="lc-check">
					<input type="radio" name={`r-${id}`} disabled={auto[id]} checked={single[id] === i} onChange={() => setSingle({ ...single, [id]: i })} /> {e.label}
				</label>
			))}
		</div>
	);
	const AutoManual = ({ id }: { id: string }) => (
		<div className="lc-field">
			<p>Expiry Selection</p>
			<label className="lc-check"><input type="radio" name={`am-${id}`} checked={auto[id]} onChange={() => setAuto({ ...auto, [id]: true })} /> Automatic <Info size={13} /></label>
			<label className="lc-check"><input type="radio" name={`am-${id}`} checked={!auto[id]} onChange={() => setAuto({ ...auto, [id]: false })} /> Manual</label>
		</div>
	);
	const PriceToggle = ({ id }: { id: string }) => (
		<div className="lc-field">
			<p>Show Stock Price</p>
			<label className="lc-check"><input type="checkbox" checked={priceOn(id)} onChange={() => setShowPrice({ ...showPrice, [id]: !priceOn(id) })} /> {inst.symbol}</label>
		</div>
	);
	const StrikeFilter = ({ id }: { id: string }) => (
		<div className="lc-field lc-wide">
			<div className="lc-around">
				<p>Strikes above/below ATM</p>
				<select className="sb-sel" value={around[id] ?? 'All'} onChange={(e) => setAround({ ...around, [id]: e.target.value })}>
					{AROUND.map((a) => <option key={a}>{a}</option>)}
				</select>
			</div>
			<p className="lc-muted">Strike Range - {around[id] && around[id] !== 'All' ? `${atmStrike - Number(around[id]) * inst.step} - ${atmStrike + Number(around[id]) * inst.step}` : `${Math.round(atmStrike * 0.74 / 100) * 100} - ${Math.round(atmStrike * 1.24 / 100) * 100}`}</p>
			<button type="button" className="sb-link" onClick={() => flash('Custom strike picker — pick strikes on the Option Chain page')}>Choose Custom Strikes</button>
		</div>
	);
	const Current = ({ v }: { v: string }) => <p className="lc-current">Current Value: <b>{v}</b></p>;

	const panel = (id: PanelId, title: string, side: ReactNode, chart: ReactNode, height: number) =>
		hidden.includes(id) ? null : (
			<section className="lc-panel" id={`lc-${id}`} key={id}>
				<aside className="lc-side">
					<h3>
						{title} {id === 'atm' ? <span className="oi-new">New</span> : <Info size={13} />}
					</h3>
					{side}
				</aside>
				<div className="lc-chart" style={{ height }}>{chart}</div>
			</section>
		);

	const sharedProps = { ticks, hover, onHover: setHover };

	return (
		<TerminalPage title="Live Options Charts" active="analyse" className="lc-page">
			<div className="lc-shell">
				<LoginBanner />
				<ChartsToolbar
					inst={inst}
					onSymbol={(s) => { setParams({ tradingsymbol: s }, { replace: true }); setStrategies(defaultStrategies(instrumentBySymbol(s)).slice(1)); }}
					tf={tf}
					onTf={setTf}
					range={range}
					onRange={setRange}
					spark={spot}
					onInfo={() => flash(`${inst.name} · lot ${inst.lot} · mock intraday data`)}
					jump={PANELS.filter(([id]) => !hidden.includes(id)).map(([id, label]) => ({ id: `lc-${id}`, label }))}
					settings={
						<div className="lc-settings">
							<p>Show charts</p>
							{PANELS.map(([id, label]) => (
								<label key={id} className="lc-check"><input type="checkbox" checked={!hidden.includes(id)} onChange={() => setHidden(hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id])} /> {label}</label>
							))}
						</div>
					}
				/>
				<div className="lc-stack">
					{panel('atm', 'Auto ATM Straddle', (
						<>
							<div className="lc-row">
								<div className="lc-field">
									<p>Price Display</p>
									<label className="lc-check"><input type="checkbox" checked={ltpOn} onChange={() => setLtpOn(!ltpOn)} /> <i className="lc-key solid" /> LTP</label>
									<label className="lc-check"><input type="checkbox" checked={vwapOn} onChange={() => setVwapOn(!vwapOn)} /> <i className="lc-key dashed" /> VWAP</label>
								</div>
								<PriceToggle id="atm" />
							</div>
							<div className="lc-field">
								<p>Select Strategy</p>
								{EXP.map((e, i) => (
									<label key={e.iso} className="lc-check"><input type="checkbox" checked={atmExpiry === i} onChange={() => setAtmExpiry(i)} /> {e.label}</label>
								))}
							</div>
							<div className="lc-field">
								<p>ATM Strike</p>
								<b className="lc-strong">{atmData.strikes[hover ?? atmData.strikes.length - 1]?.split('/')[0]} ({EXP[atmExpiry].label})</b>
							</div>
						</>
					), (
						<TsChart {...sharedProps} height={362} rightTitle="" series={[
							...(ltpOn ? [{ key: 'ltp', label: `${EXP[atmExpiry].label} Auto ATM Straddle - ${atmData.strikes[atmData.strikes.length - 1].split('/')[0]}`, color: '#e87157', values: atmData.price, fmt: (v: number) => v.toFixed(2), change: changeOf(atmData.price, ticks) } as Series] : []),
							...(vwapOn ? [{ key: 'vwap', label: 'VWAP', color: '#e87157', values: atmData.vwap, dashed: true, fmt: (v: number) => v.toFixed(2) } as Series] : []),
							...priceSeries('atm'),
						]} />
					), 362)}

					{panel('multi', 'Multi Straddle-Strangle', (
						<>
							<div className="lc-row">
								<div className="lc-field">
									<p>Price Display</p>
									<label className="lc-check"><input type="checkbox" checked={ltpOn} onChange={() => setLtpOn(!ltpOn)} /> <i className="lc-key solid" /> LTP</label>
									<label className="lc-check"><input type="checkbox" checked={vwapOn} onChange={() => setVwapOn(!vwapOn)} /> <i className="lc-key dashed" /> VWAP</label>
								</div>
								<PriceToggle id="multi" />
							</div>
							<div className="lc-field lc-wide">
								<div className="lc-around"><p>Selected Strategies</p><button type="button" className="sb-link" onClick={() => setStrategies([])}>Clear All</button></div>
								{strategies.map((s) => (
									<div key={s.id} className={`lc-strat ${s.visible ? '' : 'off'}`}>
										<i style={{ background: s.color }} />
										<span>{EXP[s.expiry].label} {s.name}</span>
										<button type="button" aria-label="Toggle" onClick={() => setStrategies(strategies.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)))}>{s.visible ? <MoreVertical size={14} /> : <X size={14} />}</button>
									</div>
								))}
								<button type="button" className="lc-add" onClick={() => setAddOpen(true)}><Plus size={15} /> Add Strategy</button>
							</div>
							<p className="lc-muted">See Call/Put price, OI, VWAP and more</p>
							<Link className="sb-link lc-go" to={`/tools/multi-straddle-strangle?tradingsymbol=${inst.symbol}`}>Go to Multi Straddles/Strangles</Link>
						</>
					), (
						<TsChart {...sharedProps} height={387} series={[
							...multiData.filter((m) => m.def.visible).flatMap((m) => [
								...(ltpOn ? [{ key: m.def.id, label: `${EXP[m.def.expiry].label} ${m.def.name}`, color: m.def.color, values: m.data.price, fmt: (v: number) => v.toFixed(2), change: changeOf(m.data.price, ticks) } as Series] : []),
								...(vwapOn ? [{ key: `${m.def.id}v`, label: 'VWAP', color: m.def.color, values: m.data.vwap, dashed: true, fmt: (v: number) => v.toFixed(2) } as Series] : []),
							]),
							...priceSeries('multi'),
						]} />
					), 387)}

					{panel('oi', 'Open Interest - Options', (
						<>
							<div className="lc-row"><ExpiryChecks value={oiExp} onChange={setOiExp} /><PriceToggle id="oi" /></div>
							<StrikeFilter id="oi" />
						</>
					), (
						<TsChart {...sharedProps} height={314} series={[
							{ key: 'c', label: 'Call OI', color: 'rgb(226,167,167)', values: callOi },
							{ key: 'p', label: 'Put OI', color: 'rgb(113,199,159)', values: putOi },
							...priceSeries('oi'),
						]} />
					), 314)}

					{panel('oichg', 'Open Interest Change - Options', (
						<>
							<div className="lc-row"><ExpiryChecks value={oiChgExp} onChange={setOiChgExp} /><PriceToggle id="oichg" /></div>
							<StrikeFilter id="oichg" />
						</>
					), (
						<TsChart {...sharedProps} height={314} series={[
							{ key: 'c', label: 'Call OI Chg', color: 'rgb(226,167,167)', values: callChg, type: 'bar' },
							{ key: 'p', label: 'Put OI Chg', color: 'rgb(113,199,159)', values: putChg, type: 'bar' },
							...priceSeries('oichg'),
						]} />
					), 314)}

					{panel('pcr', 'Put-Call Ratio', (
						<>
							<Current v={last(pcr).toFixed(2)} />
							<div className="lc-row"><AutoManual id="pcr" /><ExpiryChecks value={pcrExp} onChange={setPcrExp} /></div>
							<PriceToggle id="pcr" />
							<StrikeFilter id="pcr" />
						</>
					), (
						<TsChart {...sharedProps} height={383} series={[{ key: 'pcr', label: 'PCR', color: '#68a5ea', values: pcr, fmt: (v) => v.toFixed(2) }, ...priceSeries('pcr')]} />
					), 383)}

					{panel('maxpain', 'Max Pain', (
						<>
							<Current v={String(last(maxPain))} />
							<div className="lc-row"><AutoManual id="maxpain" /><ExpiryRadios id="maxpain" /></div>
							<PriceToggle id="maxpain" />
						</>
					), (
						<TsChart {...sharedProps} height={300} series={[{ key: 'mp', label: 'Max Pain', color: '#68a5ea', values: maxPain, fmt: (v) => v.toFixed(0) }, ...priceSeries('maxpain')]} />
					), 300)}

					{panel('futoi', 'Open Interest - Futures', (
						<>
							<Current v={fmtCompact(last(futOi))} />
							<div className="lc-row"><ExpiryChecks value={futExp} onChange={setFutExp} /><PriceToggle id="futoi" /></div>
						</>
					), (
						<TsChart {...sharedProps} height={300} series={[{ key: 'f', label: 'Futures OI', color: '#68a5ea', values: futOi }, { key: 'fp', label: `${inst.symbol} FUT`, color: '#e16bff', values: fut, dashed: true, axis: 'price', fmt: (v) => v.toFixed(2) }, ...(priceOn('futoi') ? [] : [])]} />
					), 300)}

					{panel('futoichg', 'Open Interest Change - Futures', (
						<>
							<Current v={fmtCompact(last(futOiChg))} />
							<div className="lc-row"><ExpiryChecks value={futExp} onChange={setFutExp} /><PriceToggle id="futoichg" /></div>
						</>
					), (
						<TsChart {...sharedProps} height={300} series={[{ key: 'fc', label: 'Futures OI Chg', color: '#68a5ea', values: futOiChg, type: 'bar' }, ...priceSeries('futoichg')]} />
					), 300)}

					{panel('iv', 'Option IV', (
						<>
							<Current v={last(iv).toFixed(2)} />
							<div className="lc-row"><AutoManual id="iv" /><ExpiryRadios id="iv" /></div>
							<div className="lc-row">
								<div className="lc-field">
									<p>Selection</p>
									<label className="lc-check"><input type="radio" name="ivsel" checked={ivMode === 'atm'} onChange={() => setIvMode('atm')} /> ATM Strike</label>
									<label className="lc-check"><input type="radio" name="ivsel" checked={ivMode === 'custom'} onChange={() => setIvMode('custom')} /> Custom</label>
								</div>
								<PriceToggle id="iv" />
							</div>
							<p className="lc-muted">ATM Strike at {atmStrike}</p>
							<button type="button" className="sb-link" onClick={() => setIvMode('custom')}>Choose Custom Strikes</button>
						</>
					), (
						<TsChart {...sharedProps} height={360} series={[{ key: 'iv', label: 'Option IV', color: '#68a5ea', values: iv, fmt: (v) => v.toFixed(2) }, ...priceSeries('iv')]} />
					), 360)}

					{panel('vix', 'INDIAVIX', (
						<>
							<Current v={last(vix).toFixed(2)} />
							<PriceToggle id="vix" />
						</>
					), (
						<TsChart {...sharedProps} height={260} series={[{ key: 'vix', label: 'INDIAVIX', color: '#68a5ea', values: vix, fmt: (v) => v.toFixed(2) }, ...priceSeries('vix')]} />
					), 260)}

					{panel('ivp', 'IV Percentile', (
						<>
							<Current v={last(ivp).toFixed(0)} />
							<div className="lc-row"><AutoManual id="ivp" /><ExpiryRadios id="ivp" /></div>
							<p className="lc-muted">ATM Strike at {atmStrike}</p>
							<PriceToggle id="ivp" />
						</>
					), (
						<TsChart {...sharedProps} height={330} series={[{ key: 'ivp', label: 'IVP', color: '#68a5ea', values: ivp, fmt: (v) => v.toFixed(0) }, ...priceSeries('ivp')]} />
					), 330)}
				</div>
			</div>
			{addOpen ? (
				<AddStrategyModal
					inst={inst}
					onClose={() => setAddOpen(false)}
					onAdd={(def) => { setStrategies([...strategies, { ...def, color: STRATEGY_COLORS[(strategies.length + 1) % STRATEGY_COLORS.length] }]); setAddOpen(false); }}
				/>
			) : null}
			{toast ? <div className="sb-toast">{toast}</div> : null}
		</TerminalPage>
	);
}

