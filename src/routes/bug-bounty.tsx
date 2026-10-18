import { useState } from 'react';
import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';

const SEO = { title: 'Bug Bounty — Sensibull', description: 'Report a security issue in Sensibull.' };

export default function BugBounty() {
	const [sent, setSent] = useState(false);
	return (
		<SiteChrome>
			<Seo {...SEO} />
			<section className="page-section">
				<div className="page-wrap narrow-page">
					<span className="section-label">SECURITY</span>
					<h1>Bug Bounty</h1>
					<p className="lead">Found a security issue? Tell us before you tell anyone else. We read every report.</p>
					{sent ? (
						<p className="applied">Report received. If we need more detail we will reply to the email you entered.</p>
					) : (
						<form
							className="apply-form"
							onSubmit={(event) => {
								event.preventDefault();
								setSent(true);
							}}
						>
							<label>
								Email
								<input type="email" required placeholder="you@email.com" />
							</label>
							<label>
								What did you find?
								<textarea required rows={5} placeholder="Steps, URL, and what an attacker could do" />
							</label>
							<button className="primary-button" type="submit">
								Send report
							</button>
						</form>
					)}
				</div>
			</section>
		</SiteChrome>
	);
}
