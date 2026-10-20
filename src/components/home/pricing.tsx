import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { features } from '@/data/home';

export function Pricing() {
	const [broker, setBroker] = useState('Zerodha');
	const [full, setFull] = useState(false);
	return (
		<section id="pricing" className="pricing section-rail">
			<h2>Join more than 2 Million happy users</h2>
			<p>
				No charges for TIGERBULL on select brokers
				<br />
				TIGERBULL app has no charges on iOS devices
			</p>
			<div className="pricing-tabs" role="tablist" aria-label="Broker pricing">
				{['Zerodha', 'Others'].map((b) => (
					<button key={b} role="tab" aria-selected={broker === b} onClick={() => setBroker(b)} className={broker === b ? 'selected' : ''}>
						{b}
					</button>
				))}
			</div>
			<div className="plan-grid">
				<article className="plan">
					<img src="https://sensibull.com/images/paper-plane.webp" alt="" loading="lazy" />
					<h3>Free Plan</h3>
					<p>8 Useful Features</p>
					<strong className="plan-price">Free</strong>
					<button type="button" className="outline-button" onClick={() => window.dispatchEvent(new Event('tigerbull-open-login'))}>
						Explore
					</button>
					<h4>Highlights</h4>
					<ul>
						{['Basic Option Chain', 'FII DII Data Analysis', 'Events Calendar', 'and more...'].map((t) => (
							<li key={t}>
								<Check />
								{t}
							</li>
						))}
					</ul>
				</article>
				<article className="plan pro">
					<img src="https://sensibull.com/images/rocket.webp" alt="" loading="lazy" />
					<h3>Pro Plan</h3>
					<p>Highest Plan with all 25+ features</p>
					<strong className="plan-price">
						{broker === 'Zerodha' ? '₹0' : '₹800'}
						<small> /month</small>
					</strong>
					<p>{broker === 'Zerodha' ? 'No Charges' : 'View current broker offers on TIGERBULL'}</p>
					<button type="button" className="primary-button" onClick={() => window.dispatchEvent(new Event('tigerbull-open-login'))}>
						{broker === 'Zerodha' ? "Let's Go" : 'Explore on TIGERBULL'}
					</button>
					<h4>Highlights</h4>
					<ul>
						{['Strategy Builder', 'Draft Portfolios', 'Advanced Option Chain', 'Open Interest Analysis', 'Analyse Trades', 'Stocks Heat Map', 'and much more...'].map((t) => (
							<li key={t}>
								<Check />
								{t}
							</li>
						))}
					</ul>
				</article>
			</div>
			<button className="feature-toggle" aria-expanded={full} onClick={() => setFull(!full)}>
				{full ? 'Hide' : 'Full'} Feature List <ChevronDown size={18} />
			</button>
			{full ? (
				<div className="feature-table">
					<div>
						<strong>Compare Plans</strong>
						<strong>Pro</strong>
						<strong>Free</strong>
					</div>
					{features.map((f, i) => (
						<div key={f}>
							<span>{f}</span>
							<Check size={18} />
							{[2, 4, 8, 9, 13, 21, 22, 23, 24, 25].includes(i) ? <Check size={18} /> : <span>—</span>}
						</div>
					))}
				</div>
			) : null}
		</section>
	);
}
