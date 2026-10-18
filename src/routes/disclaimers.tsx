import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';
import { SimplePage } from '@/components/pages/simple-page';

const SEO = { title: 'Disclaimers — Sensibull', description: 'Risk disclaimers for options trading on Sensibull.' };

export default function Disclaimers() {
	return (
		<SiteChrome>
			<Seo {...SEO} />
			<SimplePage
				kicker="DISCLAIMERS"
				title="Disclaimers"
				lead="Options are leveraged. Read this before you treat a payoff chart as a promise."
				sections={[
					{ heading: 'No advice', body: 'Nothing on Sensibull is investment advice or a research recommendation, except where a SEBI-registered research report says so. Strategy ideas, ready-made templates and verified trader P&L are information, not instructions.' },
					{ heading: 'Past P&L', body: 'A verified trader’s past profit does not predict yours. Followers see live broker numbers; those numbers can turn red the same day.' },
					{ heading: 'Technology', body: 'Prices, margins and order status can be delayed or wrong. Always confirm the order on your broker before you assume it is filled.' },
				]}
			/>
		</SiteChrome>
	);
}
