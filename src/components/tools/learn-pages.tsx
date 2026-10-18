import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ChevronDown, ChevronUp, ExternalLink, Play, Search, X } from 'lucide-react';
import '@/components/tools/trade-pages.css';
import { LoginBanner, TerminalPage } from '@/components/tools/terminal-chrome';
import { PayoffIcon } from '@/components/tools/strategy-builder';
import { EXPIRIES, INSTRUMENTS, PRESETS, buildPreset, payoffAt, summarise, type PresetGroup, type PresetId } from '@/lib/strategy-math';

/* ------------------------------------------------------------------ */
/* Strategy content                                                    */
/* ------------------------------------------------------------------ */
type Info = {
	slug: string; view: string; trade: string; breakeven: string; maxProfit: string; maxLoss: string; premium: 'Pay' | 'Get' | 'Pay or Get';
	margin: string; time: string; timeShort: string; vol: string; volShort: string; pros: string[]; cons: string[];
};

const LIMITED = 'Limited';
const INFO: Record<PresetId, Info> = {
	'buy-call': { slug: 'long-call-option', view: 'Bullish. Use it when you expect a sharp rise in the stock or index before expiry.', trade: 'Buy one call option, usually at or a little above the current price.', breakeven: 'Strike Price + Premium Paid', maxProfit: 'Unlimited', maxLoss: 'The premium you paid for the option — nothing more.', premium: 'Pay', margin: 'Not required', time: 'The option loses a little value every day, so you need the move to come quickly.', timeShort: 'Loses value with time', vol: 'A rise in implied volatility makes the option more expensive, which helps you.', volShort: 'Benefits from increased volatility', pros: ['Large upside if the move is big.', 'Risk is capped at the premium paid.'], cons: ['You lose the whole premium if the price stays below the strike at expiry.', 'Time decay works against you every day the price does not rise.'] },
	'sell-put': { slug: 'short-put-option', view: 'Bullish to neutral. Use it when you think the price will not fall below a level.', trade: 'Sell one put option at or below the current price.', breakeven: 'Strike Price − Premium Received', maxProfit: 'The premium received.', maxLoss: 'Large — it grows the further the price falls below the strike.', premium: 'Get', margin: 'Required', time: 'Time is your friend: the option you sold loses value every day.', timeShort: 'Gains value with time', vol: 'Falling volatility makes the put cheaper, which helps you.', volShort: 'Benefits from decreased volatility', pros: ['High chance of keeping a small profit.', 'Makes money even if the price just stays flat.'], cons: ['A sharp fall can cause a big loss.', 'Needs margin.'] },
	'bull-call': { slug: 'bull-call-spread', view: 'Moderately bullish. You expect a rise, but not a huge one.', trade: 'Buy a call near the current price and sell a higher-strike call on the same expiry.', breakeven: 'Lower Strike + Net Premium Paid', maxProfit: 'Difference between strikes − Net Premium Paid', maxLoss: 'The net premium paid.', premium: 'Pay', margin: 'Small', time: 'Mild effect; hurts a little early on, helps once the price is above the sold strike.', timeShort: 'Mixed', vol: 'Mild effect because one option offsets the other.', volShort: 'Little effect', pros: ['Cheaper than buying a call alone.', 'Both profit and loss are capped and known upfront.'], cons: ['Profit is capped at the higher strike.', 'Still loses the premium if the price does not rise.'] },
	'bull-put': { slug: 'bull-put-spread', view: 'Moderately bullish. You think the price will stay above a level.', trade: 'Sell a put near the current price and buy a lower-strike put as protection.', breakeven: 'Higher Strike − Net Premium Received', maxProfit: 'The net premium received.', maxLoss: 'Difference between strikes − Net Premium Received', premium: 'Get', margin: 'Required (reduced by the hedge)', time: 'Time helps — the spread loses value as expiry nears.', timeShort: 'Gains value with time', vol: 'Falling volatility helps.', volShort: 'Benefits from decreased volatility', pros: ['Profits if the price rises, stays flat or falls a little.', 'Loss is capped by the bought put.'], cons: ['Profit is limited to the premium.', 'Needs margin.'] },
	'call-ratio': { slug: 'call-ratio-back-spread', view: 'Very bullish. You expect a big up move, and want little or no loss if the price falls.', trade: 'Sell one call near the money and buy two higher-strike calls.', breakeven: 'Two breakevens — one on each side of the bought strike', maxProfit: 'Unlimited on the upside', maxLoss: 'Limited — worst when the price expires at the bought strike.', premium: 'Pay or Get', margin: 'Required', time: 'Time hurts while the price is stuck between strikes.', timeShort: 'Loses value with time', vol: 'Rising volatility helps.', volShort: 'Benefits from increased volatility', pros: ['Unlimited upside.', 'Can be set up for a small credit, so a fall costs little.'], cons: ['Worst loss if the price drifts slowly to the bought strike.', 'Needs margin.'] },
	'calendar-call': { slug: 'long-calendar-with-calls', view: 'Neutral now, bullish later. You expect the price to stay near the strike for the near expiry.', trade: 'Sell a near-expiry call and buy a far-expiry call at the same strike.', breakeven: 'Depends on volatility — roughly either side of the strike', maxProfit: LIMITED, maxLoss: 'The net premium paid.', premium: 'Pay', margin: 'Small', time: 'Helps — the near option decays faster than the far one.', timeShort: 'Gains value with time', vol: 'Rising volatility helps the bought far option.', volShort: 'Benefits from increased volatility', pros: ['Benefits from fast decay of the near option.', 'Risk is limited to the premium paid.'], cons: ['Loses if the price moves far in either direction.', 'Payoff is harder to read.'] },
	'bull-condor': { slug: 'bull-condor', view: 'Moderately bullish. You expect the price to end within a band above today’s price.', trade: 'Four calls: buy one, sell two higher strikes, buy one even higher strike.', breakeven: 'Two breakevens around the sold strikes', maxProfit: LIMITED, maxLoss: 'The net premium paid.', premium: 'Pay', margin: 'Small', time: 'Helps once the price is inside the profit band.', timeShort: 'Mixed', vol: 'Falling volatility helps.', volShort: 'Benefits from decreased volatility', pros: ['Low cost.', 'Wide profit zone.'], cons: ['Profit is limited.', 'Four legs mean more brokerage.'] },
	'bull-fly': { slug: 'bull-butterfly', view: 'Moderately bullish with a specific target in mind.', trade: 'Buy one lower call, sell two middle calls, buy one higher call.', breakeven: 'Two breakevens around the middle strike', maxProfit: 'Middle strike − lower strike − net premium paid', maxLoss: 'The net premium paid.', premium: 'Pay', margin: 'Small', time: 'Helps when the price is near the middle strike.', timeShort: 'Mixed', vol: 'Falling volatility helps.', volShort: 'Benefits from decreased volatility', pros: ['Very cheap for the payoff.', 'Great reward-to-risk if your target is right.'], cons: ['Narrow profit zone.', 'Needs a precise forecast.'] },
	'range-forward': { slug: 'range-forward', view: 'Bullish. You want call-like upside paid for by selling a put.', trade: 'Buy an out-of-the-money call and sell an out-of-the-money put.', breakeven: 'Close to the strikes, depending on net premium', maxProfit: 'Unlimited', maxLoss: 'Large if the price falls below the sold put.', premium: 'Pay or Get', margin: 'Required', time: 'Little effect when the two premiums are similar.', timeShort: 'Little effect', vol: 'Little effect.', volShort: 'Little effect', pros: ['Low or zero cost upside.', 'No loss in the band between strikes.'], cons: ['A sharp fall causes big losses.', 'Needs margin.'] },
	synthetic: { slug: 'long-synthetic-future', view: 'Bullish. Behaves almost exactly like buying a future.', trade: 'Buy an at-the-money call and sell an at-the-money put on the same strike.', breakeven: 'Strike ± net premium', maxProfit: 'Unlimited', maxLoss: 'Large — like a long future.', premium: 'Pay or Get', margin: 'Required', time: 'Almost no effect.', timeShort: 'Little effect', vol: 'Almost no effect.', volShort: 'Little effect', pros: ['Full participation in an up move.', 'Sometimes cheaper than the future.'], cons: ['Full participation in a down move too.', 'Needs margin.'] },
	'buy-put': { slug: 'long-put-option', view: 'Bearish. Use it when you expect a sharp fall before expiry.', trade: 'Buy one put option, at or a little below the current price.', breakeven: 'Strike Price − Premium Paid', maxProfit: 'Large — grows as the price falls towards zero.', maxLoss: 'The premium you paid.', premium: 'Pay', margin: 'Not required', time: 'Loses value every day; you need a quick fall.', timeShort: 'Loses value with time', vol: 'Rising volatility helps.', volShort: 'Benefits from increased volatility', pros: ['Big payoff on a sharp fall.', 'Risk capped at the premium.'], cons: ['Loses the whole premium if the price stays above the strike.', 'Time decay works against you.'] },
	'sell-call': { slug: 'short-call-option', view: 'Bearish to neutral. You think the price will not rise above a level.', trade: 'Sell one call option at or above the current price.', breakeven: 'Strike Price + Premium Received', maxProfit: 'The premium received.', maxLoss: 'Unlimited if the price keeps rising.', premium: 'Get', margin: 'Required', time: 'Time helps you.', timeShort: 'Gains value with time', vol: 'Falling volatility helps.', volShort: 'Benefits from decreased volatility', pros: ['High chance of a small profit.', 'Profits even if the price stays flat.'], cons: ['Unlimited loss on a sharp rally.', 'Needs margin.'] },
	'bear-put': { slug: 'bear-put-spread', view: 'Moderately bearish. You expect a fall, but not a crash.', trade: 'Buy a put near the current price and sell a lower-strike put.', breakeven: 'Higher Strike − Net Premium Paid', maxProfit: 'Difference between strikes − Net Premium Paid', maxLoss: 'The net premium paid.', premium: 'Pay', margin: 'Small', time: 'Mild effect.', timeShort: 'Mixed', vol: 'Mild effect.', volShort: 'Little effect', pros: ['Cheaper than buying a put alone.', 'Known maximum loss.'], cons: ['Profit capped at the lower strike.', 'Loses the premium if the price does not fall.'] },
	'bear-call': { slug: 'bear-call-spread', view: 'Moderately bearish. You think the price will stay below a level.', trade: 'Sell a call near the current price and buy a higher-strike call as protection.', breakeven: 'Lower Strike + Net Premium Received', maxProfit: 'The net premium received.', maxLoss: 'Difference between strikes − Net Premium Received', premium: 'Get', margin: 'Required (reduced by the hedge)', time: 'Time helps.', timeShort: 'Gains value with time', vol: 'Falling volatility helps.', volShort: 'Benefits from decreased volatility', pros: ['Profits if the price falls, stays flat or rises a little.', 'Loss is capped.'], cons: ['Profit limited to the premium.', 'Needs margin.'] },
	'put-ratio': { slug: 'put-ratio-back-spread', view: 'Very bearish. You expect a big fall and want little loss if the price rises.', trade: 'Sell one put near the money and buy two lower-strike puts.', breakeven: 'Two breakevens', maxProfit: 'Large on a crash', maxLoss: 'Limited — worst at the bought strike.', premium: 'Pay or Get', margin: 'Required', time: 'Hurts while the price is stuck between strikes.', timeShort: 'Loses value with time', vol: 'Rising volatility helps.', volShort: 'Benefits from increased volatility', pros: ['Big payoff on a crash.', 'Small or no loss on a rally.'], cons: ['Worst loss on a slow drift to the bought strike.', 'Needs margin.'] },
	'calendar-put': { slug: 'long-calendar-with-puts', view: 'Neutral now, bearish later.', trade: 'Sell a near-expiry put and buy a far-expiry put at the same strike.', breakeven: 'Depends on volatility', maxProfit: LIMITED, maxLoss: 'The net premium paid.', premium: 'Pay', margin: 'Small', time: 'Helps.', timeShort: 'Gains value with time', vol: 'Rising volatility helps.', volShort: 'Benefits from increased volatility', pros: ['Gains from faster decay of the near option.', 'Limited risk.'], cons: ['Loses on a large move either way.', 'Payoff is harder to read.'] },
	'bear-condor': { slug: 'bear-condor', view: 'Moderately bearish. You expect the price to end within a band below today’s price.', trade: 'Four puts: buy one, sell two lower strikes, buy one even lower strike.', breakeven: 'Two breakevens', maxProfit: LIMITED, maxLoss: 'The net premium paid.', premium: 'Pay', margin: 'Small', time: 'Helps inside the profit band.', timeShort: 'Mixed', vol: 'Falling volatility helps.', volShort: 'Benefits from decreased volatility', pros: ['Low cost.', 'Wide profit zone.'], cons: ['Limited profit.', 'Four legs.'] },
	'bear-fly': { slug: 'bear-butterfly', view: 'Moderately bearish with a specific target.', trade: 'Buy one higher put, sell two middle puts, buy one lower put.', breakeven: 'Two breakevens', maxProfit: 'Higher strike − middle strike − net premium paid', maxLoss: 'The net premium paid.', premium: 'Pay', margin: 'Small', time: 'Helps near the middle strike.', timeShort: 'Mixed', vol: 'Falling volatility helps.', volShort: 'Benefits from decreased volatility', pros: ['Cheap.', 'Great reward-to-risk on target.'], cons: ['Narrow profit zone.', 'Needs a precise forecast.'] },
	'short-straddle': { slug: 'short-straddle', view: 'Neutral. You expect the price to barely move until expiry.', trade: 'Sell an at-the-money call and an at-the-money put.', breakeven: 'Strike ± Total Premium Received', maxProfit: 'Total premium received.', maxLoss: 'Unlimited on a big move either way.', premium: 'Get', margin: 'Required (high)', time: 'Time is a big help.', timeShort: 'Gains value with time', vol: 'Falling volatility is a big help.', volShort: 'Benefits from decreased volatility', pros: ['Collects the most premium of any neutral trade.', 'Profits from time decay every day.'], cons: ['Unlimited risk on both sides.', 'High margin.'] },
	'short-strangle': { slug: 'short-strangle', view: 'Neutral. You expect the price to stay within a range.', trade: 'Sell an out-of-the-money call and an out-of-the-money put.', breakeven: 'Call Strike + Premium, Put Strike − Premium', maxProfit: 'Total premium received.', maxLoss: 'Unlimited on a big move.', premium: 'Get', margin: 'Required', time: 'Time helps.', timeShort: 'Gains value with time', vol: 'Falling volatility helps.', volShort: 'Benefits from decreased volatility', pros: ['Wide profit range.', 'High probability of profit.'], cons: ['Unlimited risk.', 'Needs margin.'] },
	'iron-fly': { slug: 'iron-butterfly', view: 'Neutral with limited risk.', trade: 'Short straddle at the money, plus a bought call and put further out as protection.', breakeven: 'Middle Strike ± Net Premium', maxProfit: 'Net premium received.', maxLoss: 'Wing width − Net Premium', premium: 'Get', margin: 'Required (reduced by the hedge)', time: 'Time helps.', timeShort: 'Gains value with time', vol: 'Falling volatility helps.', volShort: 'Benefits from decreased volatility', pros: ['Defined risk.', 'Good premium for a hedged trade.'], cons: ['Narrow profit zone.', 'Four legs.'] },
	'iron-condor': { slug: 'iron-condor', view: 'Neutral. You expect the price to stay within a wide range, with defined risk.', trade: 'Short strangle plus a further out-of-the-money call and put bought as protection.', breakeven: 'Short Call + Premium, Short Put − Premium', maxProfit: 'Net premium received.', maxLoss: 'Wing width − Net Premium', premium: 'Get', margin: 'Required (reduced by the hedge)', time: 'Time helps.', timeShort: 'Gains value with time', vol: 'Falling volatility helps.', volShort: 'Benefits from decreased volatility', pros: ['Defined risk on both sides.', 'Wide profit zone.'], cons: ['Limited profit.', 'Four legs.'] },
	'long-straddle': { slug: 'long-straddle', view: 'Big move expected, direction unknown — e.g. before results.', trade: 'Buy an at-the-money call and an at-the-money put.', breakeven: 'Strike ± Total Premium Paid', maxProfit: 'Unlimited', maxLoss: 'Total premium paid.', premium: 'Pay', margin: 'Not required', time: 'Time hurts a lot.', timeShort: 'Loses value with time', vol: 'Rising volatility helps a lot.', volShort: 'Benefits from increased volatility', pros: ['Profits from a big move either way.', 'Risk capped at the premium.'], cons: ['Expensive.', 'Loses if the price stays put.'] },
	'long-strangle': { slug: 'long-strangle', view: 'Very big move expected, direction unknown.', trade: 'Buy an out-of-the-money call and an out-of-the-money put.', breakeven: 'Call Strike + Premium, Put Strike − Premium', maxProfit: 'Unlimited', maxLoss: 'Total premium paid.', premium: 'Pay', margin: 'Not required', time: 'Time hurts.', timeShort: 'Loses value with time', vol: 'Rising volatility helps.', volShort: 'Benefits from increased volatility', pros: ['Cheaper than a straddle.', 'Unlimited upside on a big move.'], cons: ['Needs a bigger move than a straddle.', 'Time decay hurts.'] },
};
const BY_SLUG = Object.fromEntries((Object.keys(INFO) as PresetId[]).map((id) => [INFO[id].slug, id])) as Record<string, PresetId>;
const GROUPS: PresetGroup[] = ['Bullish', 'Bearish', 'Neutral', 'Others'];

function LearnPayoff({ id }: { id: PresetId }) {
	const inst = INSTRUMENTS[0];
	const legs = useMemo(() => buildPreset(id, inst.spot, inst.step, EXPIRIES[0]), [id, inst]);
	const s = useMemo(() => summarise(legs, inst.spot, inst.step, inst.lot, 1), [legs, inst]);
	const W = 420, H = 230, L = 34, R = 10, T = 14, B = 26;
	const strikes = legs.map((l) => l.strike);
	const mid = (Math.min(...strikes) + Math.max(...strikes)) / 2;
	const span = Math.max(inst.step * 10, (Math.max(...strikes) - Math.min(...strikes)) * 1.6);
	const xs = Array.from({ length: 121 }, (_, i) => mid - span + (2 * span * i) / 120);
	const ys = xs.map((p) => payoffAt(legs, p, inst.lot, 1));
	// Profit and loss halves are scaled separately so a small capped loss is still readable.
	const maxP = Math.max(1, ...ys) * 1.1, maxL = Math.max(1, ...ys.map((v) => -v)) * 1.1;
	const x = (p: number) => L + ((p - xs[0]) / (xs[120] - xs[0])) * (W - L - R);
	const half = (H - T - B) / 2;
	const y = (v: number) => T + half - (v >= 0 ? (v / maxP) * half : (v / maxL) * half * 0.8);
	const line = xs.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(ys[i]).toFixed(1)}`).join('');
	const area = `${line}L${x(xs[120])},${y(0)}L${x(xs[0])},${y(0)}Z`;
	const legend = { maxProfit: INFO[id].maxProfit.length < 22 ? INFO[id].maxProfit : s.maxProfit === null ? 'Unlimited' : 'Limited', maxLoss: INFO[id].maxLoss.length < 22 ? INFO[id].maxLoss : s.maxLoss === null ? 'Unlimited' : INFO[id].premium === 'Pay' ? 'Premium Paid' : 'Limited' };
	return (
		<div className="ls-payoff">
			<svg viewBox={`0 0 ${W} ${H}`}>
				<defs>
					<clipPath id="ls-up"><rect x="0" y="0" width={W} height={y(0)} /></clipPath>
					<clipPath id="ls-dn"><rect x="0" y={y(0)} width={W} height={H} /></clipPath>
				</defs>
				<line x1={L} x2={L} y1={T} y2={H - B} className="ls-axis" />
				<line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="ls-axis" />
				<path d={area} className="ls-fill-up" clipPath="url(#ls-up)" />
				<path d={area} className="ls-fill-dn" clipPath="url(#ls-dn)" />
				<path d={line} className="ls-line-up" clipPath="url(#ls-up)" />
				<path d={line} className="ls-line-dn" clipPath="url(#ls-dn)" />
				{strikes.filter((v, i, a) => a.indexOf(v) === i).map((k) => <g key={k}><line x1={x(k)} x2={x(k)} y1={y(0) - 4} y2={y(0) + 4} className="ls-axis" /><text x={x(k)} y={y(0) + 16} textAnchor="middle" className="ls-ax">{k}</text></g>)}
				{s.breakevens.map((b) => <circle key={b} cx={x(b)} cy={y(0)} r={3.5} className="ls-be" />)}
				<text transform={`translate(14 ${T + (H - T - B) * 0.25}) rotate(-90)`} textAnchor="middle" className="ls-ax up">Profit</text>
				<text transform={`translate(14 ${T + (H - T - B) * 0.75}) rotate(-90)`} textAnchor="middle" className="ls-ax down">Loss</text>
				<text x={W - R} y={H - 6} textAnchor="end" className="ls-ax">Stock Price →</text>
			</svg>
			<div className="ls-leg">
				<span className="up">Max Profit = {legend.maxProfit.replace(/\.$/, '')}</span>
				<span className="down">Max Loss = {legend.maxLoss.replace(/\.$/, '')}</span>
				{s.breakevens.length ? <span><i className="ls-be-dot" />Breakeven {s.breakevens.map((b) => Math.round(b)).join(', ')}</span> : null}
			</div>
		</div>
	);
}

export function LearnStrategies() {
	const [params, setParams] = useSearchParams();
	const navigate = useNavigate();
	const id = BY_SLUG[params.get('strategy') ?? ''] ?? 'buy-call';
	const preset = PRESETS.find((p) => p.id === id)!;
	const info = INFO[id];
	const [openGroups, setOpenGroups] = useState<PresetGroup[]>([preset.group]);
	const inst = INSTRUMENTS[0];
	const legs = useMemo(() => buildPreset(id, inst.spot, inst.step, EXPIRIES[0]), [id, inst]);
	const go = (pid: PresetId) => {
		setParams({ strategy: INFO[pid].slug });
		const g = PRESETS.find((p) => p.id === pid)!.group;
		if (!openGroups.includes(g)) setOpenGroups([...openGroups, g]);
		window.scrollTo({ top: 0 });
	};
	const toggle = (g: PresetGroup) => setOpenGroups(openGroups.includes(g) ? openGroups.filter((x) => x !== g) : [...openGroups, g]);
	const more = PRESETS.filter((p) => p.group === preset.group && p.id !== id);
	const groupTag = preset.group === 'Others' ? 'Volatile' : preset.group;

	return (
		<TerminalPage title="Learn Options Strategies" active="trade" className="tp-page">
			<div className="tp-shell">
				<LoginBanner />
				<div className="ls-grid">
					<aside className="ls-side">
						<p className="ls-side-title">All Strategies</p>
						{GROUPS.map((g) => (
							<div key={g} className="ls-group">
								<button type="button" className="ls-group-btn" onClick={() => toggle(g)}>{g}{openGroups.includes(g) ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>
								{openGroups.includes(g) ? PRESETS.filter((p) => p.group === g).map((p) => (
									<button key={p.id} type="button" className={`ls-item ${p.id === id ? 'on' : ''}`} onClick={() => go(p.id)}>
										<span className="ls-icon"><PayoffIcon id={p.id} /></span>{p.name}
									</button>
								)) : null}
							</div>
						))}
					</aside>

					<main className="ls-main">
						<div className="ls-top">
							<div className="ls-top-left">
								<h2>{preset.name} <span className="ls-icon sm"><PayoffIcon id={id} /></span></h2>
								<span className={`ls-tag ${preset.group.toLowerCase()}`}>{groupTag}</span>
								<p className="ls-ex-title">Example:</p>
								<table className="ls-ex">
									<thead><tr><th>Instrument</th><th className="r">Qty</th><th className="r">Price</th></tr></thead>
									<tbody>
										{legs.map((l) => (
											<tr key={l.id}>
												<td><span className={`ls-side-tag ${l.side === 'B' ? 'b' : 's'}`}>{l.side === 'B' ? 'BUY' : 'SELL'}</span> {inst.symbol} {l.expiry.replace(/^(\d+)/, (d) => `${Number(d)}${['th', 'st', 'nd', 'rd'][Number(d) % 10 > 3 || Math.floor(Number(d) / 10) === 1 ? 0 : Number(d) % 10]}`)} {l.strike} {l.right}</td>
												<td className="r">{l.lots * inst.lot}</td>
												<td className="r">{l.price.toFixed(1)}</td>
											</tr>
										))}
									</tbody>
								</table>
								<div className="ls-ex-btns">
									<button type="button" className="sb-btn-primary" onClick={() => navigate(`/tools/strategy-builder?instrument_symbol=NIFTY&preset=${id}`)}>See Example</button>
									<a className="ls-outline" href={`/tools/strategy-builder?instrument_symbol=NIFTY&preset=${id}`} target="_blank" rel="noreferrer">Open in Builder <ExternalLink size={13} /></a>
								</div>
							</div>
							<LearnPayoff id={id} />
						</div>

						<div className="ls-body">
							<div className="ls-text">
								<h3>Market View</h3><p>{info.view}</p>
								<h3>The Trade</h3><p>{info.trade}</p>
								<h3>Breakeven</h3><p>{info.breakeven}</p>
								<h3>Max Profit</h3><p>{info.maxProfit}</p>
								<h3>Max Loss</h3><p>{info.maxLoss}</p>
								<h3>Premium</h3><p>{info.premium}</p>
								<h3>Margin</h3><p>{info.margin}</p>
								<h3>Effect of Time</h3><p>{info.time}</p>
								<h3>Effect of Volatility</h3><p>{info.vol}</p>
								<h3>Pros</h3><ul>{info.pros.map((p) => <li key={p}>{p}</li>)}</ul>
								<h3>Cons</h3><ul>{info.cons.map((p) => <li key={p}>{p}</li>)}</ul>
							</div>
							<aside className="ls-summary">
								<p className="ls-sum-title">Strategy Summary</p>
								{([['Market View', groupTag], ['Premium', info.premium], ['Max Profit', info.maxProfit.length < 26 ? info.maxProfit : LIMITED], ['Max Loss', info.maxLoss.length < 26 ? info.maxLoss : info.premium === 'Pay' ? 'Premium Paid' : LIMITED], ['Margin', info.margin], ['Effect of Time', info.timeShort], ['Effect of Volatility', info.volShort]] as const).map(([k, v]) => (
									<dl key={k}><dt>{k}</dt><dd>{v}</dd></dl>
								))}
							</aside>
						</div>

						<div className="ls-more">
							<p>More {preset.group} Strategies:</p>
							<div className="ls-more-grid">
								{more.map((p) => <button key={p.id} type="button" onClick={() => go(p.id)}><span className="ls-icon"><PayoffIcon id={p.id} /></span>{p.name}</button>)}
							</div>
						</div>
					</main>
				</div>
			</div>
		</TerminalPage>
	);
}

/* ------------------------------------------------------------------ */
/* Learn Options Trading (video course)                                */
/* ------------------------------------------------------------------ */
type Video = { ep: number; title: string; dur: string; thumb: string; accent: string; summary: string; points: string[] };
const VIDEOS: Video[] = [
	{ ep: 1, title: 'What is a Call Option? Buying, Selling and Profit Explained', dur: '15:30', thumb: 'Call Options 101', accent: '#ffd43b', summary: 'The right, but not the obligation, to buy at a fixed price — explained with a simple property example.', points: ['Strike price, premium and expiry', 'Why a buyer’s loss is capped', 'How a call seller earns the premium'] },
	{ ep: 2, title: 'What is a Put Option? Protection and Profit from a Fall', dur: '15:43', thumb: 'PUT OPTIONS', accent: '#ff6b6b', summary: 'Puts as insurance: how they gain when prices fall, and who takes the other side.', points: ['Buying a put vs selling a put', 'Using puts to protect a portfolio', 'Payoff at expiry'] },
	{ ep: 3, title: 'How Index Options Settle in Cash', dur: '15:38', thumb: 'Cash Settlement', accent: '#69db7c', summary: 'Index options never deliver shares. See exactly how the final profit or loss is worked out.', points: ['Settlement price', 'Worked example for a call and a put', 'What happens to out-of-the-money options'] },
	{ ep: 4, title: 'Option Buying vs Option Selling: Risk, Reward and Return', dur: '16:51', thumb: 'Buy or Sell?', accent: '#74c0fc', summary: 'Why most option buyers lose small amounts often, and sellers win small amounts often — and the hidden tail risk.', points: ['Probability vs payoff', 'Return on capital and margin', 'Choosing a side for your temperament'] },
	{ ep: 5, title: 'What Moves an Option’s Price? Spot and Strike', dur: '10:11', thumb: 'Spot → Premium', accent: '#4dabf7', summary: 'How the distance between the stock price and the strike drives the premium.', points: ['Moneyness: ITM, ATM, OTM', 'Delta in plain words', 'Why far OTM options are cheap'] },
	{ ep: 6, title: 'Buy a Put or Sell a Call? Picking the Right Strike', dur: '18:00', thumb: 'Pick a Strike', accent: '#f783ac', summary: 'Two ways to be bearish, compared side by side, plus a simple rule for choosing strikes.', points: ['Same view, different risk', 'Strike selection by target', 'When to prefer spreads'] },
	{ ep: 7, title: 'Time Decay: How Time Eats Option Value', dur: '17:17', thumb: 'Time Value', accent: '#ffa94d', summary: 'Every option loses value as expiry approaches. See how fast, and why it speeds up near the end.', points: ['Theta explained', 'Decay curve near expiry', 'Using decay as a seller'] },
	{ ep: 8, title: 'Intrinsic Value vs Time Value — ITM, ATM and OTM', dur: '16:12', thumb: 'Intrinsic + Time', accent: '#ffe066', summary: 'Split any premium into the part that is “real” today and the part that is hope.', points: ['Calculating intrinsic value', 'Where time value is highest', 'Reading the option chain with this lens'] },
	{ ep: 9, title: 'Implied Volatility: The Market’s Fear Gauge', dur: '14:48', thumb: 'Implied Volatility', accent: '#e599f7', summary: 'IV is the price of uncertainty. Learn why premiums jump before events and collapse after.', points: ['IV vs historical volatility', 'IV crush after results', 'Using IV percentile'] },
];

function Thumb({ v }: { v: Video }) {
	return (
		<div className="lt-thumb" style={{ ['--acc' as string]: v.accent }}>
			<span className="lt-thumb-text">{v.thumb}</span>
			<svg className="lt-thumb-chart" viewBox="0 0 120 50" aria-hidden="true">
				<path d={v.ep % 2 ? 'M0 44 L30 36 L50 40 L75 18 L95 24 L120 6' : 'M0 8 L25 16 L50 12 L70 30 L95 26 L120 44'} />
			</svg>
			<span className="lt-ep">EP {v.ep}</span>
			<span className="lt-dur">{v.dur}</span>
			<span className="lt-play"><Play size={20} fill="currentColor" /></span>
		</div>
	);
}

export function LearnTrading() {
	const [q, setQ] = useState('');
	const [open, setOpen] = useState<Video | null>(null);
	const [watched, setWatched] = useState<number[]>([]);
	const list = VIDEOS.filter((v) => v.title.toLowerCase().includes(q.toLowerCase()));
	return (
		<TerminalPage title="Learn Options Trading" active="trade" className="tp-page">
			<div className="tp-shell">
				<LoginBanner />
				<label className="lt-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Videos" /></label>
				<div className="lt-section-head">
					<p>How to trade Options</p>
					<span>{watched.length}/{VIDEOS.length} watched</span>
				</div>
				<div className="lt-grid">
					{list.map((v) => (
						<button key={v.ep} type="button" className="lt-card" onClick={() => { setOpen(v); if (!watched.includes(v.ep)) setWatched([...watched, v.ep]); }}>
							<Thumb v={v} />
							<p>{v.title} | Options Trading EP {v.ep}</p>
							{watched.includes(v.ep) ? <span className="lt-watched">Watched</span> : null}
						</button>
					))}
					{list.length === 0 ? <p className="lt-none">No videos match “{q}”.</p> : null}
				</div>
				<div className="lt-next">
					<p>Next: try what you learnt</p>
					<div>
						<Link to="/tools/learn-options-strategies">Learn Options Strategies</Link>
						<Link to="/tools/strategy-builder">Strategy Builder</Link>
						<Link to="/tools/easy-options">Easy Options</Link>
					</div>
				</div>
			</div>
			{open ? (
				<div className="sb-modal">
					<button type="button" className="sb-modal-back" aria-label="Close" onClick={() => setOpen(null)} />
					<div className="sb-modal-card lt-player">
						<button type="button" className="ec-x" onClick={() => setOpen(null)} aria-label="Close"><X size={18} /></button>
						<Thumb v={open} />
						<p className="lt-player-title">{open.title}</p>
						<p className="lt-player-sum">{open.summary}</p>
						<ul>{open.points.map((p) => <li key={p}>{p}</li>)}</ul>
						<div className="lt-player-nav">
							<button type="button" className="sb-link" disabled={open.ep === 1} onClick={() => setOpen(VIDEOS[open.ep - 2])}>← Previous</button>
							<span>Episode {open.ep} of {VIDEOS.length}</span>
							<button type="button" className="sb-link" disabled={open.ep === VIDEOS.length} onClick={() => { const n = VIDEOS[open.ep]; setOpen(n); if (!watched.includes(n.ep)) setWatched([...watched, n.ep]); }}>Next →</button>
						</div>
					</div>
				</div>
			) : null}
		</TerminalPage>
	);
}
