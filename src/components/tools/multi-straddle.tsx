import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ChevronsLeft, ChevronsRight, Eye, EyeOff, MoreVertical, Plus, Trash2 } from 'lucide-react';
import '@/components/tools/live-charts.css';
import { LoginBanner, TerminalPage } from '@/components/tools/terminal-chrome';
import { ChartsToolbar } from '@/components/tools/charts-toolbar';
import { TsChart, type Series } from '@/components/tools/ts-chart';
import { CHAIN_EXPIRIES, instrumentBySymbol } from '@/lib/market-mock';
import { changeOf, defaultStrategies, oiSeries, strategySeries, timeline, RANGES, STRATEGY_COLORS, type RangeId, type StrategyDef, type Tf } from '@/lib/intraday-mock';
import type { Instrument } from '@/lib/strategy-math';

const EXP = CHAIN_EXPIRIES.slice(0, 6);

export function MultiStraddle() {
	const [params, setParams] = useSearchParams();
	const inst = instrumentBySymbol(params.get('tradingsymbol'));
	const [tf, setTf] = useState<Tf>(5);
	const [range, setRange] = useState<RangeId>('3d');
	const [hover, setHover] = useState<number | null>(null);
	const [strategies, setStrategies] = useState<StrategyDef[]>(() => defaultStrategies(inst));
	const [selected, setSelected] = useState('auto');
	const [showSpot, setShowSpot] = useState(true);
	const [showPrice, setShowPrice] = useState(true);
	const [showVwap, setShowVwap] = useState(true);
	const [showCall, setShowCall] = useState(true);
	const [showPut, setShowPut] = useState(true);
	const [menu, setMenu] = useState<string | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [feedback, setFeedback] = useState(true);
	const [toast, setToast] = useState<string | null>(null);

	const days = RANGES.find((r) => r.id === range)?.days ?? 3;
	const ticks = useMemo(() => timeline(tf, days), [tf, days]);
	const data = useMemo(() => strategies.map((s) => ({ def: s, ...strategySeries(inst, ticks, s) })), [inst, ticks, strategies]);
	const sel = data.find((d) => d.def.id === selected) ?? data[0];
	const spot = data[0]?.spot ?? [];
	const isIndex = inst.symbol.includes('NIFTY') || inst.symbol === 'SENSEX';
	const callOi = useMemo(() => oiSeries(inst, ticks, `c${selected}`, isIndex ? 9.5e6 : 3e5, -0.3), [inst, ticks, selected, isIndex]);
	const putOi = useMemo(() => oiSeries(inst, ticks, `p${selected}`, isIndex ? 9.8e6 : 2.8e5, -0.4), [inst, ticks, selected, isIndex]);
	const lastPrice = (d: (typeof data)[number]) => d.price[d.price.length - 1];
	const flash = (t: string) => { setToast(t); window.setTimeout(() => setToast(null), 2200); };

	const mainSeries: Series[] = [
		...data.filter((d) => d.def.visible).map((d) => ({
			key: d.def.id,
			label: `${EXP[d.def.expiry].label} ${d.def.auto ? `${d.def.name} - ${d.strikes[d.strikes.length - 1].split('/')[0]}` : d.def.name}`,
			color: d.def.color,
			values: d.price,
			fmt: (v: number) => v.toFixed(2),
			change: changeOf(d.price, ticks),
			glow: d.def.id === selected,
		})),
		...(showSpot ? [{ key: 'spot', label: inst.symbol, color: '#e16bff', values: spot, dashed: true, axis: 'price', fmt: (v: number) => v.toFixed(2), change: inst.change, changePct: true } as Series] : []),
	];
	const strikesLabel = sel ? (sel.def.auto ? sel.strikes[sel.strikes.length - 1] : `${sel.def.ce ?? ''}${sel.def.ce && sel.def.pe ? ' / ' : ''}${sel.def.pe ?? ''}`) : '';

	return (
		<TerminalPage title="Multi Straddle-Strangle Charts" active="analyse" className="ms-page">
			<div className="lc-shell ms-shell">
				<LoginBanner />
				<div className="ms-body">
					<aside className={`ms-side ${collapsed ? 'collapsed' : ''}`}>
						<div className="ms-side-head">
							<span>Strategies</span>
							<button type="button" aria-label="Collapse" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}</button>
						</div>
						{collapsed ? null : (
							<>
								<div className="ms-list">
									<div className="ms-item ms-spot">
										<i className="dash" />
										<span className="ms-name">{inst.symbol}</span>
										<button type="button" className="ms-eye" aria-label="Toggle spot" onClick={() => setShowSpot(!showSpot)}>{showSpot ? <Eye size={16} /> : <EyeOff size={16} />}</button>
									</div>
									{data.map((d) => (
										<div key={d.def.id} className={`ms-item ${selected === d.def.id ? 'on' : ''} ${d.def.visible ? '' : 'off'}`} onClick={() => setSelected(d.def.id)} role="button" tabIndex={0}>
											<i style={{ background: d.def.color }} />
											<div className="ms-name">
												<p>{EXP[d.def.expiry].label} {d.def.auto ? `${d.def.name} - ${d.strikes[d.strikes.length - 1].split('/')[0]}` : d.def.name}</p>
												<p className="ms-ltp">LTP <span>{lastPrice(d).toFixed(2)}</span> <em className={changeOf(d.price, ticks) >= 0 ? 'up' : 'down'}>({changeOf(d.price, ticks) >= 0 ? '+' : ''}{changeOf(d.price, ticks).toFixed(2)})</em></p>
											</div>
											<div className="ms-actions">
												<button type="button" className="ms-eye" aria-label="Toggle visibility" onClick={(e) => { e.stopPropagation(); setStrategies(strategies.map((x) => (x.id === d.def.id ? { ...x, visible: !x.visible } : x))); }}>{d.def.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
												<button type="button" className="ms-eye" aria-label="Menu" onClick={(e) => { e.stopPropagation(); setMenu(menu === d.def.id ? null : d.def.id); }}><MoreVertical size={16} /></button>
												<span className="ms-tag">{d.def.kind}</span>
											</div>
											{menu === d.def.id ? (
												<div className="sb-pop ms-menu" onClick={(e) => e.stopPropagation()}>
													<button type="button" onClick={() => { setSelected(d.def.id); setMenu(null); }}><strong>Show details</strong></button>
													<button type="button" onClick={() => { setStrategies(strategies.filter((x) => x.id !== d.def.id)); setMenu(null); if (selected === d.def.id) setSelected(strategies[0]?.id ?? ''); }}><strong><Trash2 size={13} /> Remove</strong></button>
												</div>
											) : null}
										</div>
									))}
								</div>
								<div className="ms-side-foot">
									<button type="button" className="lc-add solid" onClick={() => setAddOpen(true)}><Plus size={15} /> Add Strategy</button>
									<button type="button" className="ms-clear" onClick={() => { setStrategies([]); setSelected(''); }}>Clear All</button>
								</div>
							</>
						)}
					</aside>
					<div className="ms-main">
						<ChartsToolbar
							inst={inst}
							onSymbol={(s) => { setParams({ tradingsymbol: s }, { replace: true }); setStrategies(defaultStrategies(instrumentBySymbol(s))); setSelected('auto'); }}
							tf={tf}
							onTf={setTf}
							range={range}
							onRange={setRange}
							spark={spot.length ? spot : [0, 1]}
							onInfo={() => flash(`${inst.name} · lot ${inst.lot} · mock intraday data`)}
							settings={
								<div className="lc-settings">
									<p>Chart options</p>
									<label className="lc-check"><input type="checkbox" checked={showSpot} onChange={() => setShowSpot(!showSpot)} /> Show {inst.symbol}</label>
									<label className="lc-check"><input type="checkbox" checked={showPrice} onChange={() => setShowPrice(!showPrice)} /> Strategy Price</label>
									<label className="lc-check"><input type="checkbox" checked={showVwap} onChange={() => setShowVwap(!showVwap)} /> Strategy VWAP</label>
									<label className="lc-check"><input type="checkbox" checked={showCall} onChange={() => setShowCall(!showCall)} /> Call OI</label>
									<label className="lc-check"><input type="checkbox" checked={showPut} onChange={() => setShowPut(!showPut)} /> Put OI</label>
								</div>
							}
						/>
						<section className="ms-chart-block">
							<p className="ms-title">Multi Strategy Chart</p>
							{mainSeries.length ? <TsChart ticks={ticks} hover={hover} onHover={setHover} height={252} showXAxis={false} padTop={26} series={mainSeries} /> : <p className="ms-empty">Add a strategy to start charting.</p>}
						</section>
						{sel ? (
							<>
								<div className="ms-detail-head">
									<span>Strategy Details</span>
									<button type="button" className={showPrice ? '' : 'off'} onClick={() => setShowPrice(!showPrice)}>{showPrice ? <Eye size={14} /> : <EyeOff size={14} />}<i style={{ background: '#7975cd' }} /> Strategy Price</button>
									<button type="button" className={showVwap ? '' : 'off'} onClick={() => setShowVwap(!showVwap)}>{showVwap ? <Eye size={14} /> : <EyeOff size={14} />}<i style={{ background: '#f1b851' }} /> Strategy VWAP</button>
									<span className="ms-strikes">{strikesLabel.split('/').map((k, i) => <b key={i}>{k.trim()}</b>)}</span>
								</div>
								<section className="ms-chart-block">
									<TsChart ticks={ticks} hover={hover} onHover={setHover} height={383} showXAxis={false} padTop={20} series={[
										...(showPrice ? [{ key: 'p', label: 'Strategy Price', color: '#7975cd', values: sel.price, fmt: (v: number) => v.toFixed(2) } as Series] : []),
										...(showVwap ? [{ key: 'v', label: 'Strategy VWAP', color: '#f1b851', values: sel.vwap, fmt: (v: number) => v.toFixed(2) } as Series] : []),
									]} />
								</section>
								<div className="ms-detail-head">
									<button type="button" className={showCall ? '' : 'off'} onClick={() => setShowCall(!showCall)}>{showCall ? <Eye size={14} /> : <EyeOff size={14} />}<i style={{ background: 'rgb(233,103,103)' }} /> Call OI</button>
									<button type="button" className={showPut ? '' : 'off'} onClick={() => setShowPut(!showPut)}>{showPut ? <Eye size={14} /> : <EyeOff size={14} />}<i style={{ background: 'rgb(117,243,123)' }} /> Put OI</button>
								</div>
								<section className="ms-chart-block">
									<TsChart ticks={ticks} hover={hover} onHover={setHover} height={180} padTop={14} series={[
										...(showCall ? [{ key: 'c', label: 'Call OI', color: 'rgb(233,103,103)', values: callOi } as Series] : []),
										...(showPut ? [{ key: 'pu', label: 'Put OI', color: 'rgb(117,243,123)', values: putOi } as Series] : []),
									]} />
								</section>
							</>
						) : null}
						{feedback ? (
							<div className="ms-feedback">
								<span>Thanks for trying out Multi Straddle-Strangle Charts. We&apos;d love to hear what you think about it.</span>
								<button type="button" onClick={() => { setFeedback(false); flash('Thanks for the feedback!'); }}>Give us Feedback</button>
							</div>
						) : null}
					</div>
				</div>
			</div>
			{addOpen ? (
				<AddStrategyModal
					inst={inst}
					onClose={() => setAddOpen(false)}
					onAdd={(def) => { const next = { ...def, color: STRATEGY_COLORS[strategies.length % STRATEGY_COLORS.length] }; setStrategies([...strategies, next]); setSelected(next.id); setAddOpen(false); }}
				/>
			) : null}
			{menu ? <button type="button" className="lc-dismiss" aria-label="Close" onClick={() => setMenu(null)} /> : null}
			{toast ? <div className="sb-toast">{toast}</div> : null}
		</TerminalPage>
	);
}

export function AddStrategyModal({ inst, onAdd, onClose }: { inst: Instrument; onAdd: (d: StrategyDef) => void; onClose: () => void }) {
	const atm = Math.round(inst.spot / inst.step) * inst.step;
	const [kind, setKind] = useState<'Straddle' | 'Strangle' | 'Custom'>('Straddle');
	const [expiry, setExpiry] = useState(0);
	const [ce, setCe] = useState(atm);
	const [pe, setPe] = useState(atm);
	const strikes = Array.from({ length: 21 }, (_, i) => atm + (i - 10) * inst.step);
	return (
		<div className="sb-modal">
			<button type="button" className="sb-modal-back" aria-label="Close" onClick={onClose} />
			<form
				className="sb-modal-card ms-add"
				onSubmit={(e) => {
					e.preventDefault();
					const ceS = kind === 'Custom' && !ce ? null : ce;
					const peS = kind === 'Straddle' ? ce : pe;
					onAdd({ id: `u${Date.now()}`, name: `${ceS ? `${ceS}CE` : ''}${ceS && peS ? ', ' : ''}${peS ? `${peS}PE` : ''}`, kind, expiry, ce: ceS, pe: peS, color: STRATEGY_COLORS[0], visible: true });
				}}
			>
				<strong>Add Strategy</strong>
				<div className="ms-kind">
					{(['Straddle', 'Strangle', 'Custom'] as const).map((k) => <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}
				</div>
				<label>Expiry<select className="sb-sel" value={expiry} onChange={(e) => setExpiry(Number(e.target.value))}>{EXP.map((x, i) => <option key={x.iso} value={i}>{x.label}</option>)}</select></label>
				<label>{kind === 'Straddle' ? 'Strike' : 'Call strike'}<select className="sb-sel" value={ce} onChange={(e) => setCe(Number(e.target.value))}>{strikes.map((s) => <option key={s} value={s}>{s}{s === atm ? ' (ATM)' : ''}</option>)}</select></label>
				{kind !== 'Straddle' ? <label>Put strike<select className="sb-sel" value={pe} onChange={(e) => setPe(Number(e.target.value))}>{strikes.map((s) => <option key={s} value={s}>{s}{s === atm ? ' (ATM)' : ''}</option>)}</select></label> : null}
				<div className="sb-actions">
					<button type="button" onClick={onClose}>Cancel</button>
					<button type="submit" className="on">Add</button>
				</div>
			</form>
		</div>
	);
}
