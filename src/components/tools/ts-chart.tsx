import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Tick } from '@/lib/intraday-mock';

export type Series = {
	key: string;
	label: string;
	color: string;
	values: number[];
	type?: 'line' | 'bar';
	dashed?: boolean;
	/** 'main' uses the visible right axis, 'price' uses a hidden secondary scale (underlying overlay). */
	axis?: 'main' | 'price';
	fmt?: (v: number) => string;
	change?: number | null;
	changePct?: boolean;
	glow?: boolean;
};

export function useWidth<T extends HTMLElement>() {
	const ref = useRef<T>(null);
	const [w, setW] = useState(900);
	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		setW(el.clientWidth);
		const ro = new ResizeObserver(() => setW(el.clientWidth));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return [ref, w] as const;
}

const niceStep = (span: number, parts = 5) => {
	const raw = span / parts || 1;
	const mag = 10 ** Math.floor(Math.log10(raw));
	return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw) ?? raw;
};

export const fmtCompact = (v: number) => {
	const a = Math.abs(v);
	if (a >= 1e7) return `${+(v / 1e7).toFixed(2)}Cr`;
	if (a >= 1e5) return `${+(v / 1e5).toFixed(2)}L`;
	if (a >= 1e3) return `${+(v / 1e3).toFixed(1)}K`;
	return `${+v.toFixed(2)}`;
};

/**
 * Sensibull-style time-series panel: values on a right axis, crosshair that follows the
 * pointer, and a legend box (time + EOD chip + one row per series) that reads the hovered point.
 */
export function TsChart({
	ticks,
	series,
	height = 300,
	hover,
	onHover,
	showXAxis = true,
	rightTitle,
	padTop = 16,
	legendExtra,
	zeroLine,
	leftTitle,
}: {
	ticks: Tick[];
	series: Series[];
	height?: number;
	hover?: number | null;
	onHover?: (i: number | null) => void;
	showXAxis?: boolean;
	rightTitle?: string;
	padTop?: number;
	legendExtra?: ReactNode;
	zeroLine?: boolean;
	/** Show the price (secondary) scale on a left axis with this title. */
	leftTitle?: string;
}) {
	const [wrap, W] = useWidth<HTMLDivElement>();
	const [localHover, setLocalHover] = useState<number | null>(null);
	const h = hover !== undefined ? hover : localHover;
	const setH = (i: number | null) => (onHover ? onHover(i) : setLocalHover(i));
	const pad = { l: leftTitle ? 64 : 12, r: rightTitle ? 70 : 56, t: padTop, b: showXAxis ? 26 : 6 };
	const pw = Math.max(10, W - pad.l - pad.r);
	const ph = height - pad.t - pad.b;
	const n = ticks.length;
	const main = series.filter((s) => s.axis !== 'price');
	const price = series.filter((s) => s.axis === 'price');
	const range = (list: Series[]) => {
		const vals = list.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
		if (list.some((s) => s.type === 'bar') || zeroLine) vals.push(0);
		let lo = Math.min(...vals);
		let hi = Math.max(...vals);
		if (lo === hi) { lo -= 1; hi += 1; }
		const padV = (hi - lo) * 0.08;
		return [lo - padV, hi + padV] as const;
	};
	const [mLo, mHi] = main.length ? range(main) : [0, 1];
	const [pLo, pHi] = price.length ? range(price) : [0, 1];
	const x = (i: number) => pad.l + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw);
	const y = (v: number) => pad.t + ((mHi - v) / (mHi - mLo)) * ph;
	const yp = (v: number) => pad.t + ((pHi - v) / (pHi - pLo)) * ph;
	const st = niceStep(mHi - mLo);
	const ticksY: number[] = [];
	for (let v = Math.ceil(mLo / st) * st; v <= mHi; v += st) ticksY.push(v);
	const xEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(pw / 150))));
	const hi = h === null || h === undefined ? n - 1 : Math.min(n - 1, Math.max(0, h));
	const barW = Math.max(2, Math.min(14, (pw / Math.max(n, 1)) * 0.36));
	const barSeries = series.filter((s) => s.type === 'bar');
	const fmtMain = main[0]?.fmt ?? fmtCompact;

	const path = (s: Series) => {
		const scale = s.axis === 'price' ? yp : y;
		let d = '';
		s.values.forEach((v, i) => {
			if (!Number.isFinite(v)) return;
			d += `${d ? 'L' : 'M'}${x(i).toFixed(1)} ${scale(v).toFixed(1)}`;
		});
		return d;
	};

	useEffect(() => {
		if (hover === undefined) setLocalHover(null);
	}, [n, hover]);

	return (
		<div className="ts-chart" ref={wrap} style={{ height }}>
			<svg
				width={W}
				height={height}
				onMouseMove={(e) => {
					const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
					const px = e.clientX - r.left - pad.l;
					setH(Math.round((px / pw) * (n - 1)));
				}}
				onMouseLeave={() => setH(null)}
			>
				{ticksY.map((t) => (
					<g key={t}>
						<line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#2c333b" />
						<text x={W - pad.r + 8} y={y(t) + 3} fontSize="10" fill="#868c98">{fmtMain(t)}</text>
					</g>
				))}
				{leftTitle && price.length ? (() => {
					const ps = niceStep(pHi - pLo);
					const out: ReactNode[] = [];
					for (let v = Math.ceil(pLo / ps) * ps; v <= pHi; v += ps) out.push(<text key={`pl${v}`} x={pad.l - 8} y={yp(v) + 3} textAnchor="end" fontSize="10" fill="#868c98">{v.toLocaleString('en-IN')}</text>);
					out.push(<text key="plt" transform={`translate(14 ${pad.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#868c98">{leftTitle}</text>);
					return out;
				})() : null}
				{rightTitle ? <text transform={`translate(${W - 10} ${pad.t + ph / 2}) rotate(90)`} textAnchor="middle" fontSize="10" fill="#868c98">{rightTitle}</text> : null}
				{Array.from({ length: n }, (_, i) => i)
					.filter((i) => i % xEvery === 0)
					.map((i) => (
						<line key={`g${i}`} x1={x(i)} x2={x(i)} y1={pad.t} y2={pad.t + ph} stroke="#262b31" />
					))}
				{zeroLine || barSeries.length ? <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#4a515a" /> : null}
				{barSeries.map((s, si) =>
					s.values.map((v, i) => (
						<rect
							key={`${s.key}${i}`}
							x={x(i) - (barSeries.length * barW) / 2 + si * barW}
							y={Math.min(y(v), y(0))}
							width={barW - 1}
							height={Math.max(1, Math.abs(y(v) - y(0)))}
							fill={s.color}
							opacity={i === hi ? 1 : 0.85}
						/>
					)),
				)}
				{series
					.filter((s) => s.type !== 'bar')
					.map((s) => (
						<g key={s.key}>
							{s.glow ? <path d={path(s)} fill="none" stroke={s.color} strokeWidth="6" opacity="0.18" /> : null}
							<path d={path(s)} fill="none" stroke={s.color} strokeWidth={s.axis === 'price' ? 1.4 : 1.8} strokeDasharray={s.dashed ? '4 4' : undefined} />
						</g>
					))}
				<line x1={x(hi)} x2={x(hi)} y1={pad.t} y2={pad.t + ph} stroke="#d0d1d2" strokeWidth="1" opacity="0.8" />
				{series
					.filter((s) => s.type !== 'bar')
					.map((s) => {
						const v = s.values[hi];
						if (!Number.isFinite(v)) return null;
						return <circle key={`c${s.key}`} cx={x(hi)} cy={(s.axis === 'price' ? yp : y)(v)} r="3" fill={s.color} stroke="#1e2124" strokeWidth="1.5" />;
					})}
				{showXAxis
					? Array.from({ length: n }, (_, i) => i)
							.filter((i) => i % xEvery === 0)
							.map((i) => (
								<text key={`x${i}`} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : 'middle'} fontSize="10" fill="#868c98">{ticks[i].short}</text>
							))
					: null}
			</svg>
			<div className="ts-legend" style={{ left: Math.min(Math.max(pad.l + 8, x(hi) - 290), W - pad.r - 290) }}>
				<p className="ts-legend-time">
					{ticks[hi]?.label}
					{hi === n - 1 ? <span>EOD Settlement</span> : null}
				</p>
				{series.map((s) => {
					const v = s.values[hi];
					const f = s.fmt ?? fmtCompact;
					return (
						<p key={s.key} className="ts-legend-row">
							<i className={s.dashed ? 'dash' : s.type === 'bar' ? 'sq' : 'ln'} style={{ '--c': s.color } as CSSProperties} />
							<span>{s.label}</span>
							<b>{Number.isFinite(v) ? f(v) : '--'}</b>
							{s.change !== undefined && s.change !== null && hi === n - 1 ? (
								<em className={s.change >= 0 ? 'up' : 'down'}>{s.changePct ? `${s.change >= 0 ? '' : ''}${s.change.toFixed(2)}%` : `(${s.change >= 0 ? '+' : ''}${f(s.change)})`}</em>
							) : null}
						</p>
					);
				})}
				{legendExtra}
			</div>
		</div>
	);
}
