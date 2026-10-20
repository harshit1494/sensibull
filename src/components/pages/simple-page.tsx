import { Link } from 'react-router';

export function SimplePage({
	kicker,
	title,
	lead,
	sections,
}: {
	kicker: string;
	title: string;
	lead: string;
	sections: { heading: string; body: string }[];
}) {
	return (
		<section className="page-section">
			<div className="page-wrap narrow-page">
				<span className="section-label">{kicker}</span>
				<h1>{title}</h1>
				<p className="lead">{lead}</p>
				{sections.map((section) => (
					<div key={section.heading} className="prose-block">
						<h2>{section.heading}</h2>
						<p>{section.body}</p>
					</div>
				))}
				<p className="center-note">
					Questions? Read the <Link to="/help">Help & FAQs</Link>.
				</p>
			</div>
		</section>
	);
}
