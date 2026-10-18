export function Mindful() {
	return (
		<section className="mindful">
			<h2>Conquer your Mind</h2>
			<p>
				Our revolutionary mindful trading feature helps you pause, control your emotions,
				<br />
				and stop impulsive trading - leading to better discipline and less mistakes
			</p>
			<div className="mindful-art">
				<img className="flower" src="https://sensibull.com/images/mt-flower.webp" alt="" loading="lazy" />
				<img className="meditation" src="https://sensibull.com/images/mt-meditation.webp" alt="Mindful trader meditating" loading="lazy" />
				<div className="mindful-prompt prompt-left">
					<h3>
						Have you planned and
						<br />
						thought through this trade?
					</h3>
					<a href="/tools/strategy-builder">No, Don't Take This Trade</a>
					<a href="/tools/strategy-builder">Yes, Go Ahead</a>
				</div>
				<div className="mindful-prompt prompt-right">
					<h3>
						Do you still want to take
						<br />
						this trade?
					</h3>
					<a href="/tools/strategy-builder">No</a>
					<a href="/tools/strategy-builder">Yes, Let's Take This Trade</a>
				</div>
				<div className="mindful-clicks">
					2 Trade button
					<br />
					<span>clicks today</span>
					<img src="https://sensibull.com/images/mt-clicks.webp" alt="" />
				</div>
				<div className="mindful-days">
					<img src="https://sensibull.com/images/mt-calendar.webp" alt="" />
					<div>
						1st Day towards
						<br />
						<span>mindful trading</span>
					</div>
				</div>
			</div>
			<a className="outline-button" href="/tools/strategy-builder">
				Try Mindful Trading Now
			</a>
		</section>
	);
}
