import { Seo } from '@/components/seo';
import { SiteChrome } from '@/components/site-chrome';
import { LoginPage } from '@/components/auth/login-page';

const SEO = {
			title: 'Free Login — Sensibull',
			description: 'Free login for Sensibull. Sign in with email or continue with your broker to open the strategy builder and market tools.',
		};

export default function Login() {
	return (
		<SiteChrome>
			<Seo {...SEO} />
			<LoginPage />
		</SiteChrome>
	);
}
