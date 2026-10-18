import { useEffect, useState } from 'react';

const QUERY = '(min-width: 901px)';

export function useIsDesktop() {
	const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);
	useEffect(() => {
		const mq = window.matchMedia(QUERY);
		const sync = () => setDesktop(mq.matches);
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	}, []);
	return desktop;
}
