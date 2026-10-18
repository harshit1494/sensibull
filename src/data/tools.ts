export type Tool = {
	slug: string;
	name: string;
	blurb: string;
	group: string;
};

export const tools: Tool[] = [
	{ slug: 'strategy-builder', name: 'Strategy Builder', group: 'Trade', blurb: 'Build multi-leg option strategies, see the payoff, Greeks and margin before you send the order.' },
	{ slug: 'option-chain', name: 'Option Chain', group: 'Analyse', blurb: 'Live calls and puts with OI, IV, greeks and a built-in strategy ticket.' },
	{ slug: 'open-interest', name: 'Open Interest', group: 'Analyse', blurb: 'Strike-wise open interest, change in OI and where the market is positioning.' },
	{ slug: 'fii-dii', name: 'FII DII Data', group: 'Analyse', blurb: 'Daily FII and DII cash and derivatives activity, the way desks actually read it.' },
	{ slug: 'live-options-charts', name: 'Live Options Charts', group: 'Analyse', blurb: 'Live OI, IV, PCR, IVP, max pain and ATM straddle charts on one synced timeline.' },
	{ slug: 'multi-straddle-strangle', name: 'Multi Straddle-Strangle Charts', group: 'Analyse', blurb: 'Compare intraday premium, VWAP and OI of several straddles and strangles together.' },
	{ slug: 'stock-data', name: 'Stock Data', group: 'Analyse', blurb: 'Everything about one underlying at a glance — OI, technical signals and a mini option chain.' },
	{ slug: 'screener', name: 'Options Screener', group: 'Analyse', blurb: 'Screen F&O stocks by IV, IVP, PCR, OI action and futures change.' },
	{ slug: 'technical-signals', name: 'Technical Signals', group: 'Analyse', blurb: 'Candlestick patterns and moving-average crossovers across F&O stocks.' },
	{ slug: 'market-analysis', name: 'Market Analysis', group: 'Analyse', blurb: 'Daily NIFTY and BANKNIFTY outlook with chart, OI, PCR and FII notes.' },
	{ slug: 'strategy-wizard', name: 'Strategy Wizard', group: 'Trade', blurb: 'Give a target and a date, and get the option trades that fit it best.' },
	{ slug: 'expiry-trades', name: 'Expiry Trades', group: 'Trade', blurb: 'Predict where the index closes on expiry and get a matching trade.' },
	{ slug: 'easy-options', name: 'Easy Options', group: 'Trade', blurb: 'Just guess up, down or flat, and get a simple trade with small, known risk.' },
	{ slug: 'mindful-trading', name: 'Mindful Trading', group: 'Trade', blurb: 'Daily limits and a short pause before impulsive trades.' },
	{ slug: 'learn-options-strategies', name: 'Learn Options Strategies', group: 'Learn', blurb: 'Every common options strategy explained with a payoff chart and example.' },
	{ slug: 'learn-options-trading', name: 'Learn Options Trading', group: 'Learn', blurb: 'Free video course on options trading, from calls and puts to volatility.' },
	{ slug: 'iv-chart', name: 'IV Chart', group: 'Analyse', blurb: 'ATM implied volatility plotted against the price, day by day.' },
	{ slug: 'economic-calendar', name: 'Stock Market Calendar', group: 'Analyse', blurb: 'Economic events, results dates and market holidays in one place.' },
	{ slug: 'verified', name: 'Verified by Sensibull', group: 'Community', blurb: 'Follow traders who share live, broker-verified P&L. No screenshots, no stories.' },
];

export function getTool(slug: string) {
	return tools.find((tool) => tool.slug === slug);
}
