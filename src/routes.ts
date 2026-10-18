import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
	index('routes/home.tsx'),
	route('about', 'routes/about.tsx'),
	route('login', 'routes/login.tsx'),
	route('tools', 'routes/tools.tsx'),
	route('tools/:slug', 'routes/tools.$slug.tsx'),
	route('help', 'routes/help.tsx'),
	route('legal', 'routes/legal.tsx'),
	route('disclaimers', 'routes/disclaimers.tsx'),
	route('investor-charter', 'routes/investor-charter.tsx'),
	route('bug-bounty', 'routes/bug-bounty.tsx'),
	route('sitemap.xml', 'routes/sitemap.xml.ts'),
	route('robots.txt', 'routes/robots.txt.ts'),
	route('api/health', 'routes/api.health.ts'),
	route('api/*', 'routes/api.$.ts'),
] satisfies RouteConfig;
