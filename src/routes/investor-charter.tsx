import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';
import { SimplePage } from '@/components/pages/simple-page';

const SEO = { title: 'Investor Charter — TIGERBULL', description: 'Investor charter for Riskilla Software Technologies Private Limited.' };

export default function InvestorCharter() {
	return (
		<SiteChrome>
			<Seo {...SEO} />
			<SimplePage
				kicker="INVESTOR CHARTER"
				title="Investor Charter"
				lead="Riskilla Software Technologies Pvt Ltd — what you can expect when you use TIGERBULL."
				sections={[
					{ heading: 'Vision', body: 'To give options traders a clear view of risk, payoff and positions, and to deal with them fairly.' },
					{ heading: 'What we commit to', body: 'We show max loss before you trade. We do not hide charges inside the product. We do not promise returns.' },
					{ heading: 'Grievances', body: 'Use Help & FAQs on this site with your registered email and a short description. If you are not heard, you may escalate through the SEBI SCORES portal.' },
				]}
			/>
		</SiteChrome>
	);
}
