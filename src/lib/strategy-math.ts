export type Side = 'B' | 'S';
export type Right = 'CE' | 'PE';

export type Leg = {
	id: string;
	on: boolean;
	side: Side;
	expiry: string;
	strike: number;
	right: Right;
	lots: number;
	price: number;
};

export const EXPIRIES = ['19 Oct', '27 Oct', '03 Nov', '09 Nov', '17 Nov', '23 Nov', '29 Dec'];
export const LOT_CHOICES = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20];

export type Instrument = {
	symbol: string;
	name: string;
	spot: number;
	change: number;
	step: number;
	lot: number;
};

export const INSTRUMENTS: Instrument[] = [
	{ symbol: 'NIFTY', name: 'Nifty 50', spot: 23146.15, change: 0.65, step: 50, lot: 65 },
	{ symbol: 'BANKNIFTY', name: 'Nifty Bank', spot: 51240.3, change: -0.28, step: 100, lot: 30 },
	{ symbol: 'FINNIFTY', name: 'Nifty Financial', spot: 24118.7, change: 0.41, step: 50, lot: 40 },
	{ symbol: 'RELIANCE', name: 'Reliance Industries', spot: 1211.2, change: -0.31, step: 10, lot: 500 },
	{ symbol: 'SENSEX', name: 'BSE Sensex', spot: 76210.4, change: 0.33, step: 100, lot: 20 },
];

export function roundToTick(value: number, tick = 0.05) {
	return Math.round(value / tick) * tick;
}

export function modelPrice(spot: number, strike: number, right: Right, expiryIndex = 0) {
	const itm = right === 'CE' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
	const otm = right === 'CE' ? Math.max(0, strike - spot) : Math.max(0, spot - strike);
	const base = spot > 5000 ? 64.7 : spot > 500 ? 18.4 : 8.2;
	const width = spot > 5000 ? 150 : spot > 500 ? 28 : 12;
	const tv = base * Math.exp(-otm / width) * Math.exp(-itm / (width * 3.2)) * (1 + expiryIndex * 0.08);
	return roundToTick(itm + Math.max(0.5, tv));
}

export function atmStrike(spot: number, step: number) {
	return Math.round(spot / step) * step;
}

let legSeq = 1;
export function makeLeg(partial: Omit<Leg, 'id' | 'on'> & { on?: boolean }): Leg {
	legSeq += 1;
	return { on: true, ...partial, id: `leg-${legSeq}` };
}

export type PresetId =
	| 'buy-call'
	| 'sell-put'
	| 'bull-call'
	| 'bull-put'
	| 'call-ratio'
	| 'calendar-call'
	| 'bull-condor'
	| 'bull-fly'
	| 'range-forward'
	| 'synthetic'
	| 'buy-put'
	| 'sell-call'
	| 'bear-put'
	| 'bear-call'
	| 'put-ratio'
	| 'calendar-put'
	| 'bear-condor'
	| 'bear-fly'
	| 'short-straddle'
	| 'short-strangle'
	| 'iron-fly'
	| 'iron-condor'
	| 'long-straddle'
	| 'long-strangle';

export type PresetGroup = 'Bullish' | 'Bearish' | 'Neutral' | 'Others';

export type Preset = {
	id: PresetId;
	name: string;
	group: PresetGroup;
	icon: PresetId;
};

export const PRESETS: Preset[] = [
	{ id: 'buy-call', name: 'Buy Call', group: 'Bullish', icon: 'buy-call' },
	{ id: 'sell-put', name: 'Sell Put', group: 'Bullish', icon: 'sell-put' },
	{ id: 'bull-call', name: 'Bull Call Spread', group: 'Bullish', icon: 'bull-call' },
	{ id: 'bull-put', name: 'Bull Put Spread', group: 'Bullish', icon: 'bull-put' },
	{ id: 'call-ratio', name: 'Call Ratio Back Spread', group: 'Bullish', icon: 'call-ratio' },
	{ id: 'calendar-call', name: 'Long Calendar with Calls', group: 'Bullish', icon: 'calendar-call' },
	{ id: 'bull-condor', name: 'Bull Condor', group: 'Bullish', icon: 'bull-condor' },
	{ id: 'bull-fly', name: 'Bull Butterfly', group: 'Bullish', icon: 'bull-fly' },
	{ id: 'range-forward', name: 'Range Forward', group: 'Bullish', icon: 'range-forward' },
	{ id: 'synthetic', name: 'Long Synthetic Future', group: 'Bullish', icon: 'synthetic' },
	{ id: 'buy-put', name: 'Buy Put', group: 'Bearish', icon: 'buy-put' },
	{ id: 'sell-call', name: 'Sell Call', group: 'Bearish', icon: 'sell-call' },
	{ id: 'bear-put', name: 'Bear Put Spread', group: 'Bearish', icon: 'bear-put' },
	{ id: 'bear-call', name: 'Bear Call Spread', group: 'Bearish', icon: 'bear-call' },
	{ id: 'put-ratio', name: 'Put Ratio Back Spread', group: 'Bearish', icon: 'put-ratio' },
	{ id: 'calendar-put', name: 'Long Calendar with Puts', group: 'Bearish', icon: 'calendar-put' },
	{ id: 'bear-condor', name: 'Bear Condor', group: 'Bearish', icon: 'bear-condor' },
	{ id: 'bear-fly', name: 'Bear Butterfly', group: 'Bearish', icon: 'bear-fly' },
	{ id: 'short-straddle', name: 'Short Straddle', group: 'Neutral', icon: 'short-straddle' },
	{ id: 'short-strangle', name: 'Short Strangle', group: 'Neutral', icon: 'short-strangle' },
	{ id: 'iron-fly', name: 'Iron Butterfly', group: 'Neutral', icon: 'iron-fly' },
	{ id: 'iron-condor', name: 'Iron Condor', group: 'Neutral', icon: 'iron-condor' },
	{ id: 'long-straddle', name: 'Long Straddle', group: 'Others', icon: 'long-straddle' },
	{ id: 'long-strangle', name: 'Long Strangle', group: 'Others', icon: 'long-strangle' },
];

type Spec = { side: Side; right: Right; strikeOff: number; lots?: number; expiryOff?: number };

const SPECS: Record<PresetId, Spec[]> = {
	'buy-call': [{ side: 'B', right: 'CE', strikeOff: 0 }],
	'sell-put': [{ side: 'S', right: 'PE', strikeOff: 0 }],
	'bull-call': [
		{ side: 'B', right: 'CE', strikeOff: 0 },
		{ side: 'S', right: 'CE', strikeOff: 4 },
	],
	'bull-put': [
		{ side: 'B', right: 'PE', strikeOff: -4 },
		{ side: 'S', right: 'PE', strikeOff: 0 },
	],
	'call-ratio': [
		{ side: 'S', right: 'CE', strikeOff: 0, lots: 1 },
		{ side: 'B', right: 'CE', strikeOff: 2, lots: 2 },
	],
	'calendar-call': [
		{ side: 'S', right: 'CE', strikeOff: 0, expiryOff: 0 },
		{ side: 'B', right: 'CE', strikeOff: 0, expiryOff: 1 },
	],
	'bull-condor': [
		{ side: 'B', right: 'CE', strikeOff: -2 },
		{ side: 'S', right: 'CE', strikeOff: 0 },
		{ side: 'S', right: 'CE', strikeOff: 2 },
		{ side: 'B', right: 'CE', strikeOff: 4 },
	],
	'bull-fly': [
		{ side: 'B', right: 'CE', strikeOff: -1 },
		{ side: 'S', right: 'CE', strikeOff: 0, lots: 2 },
		{ side: 'B', right: 'CE', strikeOff: 1 },
	],
	'range-forward': [
		{ side: 'S', right: 'PE', strikeOff: -2 },
		{ side: 'B', right: 'CE', strikeOff: 2 },
	],
	synthetic: [
		{ side: 'B', right: 'CE', strikeOff: 0 },
		{ side: 'S', right: 'PE', strikeOff: 0 },
	],
	'buy-put': [{ side: 'B', right: 'PE', strikeOff: 0 }],
	'sell-call': [{ side: 'S', right: 'CE', strikeOff: 0 }],
	'bear-put': [
		{ side: 'B', right: 'PE', strikeOff: 0 },
		{ side: 'S', right: 'PE', strikeOff: -4 },
	],
	'bear-call': [
		{ side: 'S', right: 'CE', strikeOff: 0 },
		{ side: 'B', right: 'CE', strikeOff: 4 },
	],
	'put-ratio': [
		{ side: 'S', right: 'PE', strikeOff: 0 },
		{ side: 'B', right: 'PE', strikeOff: -2, lots: 2 },
	],
	'calendar-put': [
		{ side: 'S', right: 'PE', strikeOff: 0 },
		{ side: 'B', right: 'PE', strikeOff: 0, expiryOff: 1 },
	],
	'bear-condor': [
		{ side: 'B', right: 'PE', strikeOff: 2 },
		{ side: 'S', right: 'PE', strikeOff: 0 },
		{ side: 'S', right: 'PE', strikeOff: -2 },
		{ side: 'B', right: 'PE', strikeOff: -4 },
	],
	'bear-fly': [
		{ side: 'B', right: 'PE', strikeOff: 1 },
		{ side: 'S', right: 'PE', strikeOff: 0, lots: 2 },
		{ side: 'B', right: 'PE', strikeOff: -1 },
	],
	'short-straddle': [
		{ side: 'S', right: 'CE', strikeOff: 0 },
		{ side: 'S', right: 'PE', strikeOff: 0 },
	],
	'short-strangle': [
		{ side: 'S', right: 'CE', strikeOff: 4 },
		{ side: 'S', right: 'PE', strikeOff: -4 },
	],
	'iron-fly': [
		{ side: 'B', right: 'PE', strikeOff: -4 },
		{ side: 'S', right: 'PE', strikeOff: 0 },
		{ side: 'S', right: 'CE', strikeOff: 0 },
		{ side: 'B', right: 'CE', strikeOff: 4 },
	],
	'iron-condor': [
		{ side: 'B', right: 'PE', strikeOff: -6 },
		{ side: 'S', right: 'PE', strikeOff: -2 },
		{ side: 'S', right: 'CE', strikeOff: 2 },
		{ side: 'B', right: 'CE', strikeOff: 6 },
	],
	'long-straddle': [
		{ side: 'B', right: 'CE', strikeOff: 0 },
		{ side: 'B', right: 'PE', strikeOff: 0 },
	],
	'long-strangle': [
		{ side: 'B', right: 'CE', strikeOff: 4 },
		{ side: 'B', right: 'PE', strikeOff: -4 },
	],
};

export function buildPreset(id: PresetId, spot: number, step: number, expiry: string): Leg[] {
	const atm = atmStrike(spot, step);
	const expiryIndex = Math.max(0, EXPIRIES.indexOf(expiry));
	return SPECS[id].map((spec) => {
		const strike = atm + spec.strikeOff * step;
		const exp = EXPIRIES[Math.min(EXPIRIES.length - 1, expiryIndex + (spec.expiryOff ?? 0))] ?? expiry;
		return makeLeg({
			side: spec.side,
			right: spec.right,
			strike,
			expiry: exp,
			lots: spec.lots ?? 1,
			price: modelPrice(spot, strike, spec.right, EXPIRIES.indexOf(exp)),
		});
	});
}

export function payoffAt(legs: Leg[], price: number, lotSize: number, multiplier: number, manual = 0) {
	return (
		legs
			.filter((leg) => leg.on)
			.reduce((sum, leg) => {
				const intrinsic = leg.right === 'CE' ? Math.max(0, price - leg.strike) : Math.max(0, leg.strike - price);
				const sign = leg.side === 'B' ? 1 : -1;
				return sum + sign * (intrinsic - leg.price) * leg.lots * lotSize * multiplier;
			}, 0) + manual
	);
}

export function samplePrices(legs: Leg[], spot: number, step: number) {
	const strikes = legs.map((leg) => leg.strike);
	const mid = strikes.length ? strikes.reduce((a, b) => a + b, 0) / strikes.length : spot;
	const span = Math.max(step * 16, (Math.max(...strikes, spot) - Math.min(...strikes, spot)) * 1.8, step * 8);
	const start = mid - span;
	const count = 48;
	return Array.from({ length: count }, (_, i) => start + (span * 2 * i) / (count - 1));
}

export function summarise(legs: Leg[], spot: number, step: number, lotSize: number, multiplier: number, manual = 0) {
	const active = legs.filter((leg) => leg.on);
	const prices = samplePrices(active.length ? active : legs, spot, step);
	const pnls = prices.map((price) => payoffAt(active, price, lotSize, multiplier, manual));
	const hi = Math.max(...pnls);
	const lo = Math.min(...pnls);
	const lastSlope = pnls[pnls.length - 1] - pnls[pnls.length - 2];
	const firstSlope = pnls[1] - pnls[0];
	const maxProfitUnlimited = lastSlope > lotSize * 0.4 || firstSlope < -lotSize * 0.4;
	const maxLossUnlimited = firstSlope > lotSize * 0.4 || lastSlope < -lotSize * 0.4;
	const maxProfit = maxProfitUnlimited && hi === Math.max(pnls[0], pnls[pnls.length - 1]) ? null : hi;
	const maxLoss = maxLossUnlimited && lo === Math.min(pnls[0], pnls[pnls.length - 1]) ? null : lo;

	const breakevens: number[] = [];
	for (let i = 1; i < pnls.length; i += 1) {
		if (pnls[i - 1] === 0) breakevens.push(prices[i - 1]);
		else if ((pnls[i - 1] < 0 && pnls[i] > 0) || (pnls[i - 1] > 0 && pnls[i] < 0)) {
			const t = Math.abs(pnls[i - 1]) / (Math.abs(pnls[i - 1]) + Math.abs(pnls[i]));
			breakevens.push(prices[i - 1] + (prices[i] - prices[i - 1]) * t);
		}
	}

	let debit = 0;
	let credit = 0;
	let timeValue = 0;
	let intrinsicValue = 0;
	for (const leg of active) {
		const intrinsic = leg.right === 'CE' ? Math.max(0, spot - leg.strike) : Math.max(0, leg.strike - spot);
		const sign = leg.side === 'B' ? 1 : -1;
		const cash = sign * leg.price * leg.lots * lotSize * multiplier;
		if (cash > 0) debit += cash;
		else credit += -cash;
		timeValue += sign * Math.max(0, leg.price - intrinsic) * leg.lots * lotSize * multiplier;
		intrinsicValue += sign * Math.min(leg.price, intrinsic) * leg.lots * lotSize * multiplier;
	}

	const pop = probabilityOfProfit(active, spot, lotSize, multiplier, manual);
	return {
		maxProfit: maxProfit === null ? null : Math.max(0, maxProfit),
		maxLoss: maxLoss === null ? null : Math.min(0, maxLoss),
		breakevens: breakevens.slice(0, 3),
		debit,
		credit,
		net: credit - debit,
		timeValue,
		intrinsicValue,
		pop,
		prices,
		pnls,
	};
}

function normCdf(z: number) {
	const t = 1 / (1 + 0.2316419 * Math.abs(z));
	const d = 0.3989423 * Math.exp((-z * z) / 2);
	const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
	return z > 0 ? 1 - p : p;
}

function probabilityOfProfit(legs: Leg[], spot: number, lotSize: number, multiplier: number, manual: number) {
	if (!legs.length) return 0;
	const prices = samplePrices(legs, spot, 1);
	const sd = spot * 0.012 * 3;
	let win = 0;
	let total = 0;
	for (const price of prices) {
		const z = (price - spot) / sd;
		const density = Math.exp(-0.5 * z * z);
		total += density;
		if (payoffAt(legs, price, lotSize, multiplier, manual) > 0) win += density;
	}
	return total ? Math.round((win / total) * 100) : 0;
}

export function targetPayoff(expiryPnl: number, daysLeft: number, totalDays: number) {
	const progressed = 1 - daysLeft / Math.max(totalDays, 1);
	return expiryPnl * (0.18 + 0.82 * progressed);
}

export function legGreeks(leg: Leg, spot: number, lotSize: number, multiplyLots: boolean) {
	const t = 4 / 365;
	const vol = 0.12;
	const sd = spot * vol * Math.sqrt(t);
	const d1 = (spot - leg.strike) / sd;
	const callDelta = Math.min(0.98, Math.max(0.02, normCdf(d1)));
	const delta = (leg.right === 'CE' ? callDelta : callDelta - 1) * (leg.side === 'B' ? 1 : -1);
	const gamma = Math.exp(-0.5 * d1 * d1) / (spot * vol * Math.sqrt(t)) * (leg.side === 'B' ? 1 : -1);
	const vega = (spot * Math.exp(-0.5 * d1 * d1) * Math.sqrt(t)) / 100 * (leg.side === 'B' ? 1 : -1);
	const theta = (-(spot * vol * Math.exp(-0.5 * d1 * d1)) / (2 * Math.sqrt(t)) / 365) * (leg.side === 'B' ? 1 : -1);
	const scale = multiplyLots ? leg.lots * lotSize : 1;
	return { delta: delta * scale, gamma: gamma * scale, vega: vega * scale, theta: theta * scale };
}

export function callOi(strike: number, spot: number, step: number) {
	const dist = (strike - spot) / step;
	return Math.max(4, 78 * Math.exp(-((dist - 0.2) ** 2) / 18) + (dist > 2 ? 12 : 0));
}

export function putOi(strike: number, spot: number, step: number) {
	const dist = (spot - strike) / step;
	return Math.max(3, 62 * Math.exp(-((dist - 0.4) ** 2) / 16));
}

export function formatInr(value: number, signed = false) {
	const rounded = Math.round(value);
	const body = Math.abs(rounded).toLocaleString('en-IN');
	if (!signed) return rounded < 0 ? `-${body}` : body;
	if (rounded > 0) return `+${body}`;
	if (rounded < 0) return `-${body}`;
	return '0';
}

export function formatPx(value: number) {
	return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
