import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';
import { ToolsIndex } from '@/components/tools/tools-index';

const SEO = {
			title: 'Tools — TIGERBULL',
			description: 'Strategy Builder, Option Chain, Open Interest, FII DII data and Verified by TIGERBULL.',
		};

export default function ToolsRoute() {
	return (
		<SiteChrome>
			<Seo {...SEO} />
			<ToolsIndex />
		</SiteChrome>
	);
}
