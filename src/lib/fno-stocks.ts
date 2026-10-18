/** Mock F&O universe for Screener, Technical Signals and Stock Data pages. */
import { seeded } from '@/lib/market-mock';

const RAW: [string, string, number][] = [
	['NIFTY', 'Index', 23146.15], ['BANKNIFTY', 'Index', 55844], ['FINNIFTY', 'Index', 25370], ['MIDCPNIFTY', 'Index', 12840],
	['360ONE', 'Financial Services', 1075], ['ABB', 'Capital Goods', 5480], ['ABCAPITAL', 'Financial Services', 248.6], ['ADANIENSOL', 'Power', 812.4],
	['ADANIENT', 'Metals & Mining', 2388], ['ADANIGREEN', 'Power', 1302], ['ADANIPORTS', 'Services', 1746.8], ['ADANIPOWER', 'Power', 562.3],
	['ALKEM', 'Healthcare', 5410], ['AMBUJACEM', 'Construction Materials', 568.2], ['ANGELONE', 'Financial Services', 300], ['APLAPOLLO', 'Capital Goods', 2152.7],
	['APOLLOHOSP', 'Healthcare', 7869.5], ['ASHOKLEY', 'Automobile', 128.4], ['ASIANPAINT', 'Consumer Durables', 2331.9], ['ASTRAL', 'Capital Goods', 1418],
	['AUBANK', 'Financial Services', 742.5], ['AUROPHARMA', 'Healthcare', 1166.9], ['AXISBANK', 'Financial Services', 1290], ['BAJAJ-AUTO', 'Automobile', 8920],
	['BAJAJFINSV', 'Financial Services', 2010.4], ['BAJAJHLDNG', 'Financial Services', 11198], ['BAJFINANCE', 'Financial Services', 982.1], ['BANDHANBNK', 'Financial Services', 168.3],
	['BANKBARODA', 'Financial Services', 248.9], ['BEL', 'Capital Goods', 378.3], ['BHARATFORG', 'Automobile', 1835], ['BHARTIARTL', 'Telecommunication', 1905],
	['BHEL', 'Capital Goods', 234.25], ['BIOCON', 'Healthcare', 352.6], ['BLUESTARCO', 'Consumer Durables', 1567.6], ['BOSCHLTD', 'Automobile', 36400],
	['BPCL', 'Oil Gas & Fuels', 334.8], ['BRITANNIA', 'FMCG', 5810], ['BSE', 'Financial Services', 3363], ['CANBK', 'Financial Services', 118.78],
	['CGPOWER', 'Capital Goods', 846], ['CIPLA', 'Healthcare', 1512.4], ['COALINDIA', 'Oil Gas & Fuels', 388.2], ['COFORGE', 'Information Technology', 1950.4],
	['CROMPTON', 'Consumer Durables', 214.4], ['DIVISLAB', 'Healthcare', 9168.5], ['DIXON', 'Consumer Durables', 12366], ['DLF', 'Realty', 788.4],
	['DRREDDY', 'Healthcare', 1248.6], ['EICHERMOT', 'Automobile', 6840], ['ETERNAL', 'Consumer Services', 325.05], ['FEDERALBNK', 'Financial Services', 337.5],
	['GAIL', 'Oil Gas & Fuels', 182.4], ['GRASIM', 'Construction Materials', 2780], ['HAL', 'Capital Goods', 4720], ['HCLTECH', 'Information Technology', 1488],
	['HDFCBANK', 'Financial Services', 1012.6], ['HDFCLIFE', 'Financial Services', 758.2], ['HEROMOTOCO', 'Automobile', 5420], ['HINDALCO', 'Metals & Mining', 768.4],
	['HINDUNILVR', 'FMCG', 2512], ['ICICIBANK', 'Financial Services', 1402.3], ['INDIGO', 'Services', 5640], ['INFY', 'Information Technology', 1521.4],
	['ITC', 'FMCG', 412.6], ['JIOFIN', 'Financial Services', 318.4], ['JSWSTEEL', 'Metals & Mining', 1124], ['KOTAKBANK', 'Financial Services', 2140],
	['LT', 'Construction', 3842], ['LUPIN', 'Healthcare', 1984], ['M&M', 'Automobile', 3412], ['MARUTI', 'Automobile', 15820],
	['NESTLEIND', 'FMCG', 1188], ['NTPC', 'Power', 338.6], ['ONGC', 'Oil Gas & Fuels', 241.2], ['POWERGRID', 'Power', 288.4],
	['RELIANCE', 'Oil Gas & Fuels', 1211.2], ['SBIN', 'Financial Services', 868.4], ['SUNPHARMA', 'Healthcare', 1642], ['TATAMOTORS', 'Automobile', 684.2],
	['TATASTEEL', 'Metals & Mining', 168.9], ['TCS', 'Information Technology', 3048], ['TECHM', 'Information Technology', 1468], ['TITAN', 'Consumer Durables', 3612],
	['TRENT', 'Consumer Services', 4820], ['ULTRACEMCO', 'Construction Materials', 12240], ['VEDL', 'Metals & Mining', 468.2], ['WIPRO', 'Information Technology', 246.8],
];

export type FnoStock = {
	symbol: string;
	sector: string;
	price: number;
	change: number;
	fut: number;
	futChg: number;
	atmIv: number;
	ivChg: number;
	ivp: number;
	result: string;
	oiChg: number;
	pcr: number;
	maxPain: number;
	volumeX: number;
	futOiChg: number;
	liquid: boolean;
	action: 'Long buildup' | 'Short cover' | 'Long unwind' | 'Short buildup';
};

const RESULT_DATES = ['14 Oct', '15 Oct', '16 Oct', '17 Oct', '19 Oct', '21 Oct', '23 Oct', '28 Oct', '30 Oct', '04 Nov', 'TBA'];

export const FNO: FnoStock[] = RAW.map(([symbol, sector, price]) => {
	const r = seeded('fno', symbol);
	const isIdx = sector === 'Index';
	const change = symbol === 'NIFTY' ? 0.65 : symbol === 'BANKNIFTY' ? 0.06 : symbol === 'RELIANCE' ? -0.31 : Math.round((r() - 0.5) * 6 * 100) / 100;
	const futChg = Math.round((change - 0.09 + (r() - 0.5) * 0.3) * 100) / 100;
	const step = price > 10000 ? 100 : price > 2000 ? 50 : price > 500 ? 10 : price > 100 ? 5 : 2.5;
	const oiChg = Math.round((r() - 0.3) * 16 * 10) / 10;
	const up = futChg >= 0;
	const action = up ? (oiChg >= 0 ? 'Long buildup' : 'Short cover') : oiChg >= 0 ? 'Short buildup' : 'Long unwind';
	return {
		symbol,
		sector,
		price,
		change,
		fut: Math.round(price * (1 - 0.0014 + r() * 0.002) * 100) / 100,
		futChg,
		atmIv: Math.round((isIdx ? 11 + r() * 4 : 15 + r() * 28) * 10) / 10,
		ivChg: Math.round((r() - 0.55) * 8 * 10) / 10,
		ivp: Math.round(r() * 98),
		result: isIdx ? 'N/A' : RESULT_DATES[Math.floor(r() * RESULT_DATES.length)],
		oiChg,
		pcr: Math.round((0.45 + r() * 0.9) * 100) / 100,
		maxPain: Math.round(price / step) * step,
		volumeX: Math.round((0.4 + r() * 2.4) * 10) / 10,
		futOiChg: Math.round((r() - 0.4) * 30 * 10) / 10,
		liquid: isIdx || r() > 0.2,
		action,
	};
});

export const SECTORS = Array.from(new Set(FNO.map((s) => s.sector))).sort();
export const fnoBySymbol = (s: string) => FNO.find((x) => x.symbol === s.toUpperCase()) ?? FNO[0];

export type Signal = { date: string; time: string; sort: number; kind: 'MA' | 'Candle'; tf: 'H' | 'D' | 'W' | 'M'; name: string; bullish: boolean | null; symbol: string };

const CANDLES: [string, boolean][] = [['Bearish Engulfing', false], ['Bearish Marubozu', false], ['Bullish Engulfing', true], ['Bullish Marubozu', true], ['Hammer', true], ['Shooting Star', false], ['Bullish Harami', true], ['Bearish Harami', false], ['Morning Star', true], ['Evening Star', false]];
const TF_NAME = { H: 'Hourly', D: 'Daily', W: 'Weekly', M: 'Monthly' } as const;
const SIG_DAYS = ['16 Oct 2026', '15 Oct 2026', '14 Oct 2026', '13 Oct 2026', '12 Oct 2026', '09 Oct 2026', '08 Oct 2026'];

export const SIGNALS: Signal[] = (() => {
	const out: Signal[] = [];
	SIG_DAYS.forEach((date, di) => {
		FNO.forEach((s) => {
			const r = seeded('sig', s.symbol, date);
			const n = r() < 0.35 ? (r() < 0.3 ? 2 : 1) : 0;
			for (let k = 0; k < n; k++) {
				const tf = (['D', 'D', 'D', 'H', 'W', 'M'] as const)[Math.floor(r() * 6)];
				const time = tf === 'H' ? ['10:15', '11:15', '13:15', '14:15'][Math.floor(r() * 4)] : '03:40';
				if (r() < 0.55) {
					const ma = [50, 100, 200][Math.floor(r() * 3)];
					out.push({ date, time, sort: (6 - di) * 10000 + (tf === 'H' ? Number(time.replace(':', '')) : 1540), kind: 'MA', tf, name: `${ma} ${TF_NAME[tf]} Moving Average`, bullish: null, symbol: s.symbol });
				} else {
					const [c, bull] = CANDLES[Math.floor(r() * CANDLES.length)];
					out.push({ date, time, sort: (6 - di) * 10000 + 1540, kind: 'Candle', tf, name: `${c} - ${TF_NAME[tf]}`, bullish: bull, symbol: s.symbol });
				}
			}
		});
	});
	return out.sort((a, b) => b.sort - a.sort || a.symbol.localeCompare(b.symbol));
})();
