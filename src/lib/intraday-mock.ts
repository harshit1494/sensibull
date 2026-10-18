/**
 * Deterministic mock intraday series (spot, straddles, OI, PCR, IV, VIX …) for the
 * Live Options Charts, Multi Straddle-Strangle and Multistrike OI pages.
 */
import type { Instrument } from '@/lib/strategy-math';
import { CHAIN_EXPIRIES, blackScholes, seeded } from '@/lib/market-mock';

export type Tf = 1 | 5 | 15 | 30 | 60 | 1440;
export const TIMEFRAMES: [Tf, string][] = [[1, '1m'], [5, '5m'], [15, '15m'], [30, '30m'], [60, '1hr'], [1440, '1d']];
export const RANGES = [
	{ id: 'intraday', label: 'Intraday', days: 1 },
	{ id: '3d', label: '3 Days', days: 3 },
	{ id: '5d', label: '5 Days', days: 5 },
] as const;
export type RangeId = (typeof RANGES)[number]['id'];

const DAYS = [
	{ label: '12 Oct', dow: 'Mon' },
	{ label: '13 Oct', dow: 'Tue' },
	{ label: '14 Oct', dow: 'Wed' },
	{ label: '15 Oct', dow: 'Thu' },
	{ label: '16 Oct', dow: 'Fri' },
];

export type Tick = { day: number; minute: number; label: string; short: string };

function clock(min: number) {
	const total = 555 + min;
	const h = Math.floor(total / 60);
	const m = total % 60;
	const hh = h > 12 ? h - 12 : h;
	return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function timeline(tf: Tf, days: number): Tick[] {
	const out: Tick[] = [];
	const first = DAYS.length - days;
	for (let d = first; d < DAYS.length; d++) {
		if (tf === 1440) {
			out.push({ day: d, minute: 375, label: `${DAYS[d].label}, 03:30 PM`, short: DAYS[d].label });
			continue;
		}
		for (let m = 0; m <= 375; m += tf) out.push({ day: d, minute: m, label: `${DAYS[d].label}, ${clock(m)}`, short: days > 1 ? `${DAYS[d].label}, ${clock(m)}` : clock(m) });
	}
	if (out.length) out[out.length - 1] = { ...out[out.length - 1], label: `${DAYS[DAYS.length - 1].label}, 03:30 PM` };
	return out;
}

/** Brownian-bridge style walk that ends exactly at `end`. */
function walk(rnd: () => number, n: number, start: number, end: number, vol: number) {
	const raw: number[] = [0];
	for (let i = 1; i < n; i++) raw.push(raw[i - 1] + (rnd() - 0.5) * vol + Math.sin(i / 9) * vol * 0.08);
	const last = raw[n - 1] ?? 0;
	return raw.map((v, i) => start + (end - start) * (i / Math.max(1, n - 1)) + v - last * (i / Math.max(1, n - 1)));
}

const fineCache = new Map<string, number[]>();
/** 1-minute spot path over the 5 mock sessions. */
function fineSpot(inst: Instrument) {
	const key = inst.symbol;
	const hit = fineCache.get(key);
	if (hit) return hit;
	const n = DAYS.length * 376;
	const rnd = seeded('spot', inst.symbol);
	const start = inst.spot * (1 - inst.change / 100) * (1 - 0.006 + rnd() * 0.012);
	const path = walk(rnd, n, start, inst.spot, inst.spot * 0.00055);
	fineCache.set(key, path);
	return path;
}
const idx = (t: Tick) => t.day * 376 + t.minute;

export function spotSeries(inst: Instrument, ticks: Tick[]) {
	const f = fineSpot(inst);
	return ticks.map((t) => f[idx(t)]);
}

export function futureSeries(inst: Instrument, ticks: Tick[]) {
	return spotSeries(inst, ticks).map((s, i) => s * (1 + 0.0021 - ticks[i].day * 0.0001));
}

export type StrategyDef = {
	id: string;
	name: string;
	kind: 'Straddle' | 'Strangle' | 'Custom';
	expiry: number;
	ce: number | null;
	pe: number | null;
	color: string;
	visible: boolean;
	auto?: boolean;
};

const atm = (s: number, step: number) => Math.round(s / step) * step;

/** Price of a straddle / strangle along the spot path, with time decay towards expiry. */
export function strategySeries(inst: Instrument, ticks: Tick[], def: StrategyDef) {
	const spot = spotSeries(inst, ticks);
	const exp = CHAIN_EXPIRIES[def.expiry] ?? CHAIN_EXPIRIES[0];
	const rnd = seeded('ivw', inst.symbol, def.id);
	let ivShock = 0;
	const price: number[] = [];
	const strikes: string[] = [];
	ticks.forEach((t, i) => {
		const s = spot[i];
		const ce = def.auto ? atm(s, inst.step) : def.ce;
		const pe = def.auto ? atm(s, inst.step) : def.pe;
		const daysLeft = exp.days + (DAYS.length - 1 - t.day) + (375 - t.minute) / 375;
		ivShock = ivShock * 0.97 + (rnd() - 0.5) * 0.5;
		const iv = (inst.symbol.includes('NIFTY') || inst.symbol === 'SENSEX' ? 11 : 24) + ivShock;
		let v = 0;
		if (ce !== null) v += blackScholes(s, ce, daysLeft, iv, 'CE').price;
		if (pe !== null) v += blackScholes(s, pe, daysLeft, iv, 'PE').price;
		price.push(Math.round(v * 20) / 20);
		strikes.push(`${ce ?? ''}${ce !== null && pe !== null ? '/' : ''}${pe ?? ''}`);
	});
	let pv = 0;
	let vol = 0;
	let lastDay = -1;
	const vwap = price.map((p, i) => {
		if (ticks[i].day !== lastDay) {
			pv = 0;
			vol = 0;
			lastDay = ticks[i].day;
		}
		const w = 1 + Math.sin(i * 1.7) * 0.4 + (i % 7) * 0.1;
		pv += p * w;
		vol += w;
		return pv / vol;
	});
	return { price, vwap, strikes, spot };
}

/** Rough day-over-day change used in legends. */
export function changeOf(series: number[], ticks: Tick[]) {
	const lastDay = ticks[ticks.length - 1]?.day;
	const firstOfDay = ticks.findIndex((t) => t.day === lastDay);
	const prev = firstOfDay > 0 ? series[firstOfDay - 1] : series[0];
	return series[series.length - 1] - prev;
}

export function oiSeries(inst: Instrument, ticks: Tick[], key: string, base: number, drift: number) {
	const rnd = seeded('oi', inst.symbol, key);
	let v = base * (0.85 + rnd() * 0.2);
	return ticks.map((t, i) => {
		if (i && ticks[i - 1].day !== t.day) v *= 0.93 + rnd() * 0.1; // overnight gap
		v *= 1 + drift / Math.max(ticks.length, 1) + (rnd() - 0.48) * 0.012;
		return Math.max(base * 0.05, v);
	});
}

export function noisy(inst: Instrument, ticks: Tick[], key: string, center: number, amp: number, end?: number) {
	const rnd = seeded('n', inst.symbol, key);
	const w = walk(rnd, ticks.length, center, end ?? center + (rnd() - 0.5) * amp, amp * 0.18);
	return w;
}

export function stepSeries(inst: Instrument, ticks: Tick[], key: string, center: number, step: number) {
	const rnd = seeded('step', inst.symbol, key);
	let v = center;
	return ticks.map((_, i) => {
		if (i % 9 === 0 && rnd() > 0.55) v += (rnd() > 0.5 ? 1 : -1) * step;
		return v;
	});
}

export const STRATEGY_COLORS = ['#e87157', '#7975cd', '#4cb5ae', '#d256f1', '#f1b851', '#68a5ea'];

export function defaultStrategies(inst: Instrument): StrategyDef[] {
	const a = atm(inst.spot, inst.step);
	return [
		{ id: 'auto', name: 'Auto ATM Straddle', kind: 'Straddle', expiry: 0, ce: null, pe: null, color: STRATEGY_COLORS[0], visible: true, auto: true },
		{ id: 's1', name: `${a - inst.step}CE, ${a - inst.step}PE`, kind: 'Straddle', expiry: 0, ce: a - inst.step, pe: a - inst.step, color: STRATEGY_COLORS[1], visible: true },
		{ id: 's2', name: `${a}CE, ${a - 2 * inst.step}PE`, kind: 'Strangle', expiry: 0, ce: a, pe: a - 2 * inst.step, color: STRATEGY_COLORS[2], visible: false },
		{ id: 's3', name: `${a + inst.step * 2}CE, ${a - inst.step * 2}PE`, kind: 'Strangle', expiry: 0, ce: a + inst.step * 2, pe: a - inst.step * 2, color: STRATEGY_COLORS[3], visible: false },
	];
}
