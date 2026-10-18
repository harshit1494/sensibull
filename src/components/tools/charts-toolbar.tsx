import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronsLeft, ChevronsRight, Search, Settings } from 'lucide-react';
import { INSTRUMENTS, type Instrument } from '@/lib/strategy-math';
import { RANGES, TIMEFRAMES, type RangeId, type Tf } from '@/lib/intraday-mock';

/** Toolbar shared by Live Options Charts and Multi Straddle-Strangle (ticker, timeframe pills, range, navigator, settings, jump). */
export function ChartsToolbar({
	inst,
	onSymbol,
	tf,
	onTf,
	range,
	onRange,
	spark,
	settings,
	jump,
	onInfo,
}: {
	inst: Instrument;
	onSymbol: (s: string) => void;
	tf: Tf;
	onTf: (t: Tf) => void;
	range: RangeId;
	onRange: (r: RangeId) => void;
	spark: number[];
	settings?: ReactNode;
	jump?: { id: string; label: string }[];
	onInfo?: () => void;
}) {
	const [open, setOpen] = useState<'sym' | 'range' | 'settings' | 'jump' | null>(null);
	const [query, setQuery] = useState('');
	const list = INSTRUMENTS.filter((i) => i.symbol.includes(query.toUpperCase()) || i.name.toLowerCase().includes(query.toLowerCase()));
	const lo = Math.min(...spark);
	const hi = Math.max(...spark);
	const d = spark.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, spark.length - 1)) * 560).toFixed(1)} ${(26 - ((v - lo) / (hi - lo || 1)) * 22).toFixed(1)}`).join(' ');
	const toggle = (k: typeof open) => setOpen(open === k ? null : k);

	return (
		<div className="lc-toolbar">
			<div className="lc-ticker">
				<button type="button" className="lc-ticker-main" onClick={() => toggle('sym')}>
					<Search size={16} />
					<strong>{inst.symbol}</strong>
					<span>{inst.spot.toFixed(2)}</span>
					<em className={inst.change >= 0 ? 'up' : 'down'}>{inst.change >= 0 ? '+' : ''}{inst.change.toFixed(2)}%</em>
				</button>
				<button type="button" className="sb-chip" onClick={onInfo}>Info</button>
				{open === 'sym' ? (
					<div className="sb-pop">
						<input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol" />
						{list.map((item) => (
							<button key={item.symbol} type="button" onClick={() => { onSymbol(item.symbol); setOpen(null); setQuery(''); }}>
								<strong>{item.symbol}</strong><span>{item.name}</span>
							</button>
						))}
					</div>
				) : null}
			</div>
			<div className="lc-tfs">
				{TIMEFRAMES.map(([v, label]) => (
					<button key={v} type="button" className={tf === v ? 'on' : ''} onClick={() => onTf(v)}>{label}</button>
				))}
			</div>
			<div className="lc-range">
				<button type="button" onClick={() => toggle('range')}>{RANGES.find((r) => r.id === range)?.label}</button>
				{open === 'range' ? (
					<div className="sb-pop lc-pop-sm">
						{RANGES.map((r) => (
							<button key={r.id} type="button" className={r.id === range ? 'on' : ''} onClick={() => { onRange(r.id); setOpen(null); }}><strong>{r.label}</strong></button>
						))}
					</div>
				) : null}
			</div>
			<div className="lc-nav">
				<ChevronsLeft size={14} />
				<svg viewBox="0 0 560 30" preserveAspectRatio="none" aria-hidden="true">
					<rect x="430" y="1" width="128" height="28" fill="rgba(104,165,234,0.12)" stroke="#68a5ea" />
					<path d={d} fill="none" stroke="#868c98" strokeWidth="1.2" />
				</svg>
				<ChevronsRight size={14} />
			</div>
			<div className="lc-tool-btn">
				<button type="button" onClick={() => toggle('settings')}><Settings size={16} /><p>Settings</p></button>
				{open === 'settings' && settings ? <div className="sb-pop lc-pop-right">{settings}</div> : null}
			</div>
			{jump ? (
				<div className="lc-tool-btn">
					<button type="button" onClick={() => toggle('jump')}><span>Jump...</span><ChevronDown size={15} /></button>
					{open === 'jump' ? (
						<div className="sb-pop lc-pop-right">
							{jump.map((j) => (
								<button key={j.id} type="button" onClick={() => { document.getElementById(j.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setOpen(null); }}><strong>{j.label}</strong></button>
							))}
						</div>
					) : null}
				</div>
			) : null}
			{open ? <button type="button" className="lc-dismiss" aria-label="Close" onClick={() => setOpen(null)} /> : null}
		</div>
	);
}
