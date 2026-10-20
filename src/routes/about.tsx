import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';
import { AboutPage } from '@/components/about/about-page';

const SEO = {
			title: 'About TIGERBULL — Options Trading Platform in India',
			description:
				'TIGERBULL was built to bring structure and sanity to options trading. Meet the team, the journey since 2017, and open roles.',
			image: 'https://sensibull.com/images/team/abid-hassan.webp',
			jsonLd: {
				'@context': 'https://schema.org',
				'@type': 'AboutPage',
				name: 'About TIGERBULL',
				description: 'The team and story behind TIGERBULL, an options trading platform in India.',
			},
		};

export default function About() {
	return (
		<SiteChrome>
			<Seo {...SEO} />
			<AboutPage />
		</SiteChrome>
	);
}
