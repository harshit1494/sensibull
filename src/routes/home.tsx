import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';
import { Hero } from '@/components/home/hero';
import { Brokers } from '@/components/home/brokers';
import { Strategies } from '@/components/home/strategies';
import { Positions } from '@/components/home/positions';
import { DraftPortfolios } from '@/components/home/draft-portfolios';
import { DataTools } from '@/components/home/data-tools';
import { Verified } from '@/components/home/verified';
import { Mindful } from '@/components/home/mindful';
import { MobileApp } from '@/components/home/mobile-app';
import { Testimonials } from '@/components/home/testimonials';
import { Pricing } from '@/components/home/pricing';
const SEO = {title:'TIGERBULL — Options Trading with Clarity and Control',description:'Explore options strategies, trade analysis, market data and mindful trading with this recreation of the TIGERBULL homepage.',image:'https://sensibull.com/images/homepage-hero-mobile.webp',jsonLd:{'@context':'https://schema.org','@type':'WebSite',name:'TIGERBULL homepage reproduction',description:'An independent recreation of the TIGERBULL options trading homepage.'}};
export default function HomePage() {
 return <SiteChrome>
			<Seo {...SEO} /><Hero/><Brokers/><Strategies/><Positions/><DraftPortfolios/><DataTools/><Verified/><Mindful/><MobileApp/><Testimonials/><Pricing/></SiteChrome>;
}
