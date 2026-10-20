import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Calendar, ChevronDown, Play, PlayCircle } from 'lucide-react';
import '@/components/tools/analysis-pages.css';
import { LoginBanner, TerminalPage } from '@/components/tools/terminal-chrome';
import { FNO } from '@/lib/fno-stocks';

/** Mock daily notes — original text written for this recreation. */
type Note = { iso: string; day: string; color: string; title: string; chart: string; oi: string; pcr: string; participant: string; fiiFut: string; fiiCash: string; verdict: string; trades: string; hi: { verdict: string; trades: string } };
const NOTES: Note[] = [
	{ iso: '2026-10-16', day: '16', color: '#2e6b8d', title: 'NIFTY 23,000 reclaimed — can the bounce stretch further?',
		chart: 'NIFTY printed a wide-range green candle that erased the prior session’s hesitation. BANKNIFTY followed with a smaller body. On the weekly chart both indices are holding above last week’s low.',
		oi: 'Put writers are stacked at 22,800 and 23,000. Call OI above 23,300 is thin, so there is no heavy wall immediately overhead.',
		pcr: 'Near-the-money PCR is around 1.2, which leans bullish. Overall PCR is high enough that a pause would not be surprising.',
		participant: 'FIIs and Pros added bullish index-option positions; Clients were net sellers of calls.',
		fiiFut: 'FIIs were net buyers in index futures.', fiiCash: 'FIIs were net sellers in the cash market.',
		verdict: 'Bias stays positive while 22,800 holds. 23,300–23,500 is the zone to start booking some profit on longs.',
		trades: 'Keeping existing bull call spreads; no fresh shorts until a reversal candle shows up.',
		hi: { verdict: 'जब तक 22,800 टिका है, रुझान सकारात्मक है। 23,300–23,500 के आसपास कुछ मुनाफ़ा बुक करने का क्षेत्र है।', trades: 'मौजूदा बुल कॉल स्प्रेड बनाए रखें; रिवर्सल कैंडल आने तक नए शॉर्ट नहीं।' } },
	{ iso: '2026-10-15', day: '15', color: '#3a8a7a', title: 'Inside day — waiting for the next close to decide',
		chart: 'A small-bodied candle stayed inside the previous day’s range on both indices. Momentum has slowed but the structure is not broken.',
		oi: 'Fresh put writing at 22,900; calls being added at 23,200 suggest a short-term range.', pcr: 'PCR eased to about 1.05 near ATM — neutral.',
		participant: 'Pros were mildly bullish; FIIs flat in options.', fiiFut: 'Small net short addition by FIIs in index futures.', fiiCash: 'Mixed cash activity, mild net selling.',
		verdict: 'A firm close above the day’s high favours a continuation; a close below the low would weaken the bounce. Trading the confirmation is safer than guessing.',
		trades: 'Holding hedged positions; no new directional trade today.',
		hi: { verdict: 'दिन के ऊपर मज़बूत क्लोज़ तेज़ी जारी रखेगा; नीचे क्लोज़ उछाल को कमज़ोर करेगा। अनुमान से बेहतर है पुष्टि पर ट्रेड करना।', trades: 'हेज्ड पोज़िशन बनाए रखें; आज कोई नया डायरेक्शनल ट्रेड नहीं।' } },
	{ iso: '2026-10-14', day: '14', color: '#2e5d9a', title: 'Relief rally has room — 23,000 in sight',
		chart: 'A higher low formed after three weak sessions.', oi: 'Support building at 22,700.', pcr: 'PCR recovered to 0.95.', participant: 'Clients turned buyers of calls.', fiiFut: 'FIIs covered some shorts.', fiiCash: 'Net selling continued.',
		verdict: 'Some room for a relief move towards 23,000–23,100. Reassess once that zone is tested.', trades: 'Small bull spread initiated with defined risk.',
		hi: { verdict: '23,000–23,100 की ओर राहत रैली की गुंजाइश है। उस क्षेत्र के बाद दोबारा देखें।', trades: 'सीमित जोखिम वाला छोटा बुल स्प्रेड लिया।' } },
	{ iso: '2026-10-13', day: '13', color: '#4b4f9e', title: 'Stuck between 22,600 and the recent low',
		chart: 'Neither a breakout above 22,600 nor a breakdown below the swing low.', oi: 'Balanced OI on both sides.', pcr: 'PCR around 0.9.', participant: 'No clear lead from any participant.', fiiFut: 'Flat.', fiiCash: 'Mild selling.',
		verdict: 'Until one of the two levels breaks, this is a coin-flip market — sitting out is a valid position.', trades: 'No trade.',
		hi: { verdict: 'जब तक कोई एक स्तर नहीं टूटता, बाज़ार 50-50 है — बाहर रहना भी एक पोज़िशन है।', trades: 'कोई ट्रेड नहीं।' } },
	{ iso: '2026-10-12', day: '12', color: '#3c4a8c', title: 'Weekly reversal candle on both indices',
		chart: 'Weekly candles show a potential reversal; daily candle is an inside bar.', oi: 'Put OI rising at 22,500.', pcr: 'PCR 0.88.', participant: 'FIIs reduced bearish bets.', fiiFut: 'Short covering seen.', fiiCash: 'Selling slowed.',
		verdict: 'A weekly close above last week’s high would confirm the reversal. Do not expect a straight-line rally — overhead supply remains.', trades: 'Watching for a close above 22,600 before going long.',
		hi: { verdict: 'पिछले हफ़्ते के हाई के ऊपर साप्ताहिक क्लोज़ रिवर्सल की पुष्टि करेगा। सीधी तेज़ी की उम्मीद न करें।', trades: 'लॉन्ग से पहले 22,600 के ऊपर क्लोज़ का इंतज़ार।' } },
	{ iso: '2026-10-09', day: '09', color: '#1f5fa8', title: 'Pressure stays on — every rise is being sold',
		chart: 'Lower highs continue.', oi: 'Call writers active at 22,800.', pcr: 'PCR 0.75 — bearish.', participant: 'FIIs bearish.', fiiFut: 'Net short addition.', fiiCash: 'Heavy selling.',
		verdict: 'Below 22,600 the path of least resistance is down; expect selling into rallies.', trades: 'Bear call spread above 22,800.',
		hi: { verdict: '22,600 के नीचे रास्ता नीचे की ओर है; हर उछाल पर बिकवाली की उम्मीद।', trades: '22,800 के ऊपर बेयर कॉल स्प्रेड।' } },
	{ iso: '2026-10-08', day: '08', color: '#0f57a0', title: 'Make-or-break near 22,400',
		chart: 'Price sitting right on the 200-week average.', oi: 'Large put OI at 22,400.', pcr: 'PCR 0.8.', participant: 'Clients bullish, FIIs bearish.', fiiFut: 'Net short.', fiiCash: 'Net selling.',
		verdict: 'A break of 22,400 opens more downside; holding 22,600 could give a relief bounce that becomes a level to short.', trades: 'Wait.',
		hi: { verdict: '22,400 टूटने पर और गिरावट; 22,600 टिकने पर राहत उछाल मिल सकता है।', trades: 'इंतज़ार।' } },
];
const LABELS = {
	english: { chart: 'Chart:', oi: 'Open Interest:', pcr: 'PCR:', participant: 'Participant Options Data:', fiiFut: 'FII Futures Data:', fiiCash: 'FII Stock Data:', verdict: 'Verdict', trades: 'Trades?', history: 'History', title: (d: string) => `Nifty and Bank Nifty Analysis for ${d} Oct` },
	hindi: { chart: 'चार्ट:', oi: 'ओपन इंटरेस्ट:', pcr: 'PCR:', participant: 'प्रतिभागी ऑप्शंस डेटा:', fiiFut: 'FII फ्यूचर्स डेटा:', fiiCash: 'FII स्टॉक डेटा:', verdict: 'निष्कर्ष', trades: 'ट्रेड?', history: 'इतिहास', title: (d: string) => `${d} अक्टूबर के लिए निफ्टी और बैंक निफ्टी विश्लेषण` },
};

export function MarketAnalysis() {
	const [params, setParams] = useSearchParams();
	const lang = params.get('lang') === 'hindi' ? 'hindi' : 'english';
	const view = params.get('view');
	const note = NOTES.find((n) => n.iso === params.get('date')) ?? NOTES[0];
	const [pickOpen, setPickOpen] = useState(false);
	const [playing, setPlaying] = useState(false);
	const L = LABELS[lang];
	const set = (patch: Record<string, string>) => { setParams({ lang, date: note.iso, ...patch }, { replace: true }); setPlaying(false); };

	return (
		<TerminalPage title="Market Analysis" active="analyse" className="ap-page">
			<div className="ap-shell">
				<LoginBanner />
				<div className="ma-bar">
					<div className="fd-seg-btns">
						<button type="button" className={lang === 'english' ? 'on' : ''} onClick={() => set({ lang: 'english' })}>English</button>
						<button type="button" className={lang === 'hindi' ? 'on' : ''} onClick={() => set({ lang: 'hindi' })}>हिन्दी</button>
					</div>
					<div className="ma-dates">
						{NOTES.slice(0, 5).map((n) => (
							<button key={n.iso} type="button" className={n.iso === note.iso && view !== 'calendar' ? 'on' : ''} onClick={() => setParams({ lang, date: n.iso }, { replace: true })}>{n.day} Oct <PlayCircle size={16} /></button>
						))}
						<div className="ma-pick">
							<button type="button" onClick={() => setPickOpen(!pickOpen)}><Calendar size={16} /> {note.day} Oct 2026 <ChevronDown size={14} /></button>
							{pickOpen ? (
								<div className="sb-pop ma-pick-pop">
									{NOTES.map((n) => <button key={n.iso} type="button" className={n.iso === note.iso ? 'on' : ''} onClick={() => { setParams({ lang, date: n.iso }, { replace: true }); setPickOpen(false); }}><strong>{n.day} Oct 2026</strong></button>)}
									<button type="button" onClick={() => { setParams({ lang, view: 'calendar' }, { replace: true }); setPickOpen(false); }}><strong>Stock Market Calendar</strong></button>
								</div>
							) : null}
						</div>
					</div>
				</div>

				{view === 'calendar' ? <MarketCalendar /> : (
					<div className="ma-grid">
						<div className="ma-left">
							<div className={`ma-video ${playing ? 'playing' : ''}`} style={{ background: `linear-gradient(135deg, ${note.color}, #0f1720 78%)` }}>
								<div className="ma-video-top"><span className="ma-logo">T</span><p>{note.title} | {note.day} Oct</p></div>
								<div className="ma-video-body">
									<p className="ma-kicker">DAILY NIFTY &amp; BANKNIFTY ANALYSIS</p>
									<p className="ma-date">{note.day} OCT 2026</p>
									<p className="ma-headline">{note.title}</p>
								</div>
								<button type="button" className="ma-play" aria-label="Play video" onClick={() => setPlaying(!playing)}><Play size={30} fill="currentColor" /></button>
								{playing ? <p className="ma-playing">Video playback isn’t part of this mock — the written analysis is on the right.</p> : null}
							</div>
							<p className="ma-h">{L.history}</p>
							<div className="ma-history">
								{NOTES.filter((n) => n.iso !== note.iso).map((n) => (
									<button key={n.iso} type="button" className="ma-card" onClick={() => setParams({ lang, date: n.iso }, { replace: true })}>
										<span className="ma-tile" style={{ background: n.color }}><PlayCircle size={20} /><b>{n.day}</b> Oct<small>2026</small></span>
										<span className="ma-snip"><b>{L.verdict}</b>{lang === 'hindi' ? n.hi.verdict : n.verdict}</span>
									</button>
								))}
							</div>
						</div>
						<div className="ma-right">
							<div className="ma-title"><h2>{L.title(note.day)}</h2><span className="ma-yt"><Play size={12} fill="currentColor" /> YouTube</span></div>
							<dl className="ma-dl">
								<dt>{L.chart}</dt><dd>{note.chart}</dd>
								<dt>{L.oi}</dt><dd>{note.oi}</dd>
								<dt>{L.pcr}</dt><dd>{note.pcr}</dd>
								<dt>{L.participant}</dt><dd>{note.participant}</dd>
								<dt>{L.fiiFut}</dt><dd>{note.fiiFut}</dd>
								<dt>{L.fiiCash}</dt><dd>{note.fiiCash}</dd>
							</dl>
							<div className="ma-verdict">
								<p className="ma-vh">{L.verdict}</p>
								<p>{lang === 'hindi' ? note.hi.verdict : note.verdict}</p>
								<p className="ma-vh">{L.trades}</p>
								<p>{lang === 'hindi' ? note.hi.trades : note.trades}</p>
							</div>
							<p className="ma-disclaimer">Mock commentary for this recreation — not investment advice.</p>
						</div>
					</div>
				)}
			</div>
			{pickOpen ? <button type="button" className="lc-dismiss ap-dismiss" aria-label="Close" onClick={() => setPickOpen(false)} /> : null}
		</TerminalPage>
	);
}

function MarketCalendar() {
	const events = [
		...FNO.filter((s) => s.result !== 'N/A' && s.result !== 'TBA').map((s) => ({ date: s.result, type: 'Results', what: s.symbol })),
		{ date: '19 Oct', type: 'Expiry', what: 'NIFTY weekly' }, { date: '27 Oct', type: 'Expiry', what: 'Monthly F&O' }, { date: '23 Oct', type: 'Holiday', what: 'Markets closed (mock)' },
	];
	const order = (d: string) => (d.endsWith('Nov') ? 100 : 0) + Number(d.slice(0, 2));
	const days = Array.from(new Set(events.map((e) => e.date))).sort((a, b) => order(a) - order(b));
	return (
		<div className="ma-cal">
			<h2>Stock Market Calendar</h2>
			{days.map((d) => (
				<div key={d} className="ma-cal-day">
					<p>{d} 2026</p>
					<div>{events.filter((e) => e.date === d).map((e) => <span key={e.what + e.type} className={`ma-chip ${e.type.toLowerCase()}`}>{e.type}: {e.what}</span>)}</div>
				</div>
			))}
		</div>
	);
}
