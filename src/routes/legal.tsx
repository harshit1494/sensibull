import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';
import { SimplePage } from '@/components/pages/simple-page';

const SEO = { title: 'Terms of Use & Privacy Policy — Sensibull', description: 'How this Sensibull site may be used, and how account details you enter here are stored.' };

export default function Legal() {
	return (
		<SiteChrome>
			<Seo {...SEO} />
			<SimplePage
				kicker="LEGAL"
				title="Terms of Use & Privacy Policy"
				lead="Riskilla Software Technologies Private Limited operates Sensibull. This page is the version that lives on this website."
				sections={[
					{ heading: 'Using the site', body: 'The tools on this site are for education and analysis. They are not a recommendation to buy or sell any option. Orders you place with a broker are your own. Markets can move against you, and you can lose more than the premium you planned for.' },
					{ heading: 'Accounts', body: 'If you create an account from the Login page, your name, email and password stay in this browser only. We do not send them to a server from this page. Clearing site data logs you out.' },
					{ heading: 'Market data', body: 'Charts on the marketing pages are powered by TradingView. Figures inside the tools on this recreation are illustrative and are not a live exchange feed.' },
					{ heading: 'Contact', body: 'Questions about these terms go to help@sensibull.com. SEBI registration: RA INH200006895.' },
				]}
			/>
		</SiteChrome>
	);
}
