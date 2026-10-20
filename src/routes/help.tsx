import { useState } from 'react';
import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';

const faqs = [
	{ q: 'Is TIGERBULL free on Zerodha?', a: 'On Zerodha the Pro plan has no TIGERBULL charge. Other brokers may bill a monthly fee — the pricing section on the home page shows both.' },
	{ q: 'Do I need a broker to use the tools here?', a: 'You can build strategies, read the option chain and study open interest without a broker. Sending a live order still happens on your broker.' },
	{ q: 'What is Verified by TIGERBULL?', a: 'Traders connect a broker and share live P&L. Followers see the numbers from the broker, not a screenshot.' },
	{ q: 'How do I reset my password?', a: 'Log out from the Login page and sign up again with the same email only if you have not created an account yet. Existing accounts keep the password you chose on this browser.' },
];

const SEO = { title: 'Help & FAQs — TIGERBULL', description: 'Answers to common questions about TIGERBULL plans, tools and support.' };

export default function Help() {
	const [open, setOpen] = useState(0);
	return (
		<SiteChrome>
			<Seo {...SEO} />
			<section className="page-section">
				<div className="page-wrap narrow-page">
					<span className="section-label">HELP</span>
					<h1>Help & FAQs</h1>
					<p className="lead">Short answers to the questions we hear most often.</p>
					<div className="faq-list">
						{faqs.map((item, index) => (
							<div key={item.q} className="opening">
								<button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>
									<strong>{item.q}</strong>
									<span>{open === index ? '−' : '+'}</span>
								</button>
								{open === index ? <p className="applied">{item.a}</p> : null}
							</div>
						))}
					</div>
				</div>
			</section>
		</SiteChrome>
	);
}
