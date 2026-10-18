import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Tool } from '@/data/tools';

const strikes = [24400, 24500, 24600, 24700, 24800, 24900, 25000];

export function ToolView({ tool }: { tool: Tool }) {
	const [spot, setSpot] = useState(24626);
	const [lots, setLots] = useState(1);
	const [buy, setBuy] = useState(24600);
	const [sell, setSell] = useState(24800);
	const [traded, setTraded] = useState(false);
	const [followed, setFollowed] = useState<string | null>(null);

	const width = sell - buy;
	const debit = Math.max(40, Math.round(width * 0.32));
	const maxProfit = (width - debit) * lots * 50;
	const maxLoss = debit * lots * 50;

	const chain = useMemo(
		() =>
			strikes.map((strike) => {
				const call = Math.max(2, Math.round((spot - strike) * 0.55 + 180 - (strike - 24400) * 0.04));
				const put = Math.max(2, Math.round((strike - spot) * 0.55 + 160));
				return { strike, call, put, callOi: 40 + ((strike / 100) % 9) * 12, putOi: 30 + ((strike / 100) % 7) * 15 };
			}),
		[spot],
	);

	return (
		<section className="page-section">
			<div className="page-wrap wide">
				<p className="crumb">
					<Link to="/tools">Tools</Link> / {tool.group}
				</p>
				<span className="section-label">{tool.group.toUpperCase()}</span>
				<h1>{tool.name}</h1>
				<p className="lead">{tool.blurb}</p>

				{tool.slug === 'strategy-builder' ? (
					<div className="workbench">
						<div className="work-panel">
							<div className="work-head">
								<strong>Bull Call Spread · NIFTY</strong>
								<label>
									Spot
									<input type="number" value={spot} min={20000} max={30000} onChange={(e) => setSpot(Number(e.target.value) || 0)} />
								</label>
							</div>
							<div className="leg-row">
								<span className="blue">Buy</span>
								<select value={buy} onChange={(e) => setBuy(Number(e.target.value))}>
									{strikes.map((s) => (
										<option key={s}>{s}</option>
									))}
								</select>
								<span>CE</span>
								<label>
									Lots
									<input type="number" min={1} max={50} value={lots} onChange={(e) => setLots(Math.max(1, Number(e.target.value) || 1))} />
								</label>
							</div>
							<div className="leg-row">
								<span className="red">Sell</span>
								<select value={sell} onChange={(e) => setSell(Number(e.target.value))}>
									{strikes.filter((s) => s > buy).map((s) => (
										<option key={s}>{s}</option>
									))}
								</select>
								<span>CE</span>
								<span className="muted">same lots</span>
							</div>
							<div className="metric-row">
								<div>
									<span>Max profit</span>
									<strong className="green">₹{maxProfit.toLocaleString('en-IN')}</strong>
								</div>
								<div>
									<span>Max loss</span>
									<strong className="red">₹{maxLoss.toLocaleString('en-IN')}</strong>
								</div>
								<div>
									<span>Breakeven</span>
									<strong>{(buy + debit).toLocaleString('en-IN')}</strong>
								</div>
								<div>
									<span>Net debit</span>
									<strong>{debit}</strong>
								</div>
							</div>
							<Payoff buy={buy} sell={sell} debit={debit} spot={spot} />
							<button className="primary-button" type="button" onClick={() => setTraded(true)}>
								{traded ? 'Added to draft portfolio' : 'Add to Drafts'}
							</button>
							{traded ? <p className="applied">Saved on this browser. Open Drafts from the home page story, or keep editing.</p> : null}
						</div>
					</div>
				) : null}

				{tool.slug === 'option-chain' ? (
					<div className="work-panel">
						<div className="work-head">
							<strong>NIFTY option chain</strong>
							<label>
								Spot
								<input type="number" value={spot} onChange={(e) => setSpot(Number(e.target.value) || 0)} />
							</label>
						</div>
						<table className="chain">
							<thead>
								<tr>
									<th>Call LTP</th>
									<th>Call OI</th>
									<th>Strike</th>
									<th>Put OI</th>
									<th>Put LTP</th>
								</tr>
							</thead>
							<tbody>
								{chain.map((row) => (
									<tr key={row.strike} className={row.strike === 24600 ? 'atm' : ''}>
										<td className="green">{row.call.toFixed(1)}</td>
										<td>{row.callOi.toFixed(1)}L</td>
										<td>{row.strike}</td>
										<td>{row.putOi.toFixed(1)}L</td>
										<td className="red">{row.put.toFixed(1)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}

				{tool.slug === 'open-interest' ? (
					<div className="work-panel">
						<strong>Open interest by strike</strong>
						<div className="oi-chart" aria-label="Open interest bars">
							{chain.map((row) => (
								<div key={row.strike} className="oi-col">
									<div className="oi-bars">
										<span className="call-bar" style={{ height: `${row.callOi * 2}px` }} />
										<span className="put-bar" style={{ height: `${row.putOi * 2}px` }} />
									</div>
									<em>{row.strike}</em>
								</div>
							))}
						</div>
						<p className="muted">Green bars are call OI, red bars are put OI. Taller bars are where the market has more open positions.</p>
					</div>
				) : null}

				{tool.slug === 'fii-dii' ? <FiiTable /> : null}

				{tool.slug === 'verified' ? (
					<div className="verified-list">
						{[
							{ name: 'white-velociraptor', pnl: '+5.09L', roi: '+17%', days: 72 },
							{ name: 'index-quiet', pnl: '+1.84L', roi: '+9%', days: 41 },
							{ name: 'expiry-note', pnl: '-42,300', roi: '-3%', days: 18 },
						].map((trader) => (
							<article key={trader.name}>
								<strong>{trader.name}</strong>
								<p>
									Verified P&L {trader.pnl} · ROI {trader.roi} · {trader.days} days live
								</p>
								<button type="button" className="outline-button" onClick={() => setFollowed(trader.name)}>
									{followed === trader.name ? 'Following' : 'Follow'}
								</button>
							</article>
						))}
					</div>
				) : null}
			</div>
		</section>
	);
}

function Payoff({ buy, sell, debit, spot }: { buy: number; sell: number; debit: number; spot: number }) {
	const points = [buy - 200, buy, buy + debit, sell, sell + 200];
	const pnl = (price: number) => {
		const long = Math.max(0, price - buy);
		const short = Math.max(0, price - sell);
		return long - short - debit;
	};
	const values = points.map(pnl);
	const min = Math.min(...values, -debit);
	const max = Math.max(...values, 10);
	const x = (index: number) => 20 + index * 70;
	const y = (value: number) => 110 - ((value - min) / (max - min)) * 90;
	const d = points.map((price, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(pnl(price))}`).join(' ');
	const spotX = 20 + ((spot - points[0]) / (points[4] - points[0])) * 280;
	return (
		<svg className="payoff" viewBox="0 0 320 140" role="img" aria-label="Payoff chart">
			<line x1="16" y1={y(0)} x2="304" y2={y(0)} stroke="#2c333b" />
			<path d={d} fill="none" stroke="#68a5ea" strokeWidth="2" />
			<line x1={spotX} y1="12" x2={spotX} y2="128" stroke="#4cbb83" strokeDasharray="3 3" />
		</svg>
	);
}

function FiiTable() {
	const rows = [
		{ date: 'Fri, 16 Oct', fii: -2140, dii: 1860 },
		{ date: 'Thu, 15 Oct', fii: 640, dii: -220 },
		{ date: 'Wed, 14 Oct', fii: -980, dii: 1410 },
		{ date: 'Tue, 13 Oct', fii: 320, dii: 540 },
		{ date: 'Mon, 12 Oct', fii: -1560, dii: 990 },
	];
	return (
		<div className="work-panel">
			<strong>Cash market · ₹ crore</strong>
			<table className="chain">
				<thead>
					<tr>
						<th>Date</th>
						<th>FII net</th>
						<th>DII net</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.date}>
							<td>{row.date}</td>
							<td className={row.fii < 0 ? 'red' : 'green'}>{row.fii.toLocaleString('en-IN')}</td>
							<td className={row.dii < 0 ? 'red' : 'green'}>{row.dii.toLocaleString('en-IN')}</td>
						</tr>
					))}
				</tbody>
			</table>
			<p className="muted">Figures are a representative desk view for this recreation, not a live exchange feed.</p>
		</div>
	);
}
