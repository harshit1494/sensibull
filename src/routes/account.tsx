import { Seo } from '@/components/seo';
import { AccountHomePage, OrdersPage, PositionsPage } from '@/components/account/account-pages';
import { WatchlistPage } from '@/components/account/watchlist-page';

export function AccountHome() {
	return (
		<>
			<Seo title="India’s Largest Options Trading Platform - Sensibull" description="Your Sensibull home: strategy tools, verified traders and learning, all in one place." noindex />
			<AccountHomePage />
		</>
	);
}

export function Positions() {
	return (
		<>
			<Seo title="Your F&O Positions Grouped by Underlying - Sensibull" description="See your F&O positions, P&L, decay, funds and charges." noindex />
			<PositionsPage />
		</>
	);
}

export function Watchlist() {
	return (
		<>
			<Seo title="My Watchlist: Track Stocks, Futures & Options - Sensibull" description="Track indices, stocks, futures and options across ten watchlists with charts and OI profile." noindex />
			<WatchlistPage />
		</>
	);
}

export function Orders() {
	return (
		<>
			<Seo title="Your F&O Order Book - Sensibull" description="All, open, executed and stoploss orders in one order book." noindex />
			<OrdersPage />
		</>
	);
}
