import { Link } from 'react-router';
import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';

export default function NotFound() {
	return (
		<SiteChrome>
			<Seo title="Page not found — Sensibull" description="The requested page could not be found." noindex />
			<section className="page-section">
				<div className="page-wrap narrow-page">
					<span className="section-label">404</span>
					<h1>Page not found</h1>
					<p className="lead">The requested page could not be found.</p>
					<Link className="primary-button" to="/">Back to home</Link>
				</div>
			</section>
		</SiteChrome>
	);
}
