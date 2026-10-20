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
import PathAlias from '@/routes/path-alias';
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
			{ path: 'option-strategy-builder', element: <PathAlias to="strategy-builder" /> },
			{ path: 'option-chain', element: <PathAlias to="option-chain" /> },
			{ path: 'open-interest', element: <PathAlias to="open-interest" /> },
			{ path: 'open-interest/:sub', element: <PathAlias to="open-interest" /> },
			{ path: 'fii-dii-data', element: <PathAlias to="fii-dii" /> },
			{ path: 'fii-dii-data/:sub', element: <PathAlias to="fii-dii" /> },
			{ path: 'live-options-charts', element: <PathAlias to="live-options-charts" /> },
			{ path: 'multi-straddle-strangle-charts', element: <PathAlias to="multi-straddle-strangle" /> },
			{ path: 'futures-options-data', element: <PathAlias to="stock-data" /> },
			{ path: 'options-screener', element: <PathAlias to="screener" /> },
			{ path: 'candlestick-patterns', element: <PathAlias to="technical-signals" /> },
			{ path: 'technical-signals', element: <PathAlias to="technical-signals" /> },
			{ path: 'daily-nifty-analysis', element: <PathAlias to="market-analysis" /> },
			{ path: 'stock-market-calendar', element: <PathAlias to="economic-calendar" /> },
			{ path: 'stock-market-calendar/:sub', element: <PathAlias to="economic-calendar" subParam="tab" /> },
			{ path: 'implied-volatility-chart', element: <PathAlias to="iv-chart" /> },
			{ path: 'trade-options-strategies', element: <PathAlias to="strategy-wizard" /> },
			{ path: 'expiry-trades', element: <PathAlias to="expiry-trades" /> },
			{ path: 'trade-options', element: <PathAlias to="easy-options" /> },
			{ path: 'mindful-trading', element: <PathAlias to="mindful-trading" /> },
			{ path: 'learn-options-strategies', element: <PathAlias to="learn-options-strategies" /> },
			{ path: 'learn-options-strategies/:sub', element: <PathAlias to="learn-options-strategies" subParam="strategy" /> },
			{ path: 'learn-options-trading', element: <PathAlias to="learn-options-trading" /> },
			{ path: '*', element: <NotFound /> },
		],
	},
]);

export default function App() {
	return <RouterProvider router={router} />;
}
