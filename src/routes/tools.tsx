import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';
import { ToolsIndex } from '@/components/tools/tools-index';

const SEO = {
			title: 'Tools — Sensibull',
			description: 'Strategy Builder, Option Chain, Open Interest, FII DII data and Verified by Sensibull.',
		};

export default function ToolsRoute() {
	return (
		<SiteChrome>
			<Seo {...SEO} />
			<ToolsIndex />
		</SiteChrome>
	);
}
