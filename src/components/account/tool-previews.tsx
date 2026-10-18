import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BarChart3, LineChart, Network, Radio } from 'lucide-react';

const G = '#32d583';
const R = '#f16a5b';
const B = '#68a5ea';
const P = '#9b7be8';
const Y = '#f0c63a';

const wave = (n: number, seed: number, amp: number, base: number) =>
	Array.from({ length: n }, (_, i) => base + Math.sin(i * 0.9 + seed) * amp + Math.cos(i * 0.45 + seed * 2) * amp * 0.6);

function polyline(values: number[], w: number, color: string, key?: string) {
	const step = w / (values.length - 1);
	return <polyline key={key} fill="none" stroke={color} strokeWidth="1.6" points={values.map((v, i) => `${i * step},${v}`).join(' ')} />;
}

function OptionChainArt() {
	const rows = [['14.6', '12.7%', '15000', '120.8'], ['16', '12.7%', '15500', '112.8'], ['11624.42', '12.7%', '15600', '11624.42'], ['16', '12.7%', '15650', '78']];
	return (
		<div className="tp-chain">
			<p className="tp-chip">HEROMOTOCO 11191.21 <span style={{ color: G }}>+2.00%</span></p>
			<div className="tp-chain-grid">
				<span>Call LTP</span><span>Strike</span><span>Put LTP</span>
				{rows.map(([c, chg, s, p]) => (
					<span key={s} className="tp-chain-row"><b className="call">{c} <i style={{ color: R }}>{chg}</i></b><b className="strike">{s}</b><b className="put">{p}</b></span>
				))}
			</div>
		</div>
	);
}

function OiBarsArt() {
	const bars = [8, 14, 6, 22, 30, 18, 40, 52, 36, 60, 44, 28, 20, 12];
	return (
		<div className="tp-oi">
			<ul className="tp-legend">
				<li><i style={{ background: R }} />Call OI</li>
				<li><i style={{ background: G }} />Put OI</li>
				<li><i className="hatch" />Increase</li>
				<li><i className="outline" />Decrease</li>
			</ul>
			<svg viewBox="0 0 140 90" preserveAspectRatio="none">
				{bars.map((h, i) => (
					<g key={i}>
						<rect x={i * 10} y={90 - h * 1.4} width="4" height={h * 1.4} fill={R} />
						<rect x={i * 10 + 4.5} y={90 - (64 - h) * 1.2} width="4" height={(64 - h) * 1.2} fill={G} />
					</g>
				))}
			</svg>
		</div>
	);
}

function LinesArt({ colors, labels }: { colors: string[]; labels?: string[] }) {
	return (
		<div className="tp-lines">
			{labels ? (
				<ul className="tp-legend tp-legend--grid">
					{labels.map((label, i) => <li key={label + i}><i style={{ background: colors[i % colors.length] }} />{label}</li>)}
				</ul>
			) : null}
			<svg viewBox="0 0 180 80" preserveAspectRatio="none">
				{colors.map((c, i) => polyline(wave(10, i * 1.7, 12, 40), 180, c, c + i))}
			</svg>
		</div>
	);
}

function FiiArt() {
	const rows: [string, string, string][] = [['FII', 'Medium Bullish', G], ['Pro', 'Strong Bullish', G], ['Client', 'Strong Bearish', R]];
	return (
		<div className="tp-fii">
			{rows.map(([who, view, tone]) => (
				<div key={who}>
					<p className="tp-fii-head">{who}</p>
					<p className="tp-fii-row"><span>Index Options</span><b style={{ background: tone }}>{view}</b></p>
				</div>
			))}
		</div>
	);
}

function LiveChartsArt() {
	const panels = ['Auto ATM Straddle', 'Put-Call Ratio', 'Max Pain', 'Option IV'];
	return (
		<div className="tp-live">
			{panels.map((p, i) => (
				<div key={p}>
					<span className="tp-chip sm">{p}</span>
					<svg viewBox="0 0 80 34" preserveAspectRatio="none">
						{polyline(wave(8, i * 2.1, 7, 18), 80, [R, '#e8e8e8', P, Y][i])}
						{polyline(wave(8, i * 1.3 + 4, 6, 20), 80, B)}
					</svg>
				</div>
			))}
		</div>
	);
}

function TilesArt({ items }: { items: { label: string; icon: ReactNode }[] }) {
	return (
		<div className="tp-tiles">
			{items.map(({ label, icon }) => <span key={label}>{icon}{label}</span>)}
		</div>
	);
}

function ScreenerArt() {
	return (
		<div className="tp-screener">
			<p><b>NIFTY (Monthly)</b><span>Fut. Price<br /><em>22509.90 <i style={{ color: G }}>+0.5%</i></em></span></p>
			<div className="tp-screener-grid">
				<span>IVP<b>80</b></span><span>Result<b>N/A</b></span><span>OI Chg.<b>1.7</b></span><span>PCR<b>1.24</b></span><span>Max Pain<b>22200</b></span>
			</div>
			<p><b>BANKNIFTY (Monthly)</b><span>Fut. Price<br /><em>47581.03 <i style={{ color: R }}>-0.4%</i></em></span></p>
		</div>
	);
}

function SignalsArt() {
	const rows = ['50 Daily Moving Average', '100 Daily Moving Average', 'Bullish Harami - Daily'];
	return (
		<div className="tp-signals">
			{rows.map((r, i) => (
				<p key={r}>
					<b>{r}</b>
					{i < 2 ? <span>BANKNIFTY 46120.90 <i style={{ color: G }}>+2.00%</i></span> : null}
					{i < 2 ? <em>More</em> : null}
				</p>
			))}
		</div>
	);
}

function IvArt() {
	const candles = [[60, 72, 54, 66], [66, 70, 50, 52], [52, 64, 46, 62], [62, 76, 58, 74], [74, 80, 62, 64], [64, 70, 52, 56], [56, 68, 50, 66], [66, 78, 62, 76]];
	return (
		<div className="tp-lines">
			<ul className="tp-legend tp-legend--row">
				<li><i style={{ background: G }} />NIFTY FUT</li>
				<li><i style={{ background: R }} />ATM IV</li>
			</ul>
			<svg viewBox="0 0 180 90" preserveAspectRatio="none">
				{candles.map(([o, h, l, c], i) => {
					const x = 12 + i * 21;
					const up = c >= o;
					return (
						<g key={i}>
							<line x1={x + 4} x2={x + 4} y1={95 - h} y2={95 - l} stroke={up ? G : R} />
							<rect x={x} y={95 - Math.max(o, c)} width="8" height={Math.max(2, Math.abs(c - o))} fill={up ? G : '#f19a8a'} />
						</g>
					);
				})}
				{polyline([60, 48, 36, 52, 30, 22, 34, 40], 180, '#e2643e')}
			</svg>
		</div>
	);
}

function CalendarArt() {
	return (
		<div className="tp-cal">
			<p><span className="tp-date">22 Feb<br />Thu<small>12:30 AM</small></span><span><b>Non Farm Payrolls FEB</b><small>Importance</small><em>USA</em></span></p>
			<p><span><b>Inflation Rate YoY FEB</b><small>Importance</small><em>India</em></span><span className="tp-date">29 Feb<br />Thu<small>12:30 AM</small></span></p>
		</div>
	);
}

type ToolCard = { title: string; desc: string; to: string; art: ReactNode };

const SECTIONS: { title: string; cards: ToolCard[] }[] = [
	{
		title: 'Tools to guess the direction',
		cards: [
			{ title: 'Option chain', desc: 'All options data in one place. Identify supports and resistances.', to: '/tools/option-chain', art: <OptionChainArt /> },
			{ title: 'Open interest analysis', desc: 'Get clues on the direction with Intraday changes in open interest.', to: '/tools/open-interest', art: <OiBarsArt /> },
			{ title: 'Multi strike OI', desc: 'Graph of OI buildup in each strike. See the battle between calls and puts.', to: '/tools/open-interest?tab=multi', art: <LinesArt colors={['#38c8d8', R, B, P]} labels={['7 Dec 20100 CE', '7 Dec 20100 CE', '7 Dec 20100 CE', '7 Dec 20100 CE']} /> },
			{ title: 'FII DII data', desc: 'Know what the big guys are doing with Institutional Buy Sell data.', to: '/tools/fii-dii', art: <FiiArt /> },
			{ title: 'Multi Straddle-Strangle Charts', desc: 'Track price curves of multiple straddles, strangles and custom options strategies in a single chart.', to: '/tools/multi-straddle-strangle', art: <LinesArt colors={[R, '#f5a25d', B, Y]} /> },
			{ title: 'Live Options Charts', desc: 'Predict market direction with the power of real-time options data charts.', to: '/tools/live-options-charts', art: <LiveChartsArt /> },
			{
				title: 'Stock data',
				desc: 'All key derivatives data of a stock summarized in one page.',
				to: '/tools/stock-data',
				art: <TilesArt items={[{ label: 'Technical Signals', icon: <Radio size={16} /> }, { label: 'Option Chain', icon: <Network size={16} /> }, { label: 'Volume & OI', icon: <BarChart3 size={16} /> }, { label: 'IV Chart', icon: <LineChart size={16} /> }]} />,
			},
		],
	},
	{
		title: 'Find great trades',
		cards: [
			{ title: 'Screener', desc: 'Find great trading opportunities with the screener.', to: '/tools/screener', art: <ScreenerArt /> },
			{ title: 'Technical signals', desc: 'A simple place to see candlestick patterns and moving average crossovers.', to: '/tools/technical-signals', art: <SignalsArt /> },
		],
	},
	{
		title: 'Others',
		cards: [
			{ title: 'IV chart', desc: 'Implied Volatility charts of Indices and Stocks.', to: '/tools/iv-chart', art: <IvArt /> },
			{ title: 'Events calendar', desc: 'Find big trading opportunities with stock results calendar.', to: '/tools/economic-calendar', art: <CalendarArt /> },
		],
	},
];

export function AdvancedTools() {
	return (
		<section className="tp">
			<h3>Advanced tools</h3>
			{SECTIONS.map((section) => (
				<div key={section.title} className="tp-section">
					<h4>{section.title}</h4>
					<div className="tp-grid">
						{section.cards.map((card) => (
							<Link key={card.title} to={card.to} className="tp-card">
								<span className="tp-art" aria-hidden="true">{card.art}</span>
								<span className="tp-text">
									<strong>{card.title}</strong>
									<small>{card.desc}</small>
								</span>
							</Link>
						))}
					</div>
				</div>
			))}
		</section>
	);
}
