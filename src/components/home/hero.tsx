import { StrategyBuilder } from '@/components/tools/strategy-builder';

const assets = 'https://sensibull.com/images/';

export function Hero() {
	return (
		<section className="hero">
			<div className="hero-grid">
				<div className="hero-copy">
					<span className="eyebrow">India's most trusted options trading platform</span>
					<h1>Trade Options with <strong>Clarity and Control</strong></h1>
					<p>Build winning strategies, predict market trends, analyse your trades, and make informed decisions. Perfect for beginners and professionals</p>
					<a className="primary-button hero-cta" href="/tools/strategy-builder">Explore Now</a>
				</div>
				<div className="hero-builder" aria-label="Strategy builder">
					<div className="hero-builder-scale">
						<StrategyBuilder embedded />
					</div>
				</div>
			</div>
			<div className="hero-stats">
				<div><strong>180k+</strong><span>Daily Users</span></div>
				<div><strong><img src={assets + 'tick-badge.webp'} alt="" />SEBI</strong><span>Registered</span></div>
				<div><strong><img src={assets + 'play-store.webp'} alt="Google Play" />4.6 <img src={assets + 'ratings-star.webp'} alt="stars" /></strong><span>120k Downloads</span></div>
			</div>
		</section>
	);
}
