import { Navigate, useLocation, useParams } from 'react-router';

const OI_TABS: Record<string, string> = {
	'oi-change-vs-strike': 'change',
	'oi-vs-strike': 'oi',
	'multistrike-oi': 'multi',
	'option-oi-vs-time': 'option-time',
	'futures-oi-vs-time': 'fut-time',
};
const FII_TABS: Record<string, string> = { summary: '', fno: 'fno', cash: 'cash', history: 'history' };

/** Maps web.sensibull.com style paths (e.g. /open-interest/multistrike-oi) onto our /tools/* pages. */
export default function SensibullAlias({ to, subParam }: { to: string; subParam?: string }) {
	const { search } = useLocation();
	const { sub } = useParams();
	const qs = new URLSearchParams(search);
	if (to === 'open-interest' && sub && OI_TABS[sub] && OI_TABS[sub] !== 'change') qs.set('tab', OI_TABS[sub]);
	if (to === 'fii-dii' && sub && FII_TABS[sub]) qs.set('tab', FII_TABS[sub]);
	if (subParam && sub) qs.set(subParam, sub);
	if (to === 'iv-chart' && !qs.get('underlying') && qs.get('tradingsymbol')) qs.set('underlying', qs.get('tradingsymbol') ?? 'NIFTY');
	const q = qs.toString();
	return <Navigate replace to={`/tools/${to}${q ? `?${q}` : ''}`} />;
}
