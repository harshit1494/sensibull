/**
 * Per-page SEO tags for the client-side (SPA) build.
 * React 19 hoists <title>, <meta>, <link> and <script> rendered anywhere in
 * the tree into <head>, so each page just renders <Seo ... />.
 */
import { useLocation } from 'react-router';

export type SeoInput = {
	title: string;
	description: string;
	path?: string;
	image?: string;
	type?: 'website' | 'article';
	noindex?: boolean;
	jsonLd?: object | object[];
};

const absoluteUrl = (origin: string, target: string): string =>
	/^https?:\/\//.test(target) ? target : `${origin}${target.startsWith('/') ? target : `/${target}`}`;

export function Seo(input: SeoInput) {
	const location = useLocation();
	const origin = typeof window !== 'undefined' ? window.location.origin : '';
	const canonical = absoluteUrl(origin, input.path ?? location.pathname);
	const imageUrl = input.image ? absoluteUrl(origin, input.image) : '';

	return (
		<>
			<title>{input.title}</title>
			<meta name="description" content={input.description} />
			<meta property="og:title" content={input.title} />
			<meta property="og:description" content={input.description} />
			<meta property="og:type" content={input.type ?? 'website'} />
			<meta property="og:url" content={canonical} />
			<link rel="canonical" href={canonical} />
			<meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
			<meta name="twitter:title" content={input.title} />
			<meta name="twitter:description" content={input.description} />
			{imageUrl ? <meta property="og:image" content={imageUrl} /> : null}
			{imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}
			{input.noindex ? <meta name="robots" content="noindex" /> : null}
			{[input.jsonLd ?? []].flat().map((block, i) => (
				<script key={i} type="application/ld+json">{JSON.stringify(block)}</script>
			))}
		</>
	);
}
