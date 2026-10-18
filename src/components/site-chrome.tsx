import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { LoginModal } from '@/components/auth/login-modal';

export function SiteChrome({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Header />
			<main>{children}</main>
			<Footer />
			<LoginModal />
		</>
	);
}
