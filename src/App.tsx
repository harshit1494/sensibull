import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router';
import Home from '@/routes/home';
import About from '@/routes/about';
import Login from '@/routes/login';
import Tools from '@/routes/tools';
import ToolRoute from '@/routes/tools.$slug';
import Help from '@/routes/help';
import Legal from '@/routes/legal';
import Disclaimers from '@/routes/disclaimers';
import InvestorCharter from '@/routes/investor-charter';
import BugBounty from '@/routes/bug-bounty';
import NotFound from '@/routes/not-found';
import SensibullAlias from '@/routes/sensibull-alias';
import { AccountHome, Orders, Positions, Watchlist } from '@/routes/account';

function RootLayout() {
	return (
		<>
			<Outlet />
			<ScrollRestoration />
		</>
	);
}

const router = createBrowserRouter([
	{
		element: <RootLayout />,
		errorElement: <NotFound />,
		children: [
			{ index: true, element: <Home /> },
			{ path: 'about', element: <About /> },
			{ path: 'login', element: <Login /> },
			{ path: 'home', element: <AccountHome /> },
			{ path: 'positions', element: <Positions /> },
			{ path: 'orders', element: <Orders /> },
			{ path: 'watchlist', element: <Watchlist /> },
			{ path: 'stocks-watchlist', element: <Watchlist /> },
			{ path: 'tools', element: <Tools /> },
			{ path: 'tools/:slug', element: <ToolRoute /> },
			{ path: 'help', element: <Help /> },
			{ path: 'legal', element: <Legal /> },
			{ path: 'disclaimers', element: <Disclaimers /> },
			{ path: 'investor-charter', element: <InvestorCharter /> },
			{ path: 'bug-bounty', element: <BugBounty /> },
			{ path: 'option-strategy-builder', element: <SensibullAlias to="strategy-builder" /> },
			{ path: 'option-chain', element: <SensibullAlias to="option-chain" /> },
			{ path: 'open-interest', element: <SensibullAlias to="open-interest" /> },
			{ path: 'open-interest/:sub', element: <SensibullAlias to="open-interest" /> },
			{ path: 'fii-dii-data', element: <SensibullAlias to="fii-dii" /> },
			{ path: 'fii-dii-data/:sub', element: <SensibullAlias to="fii-dii" /> },
			{ path: 'live-options-charts', element: <SensibullAlias to="live-options-charts" /> },
			{ path: 'multi-straddle-strangle-charts', element: <SensibullAlias to="multi-straddle-strangle" /> },
			{ path: 'futures-options-data', element: <SensibullAlias to="stock-data" /> },
			{ path: 'options-screener', element: <SensibullAlias to="screener" /> },
			{ path: 'candlestick-patterns', element: <SensibullAlias to="technical-signals" /> },
			{ path: 'technical-signals', element: <SensibullAlias to="technical-signals" /> },
			{ path: 'daily-nifty-analysis', element: <SensibullAlias to="market-analysis" /> },
			{ path: 'stock-market-calendar', element: <SensibullAlias to="economic-calendar" /> },
			{ path: 'stock-market-calendar/:sub', element: <SensibullAlias to="economic-calendar" subParam="tab" /> },
			{ path: 'implied-volatility-chart', element: <SensibullAlias to="iv-chart" /> },
			{ path: 'trade-options-strategies', element: <SensibullAlias to="strategy-wizard" /> },
			{ path: 'expiry-trades', element: <SensibullAlias to="expiry-trades" /> },
			{ path: 'trade-options', element: <SensibullAlias to="easy-options" /> },
			{ path: 'mindful-trading', element: <SensibullAlias to="mindful-trading" /> },
			{ path: 'learn-options-strategies', element: <SensibullAlias to="learn-options-strategies" /> },
			{ path: 'learn-options-strategies/:sub', element: <SensibullAlias to="learn-options-strategies" subParam="strategy" /> },
			{ path: 'learn-options-trading', element: <SensibullAlias to="learn-options-trading" /> },
			{ path: '*', element: <NotFound /> },
		],
	},
]);

export default function App() {
	return <RouterProvider router={router} />;
}
