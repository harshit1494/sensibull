import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';
import { SimplePage } from '@/components/pages/simple-page';

const SEO = { title: 'Investor Charter — Sensibull', description: 'Investor charter for Riskilla Software Technologies Private Limited.' };

export default function InvestorCharter() {
	return (
		<SiteChrome>
			<Seo {...SEO} />
			<SimplePage
				kicker="INVESTOR CHARTER"
				title="Investor Charter"
				lead="Riskilla Software Technologies Pvt Ltd — what you can expect when you use Sensibull."
				sections={[
					{ heading: 'Vision', body: 'To give options traders a clear view of risk, payoff and positions, and to deal with them fairly.' },
					{ heading: 'What we commit to', body: 'We show max loss before you trade. We do not hide charges inside the product. We answer help@sensibull.com. We do not promise returns.' },
					{ heading: 'Grievances', body: 'Write to help@sensibull.com with your registered email and a short description. If you are not heard, you may escalate through the SEBI SCORES portal. Registration: RA INH200006895.' },
				]}
			/>
		</SiteChrome>
	);
}
