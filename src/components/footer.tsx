import { Link } from 'react-router';

export function Footer() {
	return (
		<footer className="site-footer">
			<div className="footer-rail">
				<p>
					Charts are powered by TradingView. An investment and trading platform providing users with global market
					insights, financial news and analytical tools like{' '}
					<a href="https://www.tradingview.com/screener/" target="_blank" rel="noreferrer">
						Stock Screener
					</a>{' '}
					and{' '}
					<a href="https://www.tradingview.com/economic-calendar/" target="_blank" rel="noreferrer">
						Economic Calendar
					</a>
					.
				</p>
				<div className="footer-columns">
					<div>
						<div className="footer-links">
							<Link to="/help">Help & FAQs</Link>
							<Link to="/disclaimers">Disclaimers</Link>
							<Link to="/bug-bounty">Bug Bounty</Link>
							<Link to="/about">About</Link>
						</div>
						<div className="footer-links">
							<Link to="/legal">Terms of Use & Privacy Policy</Link>
							<Link to="/investor-charter">Investor Charter</Link>
						</div>
					</div>
				</div>
				<p className="copyright">© 2026 All Right Reserved</p>
			</div>
		</footer>
	);
}
