/**
 * Deterministic mock market data for the Option Chain and Open Interest pages.
 * Numbers are shaped like a real NSE chain (IV smile, OI clustering at round
 * strikes, ITM/OTM pricing) but are generated, not live.
 */
import { INSTRUMENTS, type Instrument } from '@/lib/strategy-math';

export const CHAIN_EXPIRIES = [
	{ label: '19 Oct', iso: '2026-10-19', days: 3 },
	{ label: '27 Oct', iso: '2026-10-27', days: 9 },
	{ label: '03 Nov', iso: '2026-11-03', days: 16 },
	{ label: '10 Nov', iso: '2026-11-10', days: 23 },
	{ label: '24 Nov', iso: '2026-11-24', days: 37 },
	{ label: '29 Dec', iso: '2026-12-29', days: 72 },
];

export function instrumentBySymbol(symbol: string | null | undefined): Instrument {
	return INSTRUMENTS.find((item) => item.symbol === (symbol ?? '').toUpperCase()) ?? INSTRUMENTS[0];
}

/** Small seeded PRNG so the same strike always gets the same mock numbers. */
export function seeded(...parts: (string | number)[]) {
	let h = 2166136261;
	for (const ch of parts.join('|')) {
		h ^= ch.charCodeAt(0);
		h = Math.imul(h, 16777619);
	}
	return () => {
		h += 0x6d2b79f5;
		let t = h;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function normCdf(x: number) {
	const t = 1 / (1 + 0.2316419 * Math.abs(x));
	const d = 0.3989423 * Math.exp((-x * x) / 2);
	const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
	return x > 0 ? 1 - p : p;
}
const normPdf = (x: number) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);

export function blackScholes(spot: number, strike: number, days: number, ivPct: number, right: 'CE' | 'PE') {
	const t = Math.max(days, 0.35) / 365;
	const v = ivPct / 100;
	const d1 = (Math.log(spot / strike) + 0.5 * v * v * t) / (v * Math.sqrt(t));
	const d2 = d1 - v * Math.sqrt(t);
	const call = spot * normCdf(d1) - strike * normCdf(d2);
	const price = right === 'CE' ? call : call - spot + strike;
	const delta = right === 'CE' ? normCdf(d1) : normCdf(d1) - 1;
	const gamma = normPdf(d1) / (spot * v * Math.sqrt(t));
	const vega = (spot * normPdf(d1) * Math.sqrt(t)) / 100;
	const theta = -(spot * normPdf(d1) * v) / (2 * Math.sqrt(t)) / 365;
	return { price: Math.max(0.05, price), delta, gamma, vega, theta };
}

export type ChainRow = {
	strike: number;
	iv: number;
	call: Side;
	put: Side;
};
type Side = { ltp: number; chg: number; oi: number; oiChgPct: number; volume: number; delta: number; gamma: number; vega: number; theta: number; iv: number };

const round05 = (v: number) => Math.max(0.05, Math.round(v * 20) / 20);

export function buildChain(inst: Instrument, expiryIndex: number, count = 30): ChainRow[] {
	const exp = CHAIN_EXPIRIES[expiryIndex] ?? CHAIN_EXPIRIES[0];
	const atm = Math.round(inst.spot / inst.step) * inst.step;
	const rows: ChainRow[] = [];
	const baseIv = inst.symbol.includes('NIFTY') || inst.symbol === 'SENSEX' ? 10.6 : 24;
	for (let i = -count; i <= count; i++) {
		const strike = atm + i * inst.step;
		const rnd = seeded(inst.symbol, exp.iso, strike);
		const m = (strike - inst.spot) / inst.spot;
		const k = baseIv / 10.6;
		const iv = baseIv + (6000 * m * m * (exp.days < 5 ? 1 : 0.55) + (m < 0 ? -m * 60 : m * 30)) * (k > 1 ? 0.45 * k : 1);
		const round = strike % (inst.step * 10) === 0 ? 2.1 : strike % (inst.step * 2) === 0 ? 1.3 : 0.55;
		const side = (right: 'CE' | 'PE'): Side => {
			const bs = blackScholes(inst.spot, strike, exp.days, iv, right);
			const otm = right === 'CE' ? strike >= inst.spot : strike <= inst.spot;
			const dist = Math.abs(strike - inst.spot) / inst.step;
			const peak = right === 'CE' ? 95 : 120;
			const oi = (otm ? peak * Math.exp(-((dist - 5) ** 2) / 120) + 6 : 8 * Math.exp(-dist / 6) + 0.1) * round * (0.6 + rnd() * 0.8) * (inst.symbol === 'NIFTY' ? 1 : 0.35);
			return {
				ltp: round05(bs.price),
				chg: (rnd() - 0.55) * bs.price * 0.4,
				oi,
				oiChgPct: Math.round((otm ? rnd() * 180 - 25 : rnd() * 60 - 40) * 10) / 10,
				volume: oi * (8 + rnd() * 40),
				delta: bs.delta,
				gamma: bs.gamma,
				vega: bs.vega,
				theta: bs.theta,
				iv: Math.round(iv * 10) / 10,
			};
		};
		rows.push({ strike, iv: Math.round(iv * 10) / 10, call: side('CE'), put: side('PE') });
	}
	return rows;
}

export function synthFuture(inst: Instrument, expiryIndex: number) {
	const days = (CHAIN_EXPIRIES[expiryIndex] ?? CHAIN_EXPIRIES[0]).days;
	return inst.spot * (1 - 0.0024 + days * 0.00018);
}

export type OiPoint = { strike: number; callOi: number; putOi: number; callChg: number; putChg: number };

/** OI and OI-change per strike for the selected expiries, scaled to `progress` (0..1 of the session). */
export function buildOiProfile(inst: Instrument, expiryIdx: number[], progress: number, windowMins: number | null): OiPoint[] {
	const atm = Math.round(inst.spot / inst.step) * inst.step;
	const out: OiPoint[] = [];
	for (let i = -25; i <= 25; i++) {
		const strike = atm + i * inst.step;
		let callOi = 0;
		let putOi = 0;
		let callChg = 0;
		let putChg = 0;
		for (const e of expiryIdx) {
			const rnd = seeded('oi', inst.symbol, e, strike);
			const scale = (e === 0 ? 1 : 0.45) * (inst.symbol === 'NIFTY' ? 40 : 1);
			const round = strike % (inst.step * 5) === 0 ? 1.8 : 1;
			const dc = (strike - inst.spot) / inst.step;
			callOi += scale * round * (dc > -2 ? 10 * Math.exp(-((dc - 6) ** 2) / 80) + 1 : 1.2 * Math.exp(dc / 5)) * (0.6 + rnd() * 0.8);
			putOi += scale * round * (dc < 2 ? 9 * Math.exp(-((dc + 5) ** 2) / 70) + 1 : 1.1 * Math.exp(-dc / 5)) * (0.6 + rnd() * 0.8);
			const cBias = dc > 0 ? 0.6 : -0.15;
			const pBias = dc < 0 ? 0.25 : -0.2;
			callChg += scale * round * (cBias + (rnd() - 0.5) * 1.1) * Math.exp(-Math.abs(dc) / 9) * 6;
			putChg += scale * round * (pBias + (rnd() - 0.5) * 1.1) * Math.exp(-Math.abs(dc) / 9) * 5;
		}
		const f = windowMins === null ? progress : Math.min(1, windowMins / 375) * 1.6;
		out.push({ strike, callOi: callOi * 1e5, putOi: putOi * 1e5, callChg: callChg * 1e5 * f, putChg: putChg * 1e5 * f });
	}
	return out;
}

/** Intraday series (every 15 min) for OI-vs-time charts. */
export function buildOiTimeline(inst: Instrument, strike: number | null, kind: 'option' | 'future') {
	const rnd = seeded('tl', inst.symbol, strike ?? 'fut', kind);
	const points: { t: string; call: number; put: number; price: number }[] = [];
	let call = 40 + rnd() * 20;
	let put = 35 + rnd() * 20;
	let price = inst.spot * (1 + 0.0035);
	for (let m = 0; m <= 375; m += 15) {
		const h = Math.floor((555 + m) / 60);
		const mm = (555 + m) % 60;
		points.push({ t: `${h > 12 ? h - 12 : h}:${String(mm).padStart(2, '0')}`, call, put, price });
		call *= 1 + (rnd() - 0.42) * 0.06;
		put *= 1 + (rnd() - 0.5) * 0.05;
		price += (inst.spot - price) * 0.12 + (rnd() - 0.5) * inst.spot * 0.0012;
	}
	return points;
}

export function lakh(v: number, digits = 2) {
	const abs = Math.abs(v);
	if (abs >= 1e7) return `${(v / 1e7).toFixed(digits)}Cr`;
	return `${(v / 1e5).toFixed(digits)}L`;
}

export const SESSION_TIMES = (() => {
	const out: string[] = [];
	for (let m = 0; m <= 375; m += 5) {
		const total = 555 + m;
		const h = Math.floor(total / 60);
		const mm = total % 60;
		out.push(`${h > 12 ? h - 12 : h}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`);
	}
	return out;
})();
