import type { ReactElement } from 'react';
import { useParams } from 'react-router';
import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';
import { LoginModal } from '@/components/auth/login-modal';
import { StrategyBuilder } from '@/components/tools/strategy-builder';
import { ToolView } from '@/components/tools/tool-view';
import { OptionChain } from '@/components/tools/option-chain';
import { OpenInterest } from '@/components/tools/open-interest';
import { FiiDii } from '@/components/tools/fii-dii';
import { LiveOptionsCharts } from '@/components/tools/live-options-charts';
import { MultiStraddle } from '@/components/tools/multi-straddle';
import { StockData } from '@/components/tools/stock-data';
import { Screener } from '@/components/tools/screener';
import { TechnicalSignals } from '@/components/tools/technical-signals';
import { MarketAnalysis } from '@/components/tools/market-analysis';
import { EconomicCalendar, IvChart } from '@/components/tools/calendar-iv';
import { EasyOptions, ExpiryTrades, MindfulTrading, StrategyWizard } from '@/components/tools/trade-pages';
import { LearnStrategies, LearnTrading } from '@/components/tools/learn-pages';

import { getTool } from '@/data/tools';
import NotFound from '@/routes/not-found';

const TERMINAL: Record<string, { title: string; el: () => ReactElement }> = {
	'option-chain': { title: 'Live NSE Option Chain: NIFTY, BANKNIFTY, Stocks — TIGERBULL', el: () => <OptionChain /> },
	'open-interest': { title: 'Open Interest Charts of NIFTY, BANKNIFTY, NSE — TIGERBULL', el: () => <OpenInterest /> },
	'fii-dii': { title: 'Free NSE FII DII Data: Buy/Sell Activity in F&O, Cash — TIGERBULL', el: () => <FiiDii /> },
	'live-options-charts': { title: 'Live Options OI, IV, PCR, IVP & Max Pain Charts — TIGERBULL', el: () => <LiveOptionsCharts /> },
	'multi-straddle-strangle': { title: 'Live Intraday Multi Straddle-Strangle Charts — TIGERBULL', el: () => <MultiStraddle /> },
	'stock-data': { title: 'See all data for an underlying at a glance — TIGERBULL', el: () => <StockData /> },
	screener: { title: 'Options Screener using Futures and Options data — TIGERBULL', el: () => <Screener /> },
	'technical-signals': { title: 'Technical Signals: Candlestick Patterns & Moving Averages — TIGERBULL', el: () => <TechnicalSignals /> },
	'market-analysis': { title: 'NIFTY & BANKNIFTY Analysis for Tomorrow | Stock Market Outlook — TIGERBULL', el: () => <MarketAnalysis /> },
	'economic-calendar': { title: 'Economic Calendar — TIGERBULL', el: () => <EconomicCalendar /> },
	'iv-chart': { title: 'Implied Volatility (IV) Chart for NSE stocks — TIGERBULL', el: () => <IvChart /> },
	'strategy-wizard': { title: 'Find the Most Profitable Options Strategies — TIGERBULL', el: () => <StrategyWizard /> },
	'expiry-trades': { title: 'Option Trades for NIFTY SENSEX BANKNIFTY Expiry — TIGERBULL', el: () => <ExpiryTrades /> },
	'easy-options': { title: 'Super simple, safe Options Trading for beginners — TIGERBULL', el: () => <EasyOptions /> },
	'mindful-trading': { title: 'Mindful Trading — TIGERBULL', el: () => <MindfulTrading /> },
	'learn-options-strategies': { title: 'Learn Options Strategies — TIGERBULL', el: () => <LearnStrategies /> },
	'learn-options-trading': { title: 'Learn Options Trading: Free Video Courses — TIGERBULL', el: () => <LearnTrading /> },
};

export default function ToolRoute() {
	const { slug } = useParams();
	const tool = getTool(slug ?? '');
	if (!tool) return <NotFound />;

	if (tool.slug === 'strategy-builder') {
		return (
			<>
				<Seo title="Strategy Builder — TIGERBULL" description={tool.blurb} />
				<StrategyBuilder />
				<LoginModal />
			</>
		);
	}
	const terminal = TERMINAL[tool.slug];
	if (terminal) {
		return (
			<>
				<Seo title={terminal.title} description={tool.blurb} />
				{terminal.el()}
				<LoginModal />
			</>
		);
	}
	return (
		<SiteChrome>
			<Seo title={`${tool.name} — TIGERBULL`} description={tool.blurb} />
			<ToolView tool={tool} />
		</SiteChrome>
	);
}
