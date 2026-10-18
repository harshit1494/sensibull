import { Link } from 'react-router';
import { tools } from '@/data/tools';

export function ToolsIndex() {
	return (
		<section className="page-section">
			<div className="page-wrap">
				<span className="section-label">TOOLS</span>
				<h1>Everything in the Tools menu, on this site</h1>
				<p className="lead">
					Strategy builder, option chain, open interest, FII/DII and Verified by Sensibull — open them here instead of
					leaving the site.
				</p>
				<div className="tool-cards">
					{tools.map((tool) => (
						<Link key={tool.slug} to={`/tools/${tool.slug}`} className="tool-card">
							<span>{tool.group}</span>
							<strong>{tool.name}</strong>
							<p>{tool.blurb}</p>
						</Link>
					))}
				</div>
			</div>
		</section>
	);
}
